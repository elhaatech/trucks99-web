"use strict";

/**
 * OTP flow integration tests — run with: node scripts/test-otp-flow.js
 * Requires: MongoDB, Redis, server NOT required (tests service layer + optional HTTP).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const redisClient = require("../config/redisClient");
const { ensureRedisConnected } = require("../config/redisClient");
const {
  createAndSendOtp,
  verifyOtpCode,
  normalizeMobile,
  OTP_EXPIRY_SECONDS,
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_SEC,
} = require("../helpers/mobileOtpService");
const sendSMS = require("../helpers/draft4sms/sendSMS");

const TEST_MOBILE = "9876543210";
const TEST_MOBILE_NORM = normalizeMobile(TEST_MOBILE);
const REDIS_KEY = `otp:${TEST_MOBILE_NORM}`;

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ PASS: ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function clearOtp() {
  await ensureRedisConnected();
  await redisClient.del(REDIS_KEY);
}

async function ensureTestUser() {
  const User = require("../schema/user");
  let user = await User.findOne({ mobile: TEST_MOBILE_NORM }).exec();
  if (!user) {
    user = await User.findOne({ mobile: TEST_MOBILE }).exec();
  }
  if (!user) {
    fail("setup", `No user with mobile ${TEST_MOBILE} in DB`);
    return null;
  }
  pass("setup", `Found user ${user.name} (${user.mobile})`);
  return user;
}

async function testEnsureUserForMobileAuth() {
  const User = require("../schema/user");
  const { ensureUserForMobileAuth } = require("../helpers/ensureOtpUser");

  const unique = `9${Date.now().toString().slice(-9)}`;
  const mobile = normalizeMobile(unique);
  if (!mobile) {
    fail("ensureUserForMobileAuth", "could not normalize test mobile");
    return;
  }

  await User.deleteMany({ mobile: { $in: [mobile, unique, `91${unique}`] } });

  const first = await ensureUserForMobileAuth(mobile, { name: "OTP Test User" });
  if (!first.isNewUser || !first.user) {
    fail("ensureUserForMobileAuth create", `isNewUser=${first.isNewUser}`);
    await User.deleteMany({ mobile });
    return;
  }

  const second = await ensureUserForMobileAuth(mobile, { name: "Should Not Duplicate" });
  const count = await User.countDocuments({ mobile });
  if (second.isNewUser) {
    fail("ensureUserForMobileAuth duplicate", "second call created another user");
  } else if (String(second.user._id) !== String(first.user._id)) {
    fail("ensureUserForMobileAuth duplicate", "second call returned a different user");
  } else if (count !== 1) {
    fail("ensureUserForMobileAuth duplicate", `expected 1 user, found ${count}`);
  } else {
    pass("ensureUserForMobileAuth duplicate", "same mobile did not create a second user");
  }

  await User.deleteOne({ _id: first.user._id });
}

async function testSendOtp() {
  await clearOtp();
  const result = await createAndSendOtp(TEST_MOBILE);
  if (!result.ok) {
    fail("1. Send OTP", result.error);
    return null;
  }
  const raw = await redisClient.get(REDIS_KEY);
  if (!raw) {
    fail("1. Send OTP", "OTP not stored in Redis");
    return null;
  }
  const record = JSON.parse(raw);
  if (!record.otpHash) {
    fail("1. Send OTP", "Missing otpHash in Redis");
    return null;
  }
  pass(
    "1. Send OTP",
    `stored in Redis, sms.sent=${result.sent}, devOtp=${Boolean(result.otpForDev)}`,
  );
  return result;
}

async function testWrongOtpAndAttempts() {
  await clearOtp();
  const send = await createAndSendOtp(TEST_MOBILE);
  if (!send.ok) {
    fail("4-6. Wrong OTP / attempts", send.error);
    return;
  }

  for (let i = 1; i <= MAX_VERIFY_ATTEMPTS; i++) {
    const v = await verifyOtpCode(TEST_MOBILE, "000000");
    if (i < MAX_VERIFY_ATTEMPTS) {
      if (v.ok) {
        fail(`5. Wrong OTP attempt ${i}`, "Should have failed");
        return;
      }
      if (v.remainingAttempts !== MAX_VERIFY_ATTEMPTS - i) {
        fail(
          `5. Remaining attempts after attempt ${i}`,
          `expected ${MAX_VERIFY_ATTEMPTS - i}, got ${v.remainingAttempts}`,
        );
        return;
      }
    } else {
      if (v.ok) {
        fail("6. Max attempts", "Should have failed on 5th attempt");
        return;
      }
      if (v.remainingAttempts !== 0) {
        fail("6. Max attempts", `remainingAttempts should be 0, got ${v.remainingAttempts}`);
        return;
      }
    }
  }

  const after = await redisClient.get(REDIS_KEY);
  if (after) {
    fail("6. Max attempts", "OTP should be deleted after max failed attempts");
    return;
  }

  const blocked = await verifyOtpCode(TEST_MOBILE, "000000");
  if (blocked.ok || !blocked.error.includes("No OTP found")) {
    fail("6. Max attempts", "Further verification should be blocked");
    return;
  }

  pass("4-6. Wrong OTP / remaining attempts / max attempts", `${MAX_VERIFY_ATTEMPTS} failures invalidate OTP`);
}

async function sendOtpWithMockSms(smsSent = false) {
  const smsPath = require.resolve("../helpers/draft4sms/sendSMS");
  const originalSms = require.cache[smsPath].exports;
  require.cache[smsPath].exports = async () =>
    smsSent
      ? { sent: true, messageId: "test" }
      : { sent: false, error: "Simulated SMS failure for test" };
  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  const svc = require("../helpers/mobileOtpService");
  const result = await svc.createAndSendOtp(TEST_MOBILE);
  require.cache[smsPath].exports = originalSms;
  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  return result;
}

async function testCorrectVerifyAndDelete() {
  await clearOtp();
  const send = await sendOtpWithMockSms(false);
  if (!send.ok || !send.otpForDev) {
    fail("3. Verify correct OTP", "Need dev OTP from send");
    return;
  }
  const v = await verifyOtpCode(TEST_MOBILE, send.otpForDev);
  if (!v.ok) {
    fail("3. Verify correct OTP", v.error);
    return;
  }
  const after = await redisClient.get(REDIS_KEY);
  if (after) {
    fail("10. OTP deleted after login", "Redis key still exists");
    return;
  }
  pass("3. Verify correct OTP + 10. OTP deleted after login", "JWT would be issued by route handler");
}

async function testRandomOtpGeneration() {
  await clearOtp();
  const first = await sendOtpWithMockSms(false);
  await clearOtp();
  const second = await sendOtpWithMockSms(false);
  if (!first.otpForDev || !second.otpForDev) {
    fail("Random OTP generation", "otpForDev missing");
    return;
  }
  if (first.otpForDev === second.otpForDev) {
    fail("Random OTP generation", "Two sends produced the same OTP");
    return;
  }
  pass("Random OTP generation", `codes differ (${first.otpForDev} vs ${second.otpForDev})`);
}

async function testResendCooldown() {
  await clearOtp();
  const first = await createAndSendOtp(TEST_MOBILE);
  if (!first.ok) {
    fail("8-9. Resend cooldown", first.error);
    return;
  }
  const immediate = await createAndSendOtp(TEST_MOBILE, { isResend: true });
  if (immediate.ok) {
    fail("9. Resend cooldown", "Should block resend during cooldown");
    return;
  }
  if (!immediate.retryAfterSeconds && !immediate.error.includes("wait")) {
    fail("9. Resend cooldown", `Expected cooldown error, got: ${immediate.error}`);
    return;
  }
  pass("8-9. Resend cooldown", immediate.error);
}

async function testNewOtpInvalidatesPrevious() {
  const prevEnv = process.env.NODE_ENV;
  const prevDev = process.env.DEV_OTP_FALLBACK;
  process.env.NODE_ENV = "production";
  process.env.DEV_OTP_FALLBACK = "false";

  const smsPath = require.resolve("../helpers/draft4sms/sendSMS");
  const originalSms = require.cache[smsPath].exports;
  require.cache[smsPath].exports = async () => ({ sent: true, messageId: "test" });

  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  const svc = require("../helpers/mobileOtpService");

  await clearOtp();
  const first = await svc.createAndSendOtp(TEST_MOBILE);
  if (!first.ok) {
    fail("Previous OTP invalid on new send", first.error || "Send failed");
    require.cache[smsPath].exports = originalSms;
    process.env.NODE_ENV = prevEnv;
    process.env.DEV_OTP_FALLBACK = prevDev;
    delete require.cache[require.resolve("../helpers/mobileOtpService")];
    return;
  }

  const raw = await redisClient.get(REDIS_KEY);
  const record = JSON.parse(raw);
  const oldHash = record.otpHash;

  record.updatedAt = Date.now() - (RESEND_COOLDOWN_SEC + 1) * 1000;
  await redisClient.set(REDIS_KEY, JSON.stringify(record), { EX: OTP_EXPIRY_SECONDS });

  const second = await svc.createAndSendOtp(TEST_MOBILE);
  if (!second.ok) {
    fail("Previous OTP invalid on new send", second.error);
    require.cache[smsPath].exports = originalSms;
    process.env.NODE_ENV = prevEnv;
    process.env.DEV_OTP_FALLBACK = prevDev;
    delete require.cache[require.resolve("../helpers/mobileOtpService")];
    return;
  }

  const raw2 = await redisClient.get(REDIS_KEY);
  const record2 = JSON.parse(raw2);
  if (record2.otpHash === oldHash) {
    fail("Previous OTP invalid on new send", "New send did not replace OTP hash");
    require.cache[smsPath].exports = originalSms;
    process.env.NODE_ENV = prevEnv;
    process.env.DEV_OTP_FALLBACK = prevDev;
    delete require.cache[require.resolve("../helpers/mobileOtpService")];
    return;
  }

  // Wrong code should fail; stored hash no longer matches arbitrary wrong input
  const oldVerify = await svc.verifyOtpCode(TEST_MOBILE, "000000");
  if (oldVerify.ok) {
    fail("Previous OTP invalid on new send", "Wrong OTP accepted after re-send");
    require.cache[smsPath].exports = originalSms;
    process.env.NODE_ENV = prevEnv;
    process.env.DEV_OTP_FALLBACK = prevDev;
    delete require.cache[require.resolve("../helpers/mobileOtpService")];
    return;
  }

  process.env.NODE_ENV = prevEnv;
  process.env.DEV_OTP_FALLBACK = prevDev;
  require.cache[smsPath].exports = originalSms;
  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  pass("Previous OTP invalid on new send", "New OTP hash replaced previous entry in Redis");
}

async function testRedisSurvivesRestart() {
  await clearOtp();
  const send = await createAndSendOtp(TEST_MOBILE);
  if (!send.ok) {
    fail("11-12. Redis survives restart", send.error);
    return;
  }
  // Simulate restart: fresh redis module connection, key should still exist
  delete require.cache[require.resolve("../config/redisClient")];
  const freshRedis = require("../config/redisClient");
  await freshRedis.ensureRedisConnected();
  const raw = await freshRedis.get(REDIS_KEY);
  if (!raw) {
    fail("11-12. Redis survives restart", "OTP key missing after reconnect");
    return;
  }
  pass("11-12. Redis survives restart", "OTP key persisted in Redis");
}

async function testProductionNoOtpInResponse() {
  const prevEnv = process.env.NODE_ENV;
  const prevDev = process.env.DEV_OTP_FALLBACK;
  process.env.NODE_ENV = "production";
  process.env.DEV_OTP_FALLBACK = "false";

  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  const prodService = require("../helpers/mobileOtpService");

  await clearOtp();
  const send = await prodService.createAndSendOtp(TEST_MOBILE);
  if (send.otpForDev) {
    fail("13. No OTP in production response", "otpForDev was returned");
  } else {
    pass("13. No OTP in production response", "otpForDev omitted");
  }

  process.env.NODE_ENV = prevEnv;
  process.env.DEV_OTP_FALLBACK = prevDev;
  delete require.cache[require.resolve("../helpers/mobileOtpService")];
}

async function testRedisUnavailable() {
  delete require.cache[require.resolve("../config/redisClient")];
  const liveRedis = require("../config/redisClient");
  const originalGet = liveRedis.get.bind(liveRedis);
  liveRedis.get = async () => {
    throw new Error("Simulated Redis down");
  };
  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  const svc = require("../helpers/mobileOtpService");
  const v = await svc.verifyOtpCode(TEST_MOBILE, "123456");
  liveRedis.get = originalGet;
  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  delete require.cache[require.resolve("../config/redisClient")];

  if (v.ok || !v.error.includes("Redis unavailable")) {
    fail("15. Redis unavailable", v.error || "unexpected success");
  } else {
    pass("15. Redis unavailable", v.error);
  }
}

async function testSmsFailure() {
  const originalSend = sendSMS;
  const modPath = require.resolve("../helpers/draft4sms/sendSMS");
  require.cache[modPath].exports = async () => ({
    sent: false,
    error: "Simulated SMS failure",
  });

  delete require.cache[require.resolve("../helpers/mobileOtpService")];
  const svc = require("../helpers/mobileOtpService");

  const prevEnv = process.env.NODE_ENV;
  const prevDev = process.env.DEV_OTP_FALLBACK;
  process.env.NODE_ENV = "production";
  process.env.DEV_OTP_FALLBACK = "false";

  await clearOtp();
  const send = await svc.createAndSendOtp(TEST_MOBILE);
  const leftover = await redisClient.get(REDIS_KEY);

  require.cache[modPath].exports = originalSend;
  process.env.NODE_ENV = prevEnv;
  process.env.DEV_OTP_FALLBACK = prevDev;
  delete require.cache[require.resolve("../helpers/mobileOtpService")];

  if (send.ok) {
    fail("16. SMS provider failure", "Should fail when SMS fails in production");
    return;
  }
  if (leftover) {
    fail("16. SMS provider failure", "OTP should be rolled back from Redis");
    return;
  }
  pass("16. SMS provider failure", send.error);
}

async function testExpiredOtp() {
  await clearOtp();
  const send = await sendOtpWithMockSms(false);
  if (!send.ok || !send.otpForDev) {
    fail("7. Expired OTP", "Send failed");
    return;
  }
  const raw = await redisClient.get(REDIS_KEY);
  const record = JSON.parse(raw);
  record.expiresAt = Date.now() - 1000;
  await redisClient.set(REDIS_KEY, JSON.stringify(record), { EX: 60 });

  const v = await verifyOtpCode(TEST_MOBILE, send.otpForDev);
  if (v.ok) {
    fail("7. Expired OTP", "Expired OTP was accepted");
    return;
  }
  pass("7. Expired OTP", v.error);
}

async function testHttpEndpoints() {
  const http = require("http");
  const port = process.env.PORT || 3003;
  const base = `http://127.0.0.1:${port}`;

  function request(method, path, body) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const req = http.request(
        `${base}${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          },
        },
        (res) => {
          let chunks = "";
          res.on("data", (c) => {
            chunks += c;
          });
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(chunks || "{}") });
            } catch {
              resolve({ status: res.statusCode, body: chunks });
            }
          });
        },
      );
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  }

  try {
    // Resend cooldown (before verify deletes OTP)
    await clearOtp();
    const sendForResend = await request("POST", "/api/otp/send", { mobile: TEST_MOBILE });
    if (sendForResend.status !== 200) {
      fail("HTTP POST /api/otp/send (resend prep)", `status ${sendForResend.status}`);
    } else {
      const resendBlocked = await request("POST", "/api/otp/resend", { mobile: TEST_MOBILE });
      if (resendBlocked.status !== 429 && resendBlocked.status !== 400) {
        fail("HTTP POST /api/otp/resend cooldown", `expected 429/400, got ${resendBlocked.status}: ${JSON.stringify(resendBlocked.body)}`);
      } else if (!String(resendBlocked.body.message || "").toLowerCase().includes("wait")) {
        fail("HTTP POST /api/otp/resend cooldown", resendBlocked.body.message);
      } else {
        pass("HTTP POST /api/otp/resend cooldown", resendBlocked.body.message);
      }
    }

    await clearOtp();
    const sendRes = await request("POST", "/api/otp/send", { mobile: TEST_MOBILE });
    if (sendRes.status !== 200) {
      fail("HTTP POST /api/otp/send", `status ${sendRes.status}: ${JSON.stringify(sendRes.body)}`);
      return;
    }
    pass("HTTP POST /api/otp/send", JSON.stringify(sendRes.body).slice(0, 160));
    if (typeof sendRes.body.isNewUser !== "boolean") {
      fail("HTTP POST /api/otp/send isNewUser", "isNewUser missing from response");
    } else {
      pass("HTTP POST /api/otp/send isNewUser", `isNewUser=${sendRes.body.isNewUser}`);
    }

    const bad = await request("POST", "/api/otp/verify", {
      mobile: TEST_MOBILE,
      otp: "000000",
    });
    if (bad.status !== 401) {
      fail("HTTP POST /api/otp/verify wrong OTP", `status ${bad.status}`);
    } else {
      pass(
        "HTTP POST /api/otp/verify wrong OTP",
        `remainingAttempts=${bad.body.remainingAttempts ?? "n/a (restart server for latest code)"}`,
      );
    }

    const otp = sendRes.body.otpForDev;
    if (!otp) {
      fail("HTTP POST /api/otp/verify success", "SMS sent — check phone for OTP, or disable SMS for dev test");
      return;
    }
    const good = await request("POST", "/api/otp/verify", {
      mobile: TEST_MOBILE,
      otp,
    });
    if (good.status !== 200 || !good.body.token) {
      fail("HTTP POST /api/otp/verify success", `status ${good.status}: ${JSON.stringify(good.body)}`);
    } else {
      pass("HTTP POST /api/otp/verify success", `token received, user=${good.body.user?.name}`);
    }
  } catch (err) {
    fail("HTTP endpoints", `Server not reachable on port ${port}: ${err.message}`);
  }
}

async function main() {
  console.log("\n=== OTP Flow Tests ===\n");
  console.log(`Mobile: ${TEST_MOBILE} -> ${TEST_MOBILE_NORM}`);
  console.log(`OTP expiry: ${OTP_EXPIRY_SECONDS}s, max attempts: ${MAX_VERIFY_ATTEMPTS}, resend cooldown: ${RESEND_COOLDOWN_SEC}s\n`);

  if (!process.env.MONGODB_ATLAS) {
    console.error("MONGODB_ATLAS not set");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_ATLAS.trim());
  await ensureRedisConnected();

  await ensureTestUser();
  await testEnsureUserForMobileAuth();
  await testSendOtp();
  await testRandomOtpGeneration();
  await testCorrectVerifyAndDelete();
  await testWrongOtpAndAttempts();
  await testExpiredOtp();
  await testResendCooldown();
  await testNewOtpInvalidatesPrevious();
  await testRedisSurvivesRestart();
  await testProductionNoOtpInResponse();
  await testRedisUnavailable();
  await testSmsFailure();
  await testHttpEndpoints();

  await clearOtp();
  await mongoose.disconnect();
  if (redisClient.isOpen) await redisClient.quit();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});

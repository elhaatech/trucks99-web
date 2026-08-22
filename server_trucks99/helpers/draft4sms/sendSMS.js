"use strict";

require("dotenv").config();
const https = require("https");

function getDraft4SmsConfig() {
  return {
    apiBase: (
      process.env.DRAFT4SMS_API_URL || "https://text.draft4sms.com/vb/apikey.php"
    ).trim(),
    apiKey: (
      process.env.DRAFT4SMS_API_KEY || process.env.SMS_API_KEY || ""
    ).trim(),
    senderId: (
      process.env.DRAFT4SMS_SENDER_ID ||
      process.env.SMS_SENDER_ID ||
      "TRUKXX"
    ).trim(),
    timeoutMs: Number(process.env.DRAFT4SMS_TIMEOUT_MS || 10000),
  };
}

function toTenDigitMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 10) return digits;
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function isDraft4SmsConfigured() {
  const { apiKey, senderId } = getDraft4SmsConfig();
  return Boolean(apiKey && senderId);
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode || 0, body: data });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Draft4SMS request timed out after ${timeoutMs}ms`));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function parseDraft4SmsResponse(responseText) {
  const raw = String(responseText || "").trim();
  if (!raw) {
    return { ok: false, error: "Empty response from Draft4SMS" };
  }

  try {
    const parsed = JSON.parse(raw);
    const status = parsed.status ?? parsed.Status ?? parsed.success;
    const errorCode = String(
      parsed.ErrorCode ?? parsed.errorCode ?? parsed.code ?? "",
    );
    const ok =
      status === true ||
      status === "true" ||
      status === "success" ||
      status === "Success" ||
      status === 1 ||
      status === "1" ||
      String(status).toLowerCase() === "ok" ||
      errorCode === "000" ||
      errorCode === "0";

    if (ok) {
      return {
        ok: true,
        messageId:
          parsed.messageId ||
          parsed.msgid ||
          parsed.id ||
          parsed.description ||
          raw,
      };
    }

    const error =
      parsed.description ||
      parsed.message ||
      parsed.msg ||
      parsed.error ||
      `Draft4SMS error (code: ${parsed.code || "unknown"})`;
    return { ok: false, error, code: parsed.code };
  } catch {
    const lower = raw.toLowerCase();
    if (
      lower.includes("invalid api") ||
      lower.includes("invalid key") ||
      lower.includes("insufficient") ||
      lower.includes("failed") ||
      lower.includes("error")
    ) {
      return { ok: false, error: raw };
    }
    if (
      lower.includes("success") ||
      lower.includes("sent") ||
      lower.includes("submitted") ||
      /^\d+$/.test(raw)
    ) {
      return { ok: true, messageId: raw };
    }
    // HTTP 200 with a non-error gateway message is treated as accepted
    return { ok: true, messageId: raw };
  }
}

/**
 * Send SMS via Draft4SMS HTTP API.
 * @returns {{ sent: boolean, messageId?: string, error?: string, code?: string }}
 */
async function sendSMS(to, body) {
  if (!to || !String(body).trim()) {
    return { sent: false, error: "Invalid recipient or empty message body" };
  }

  const { apiBase, apiKey, senderId, timeoutMs } = getDraft4SmsConfig();
  if (!apiKey || !senderId) {
    console.warn(
      "[Draft4SMS] Not configured. Set DRAFT4SMS_API_KEY and DRAFT4SMS_SENDER_ID in .env",
    );
    return { sent: false, error: "Draft4SMS not configured" };
  }

  const number = toTenDigitMobile(to);
  if (!/^\d{10}$/.test(number)) {
    return { sent: false, error: "Invalid mobile number" };
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    senderid: senderId,
    number,
    message: String(body).trim(),
  });

  const url = `${apiBase}?${params.toString()}`;

  try {
    const { statusCode, body: responseBody } = await httpGet(url, timeoutMs);
    const responseText = String(responseBody || "").trim();
    const parsed = parseDraft4SmsResponse(responseText);

    if (statusCode < 200 || statusCode >= 300) {
      console.warn(
        `[Draft4SMS] HTTP ${statusCode} for ${number}:`,
        parsed.error || responseText,
      );
      return {
        sent: false,
        error: parsed.error || responseText || `SMS send failed (HTTP ${statusCode})`,
        code: parsed.code,
      };
    }

    if (!parsed.ok) {
      console.warn(
        `[Draft4SMS] Rejected for ${number}:`,
        parsed.error || responseText,
      );
      return {
        sent: false,
        error: parsed.error || "Draft4SMS rejected the SMS request",
        code: parsed.code,
      };
    }

    console.log(`[Draft4SMS] Accepted for ${number} — response: ${responseText}`);
    return {
      sent: true,
      messageId: parsed.messageId || responseText || "ok",
      providerResponse: responseText,
    };
  } catch (err) {
    console.warn("[Draft4SMS] Failed:", err.message);
    return { sent: false, error: err.message || "SMS send failed" };
  }
}

module.exports = sendSMS;
module.exports.isDraft4SmsConfigured = isDraft4SmsConfigured;
module.exports.toTenDigitMobile = toTenDigitMobile;
module.exports.parseDraft4SmsResponse = parseDraft4SmsResponse;

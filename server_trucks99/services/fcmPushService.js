"use strict";

const FcmToken = require("../schema/firebaseusear");
const User = require("../schema/user");
const sendNotification = require("../Firebase/firebase");
const { resolveToObjectId } = require("../helpers/uuidHelper");

async function resolveUserObjectId(userId) {
  if (!userId) return null;
  return resolveToObjectId(User, String(userId));
}

function maskToken(token) {
  if (!token) return "(empty)";
  return `${String(token).slice(0, 12)}...`;
}

/**
 * Low-level send to a single FCM device token.
 * Matches React Native app expectations (trucks99_default channel, string data map).
 */
async function sendPushToToken(fcmToken, { title, body, data = {} } = {}) {
  console.log("[FCM][fcmPushService] sendPushToToken →", {
    token: maskToken(fcmToken),
    title: title || "Trucks99",
    body: body || "",
    dataType: data?.type,
  });

  if (!sendNotification.firebaseReady) {
    console.error("[FCM][fcmPushService] FAIL — Firebase not configured");
    return { sent: false, error: "Firebase not configured" };
  }
  if (!fcmToken) {
    console.error("[FCM][fcmPushService] FAIL — FCM token missing");
    return { sent: false, error: "FCM token missing" };
  }

  const result = await sendNotification(
    fcmToken,
    title || "Trucks99",
    body || "",
    buildPushOptions({ data, type: data?.type, route: data?.route }),
  );

  if (result?.success) {
    console.log("[FCM][fcmPushService] sendPushToToken OK →", {
      token: maskToken(fcmToken),
      messageId: result.message,
    });
    return { sent: true, messageId: result.message };
  }

  console.error("[FCM][fcmPushService] sendPushToToken FAIL →", {
    token: maskToken(fcmToken),
    error: result?.message,
    code: result?.code,
  });

  return {
    sent: false,
    error: result?.message || "Push failed",
    code: result?.code || null,
    invalidToken: result?.invalidToken || false,
  };
}

function buildPushOptions(options = {}) {
  const productId = options.productId != null ? String(options.productId) : "";
  const postId = options.postId != null ? String(options.postId) : "";
  const requestId =
    options.requestId != null
      ? String(options.requestId)
      : options.bitRecordId != null
        ? String(options.bitRecordId)
        : "";

  return {
    ...options,
    type: options.type || "GENERAL",
    postId,
    productId,
    requestId,
    bitRecordId: requestId,
    entityId: options.entityId || postId || productId,
    entityType: options.entityType || options.postType || "",
    route: options.route || "/admin/portal/notifications",
  };
}

/**
 * Sends a push notification to every active FCM token for a user.
 * Invalid tokens are deactivated; successful sends update lastUsed.
 */
async function sendPushToUser(userId, title, body, options = {}) {
  const userOid = await resolveUserObjectId(userId);
  if (!userOid) {
    console.error("[FCM][fcmPushService] FAIL — user not found:", userId);
    return { sent: false, error: "User not found" };
  }

  if (!sendNotification.firebaseReady) {
    console.error("[FCM][fcmPushService] FAIL — Firebase not configured");
    return { sent: false, error: "Firebase not configured" };
  }

  const tokenDocs = await FcmToken.find({ userId: userOid, isActive: true })
    .sort({ lastUsed: -1 })
    .lean();

  console.log("[FCM][fcmPushService] sendPushToUser →", {
    userId: String(userOid),
    title,
    body,
    fcmType: options?.type,
    productId: options?.productId,
    requestId: options?.requestId,
    tokenCount: tokenDocs.length,
    tokens: tokenDocs.map((t) => ({
      prefix: maskToken(t.token),
      platform: t.platform,
      device: t.device,
    })),
  });

  if (!tokenDocs.length) {
    console.warn("[FCM][fcmPushService] FAIL — no active FCM token for user", String(userOid));
    return { sent: false, error: "No FCM token" };
  }

  const pushOptions = buildPushOptions(options);

  const perToken = await Promise.all(
    tokenDocs.map(async (tokenDoc) => {
      const result = await sendNotification(tokenDoc.token, title, body, pushOptions);
      if (!result?.success && result?.invalidToken) {
        console.warn("[FCM][fcmPushService] deactivating invalid token →", maskToken(tokenDoc.token));
        FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { isActive: false } }).catch(
          (err) =>
            console.error("[fcmPushService] failed to deactivate dead token:", err.message),
        );
      } else if (result?.success) {
        FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { lastUsed: new Date() } }).catch(
          () => {},
        );
      } else if (!result?.success) {
        console.error("[FCM][fcmPushService] token send failed →", {
          userId: String(userOid),
          token: maskToken(tokenDoc.token),
          error: result?.message || result?.code || "unknown",
        });
      }
      return result;
    }),
  );

  const anySent = perToken.some((r) => r?.success);
  const firstError = perToken.find((r) => !r?.success);

  const outcome = anySent
    ? {
        sent: true,
        messageId: perToken.find((r) => r.success)?.message,
        deviceCount: tokenDocs.length,
      }
    : { sent: false, error: firstError?.message || "Push failed" };

  console.log("[FCM][fcmPushService] sendPushToUser result →", {
    userId: String(userOid),
    sent: outcome.sent,
    error: outcome.error || null,
    deviceCount: tokenDocs.length,
    messageId: outcome.messageId || null,
  });

  return outcome;
}

/**
 * Registers or updates an FCM token for the authenticated user.
 */
async function saveFcmToken({ userId, token, device, platform }) {
  if (!userId) {
    return { ok: false, status: 401, message: "Unauthorized: Missing user ID" };
  }
  if (!token) {
    return { ok: false, status: 400, message: "Token missing" };
  }

  const updatedToken = await FcmToken.findOneAndUpdate(
    { token },
    {
      $set: {
        userId,
        device: device || "mobile",
        platform: platform || "mobile",
        isActive: true,
        lastUsed: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  console.log("[FCM][fcmPushService] token saved →", {
    userId: String(userId),
    token: maskToken(token),
    device: device || "mobile",
    platform: platform || "mobile",
  });

  return { ok: true, data: updatedToken };
}

module.exports = {
  sendPushToToken,
  sendPushToUser,
  saveFcmToken,
};

"use strict";

const FcmToken = require("../schema/firebaseusear");
const User = require("../schema/user");
const sendNotification = require("../Firebase/firebase");
const { resolveToObjectId } = require("../helpers/uuidHelper");

async function resolveUserObjectId(userId) {
  if (!userId) return null;
  return resolveToObjectId(User, String(userId));
}

/**
 * Sends a push notification to every active FCM token for a user.
 * Invalid tokens are deactivated; successful sends update lastUsed.
 */
async function sendPushToUser(userId, title, body, options = {}) {
  const userOid = await resolveUserObjectId(userId);
  if (!userOid) {
    return { sent: false, error: "User not found" };
  }

  if (!sendNotification.firebaseReady) {
    return { sent: false, error: "Firebase not configured" };
  }

  const tokenDocs = await FcmToken.find({ userId: userOid, isActive: true })
    .sort({ lastUsed: -1 })
    .lean();

  if (!tokenDocs.length) {
    return { sent: false, error: "No FCM token" };
  }

  const perToken = await Promise.all(
    tokenDocs.map(async (tokenDoc) => {
      const result = await sendNotification(tokenDoc.token, title, body, options);
      if (!result?.success && result?.invalidToken) {
        FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { isActive: false } }).catch(
          (err) =>
            console.error("[fcmPushService] failed to deactivate dead token:", err.message),
        );
      } else if (result?.success) {
        FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { lastUsed: new Date() } }).catch(
          () => {},
        );
      }
      return result;
    }),
  );

  const anySent = perToken.some((r) => r?.success);
  const firstError = perToken.find((r) => !r?.success);

  return anySent
    ? {
        sent: true,
        messageId: perToken.find((r) => r.success)?.message,
        deviceCount: perToken.length,
      }
    : { sent: false, error: firstError?.message || "Push failed" };
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

  return { ok: true, data: updatedToken };
}

module.exports = {
  sendPushToUser,
  saveFcmToken,
};

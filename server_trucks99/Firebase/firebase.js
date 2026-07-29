const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "..", "firebase-service-account.json");

let firebaseReady = false;

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8"),
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseReady = true;
    } catch (err) {
      console.error(
        "[Firebase] Failed to initialize from",
        serviceAccountPath,
        err?.message || err,
      );
    }
  } else {
    console.warn(
      "[Firebase] Service account not found at",
      serviceAccountPath,
      "— push notifications disabled until the file is present.",
    );
  }
} else {
  firebaseReady = true;
}

// Send notification to a single device.
// IMPORTANT: We use DATA-ONLY messages (no `notification` field) to avoid duplicates.
// If we send both `notification` (OS auto tray) AND your app also displays via notifee,
// the user can see the same message twice.
const sendNotification = async (token, title, body, options = {}) => {
  if (!firebaseReady) {
    return { success: false, message: "Firebase not configured" };
  }
  const {
    route = "/admin/portal",
    type = "GENERAL",
    id = "",
  } = options || {};
  try {
    const message = {
      // Send both notification + data so web gets tray notifications even when app is closed.
      notification: {
        title: String(title ?? ""),
        body: String(body ?? ""),
      },
      data: {
        type: String(type || "GENERAL"),
        id: String(id || ""),
        route: String(route || "/admin/portal"),
        title: String(title ?? ""),
        body: String(body ?? ""),
      },
      webpush: {
        notification: {
          title: String(title ?? ""),
          body: String(body ?? ""),
          requireInteraction: false,
        },
        fcmOptions: {
          link: String(route || "/admin/portal"),
        },
      },
      token,
    };

    const response = await admin.messaging().send(message);
    console.log("Notification sent:", response);
    return { success: true, message: response };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, message: "Error sending notification" };
  }
};

const publishLoadBidEvent = async ({
  loadId,
  eventType,
  bitRecordId,
  bidAmount,
  bidderUserId,
  bidderName,
  status,
}) => {
  if (!firebaseReady || !loadId) return;
  try {
    await admin.firestore().collection("realtime_load_bids").doc(String(loadId)).set(
      {
        loadId: String(loadId),
        eventType: eventType || "updated",
        bitRecordId: bitRecordId ? String(bitRecordId) : null,
        bidAmount: bidAmount != null ? Number(bidAmount) : null,
        bidderUserId: bidderUserId ? String(bidderUserId) : null,
        bidderName: bidderName || null,
        status: status || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Error publishing realtime bid event:", error?.message || error);
  }
};

sendNotification.sendNotification = sendNotification;
sendNotification.publishLoadBidEvent = publishLoadBidEvent;
sendNotification.admin = admin;
sendNotification.firebaseReady = firebaseReady;

module.exports = sendNotification;

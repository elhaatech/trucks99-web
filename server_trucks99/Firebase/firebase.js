const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json"); // your downloaded key
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}


// Send notification to a single device.
// IMPORTANT: We use DATA-ONLY messages (no `notification` field) to avoid duplicates.
// If we send both `notification` (OS auto tray) AND your app also displays via notifee,
// the user can see the same message twice.
const sendNotification = async (token, title, body, options = {}) => {
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
    if (!loadId) return;
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
            { merge: true }
        );
    } catch (error) {
        console.warn("Error publishing realtime bid event:", error?.message || error);
    }
};

sendNotification.sendNotification = sendNotification;
sendNotification.publishLoadBidEvent = publishLoadBidEvent;
sendNotification.admin = admin;

module.exports = sendNotification;

const sendMultiple = async (tokens) => {
    const message = {
        notification: {
            title: "Bulk Notification",
            body: "Hello all users!",
        },
        tokens: tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(response);
};


// const express = require("express");
// const sendNotification = require("./sendNotification");

// const app = express();
// app.use(express.json());

// app.post("/send", async (req, res) => {
//   const { token } = req.body;

//   if (!token) {
//     return res.status(400).json({ message: "Token required" });
//   }

//   await sendNotification(token);

//   res.json({ message: "Notification sent successfully" });
// });

// app.listen(3000, () => {
//   console.log("Server running on port 3000");
// });


const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

let firebaseReady = false;
let initError = null;

function parseJsonCredentials(raw, sourceLabel) {
  if (!raw || !String(raw).trim()) return null;
  try {
    return JSON.parse(String(raw).trim());
  } catch (err) {
    throw new Error(`${sourceLabel} is not valid JSON: ${err.message}`);
  }
}

function loadServiceAccountFromEnv() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    return parseJsonCredentials(inlineJson, "FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  const base64Json = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Json) {
    const decoded = Buffer.from(String(base64Json).trim(), "base64").toString("utf8");
    return parseJsonCredentials(decoded, "FIREBASE_SERVICE_ACCOUNT_BASE64");
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      type: "service_account",
      project_id: projectId,
      client_email: clientEmail,
      private_key: String(privateKey).replace(/\\n/g, "\n"),
    };
  }

  return null;
}

const DEFAULT_SERVICE_ACCOUNT_CANDIDATES = [
  "firebase-service-account.json",
  "firebase-service-account..json",
];

function loadServiceAccountFromFile() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = explicitPath
    ? [explicitPath]
    : DEFAULT_SERVICE_ACCOUNT_CANDIDATES.map((name) =>
        path.join(__dirname, "..", name),
      );

  for (const serviceAccountPath of candidates) {
    if (!fs.existsSync(serviceAccountPath)) continue;

    const raw = fs.readFileSync(serviceAccountPath, "utf8");
    return {
      credentials: parseJsonCredentials(raw, serviceAccountPath),
      path: serviceAccountPath,
    };
  }

  return { credentials: null, path: candidates[0] };
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    firebaseReady = true;
    return;
  }

  try {
    const envCredentials = loadServiceAccountFromEnv();
    if (envCredentials) {
      admin.initializeApp({
        credential: admin.credential.cert(envCredentials),
      });
      firebaseReady = true;
      console.log("[Firebase] Admin SDK initialized from environment credentials");
      return;
    }

    const fileResult = loadServiceAccountFromFile();
    if (fileResult.credentials) {
      admin.initializeApp({
        credential: admin.credential.cert(fileResult.credentials),
      });
      firebaseReady = true;
      console.log("[Firebase] Admin SDK initialized from", fileResult.path);
      return;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      firebaseReady = true;
      console.log(
        "[Firebase] Admin SDK initialized with application default credentials",
      );
      return;
    }

    console.warn(
      "[Firebase] Admin SDK not configured — push notifications disabled.",
      "Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY,",
      "FIREBASE_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS.",
      fileResult.path ? `Expected file not found: ${fileResult.path}` : "",
    );
  } catch (err) {
    initError = err;
    console.error("[Firebase] Failed to initialize Admin SDK:", err?.message || err);
  }
}

initializeFirebaseAdmin();

const isInvalidTokenError = (code) => INVALID_TOKEN_CODES.has(code);

const ANDROID_CHANNEL_ID =
  process.env.FCM_ANDROID_CHANNEL_ID || "trucks99_default";
const DEFAULT_PUSH_TITLE = "Trucks99";

function stringifyFcmData(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)]),
  );
}

function buildFcmMessage(token, title, body, options = {}) {
  const notificationTitle = String(title || DEFAULT_PUSH_TITLE);
  const notificationBody = String(body || "");

  const dataPayload = stringifyFcmData({
    title: notificationTitle,
    body: notificationBody,
    type: options.type || "GENERAL",
    id: options.id || options.postId || options.productId || "",
    postId: options.postId || options.id || "",
    productId: options.productId || "",
    requestId: options.requestId || options.bitRecordId || "",
    bitRecordId: options.bitRecordId || options.requestId || "",
    postType: options.postType || "",
    entityType: options.entityType || options.postType || "",
    entityId: options.entityId || options.postId || options.productId || "",
    status: options.status || "",
    route: options.route || "/admin/portal/notifications",
    bidAmount: options.bidAmount || "",
    bidderId: options.bidderId || "",
    bidderName: options.bidderName || "",
    ownerId: options.ownerId || "",
    bitReason: options.bitReason || "",
    rejectionType: options.rejectionType || "",
    ...(options.data || {}),
  });

  const message = {
    token,
    notification: {
      title: notificationTitle,
      body: notificationBody,
    },
    android: {
      priority: "high",
      notification: {
        channelId: ANDROID_CHANNEL_ID,
        sound: "default",
        title: notificationTitle,
        body: notificationBody,
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: notificationTitle,
            body: notificationBody,
          },
          sound: "default",
        },
      },
    },
    data: dataPayload,
  };

  if (options.route) {
    message.webpush = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
        requireInteraction: false,
      },
      fcmOptions: {
        link: String(options.route),
      },
    };
  } else {
    message.webpush = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
        requireInteraction: false,
      },
    };
  }

  return message;
}

// Send notification to a single device (mobile + web).
const sendNotification = async (token, title, body, options = {}) => {
  if (!firebaseReady) {
    return { success: false, message: "Firebase not configured" };
  }

  if (!token) {
    return { success: false, message: "FCM token missing" };
  }

  try {
    const message = buildFcmMessage(token, title, body, options);
    console.log("[FCM][Firebase] sending →", {
      token: token ? `${token.slice(0, 12)}...` : "(empty)",
      title: message.notification?.title,
      body: message.notification?.body,
      channelId: message.android?.notification?.channelId,
      data: message.data,
    });
    const response = await admin.messaging().send(message);
    console.log("[FCM][Firebase] sent OK → messageId:", response);
    return { success: true, message: response };
  } catch (error) {
    const code = error?.code || null;
    console.error("[FCM][Firebase] send FAILED →", code || error?.message || error);
    console.error("[FCM][Firebase] token prefix:", token ? `${token.slice(0, 12)}...` : "(empty)");
    return {
      success: false,
      message: error?.message || "Error sending notification",
      code,
      invalidToken: isInvalidTokenError(code),
    };
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
    await admin
      .firestore()
      .collection("realtime_load_bids")
      .doc(String(loadId))
      .set(
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
    console.warn("[Firebase] Realtime bid publish failed:", error?.message || error);
  }
};

sendNotification.sendNotification = sendNotification;
sendNotification.buildFcmMessage = buildFcmMessage;
sendNotification.stringifyFcmData = stringifyFcmData;
sendNotification.publishLoadBidEvent = publishLoadBidEvent;
sendNotification.isInvalidTokenError = isInvalidTokenError;
sendNotification.admin = admin;
Object.defineProperty(sendNotification, "firebaseReady", {
  get: () => firebaseReady,
});
sendNotification.initError = initError;

module.exports = sendNotification;

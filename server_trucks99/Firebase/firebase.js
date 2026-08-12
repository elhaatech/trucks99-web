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

function loadServiceAccountFromFile() {
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, "..", "firebase-service-account.json");

  if (!fs.existsSync(serviceAccountPath)) {
    return { credentials: null, path: serviceAccountPath };
  }

  const raw = fs.readFileSync(serviceAccountPath, "utf8");
  return {
    credentials: parseJsonCredentials(raw, serviceAccountPath),
    path: serviceAccountPath,
  };
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

// Send notification to a single device.
// Web clients receive both data + notification payloads for tray display and deep-linking.
const sendNotification = async (token, title, body, options = {}) => {
  if (!firebaseReady) {
    return { success: false, message: "Firebase not configured" };
  }

  const {
    route = "/admin/portal",
    type = "GENERAL",
    id = "",
    postId = "",
    requestId = "",
    postType = "",
    status = "",
  } = options || {};

  const message = {
    data: {
      type: String(type || "GENERAL"),
      id: String(id || postId || ""),
      postId: String(postId || id || ""),
      requestId: String(requestId || ""),
      postType: String(postType || ""),
      status: String(status || ""),
      route: String(route || "/admin/portal"),
      title: String(title || ""),
      body: String(body || ""),
    },
    token,
  };

  if (title || body) {
    message.notification = {
      title: String(title || ""),
      body: String(body || ""),
    };
    message.webpush = {
      notification: {
        title: String(title || ""),
        body: String(body || ""),
        requireInteraction: false,
      },
      fcmOptions: {
        link: String(route || "/admin/portal"),
      },
    };
  }

  try {
    const response = await admin.messaging().send(message);
    console.log("[Firebase] Notification sent. Message ID:", response);
    return { success: true, message: response };
  } catch (error) {
    const code = error?.code || null;
    console.error("[Firebase] Send failed:", code || error?.message || error);
    console.error("[Firebase] Token prefix:", token ? `${token.slice(0, 12)}...` : "(empty)");
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
sendNotification.publishLoadBidEvent = publishLoadBidEvent;
sendNotification.isInvalidTokenError = isInvalidTokenError;
sendNotification.admin = admin;
sendNotification.firebaseReady = firebaseReady;
sendNotification.initError = initError;

module.exports = sendNotification;

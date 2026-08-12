const express = require("express");
const User = require("../schema/user");
const { sendPushToUser, saveFcmToken } = require("../services/fcmPushService");

const firebaseSendMessageRouter = express.Router();

const isFirebaseTestEndpointEnabled = () =>
  process.env.ENABLE_FIREBASE_TEST_ENDPOINT === "true" ||
  process.env.NODE_ENV !== "production";

const firebaseSendMessage = async (req, res) => {
  try {
    const { title, body } = req.body;
    const result = await sendPushToUser(req.user._id, title, body);

    if (!result.sent) {
      const status = result.error === "No FCM token" ? 400 : 503;
      return res.status(status).json({ message: result.error || "Push failed" });
    }

    res.status(200).json({
      message: `Message sent successfully to ${result.deviceCount || 1} device(s)`,
      deviceCount: result.deviceCount || 1,
    });
  } catch (error) {
    console.error("[FCM] firebase-send-message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const testFirebaseEasy = async (req, res) => {
  if (!isFirebaseTestEndpointEnabled()) {
    return res.status(404).json({ message: "Not found" });
  }

  try {
    const { mobile, title, body } = req.body;

    if (!mobile) {
      return res
        .status(400)
        .json({ message: "Please provide a mobile number in the JSON body." });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: `User with mobile ${mobile} not found.` });
    }

    const result = await sendPushToUser(
      user._id,
      title || "Test",
      body || "Testing easy endpoint",
    );

    if (!result.sent) {
      const status = result.error === "No FCM token" ? 400 : 503;
      return res.status(status).json({ message: result.error || "Push failed" });
    }

    res.status(200).json({
      message: `Test message sent to ${result.deviceCount || 1} device(s) for user ${mobile}`,
      deviceCount: result.deviceCount || 1,
    });
  } catch (error) {
    console.error("[FCM] test-firebase-easy error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

firebaseSendMessageRouter.post("/firebase/save-token", async (req, res) => {
  try {
    const { token, device, platform } = req.body;
    const result = await saveFcmToken({
      userId: req.user?._id,
      token,
      device,
      platform,
    });

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json({
      message: "Token saved successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("[FCM] Save token error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

firebaseSendMessageRouter.post("/firebase-send-message", firebaseSendMessage);
firebaseSendMessageRouter.post("/test-firebase-easy", testFirebaseEasy);

module.exports = firebaseSendMessageRouter;

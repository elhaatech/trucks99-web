const express = require('express');
const FcmToken = require("../schema/firebaseusear"); // your schema
const sendNotification = require('../Firebase/firebase');
const firebaseSendMessageRouter = express.Router();

console.log("sendNotification", sendNotification);


const firebaseSendMessage = async (req, res) => {
    try {
        const {  title, body } = req.body;
        const token = await FcmToken.findOne({ userId: req.user._id });
        if (!token?.token || !token?.isActive) {
            return res.status(400).json({ message: "Token not found" });
        }


        const response = await sendNotification(token.token, title, body);
        console.log("response", response);
        res.status(200).json({ message: "Message sent successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};





firebaseSendMessageRouter.post("/firebase/save-token", async (req, res) => {
    console.log("[FCM] /firebase/save-token called!");
    console.log("[FCM] req.body:", req.body);
    console.log("[FCM] req.user:", req.user ? req.user._id : "User is not logged in!");

    try {
        const { token, device, platform } = req.body;
        const userId = req.user?._id;

        if (!userId) {
             console.error("[FCM] Missing user ID! Request not authenticated.");
             return res.status(401).json({ message: "Unauthorized: Missing user ID" });
        }

        if (!token) {
            console.error("[FCM] Token missing from request body!");
            return res.status(400).json({ message: "Token missing" });
        }

        const updatedToken = await FcmToken.findOneAndUpdate(
            { token }, // 🔍 check if token already exists
            {
                $set: {
                    userId,
                    device: device || "mobile",
                    platform: platform || "mobile",
                    isActive: true,
                    lastUsed: new Date(),
                },
            },
            {
                upsert: true, // ✅ create if not exists
                new: true,    // return updated document
            }
        );

        console.log("[FCM] Token saved successfully in DB:", updatedToken.token.substring(0, 10) + "...");
        res.json({
            message: "Token saved successfully",
            data: updatedToken,
        });

    } catch (error) {
        console.error("[FCM] Save token error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

firebaseSendMessageRouter.post('/firebase-send-message', firebaseSendMessage);

module.exports = firebaseSendMessageRouter;
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
    try {
        const { token, device, platform } = req.body;
        const userId = req.user._id;

        if (!token) {
            return res.status(400).json({ message: "Token missing" });
        }

        const updatedToken = await FcmToken.findOneAndUpdate(
            { token }, // 🔍 check if token already exists
            {
                $set: {
                    userId,
                    device: device || "web",
                    platform: platform || "web",
                    isActive: true,
                    lastUsed: new Date(),
                },
            },
            {
                upsert: true, // ✅ create if not exists
                new: true,    // return updated document
            }
        );

        res.json({
            message: "Token saved successfully",
            data: updatedToken,
        });

    } catch (error) {
        console.error("Save token error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

firebaseSendMessageRouter.post('/firebase-send-message', firebaseSendMessage);

module.exports = firebaseSendMessageRouter;
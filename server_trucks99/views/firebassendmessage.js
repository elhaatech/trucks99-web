const express = require('express');
const FcmToken = require("../schema/firebaseusear"); // your schema
const sendNotification = require('../Firebase/firebase');
const firebaseSendMessageRouter = express.Router();

console.log("sendNotification", sendNotification);


const firebaseSendMessage = async (req, res) => {
    try {
        const {  title, body } = req.body;
        
        // Find all active tokens for the user
        const tokens = await FcmToken.find({ userId: req.user._id, isActive: true }).sort({ lastUsed: -1 }).lean();
        
        if (!tokens || tokens.length === 0) {
            return res.status(400).json({ message: "No active FCM tokens found for user" });
        }

        let sentCount = 0;
        
        // Send to all active tokens (devices)
        await Promise.all(tokens.map(async (tokenDoc) => {
            if (tokenDoc?.token) {
                const response = await sendNotification(tokenDoc.token, title, body);
                if (response?.success) {
                    sentCount++;
                    // Update lastUsed
                    FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { lastUsed: new Date() } }).catch(() => {});
                } else if (response?.invalidToken) {
                     // Deactivate invalid tokens
                     FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { isActive: false } }).catch(() => {});
                }
            }
        }));

        res.status(200).json({ message: `Message sent successfully to ${sentCount} devices` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Easy test endpoint for Postman (no login token required)
const testFirebaseEasy = async (req, res) => {
    try {
        const { mobile, title, body } = req.body;
        
        if (!mobile) {
            return res.status(400).json({ message: "Please provide a mobile number in the JSON body." });
        }

        // Find the user by mobile
        const User = require('../schema/user');
        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(404).json({ message: `User with mobile ${mobile} not found.` });
        }

        // Find all active tokens for this user
        const tokens = await FcmToken.find({ userId: user._id, isActive: true }).sort({ lastUsed: -1 }).lean();
        
        if (!tokens || tokens.length === 0) {
            return res.status(400).json({ message: `No active FCM tokens found for user ${mobile}` });
        }

        let sentCount = 0;
        
        // Send to all active tokens
        await Promise.all(tokens.map(async (tokenDoc) => {
            if (tokenDoc?.token) {
                const response = await sendNotification(tokenDoc.token, title || "Test", body || "Testing easy endpoint");
                if (response?.success) {
                    sentCount++;
                    FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { lastUsed: new Date() } }).catch(() => {});
                } else if (response?.invalidToken) {
                     FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { isActive: false } }).catch(() => {});
                }
            }
        }));

        res.status(200).json({ message: `Test Message sent successfully to ${sentCount} devices for user ${mobile}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
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

firebaseSendMessageRouter.post('/test-firebase-easy', testFirebaseEasy);
module.exports = firebaseSendMessageRouter;
# Firebase Push Notifications (FCM) Implementation

This document outlines the architecture, flow, and integration of Firebase Cloud Messaging (FCM) push notifications across the iTruck platform, specifically focusing on the Truck/Load Request (Bid) flow.

## 1. Architecture Overview

### Backend (`server_trucks99`)
*   **FCM Admin Configuration**: Handled in `Firebase/firebase.js`. It utilizes the `firebase-service-account.json` to authenticate via the Firebase Admin SDK.
*   **Notification Dispatcher**: `services/notificationService.js` is the centralized brain for notifications. It supports multi-channel dispatch (In-App, Push, SMS, Email, WhatsApp).
*   **Business Logic Hooks**: `services/bitService.js` dispatches events (`NEW_REQUEST`, `REQUEST_ACCEPTED`, `REQUEST_REJECTED`) dynamically when a load/truck request is created, accepted, or rejected.
*   **Database Schemas**:
    *   `schema/firebaseusear.js` (`FcmToken`): Stores the user's active FCM device tokens.
    *   `schema/notification.js` (`Notification`): Stores the persistent history of notifications (including structured deep-link metadata like `postId`, `requestId`, `senderId`).

### Frontend (`itruck_user_portal`)
*   **Firebase SDK**: Configured via the Modular Web SDK in `lib/firebase.ts`.
*   **Push Hook (`useFirebasePush.ts`)**: 
    *   Requests notification permissions from the browser.
    *   Retrieves the FCM token using the Web Push VAPID key.
    *   Sends the token to the backend for storage.
    *   Listens for active foreground messages (triggers a UI toast).
*   **Service Worker (`firebase-messaging-sw.js`)**: Runs in the background to receive push notifications when the app is closed. If the user clicks the notification, it navigates them directly to the relevant Truck/Load Post.
*   **Global Provider (`FirebasePushProvider.tsx`)**: Placed inside the `ThemeRegistry` so it runs continuously in the background across all pages.

---

## 2. Notification Events for Truck/Load Requests

We implemented structured JSON push notifications that carry context. 

| Action | Dispatch Event | Recipient | Example Notification Body |
| :--- | :--- | :--- | :--- |
| User creates request | `NEW_REQUEST` | Post Owner | "Your load post received a new request from Ravi." |
| Post Owner accepts | `REQUEST_ACCEPTED`| Requesting User | "Your request for this load has been accepted by the post owner." |
| Post Owner rejects | `REQUEST_REJECTED`| Requesting User | "Your request for this load has been rejected by the post owner." |

---

## 3. Environment Variables Needed

### Backend (`server_trucks99`)
Make sure you have downloaded the Service Account JSON from the Firebase Console (Project Settings -> Service Accounts -> Generate New Private Key) and saved it as:
`server_trucks99/firebase-service-account.json`

### Frontend (`itruck_user_portal`)
Add the following to your frontend `.env.local` or `.env.development`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyA..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="trucks99-d90e5"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="trucks99-d90e5.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="717941782466"
NEXT_PUBLIC_FIREBASE_APP_ID="1:717941782466:web:..."
NEXT_PUBLIC_FIREBASE_VAPID_KEY="B..." # Needed for Web Push notifications
```
*(You can get the VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates).*

---

## 4. API Endpoints Reference

### 1. Register FCM Token
**POST** `/api/firebase/save-token`
*   **Auth:** Requires User JWT
*   **Body:**
```json
{
  "token": "FCM_DEVICE_TOKEN",
  "device": "web",
  "platform": "chrome"
}
```

### 2. Manual Test Trigger (Admin Only)
**POST** `/api/notification/send`
*   **Auth:** Requires Admin JWT
*   **Body:**
```json
{
  "userId": "USER_OBJECT_ID",
  "event": "NEW_REQUEST",
  "data": { "userName": "Ravi", "postType": "load" }
}
```

### 3. Fetch Notification History
**GET** `/api/notification`
*   **Auth:** Requires User JWT
*   **Response:**
```json
[
  {
    "id": "uuid",
    "title": "New request received",
    "message": "Your load post received a new request from Ravi.",
    "isRead": false,
    "postId": "64abcdef...",
    "requestId": "64abcdef...",
    "postType": "LOAD"
  }
]
```

### 4. Mark Notification as Read
**PUT** `/api/notification/:id/read`
**PUT** `/api/notification/read-all`

---

## 5. Flow Diagram

```text
[Frontend] User Logs In
       ↓
[Frontend] useFirebasePush requests permission & gets FCM Token
       ↓
[Backend] Saves Token to FcmToken Collection
       ↓
[Frontend] User A makes a bid/request on User B's Truck
       ↓
[Backend] bitService.js creates bid -> triggers notify(NEW_REQUEST)
       ↓
[Backend] notificationService.js checks FCM token for User B
       ↓
[Firebase] Dispatches Push Notification to User B's device
       ↓
[Frontend] User B clicks Push Notification
       ↓
[Frontend] Service Worker intercepts click -> Navigates to /portal/trucks/:postId
```

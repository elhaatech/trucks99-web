# Firebase / FCM Implementation

Backend push notifications use **Firebase Admin SDK**. Client apps (web/mobile) use the **Firebase client SDK** and register FCM tokens via `POST /api/firebase/save-token`.

## Important: `google-services.json` vs service account

| File | Used by | Purpose |
|------|---------|---------|
| `google-services.json` | Android mobile app | Client SDK config (public) |
| Firebase web config (`NEXT_PUBLIC_FIREBASE_*`) | Web portal | Client SDK config (public) |
| **Service account JSON** | **Backend only** | Admin SDK — send push, Firestore realtime |

**Do not use `google-services.json` for the backend.** It does not contain a private key and cannot authenticate Firebase Admin.

Download a service account key from Firebase Console → Project settings → Service accounts → **Generate new private key**.

## Backend architecture

```
server.js
  └── require('./Firebase/firebase')     # singleton Admin SDK init (once at startup)

Firebase/firebase.js
  └── admin.messaging().send()           # low-level single-token send

services/fcmPushService.js
  └── sendPushToUser()                   # multi-device, token cleanup
  └── saveFcmToken()                     # token registration

services/notificationService.js
  └── notify()                           # dispatches in-app, WhatsApp, SMS, email, push
```

## Environment variables (backend)

See `.env.example`. Supported credential sources (first match wins):

1. `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON string (recommended for Azure App Service / Railway)
2. `FIREBASE_SERVICE_ACCOUNT_BASE64` — base64-encoded JSON
3. `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
4. `FIREBASE_SERVICE_ACCOUNT_PATH` or `./firebase-service-account.json` (local dev; also tries `firebase-service-account..json`)
5. `GOOGLE_APPLICATION_CREDENTIALS` — path for application default credentials

## Environment variables (frontend)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Generate the VAPID key in Firebase Console → Project settings → Cloud Messaging → Web Push certificates.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/firebase/save-token` | Required | Register/update FCM token |
| POST | `/api/firebase-send-message` | Required | Send push to current user's devices |
| POST | `/api/test-firebase-easy` | Public (dev only) | Test push by mobile number |
| POST | `/api/test-firebase-token` | Public (dev only) | Test push by FCM device token |

Production blocks `/api/test-firebase-easy` unless `ENABLE_FIREBASE_TEST_ENDPOINT=true`.

## Deployment (Azure App Service example)

1. In Firebase Console, generate a **service account private key** (not `google-services.json`).
2. In Azure → App Service → Configuration → Application settings, add:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = entire JSON on one line
   - Or split into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
3. Do **not** upload credential files to the repo or wwwroot.
4. For Android builds, keep `google-services.json` in the mobile project only (gitignored or CI secret).

## Token storage

Collection: `fcmtokens` (schema: `schema/firebaseusear.js`)

- `token` is unique — prevents duplicate records for the same device token
- `isActive: false` when FCM returns invalid/expired token errors
- Supports multiple devices per user

## Security checklist

- [ ] Service account JSON is in environment secrets, not Git
- [ ] `google-services.json` is not used as Admin credentials
- [ ] `ENABLE_FIREBASE_TEST_ENDPOINT` is not set in production
- [ ] Rotate any credentials that were ever committed to Git

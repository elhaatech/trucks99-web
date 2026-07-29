# iTruck Notification System

End-to-end notification architecture for WhatsApp, SMS, email, push (FCM), and in-app alerts — with configurable templates, delivery history, and cron-based reminders.

---

## Overview

All business modules call a **single centralized service** instead of sending messages directly.

```
Business Event (payment, booking, bid, cron, etc.)
        │
        ▼
notificationService.notify()
        │
        ├── Load template from DB (NotificationTemplate)
        ├── Render placeholders ({{userName}}, {{amount}}, etc.)
        │
        ├── in_app  → Notification collection
        ├── whatsapp → Twilio WhatsApp (`helpers/twilio/sendWhatsApp.js`)
        ├── sms     → Twilio SMS (`helpers/twilio/sendSMS.js`) — OTP + optional template SMS
        ├── email   → SMTP (nodemailer)
        └── push    → Firebase FCM
        │
        ▼
NotificationLog (every attempt — status, channel, error)
```

---

## What Was Implemented

### Before (Audit Findings)

| Area | Status |
|------|--------|
| In-app notifications | Schema + read APIs only — **nothing was ever created server-side** |
| WhatsApp | **Not implemented** |
| SMS | OTP only (Twilio) |
| Email | **Not implemented** |
| Push (FCM) | Partial — bug in manual send endpoint |
| Templates | Hardcoded OTP strings only |
| Delivery history | **Not implemented** |
| Payment flows | Verified payments but **sent no notifications** |
| Cron reminders | Subscription expiry only — no WhatsApp/reminder notifications |

### After (Current State)

| Area | Status |
|------|--------|
| Central `NotificationService` | ✅ Complete |
| WhatsApp (Twilio) | ✅ All business notifications via Twilio WhatsApp API |
| SMS (Twilio) | ✅ OTP (registration/login/forgot password) + optional template SMS |
| Email (SMTP / nodemailer) | ✅ Complete (optional — needs env vars) |
| Push (FCM) | ✅ Wired + FCM bug fixed |
| Configurable templates | ✅ Admin-editable, not hardcoded |
| Delivery history | ✅ `NotificationLog` + admin UI |
| Payment / booking / EMI / bid flows | ✅ All wired |
| Cron reminders | ✅ Premium expiry, booking, vehicle relist, featured listing |
| Admin UI | ✅ History + template editor pages |

---

## File Structure

### Backend — Core

| File | Purpose |
|------|---------|
| `server/services/notificationService.js` | Central dispatcher — `notify()`, `notifyMultiple()`, template seed |
| `server/services/notificationReminderScheduler.js` | Daily cron for reminders |
| `server/schema/notification.js` | In-app notifications (extended with `event`, `productId`, `metadata`) |
| `server/schema/notificationLog.js` | Delivery history for all channels |
| `server/schema/notificationTemplate.js` | Per-event, per-channel message templates |
| `server/views/handleNotification.js` | REST APIs (inbox, history, templates, bulk send) |
| `server/helpers/twilio/config.js` | Twilio env validation, E.164 helpers |
| `server/helpers/twilio/sendSMS.js` | Twilio SMS sender |
| `server/helpers/twilio/sendWhatsApp.js` | Twilio WhatsApp sender |
| `server/helpers/sendWhatsApp.js` | Re-export → Twilio WhatsApp |
| `server/helpers/sendSMS.js` | Re-export → Twilio SMS |
| `server/helpers/mobileOtpService.js` | SMS OTP — hash, expiry, rate limits |
| `server/schema/mobileOtp.js` | Mobile OTP collection |
| `server/views/authRouter.js` | `/api/auth/send-otp`, `verify-otp`, `resend-otp` |
| `server/views/otp.js` | Legacy `/api/otp/send`, `/api/otp/verify` (same Twilio SMS flow) |
| `server/helpers/email/sendEmail.js` | SMTP email via nodemailer |
| `server/helpers/productLabel.js` | Shared product display name helper |
| `server/.env.example` | All notification-related environment variables |

### Backend — Integrations (where `notify()` is called)

| File | Events triggered |
|------|-------------------|
| `server/views/handlepaymentrouter.js` | Premium purchased, payment success, payment failed |
| `server/views/handlebuysellProduct.js` | Product booking, purchased, sold, payment success |
| `server/views/handleEmiRouter.js` | EMI application, EMI payment, booking, purchase, sold |
| `server/services/bitService.js` | Bid placed, bid accepted, bid rejected |
| `server/services/subscriptionScheduler.js` | Premium renewal, expiry notification |
| `server/services/notificationReminderScheduler.js` | Expiry reminder, booking, vehicle, featured listing |
| `server/views/firebassendmessage.js` | FCM bug fix (`token.token` instead of full doc) |

### Frontend

| File | Purpose |
|------|---------|
| `itruck_ui/model/services/notification.ts` | API client (inbox, history, templates, bulk) |
| `itruck_ui/app/admin/portal/notifications/page.tsx` | User in-app inbox |
| `itruck_ui/app/admin/portal/notifications/history/page.tsx` | Admin delivery log |
| `itruck_ui/app/admin/portal/notifications/templates/page.tsx` | Admin template editor |
| `itruck_ui/lib/routes.ts` | Routes: `notificationHistory()`, `notificationTemplates()` |

---

## Notification Events

| Event key | When it fires |
|-----------|---------------|
| `premium_purchased` | Subscription payment verified |
| `premium_expiry_reminder` | 3 days before expiry (cron) or on expiry |
| `product_booking` | Advance payment / book API / EMI activation |
| `product_purchased` | Full purchase / Razorpay remaining payment / EMI completed |
| `product_sold` | Seller notified when buyer completes purchase |
| `payment_success` | Any successful Razorpay verification |
| `payment_failed` | `/api/payment/fail` called |
| `emi_application` | EMI plan created (before payment) |
| `emi_payment_success` | EMI installment verified |
| `bid_placed` | New offer on a product (owner notified) |
| `bid_accepted` | Offer accepted |
| `bid_rejected` | Offer rejected |
| `booking_reminder` | Booking older than N days, payment incomplete |
| `vehicle_reminder` | Active listing not updated in N days |
| `featured_listing_reminder` | Active listing eligible for featured boost |
| `admin_bulk` | Admin bulk campaign |

### Supported Placeholders

Templates use `{{key}}` syntax. Common placeholders:

- `{{userName}}` — recipient name
- `{{productName}}` — buy/sell product label
- `{{vehicleName}}` — same as product name
- `{{planName}}` — subscription plan name
- `{{amount}}` — payment amount
- `{{expiryDate}}` — subscription expiry (YYYY-MM-DD)
- `{{bookingId}}` — product or EMI plan ID
- `{{transactionId}}` — Razorpay payment ID
- `{{buyerName}}` — buyer name (seller notifications)
- `{{message}}` — admin bulk message body

---

## API Endpoints

Base path: `/api/notification`

### User (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List in-app notifications for current user |
| `PUT` | `/read-all` | Mark all as read |
| `PUT` | `/:id/read` | Mark one as read |

### Admin only

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/history` | Delivery log (all channels). Query: `page`, `limit`, `event`, `channel`, `status`, `userId` |
| `GET` | `/templates` | List all templates |
| `GET` | `/templates/events` | Event catalog + placeholder list |
| `GET` | `/templates/:event` | Get one template |
| `PUT` | `/templates/:event` | Update template (body, channels, enabled) |
| `POST` | `/bulk` | Bulk campaign — `{ userIds[], message, channels? }` |
| `POST` | `/send` | Test send — `{ userId, event, data, channels? }` |

---

## Database Schemas

### Notification (in-app)

```js
{
  userId, title, message, event,
  loadId?, productId?, metadata?,
  read: false, timestamps
}
```

### NotificationLog (delivery history)

```js
{
  userId, event, channel,   // in_app | whatsapp | sms | email | push
  title, message,
  status,                   // pending | sent | delivered | failed | skipped
  errorMessage?, providerMessageId?,
  dedupeKey?, metadata?, sentAt?, timestamps
}
```

### NotificationTemplate

```js
{
  event, label, description, enabled,
  channels: { in_app, whatsapp, sms, email, push },
  templates: {
    in_app: { title, body },
    whatsapp: { body },
    sms: { body },
    email: { subject, body },
    push: { title, body }
  },
  placeholders: []
}
```

Default templates are **seeded on server boot** via `seedDefaultTemplates()`.

---

## Environment Variables

Copy from `server/.env.example`:

```env
# Twilio (SMS + WhatsApp)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# OTP (Twilio SMS)
OTP_SECRET=
OTP_EXPIRATION_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_MAX_RESEND=3
OTP_RESEND_COOLDOWN_SEC=60
DEV_OTP_FALLBACK=true
TEMP_OTP=123456

# SMTP Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_SECURE=false

# Cron schedules
CRON_SCHEDULE=0 0 * * *              # Subscription expiry (midnight)
REMINDER_CRON_SCHEDULE=0 9 * * *     # Reminders (9 AM daily)

# Reminder windows (days)
PREMIUM_REMINDER_DAYS=3
BOOKING_REMINDER_DAYS=3
VEHICLE_REMINDER_DAYS=30
FEATURED_REMINDER_DAYS=14
```

**Twilio:** If credentials are missing, SMS/WhatsApp attempts are logged as failed — business flows continue. OTP returns `503` in production when SMS cannot be sent (unless `DEV_OTP_FALLBACK=true` in development).

**OTP APIs:** `POST /api/auth/send-otp`, `verify-otp`, `resend-otp` and legacy `POST /api/otp/send`, `/api/otp/verify`.

**Email:** If SMTP is not configured, email is skipped gracefully.

**Firebase push:** Uses existing `server/firebase-service-account.json` + FCM token storage in `firebaseusear` collection.

---

## Business Flow Integration

### Premium Subscription

```
Create Razorpay order → Payment → Verify signature
  → Activate subscription → notify(PREMIUM_PURCHASED + PAYMENT_SUCCESS)
```

### Buy/Sell Product Purchase

```
Product details → Booking (optional) → Cart → Checkout
  → Create Razorpay order → Payment → Verify signature
  → Update product status → Create transactions
  → notify(PRODUCT_BOOKING or PRODUCT_PURCHASED + PRODUCT_SOLD + PAYMENT_SUCCESS)
  → Buyer and product owner both receive WhatsApp (buyer name passed for seller messages)
```

Notifications are **never sent before** signature verification succeeds.

### EMI Flow

```
Create EMI plan → notify(EMI_APPLICATION)
  → Razorpay payment → Verify
  → notify(EMI_PAYMENT_SUCCESS + PAYMENT_SUCCESS)
  → If activated: notify(PRODUCT_BOOKING)
  → If completed: notify(PRODUCT_PURCHASED + PRODUCT_SOLD)
```

### Bid / Offer Flow

```
createBid() → notify(BID_PLACED) to product owner
updateBid(accept) → notify(BID_ACCEPTED) to bidder
updateBid(reject) → notify(BID_REJECTED) to bidder
```

### Scheduled Reminders

| Reminder | Trigger | Dedupe |
|----------|---------|--------|
| Premium expiry | Sub ending within 3 days | Per plan + expiry date |
| Booking incomplete | Product in `booking` > 3 days | Per product |
| Vehicle relist | Active listing not updated > 30 days | Per product |
| Featured listing | Active listing > 14 days old | Per product |

Duplicate notifications within 24 hours are prevented via `dedupeKey`.

---

## Admin Portal Pages

| URL | Description |
|-----|-------------|
| `/admin/portal/notifications` | User inbox (in-app notifications) |
| `/admin/portal/notifications/history` | Full delivery log — WhatsApp, SMS, email, push, in-app |
| `/admin/portal/notifications/templates` | Edit message templates and enable/disable channels |

From the inbox page, use the **History** and **Templates** buttons in the header.

---

## Usage Example (Server-Side)

```js
const { notify, NOTIFICATION_EVENTS } = require('../services/notificationService');

// Fire-and-forget — never block the main business flow
notify({
  userId: buyerId,
  event: NOTIFICATION_EVENTS.PRODUCT_PURCHASED,
  data: {
    productName: 'Truck BS-001',
    amount: 500000,
    transactionId: 'pay_abc123',
  },
  metadata: { productId: product._id, orderId: razorpay_order_id },
}).catch(err => console.error('[notify]', err.message));
```

Bulk send (admin):

```js
const { notifyMultiple, NOTIFICATION_EVENTS } = require('../services/notificationService');

await notifyMultiple(['userId1', 'userId2'], {
  event: NOTIFICATION_EVENTS.ADMIN_BULK,
  data: { message: 'New feature launched on iTruck!' },
  skipDedupe: true,
});
```

---

## Bugs Fixed

1. **FCM manual send** — `firebassendmessage.js` passed the FCM document object instead of `token.token`
2. **In-app notifications never created** — `Notification.create()` now called by `notificationService`
3. **Payment flows silent** — All verify handlers now dispatch notifications after success
4. **Bid notifications missing** — `bitService` now notifies on create/accept/reject

---

## Known Limitations (Not Changed)

- **No Razorpay webhooks** — verification remains client-side POST to `/verify` endpoints
- **No separate Bank Finance module** — EMI (`/api/emi`) covers finance/loan applications
- **Auto-pay renewal** — creates internal transaction records without charging Razorpay (pre-existing)
- **SMS disabled by default** — enable per template in admin UI to avoid unexpected SMS costs
- **WhatsApp sandbox** — Twilio sandbox requires users to opt in before receiving messages

---

## Testing Checklist

1. Set `TWILIO_WHATSAPP_FROM` + Twilio credentials in `server/.env`
2. Restart server (templates seed on boot)
3. Complete a premium purchase → check inbox + `/notifications/history`
4. Buy/sell Razorpay payment (advance + remaining) → buyer + seller notifications
5. Create EMI plan → application notification
6. Place and accept a product bid → bid notifications
7. Edit a WhatsApp template in admin → retry an event
8. Verify failed payment logs `payment_failed` in history

---

## Dependencies

```json
"twilio": "^5.7.1",
"nodemailer": "^6.10.1"
```

Removed (Twilio-only standardization): `@whiskeysockets/baileys`, `qrcode`.

Install: `npm install` in `server/`.

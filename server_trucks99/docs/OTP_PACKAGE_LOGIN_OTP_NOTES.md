# OTP Package / Login OTP Notes

> **Updated:** This document reflects the **current** OTP implementation in `server_trucks99`.
> For full API details and test results, see also `OTP_LOGIN_IMPLEMENTATION.md`.

---

## Current status in this project

This project does **not** use a dedicated OTP package (like `otp-generator` or `otplib`) for login OTP.

The OTP logic is implemented manually in the backend:

- `helpers/mobileOtpService.js` — generate, store, verify, resend OTP
- `helpers/otpHelper.js` — mobile normalization, legacy MongoDB OTP helpers
- `views/otp.js` — routes: `/api/otp/send`, `/api/otp/verify`, `/api/otp/resend`
- `views/authRouter.js` — alias routes: `/api/auth/send-otp`, `/verify-otp`, `/resend-otp`
- `config/redisClient.js` — Redis connection for OTP storage
- `helpers/draft4sms/sendSMS.js` — SMS delivery via Draft4SMS

**Twilio is NOT used for login OTP.** (Twilio may still be used separately for WhatsApp notifications.)

---

## How OTP works here

The backend generates OTP securely with Node.js `crypto` (not `Math.random()`):

```js
const { randomInt } = require('crypto');

function generateOtpCode() {
  // In development: uses TEMP_OTP from .env (e.g. 123456)
  // In production: secure random 6-digit code
  return randomInt(100000, 999999).toString();
}
```

It stores OTP in **Redis** (not in-memory):

```js
const key = `otp:${mobile}`; // e.g. otp:+919876543210

await redisClient.set(key, JSON.stringify({
  otpHash,      // SHA-256 hash — plain OTP is never stored
  attempts: 0,
  resendCount: 0,
  expiresAt,
  createdAt,
  updatedAt,
}), { EX: OTP_EXPIRY_SECONDS });
```

Expiry is set via Redis TTL:

```js
const OTP_EXPIRY_MINUTES = 10;           // default 10 minutes
const OTP_EXPIRY_SECONDS = 10 * 60;      // 600 seconds
```

OTP is sent via **Draft4SMS** HTTP API:

```js
const url =
  `https://text.draft4sms.com/vb/apikey.php?apikey=${apikey}` +
  `&senderid=TRUKXX&number=${phoneNumber}&message=${encodedMessage}`;

const sendSMS = require('./draft4sms/sendSMS');
await sendSMS(mobile, message);
```

After successful verification, a **JWT** is issued:

```js
const { signToken } = require('./helpers/jwt');
const token = signToken(user);
```

---

## Login OTP flow

### Send OTP — `POST /api/otp/send`

```json
{ "mobile": "9876543210" }
```

```
Mobile → Validate user exists → Generate secure OTP
       → Hash & store in Redis (TTL 10 min) → Send SMS via Draft4SMS
       → Return success (otpForDev only in development)
```

### Verify OTP — `POST /api/otp/verify`

```json
{ "mobile": "9876543210", "otp": "123456" }
```

```
Get OTP from Redis → Check expiry → Check attempt count (max 5)
→ Compare hash → Correct: delete OTP → Issue JWT → Login successful
→ Wrong: increment attempts → return remainingAttempts
→ 5 failures: delete OTP → ask user to request new OTP
```

### Resend OTP — `POST /api/otp/resend`

```json
{ "mobile": "9876543210" }
```

```
Check existing OTP in Redis → 60s cooldown → max 3 resends
→ Generate new OTP → Replace previous OTP in Redis → Send SMS
```

---

## Installed packages relevant to OTP/login

From `package.json`:

| Package | Purpose |
|---------|---------|
| `redis` | Store OTP + expiry in Redis (survives server restart) |
| `jsonwebtoken` | Auth token after OTP verification |
| `nodemailer` | Email sending (not used for login OTP) |
| `crypto` (built-in) | Secure OTP generation + SHA-256 hashing |

There is **no** dedicated OTP library (`otp-generator`, `otplib`) — generation is done with `crypto.randomInt()`.

SMS is sent via **Draft4SMS direct HTTP API** — no Twilio, no extra SMS npm package.

---

## Environment variables (`.env`)

```env
# OTP settings
OTP_SECRET=your_otp_secret_key_change_in_production
OTP_EXPIRATION_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5
OTP_MAX_RESEND=3
OTP_RESEND_COOLDOWN_SEC=60

# Redis (required)
REDIS_URL=redis://127.0.0.1:6379

# Draft4SMS (login OTP SMS)
DRAFT4SMS_API_KEY=your_api_key
DRAFT4SMS_SENDER_ID=TRUKXX
# DRAFT4SMS_API_URL=https://text.draft4sms.com/vb/apikey.php

# Development only
TEMP_OTP=123456
DEV_OTP_FALLBACK=true
```

---

## Security rules

| Rule | Status |
|------|--------|
| OTP generated with `crypto.randomInt()` | ✅ |
| OTP stored in Redis with TTL | ✅ |
| Plain OTP never stored (SHA-256 hash only) | ✅ |
| OTP never logged | ✅ |
| OTP never returned in production API | ✅ |
| OTP deleted after successful verify | ✅ |
| Max 5 wrong attempts, then OTP invalidated | ✅ |
| 60s resend cooldown + max 3 resends | ✅ |
| Previous OTP invalid when new OTP generated | ✅ |
| Dev `otpForDev` / `TEMP_OTP` only in non-production | ✅ |

---

## Development vs production

| | Development | Production |
|--|-------------|------------|
| OTP generation | Fixed `TEMP_OTP=123456` | Random via `crypto.randomInt()` |
| SMS fails | Returns `otpForDev` in response | Returns error, OTP rolled back from Redis |
| OTP in API response | `otpForDev` returned | Never returned |

---

## Recommended production setup

This project uses:

- ✅ **Draft4SMS** — sending login OTP via SMS (HTTP API)
- ✅ `crypto.randomInt()` — generating OTP codes (no extra package needed)
- ✅ `redis` — storing OTP and expiry
- ✅ `jsonwebtoken` — secure login token after verify
- `nodemailer` — available for email OTP if needed in future

**Twilio is not required for login OTP.**

---

## Important note

OTP is stored in **Redis with TTL**. It survives Node.js backend restarts and is production-safe.

Redis must be running before starting the server:

```bash
REDIS_URL=redis://127.0.0.1:6379
```

Set `DRAFT4SMS_API_KEY` and `DRAFT4SMS_SENDER_ID` for real SMS delivery.

---

## How to test

```bash
cd server_trucks99
npm run test:otp
```

Manual test:

```bash
# 1. Send OTP
curl -X POST http://localhost:3003/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210"}'

# 2. Verify OTP (use otpForDev from response in dev, or SMS code in prod)
curl -X POST http://localhost:3003/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","otp":"123456"}'

# 3. Resend OTP (after 60s cooldown)
curl -X POST http://localhost:3003/api/otp/resend \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210"}'
```

**Test user (seed data):** mobile `9876543210` → user `Agent User`

---

## Summary

Current project OTP setup:

| Item | Value |
|------|-------|
| Dedicated OTP package | None — uses `crypto.randomInt()` |
| OTP storage | **Redis** with 10-minute TTL |
| SMS provider | **Draft4SMS** (`helpers/draft4sms/sendSMS.js`) |
| Twilio for login OTP | **Not used** |
| OTP length | 6 digits |
| Max verify attempts | 5 |
| Resend cooldown | 60 seconds |
| Max resends | 3 |
| JWT after verify | Yes (`helpers/jwt.js`) |
| In-memory `otpStore` | **Removed** — replaced with Redis |

This project is **not** using a dedicated OTP library, but follows production-safe patterns with Redis, crypto, and Draft4SMS.

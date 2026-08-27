# OTP Login Implementation

This document describes the OTP-based login flow implemented in `server_trucks99`, including Redis storage, security rules, API endpoints, environment configuration, and test results.

---

## Overview

Login is **OTP-only** for mobile users. The flow is:

```
Mobile → Validate user → Generate secure OTP → Store in Redis (TTL)
      → Send SMS via Twilio → Verify OTP → Issue JWT + session
```

**SMS provider:** Draft4SMS (`helpers/draft4sms/sendSMS.js`)

**Note:** Twilio is NOT used for login OTP. Twilio may still be used for WhatsApp notifications only.

**OTP storage:** Redis (not in-memory, not MongoDB for login OTP)

Registration uses `POST /api/signup`. It creates the account and sends the registration OTP; `POST /api/otp/send` is reserved for existing-user login.

---

## Files changed

| File | Purpose |
|------|---------|
| `config/redisClient.js` | Redis client + `ensureRedisConnected()` |
| `helpers/mobileOtpService.js` | Core OTP logic (generate, store, verify, resend) |
| `views/otp.js` | Routes: `/api/otp/send`, `/verify`, `/resend` |
| `views/authRouter.js` | Alias routes: `/api/auth/send-otp`, `/verify-otp`, `/resend-otp` |
| `helpers/requireAuth.js` | Public paths for OTP endpoints |
| `scripts/test-otp-flow.js` | Integration test suite |
| `package.json` | `redis` dependency + `test:otp` script |

---

## Packages used

| Package | Purpose |
|---------|---------|
| `redis` | OTP storage with TTL |
| `crypto` (Node.js built-in) | Secure OTP generation (`randomInt`) + SHA-256 hashing |
| `draft4sms` (HTTP API) | SMS delivery for OTP |
| `jsonwebtoken` | JWT after successful OTP verify |

No dedicated OTP library (`otp-generator`, `otplib`) is used.

---

## API endpoints

### POST `/api/otp/send`

Request:

```json
{
  "mobile": "9876543210"
}
```

Response (success):

```json
{
  "message": "OTP sent to your mobile number via SMS.",
  "otpSentViaSms": true
}
```

Response (development only — when SMS fails or `DEV_OTP_FALLBACK` is enabled):

```json
{
  "message": "SMS not sent. Use dev OTP below if enabled.",
  "otpSentViaSms": false,
  "otpForDev": "123456"
}
```

> **Production:** `otpForDev` is never returned when `NODE_ENV=production`.

---

### POST `/api/otp/verify`

Request:

```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

Response (success):

```json
{
  "message": "Login successful.",
  "token": "<JWT>",
  "user": {
    "id": "...",
    "name": "...",
    "roleId": "...",
    "role": { "rolename": "...", "permissions": {} },
    "mobile": "+919876543210"
  }
}
```

Response (wrong OTP):

```json
{
  "message": "Incorrect OTP. 4 attempt(s) left.",
  "remainingAttempts": 4
}
```

Response (max attempts exceeded):

```json
{
  "message": "Maximum verification attempts exceeded. Request a new OTP.",
  "remainingAttempts": 0
}
```

---

### POST `/api/otp/resend`

Request:

```json
{
  "mobile": "9876543210"
}
```

Rules:

- Requires an existing OTP in Redis
- 60-second cooldown between sends
- Max 3 resends per OTP session
- Generates a new OTP and replaces the previous one in Redis

Response (cooldown active):

```json
{
  "message": "Please wait 45s before resending OTP.",
  "otpSentViaSms": false,
  "retryAfterSeconds": 45
}
```

---

### Alias routes (same logic)

| Legacy route | Equivalent |
|--------------|------------|
| `POST /api/auth/send-otp` | `/api/otp/send` |
| `POST /api/auth/verify-otp` | `/api/otp/verify` |
| `POST /api/auth/resend-otp` | `/api/otp/resend` |

---

## OTP settings

| Setting | Default | Env variable |
|---------|---------|--------------|
| OTP expiry | **10 minutes** | `OTP_EXPIRATION_MINUTES=10` or `OTP_EXPIRY_SECONDS=600` |
| OTP length | 6 digits | `OTP_LENGTH=6` |
| Max verify attempts | 5 | `OTP_MAX_ATTEMPTS=5` |
| Resend cooldown | 60 seconds | `OTP_RESEND_COOLDOWN_SEC=60` |
| Max resends | 3 | `OTP_MAX_RESEND=3` |
| Hash pepper | required in prod | `OTP_SECRET` |

---

## Environment variables

Add these to `server_trucks99/.env`:

```env
# OTP
OTP_SECRET=your_otp_secret_key_change_in_production
OTP_EXPIRATION_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5
OTP_MAX_RESEND=3
OTP_RESEND_COOLDOWN_SEC=60

# Redis (required for login OTP)
REDIS_URL=redis://127.0.0.1:6379

# Draft4SMS (login OTP SMS)
DRAFT4SMS_API_KEY=your_api_key
DRAFT4SMS_SENDER_ID=TRUKXX
# DRAFT4SMS_API_URL=https://text.draft4sms.com/vb/apikey.php

# Development only
TEMP_OTP=123456
DEV_OTP_FALLBACK=true
```

### Development behavior

- When `NODE_ENV !== production` (or `DEV_OTP_FALLBACK=true`):
  - Fixed OTP from `TEMP_OTP` is used instead of random generation
  - `otpForDev` is returned in the send response if SMS fails
- In **production**:
  - Random OTP via `crypto.randomInt()`
  - OTP is never returned in API responses
  - SMS failure deletes the Redis OTP entry and returns an error

---

## Redis configuration

### Key format

```
otp:+919876543210
```

### Stored payload (JSON)

```json
{
  "otpHash": "<sha256 hash>",
  "createdAt": 1723612800000,
  "updatedAt": 1723612800000,
  "attempts": 0,
  "verified": false,
  "resendCount": 0,
  "expiresAt": 1723613400000
}
```

### TTL

Redis key TTL is set to `OTP_EXPIRY_SECONDS` (default 600s = 10 minutes).

OTP survives Node.js restarts because it lives in Redis, not application memory.

---

## Security

| Rule | Implementation |
|------|----------------|
| Secure OTP generation | `crypto.randomInt()` — not `Math.random()` |
| OTP never stored in plain text | SHA-256 hash with `OTP_SECRET` pepper |
| OTP never logged | SMS body not logged; only recipient + Twilio SID logged |
| OTP never in production response | `otpForDev` only when dev fallback enabled |
| OTP deleted after success | `redisClient.del()` on successful verify |
| Expired OTP rejected | Checked via `expiresAt` + Redis TTL |
| Previous OTP invalidated | New send/resend replaces hash in Redis |
| Max 5 wrong attempts | OTP deleted; user must request new OTP |
| Resend spam protection | 60s cooldown + max 3 resends |
| Redis unavailable | Returns `Internal error (Redis unavailable).` |
| SMS failure (production) | OTP rolled back from Redis |

---

## Flow diagrams

### Send OTP

```
POST /api/otp/send { mobile }
        │
        ▼
  normalizeMobile()
        │
        ▼
  User.findOne({ mobile })  ──not found──▶ 404
        │
        ▼
  Check resend cooldown in Redis
        │
        ▼
  generateOtpCode()  (crypto.randomInt or TEMP_OTP in dev)
        │
        ▼
  hashOtp() → store in Redis with TTL
        │
        ▼
  sendOtpViaSms() via Twilio
        │
        ▼
  Return success (+ otpForDev in dev only)
```

### Verify OTP

```
POST /api/otp/verify { mobile, otp }
        │
        ▼
  Get OTP record from Redis  ──missing──▶ "No OTP found"
        │
        ▼
  Check expiresAt  ──expired──▶ delete + error
        │
        ▼
  Check attempts >= 5  ──yes──▶ delete + error
        │
        ▼
  Compare hash(otp) with stored otpHash
        │
   wrong ──▶ increment attempts, return remainingAttempts
        │
   correct ──▶ delete from Redis → signToken() → login
```

---

## How to test

### Run automated tests

```bash
cd server_trucks99
npm run test:otp
```

Requires: MongoDB, Redis, and optionally the server running on port 3003 for HTTP tests.

### Manual test (Postman / curl)

**1. Send OTP**

```bash
curl -X POST http://localhost:3003/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210"}'
```

**2. Verify OTP**

```bash
curl -X POST http://localhost:3003/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","otp":"123456"}'
```

**3. Resend OTP (after 60s cooldown)**

```bash
curl -X POST http://localhost:3003/api/otp/resend \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210"}'
```

### Test results (last run)

```
=== Summary: 15 passed, 0 failed ===

✅ Send OTP — stored in Redis
✅ Verify correct OTP — JWT issued, OTP deleted
✅ Wrong OTP — remaining attempts returned
✅ Max 5 attempts — OTP invalidated
✅ Expired OTP rejected
✅ Resend cooldown (60s)
✅ Previous OTP replaced on new send
✅ Redis survives backend restart
✅ No OTP in production response
✅ Redis unavailable handled
✅ SMS failure rolls back Redis entry
✅ HTTP endpoints (/send, /verify, /resend)
```

---

## What was replaced

| Before | After |
|--------|-------|
| In-memory `otpStore = {}` | Redis with TTL |
| `Math.random()` OTP | `crypto.randomInt()` |
| MongoDB `MobileOtp` schema for login | Redis for login OTP |
| No resend endpoint on `/api/otp` | `POST /api/otp/resend` added |
| No attempt tracking | Max 5 attempts with `remainingAttempts` |
| OTP lost on server restart | OTP persists in Redis |

---

## Legacy OTP paths (unchanged)

These routes still use the MongoDB `Otp` schema and are **not** part of the Redis login flow:

| Route | Purpose |
|-------|---------|
| `POST /api/otp/mobile/send` | Logged-in user mobile verification |
| `POST /api/otp/mobile/verify` | Verify mobile for logged-in user |
| `POST /api/otp/verify-login` | Session-based OTP verify after partial login |

Login OTP (`/api/otp/send` + `/api/otp/verify`) uses Redis.

---

## Known issues

1. **Draft4SMS configuration** — If SMS fails, set `DRAFT4SMS_API_KEY` and `DRAFT4SMS_SENDER_ID` in `.env`.
2. **Redis required** — OTP send/verify will fail with `Internal error (Redis unavailable).` if Redis is not running.
3. **Dev fallback** — When Draft4SMS fails in development, use `otpForDev` from the send response or set `TEMP_OTP=123456`.

---

## Quick reference

```bash
# Start Redis (if not running)
# Windows: start Redis service or use WSL/Docker

# Start server
cd server_trucks99
npm run start

# Run OTP tests
npm run test:otp
```

**Test user mobile (seed data):** `9876543210` → user `Agent User`

**Dev OTP:** `123456` (when `TEMP_OTP=123456` in `.env`)

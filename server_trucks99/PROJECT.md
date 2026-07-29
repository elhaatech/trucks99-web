# iTruck Server — Project Documentation

Node.js/Express backend for **iTruck-Web**: a logistics platform with truck management, load management, RBAC (Role-Based Access Control), OAuth (Google/GitHub), and OTP-based login via Twilio SMS.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Database & Schemas](#database--schemas)
6. [API Reference](#api-reference)
7. [Authentication & Authorization](#authentication--authorization)
8. [Seeding & Default Data](#seeding--default-data)
9. [Scripts](#scripts)

---

## Overview

- **Name:** server  
- **Description:** Basic CRUD Server (extended with RBAC, OTP, OAuth, trucks, loads, dashboard)  
- **Author:** Roxylius  
- **License:** ISC  
- **Default port:** `3001`  
- **Database:** MongoDB (via Mongoose)  
- **Session store:** MongoDB (`connect-mongodb-session`)

The server exposes REST APIs for:

- **Auth:** Login (email/password + OTP), signup, logout, Google OAuth, GitHub OAuth  
- **Users:** CRUD with role/permissions and mobile (E.164)  
- **RBAC:** Roles, permissions, activity logs  
- **Trucks:** CRUD (registration, driver, capacity, status)  
- **Loads:** CRUD (title, origin, destination, status, weight)  
- **Dashboard:** Aggregated stats for loads and trucks by status  
- **OTP:** Send/verify OTP for login and mobile registration (Twilio SMS)

---

## Tech Stack

| Category        | Technology                          |
|----------------|-------------------------------------|
| Runtime        | Node.js                             |
| Framework      | Express 4.x                         |
| Database       | MongoDB (Mongoose 8.x)              |
| Session        | express-session + MongoDB store     |
| Auth           | Passport (local, Google OAuth2, GitHub) |
| Passwords      | passport-local-mongoose             |
| OTP            | crypto-js (AES), Twilio (SMS)       |
| JWT            | jsonwebtoken (post-OTP token)       |
| CORS           | cors                                |
| Config         | dotenv                              |

---

## Project Structure

```
server/
├── server.js              # Entry: DB connect, mount app, listen
├── app.js                 # Express app: middleware, session, passport, routes
├── seedData.js            # Seed permissions, roles, users (dummy + business)
├── package.json
├── .env                   # Not in repo; see Environment Variables
│
├── schema/                # Mongoose models
│   ├── user.js            # User (email, role, permissions, googleId, githubId, mobile)
│   ├── role.js            # Role (name, description, permissions[])
│   ├── permission.js      # Permission (name, description)
│   ├── log.js             # Activity log (name, email, role, timestamp, action)
│   ├── truck.js           # Truck (registrationNumber, driverName, capacity, status, contactNumber)
│   ├── load.js            # Load (title, description, origin, destination, status, weight)
│   └── otp.js             # OTP (userId, otp encrypted, channel, expiryDate, TTL 15m)
│
├── views/                 # Route handlers (Express routers)
│   ├── login.js           # POST /api/login
│   ├── signup.js          # POST /api/signup
│   ├── logout.js          # DELETE /api/logout
│   ├── google.js          # GET /api/auth/google, /redirect, /fail
│   ├── github.js          # GET /api/auth/github, /redirect, /fail
│   ├── otp.js             # OTP send/verify, mobile register/verify, verify-login
│   ├── handleTruck.js     # Truck CRUD
│   ├── handleLoad.js      # Load CRUD
│   ├── handleDashboard.js # GET /api/dashboard/stats
│   └── rbac/
│       ├── handleUser.js      # User CRUD + current user
│       ├── handleRole.js      # Role CRUD
│       ├── handlePermission.js# Permission CRUD
│       └── handleLog.js       # Log list + add
│
└── helpers/
    ├── permissions.js     # buildModulesResponse, parse module:action permissions
    ├── jwt.js             # signToken, verifyToken
    └── twilio/
        └── sendsms.js     # sendSMS (Twilio), E.164 normalization
```

---

## Environment Variables

Create a `.env` file in the server root. Example:

| Variable                 | Description |
|--------------------------|-------------|
| `PORT`                   | Server port (default `3001`) |
| `MONGODB_ATLAS`          | MongoDB connection URI |
| `MONGODB_SESSION`        | Collection name for session store |
| `SESSION_SECRET`         | Secret for session signing |
| `OTP_SECRET`             | Secret for AES encryption of OTP in DB |
| `OTP_EXPIRATION_MINUTES` | OTP validity (default `5`) |
| `JWT_SECRET`             | JWT signing (fallback: SESSION_SECRET) |
| `JWT_EXPIRES_IN`         | JWT expiry (e.g. `7d`) |
| `TWILIO_ACCOUNT_SID`     | Twilio Account SID |
| `TWILIO_AUTH_TOKEN`      | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER`    | Twilio sender number (E.164 or 10-digit) |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret |
| `GITHUB_CLIENT_ID`       | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET`   | GitHub OAuth app client secret |
| `CALLBACK_URL_ORIGIN`    | Base URL for OAuth callbacks (e.g. `http://localhost:3001`) |
| `CLIENT_URL`             | Frontend URL for post-OAuth redirect |
| `NODE_ENV`               | `production` or development |

---

## Database & Schemas

### User (`schema/user.js`)

- `name`, `email` (unique), `mobile` (optional; E.164 for OTP)
- `role`, `permissions` (array), `permissionsMap` (optional nested)
- `googleId`, `githubId`, `provider` (local | google | github | admin-panel)
- Password handled by passport-local-mongoose (salt/hash)

### Role (`schema/role.js`)

- `name` (unique), `description`, `permissions` (array of strings)

### Permission (`schema/permission.js`)

- `name` (unique), `description`

### Log (`schema/log.js`)

- `name`, `email`, `role`, `timestamp`, `action` — for RBAC activity audit

### Truck (`schema/truck.js`)

- `registrationNumber`, `driverName`, `capacity`, `contactNumber`
- `status`: `available` \| `in-transit` \| `maintenance` \| `unavailable`
- `createdBy` (ref User), `timestamps`

### Load (`schema/load.js`)

- `title`, `description`, `origin`, `destination`, `weight`
- `status`: `pending` \| `assigned` \| `delivered`
- `createdBy` (ref User), `timestamps`

### Otp (`schema/otp.js`)

- `userId` (ref User), `otp` (AES-encrypted), `channel` (sms \| email), `expiryDate`
- TTL index: auto-delete after 900 seconds

---

## Truck transport domain — four user types

The system has **four main user/party types** (each with full CRUD):

| User type | API base | Description |
|-----------|----------|-------------|
| **Buy/Sell** | `/api/buysell` | Buyer or seller in the transaction (type: buy / sell / vendor) |
| **Shipper** | `/api/shipper` | Sends goods (origin → destination) |
| **Loader** | `/api/loader` | Loader party (loads goods) |
| **Agent** | `/api/agent` | Transport agent; manages truck operations |

Additional entities:

- **Driver** – `/api/driver`. Driver / truck owner; linked to trucks.
- **Truck** – `/api/truck`. Vehicle (driver, capacity, current location); used to assign loads.
- **Load** – `/api/load`. One shipment (e.g. Dubai → Chennai). Has `shipperId`, `buySellId`, `loaderId`, `assignedTruckId`. Status: pending → assigned → delivered. Use **GET /api/load/available** for pending loads (optional `?location=`, `?origin=`, `?destination=`).

---

## API Reference

Base URL: `http://localhost:3001` (or your `PORT`).

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/`  | "server is up and running!" |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/login` | Email + password; sends OTP to user's mobile, responds with user + `otpSent: true` |
| POST   | `/api/signup` | Body: email, password, name, role, permissions — register user |
| DELETE | `/api/logout` | Destroy session, log out |
| GET    | `/api/auth/google` | Redirect to Google OAuth |
| GET    | `/api/auth/google/redirect` | Google callback |
| GET    | `/api/auth/google/fail` | Google auth failure |
| GET    | `/api/auth/github` | Redirect to GitHub OAuth |
| GET    | `/api/auth/github/redirect` | GitHub callback |
| GET    | `/api/auth/github/fail` | GitHub auth failure |

### OTP

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/otp/send` | Body: `{ email }` — send OTP to user's registered mobile |
| POST   | `/api/otp/verify` | Body: `{ email, otp }` — verify and log in (session) |
| POST   | `/api/otp/verify-login` | Body: `{ otp }` — verify OTP after password login (clears pending OTP, returns JWT) |
| POST   | `/api/otp/mobile/send` | Body: `{ mobile }` — send OTP to given number (logged-in user) |
| POST   | `/api/otp/mobile/verify` | Body: `{ mobile, otp }` — verify and save mobile on user |

### User (RBAC)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/user` | Current user (session) + modules (permissions map) |
| GET    | `/api/user/all` | List all users |
| GET    | `/api/user/:id` | Get one user by id (safe, no password) |
| POST   | `/api/user/add` | Add user (name, email, password, role, permissions, mobile) |
| PUT    | `/api/user/edit` | Edit user (requestingUser required; Admin can set newPassword) |
| DELETE | `/api/user/delete` | Delete user by email (body: name, email) |

### Role

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/role` | List all roles |
| POST   | `/api/role/add` | Add role (name, description, permissions, user) |
| PUT    | `/api/role/edit` | Edit role |
| DELETE | `/api/role/delete` | Delete role by name |

### Permission

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/permission` | List all permissions |
| POST   | `/api/permission/add` | Add permission (name, description, user) |
| PUT    | `/api/permission/edit` | Edit permission |
| DELETE | `/api/permission/delete` | Delete permission by name |

### Log

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/log` | List all activity logs |
| POST   | `/api/log/add` | Add log (name, email, role, timestamp, action) |

### Driver (driver / truck owner)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/driver/all` | List all drivers |
| GET    | `/api/driver/:id` | Get one driver |
| POST   | `/api/driver/add` | Add driver (name, contactMobile, contactEmail, licenseNumber, status) |
| PUT    | `/api/driver/edit/:id` | Edit driver by id in URL |
| DELETE | `/api/driver/delete` | Delete by ids array (body: ids) |

### Truck

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/truck/all` | List all trucks |
| GET    | `/api/truck/:id` | Get one truck |
| POST   | `/api/truck/add` | Add truck (registrationNumber, driverName, driverId, capacity, status, currentLocation, contactNumber) |
| PUT    | `/api/truck/edit/:id` | Edit truck by id in URL |
| DELETE | `/api/truck/delete` | Delete by ids array (body: ids) |

### Load

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/load/all` | List all loads |
| GET    | `/api/load/available` | List loads available for assignment (status=pending; optional query: location, origin, destination) |
| GET    | `/api/load/:id` | Get one load |
| POST   | `/api/load/add` | Add load (title, origin, destination, weight, shipperId, buySellId, loaderId, assignedTruckId) |
| PUT    | `/api/load/edit/:id` | Edit load; set assignedTruckId to assign truck (status becomes assigned) |
| DELETE | `/api/load/delete` | Delete loads by ids array (body: ids) |

#### Load API – Request examples (base URL: `http://localhost:3001`)

**1. List all loads**
```http
GET http://localhost:3001/api/load/all
```
No body. Response: `200` + JSON array of loads.

**2. List available loads (for assignment)**
```http
GET http://localhost:3001/api/load/available
GET http://localhost:3001/api/load/available?location=Chennai
GET http://localhost:3001/api/load/available?origin=Dubai&destination=Chennai
```
Returns loads with `status: pending`. Optional query: `location` (matches origin or destination), `origin`, `destination`. Response: `200` + JSON array.

---

**3. Get one load (View)**
```http
GET http://localhost:3001/api/load/:id
```
Replace `:id` with load `_id` (e.g. `GET http://localhost:3001/api/load/507f1f77bcf86cd799439011`).  
No body. Response: `200` + load object, or `404` Load not found.

---

**4. Create load**
```http
POST http://localhost:3001/api/load/add
Content-Type: application/json
```
```json
{
  "title": "Dubai to Chennai",
  "description": "Electronics consignment",
  "origin": "Dubai",
  "destination": "Chennai",
  "status": "pending",
  "weight": "500kg",
  "shipperId": "507f1f77bcf86cd799439011",
  "buySellId": "507f191e810c19729de860ea",
  "assignedTruckId": null
}
```
Optional: `shipperId`, `buySellId`, `loaderId`, `assignedTruckId` (if set, status can be `assigned`). Optional for audit: `user` / `requestingUser`.  
Response: `201` + `{ "message": "Load created successfully", "load": { ... } }`.

---

**5. Edit load (assign truck)**
```http
PUT http://localhost:3001/api/load/edit/:id
Content-Type: application/json
```
Replace `:id` with load `_id`. To **assign a truck**, set `assignedTruckId` (status will become `assigned`). Body:
```json
{
  "title": "Dubai to Chennai",
  "description": "Electronics consignment",
  "origin": "Dubai",
  "destination": "Chennai",
  "status": "assigned",
  "weight": "500kg",
  "shipperId": "507f1f77bcf86cd799439011",
  "buySellId": "507f191e810c19729de860ea",
  "loaderId": "507f1f77bcf86cd799439013",
  "assignedTruckId": "507f1f77bcf86cd799439012"
}
```
Response: `200` + `{ "message": "Load updated successfully", "load": { ... } }`, or `404` Load not found.

---

**6. Delete load(s) (bulk)**
```http
DELETE http://localhost:3001/api/load/delete
Content-Type: application/json
```
```json
{
  "ids": ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]
}
```
Use an array of load `_id` strings. Optional: `"user"` or `"requestingUser"` for audit.  
Response: `200` + `{ "message": "N load(s) deleted successfully", "deletedCount": N, "ids": [...] }`. If none found: `deletedCount: 0`, message "No loads found to delete".

---

### Buy/Sell

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/buysell/all` | List all buy/sell records |
| GET    | `/api/buysell/:id` | Get one by id |
| POST   | `/api/buysell/add` | Add (name, description, contactEmail, contactMobile, address, type, status) |
| PUT    | `/api/buysell/edit/:id` | Edit by id in URL |
| DELETE | `/api/buysell/delete` | Delete by ids array (body: ids) |

#### Buy/Sell API – Request examples (base URL: `http://localhost:3001`)

**1. List all buy/sell**
```http
GET http://localhost:3001/api/buysell/all
```
No body. Response: `200` + JSON array.

**2. View one buy/sell**
```http
GET http://localhost:3001/api/buysell/507f1f77bcf86cd799439011
```
Replace with real `_id`. No body. Response: `200` + object, or `404` not found.

**3. Create buy/sell**
```http
POST http://localhost:3001/api/buysell/add
Content-Type: application/json
```
```json
{
  "name": "ABC Traders",
  "description": "Buying steel rods",
  "contactEmail": "abc@mail.com",
  "contactMobile": "9876543210",
  "address": "Chennai",
  "type": "buy",
  "status": "active"
}
```
`type`: `"buy"` \| `"sell"`. Optional: `user` / `requestingUser` for audit. Response: `201` + `{ "message": "buy/sell created successfully", "buySell": { ... } }`.

**4. Edit buy/sell**
```http
PUT http://localhost:3001/api/buysell/edit/507f1f77bcf86cd799439011
Content-Type: application/json
```
```json
{
  "name": "ABC Traders",
  "description": "Buying steel rods",
  "contactEmail": "abc@mail.com",
  "contactMobile": "9876543210",
  "address": "Chennai",
  "type": "sell",
  "status": "inactive"
}
```
Response: `200` + `{ "message": "buy/sell updated successfully", "buySell": { ... } }`, or `404` not found.

**5. Delete buy/sell(s)**
```http
DELETE http://localhost:3001/api/buysell/delete
Content-Type: application/json
```
```json
{
  "ids": ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]
}
```
Response: `200` + `{ "message": "N buy/sell(s) deleted successfully", "deletedCount": N, "ids": [...] }`.

---

### Shipper

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/shipper/all` | List all shippers |
| GET    | `/api/shipper/:id` | Get one by id |
| POST   | `/api/shipper/add` | Add (name, description, contactEmail, contactMobile, company, status) |
| PUT    | `/api/shipper/edit/:id` | Edit by id in URL |
| DELETE | `/api/shipper/delete` | Delete by ids array (body: ids) |

#### Shipper API – Request examples (base URL: `http://localhost:3001`)

**1. List all shippers**
```http
GET http://localhost:3001/api/shipper/all
```
No body. Response: `200` + JSON array.

**2. View one shipper**
```http
GET http://localhost:3001/api/shipper/507f1f77bcf86cd799439011
```
Replace with real `_id`. No body. Response: `200` + object, or `404` not found.

**3. Create shipper**
```http
POST http://localhost:3001/api/shipper/add
Content-Type: application/json
```
```json
{
  "name": "Fast Cargo",
  "description": "Logistics partner",
  "contactEmail": "fast@mail.com",
  "contactMobile": "9876543210",
  "company": "Fast Cargo Pvt Ltd",
  "status": "active"
}
```
Optional: `user` / `requestingUser` for audit. Response: `201` + `{ "message": "shipper created successfully", "shipper": { ... } }`.

**4. Edit shipper**
```http
PUT http://localhost:3001/api/shipper/edit/507f1f77bcf86cd799439011
Content-Type: application/json
```
```json
{
  "name": "Fast Cargo",
  "description": "Logistics partner",
  "contactEmail": "fast@mail.com",
  "contactMobile": "9876543210",
  "company": "Fast Cargo Pvt Ltd",
  "status": "inactive"
}
```
Response: `200` + `{ "message": "shipper updated successfully", "shipper": { ... } }`, or `404` not found.

**5. Delete shipper(s)**
```http
DELETE http://localhost:3001/api/shipper/delete
Content-Type: application/json
```
```json
{
  "ids": ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]
}
```
Response: `200` + `{ "message": "N shipper(s) deleted successfully", "deletedCount": N, "ids": [...] }`.

---

### Loader

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/loader/all` | List all loaders |
| GET    | `/api/loader/:id` | Get one loader |
| POST   | `/api/loader/add` | Add (name, description, contactEmail, contactMobile, company, status) |
| PUT    | `/api/loader/edit/:id` | Edit by id in URL |
| DELETE | `/api/loader/delete` | Delete by ids array (body: ids) |

#### Loader API – Request examples (base URL: `http://localhost:3001`)

**1. List all loaders**  
`GET http://localhost:3001/api/loader/all`

**2. View one loader**  
`GET http://localhost:3001/api/loader/:id`

**3. Create loader**
```http
POST http://localhost:3001/api/loader/add
Content-Type: application/json
```
```json
{
  "name": "Warehouse Loaders Co",
  "description": "Loading and unloading services",
  "contactEmail": "loaders@mail.com",
  "contactMobile": "9876543210",
  "company": "Warehouse Loaders Co",
  "status": "active"
}
```
Optional: `user` / `requestingUser` for audit. Response: `201` + `{ "message": "loader created successfully", "loader": { ... } }`.

**4. Edit loader**  
`PUT http://localhost:3001/api/loader/edit/:id`  
Body: same fields as create.

**5. Delete loader(s)**  
`DELETE http://localhost:3001/api/loader/delete`  
Body: `{ "ids": ["id1", "id2"] }`.

---

### Agent

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/agent/all` | List all agents |
| GET    | `/api/agent/:id` | Get one by id |
| POST   | `/api/agent/add` | Add (name, description, contactEmail, contactMobile, region, status) |
| PUT    | `/api/agent/edit/:id` | Edit by id in URL |
| DELETE | `/api/agent/delete` | Delete by ids array (body: ids) |

#### Agent API – Request examples (base URL: `http://localhost:3001`)

**1. List all agents**
```http
GET http://localhost:3001/api/agent/all
```
No body. Response: `200` + JSON array.

**2. View one agent**
```http
GET http://localhost:3001/api/agent/507f1f77bcf86cd799439011
```
Replace with real `_id`. No body. Response: `200` + object, or `404` not found.

**3. Create agent**
```http
POST http://localhost:3001/api/agent/add
Content-Type: application/json
```
```json
{
  "name": "South Zone Agent",
  "description": "Coordinates south region",
  "contactEmail": "agent@mail.com",
  "contactMobile": "9876543210",
  "region": "South",
  "status": "active"
}
```
Optional: `user` / `requestingUser` for audit. Response: `201` + `{ "message": "agent created successfully", "agent": { ... } }`.

**4. Edit agent**
```http
PUT http://localhost:3001/api/agent/edit/507f1f77bcf86cd799439011
Content-Type: application/json
```
```json
{
  "name": "South Zone Agent",
  "description": "Coordinates south region",
  "contactEmail": "agent@mail.com",
  "contactMobile": "9876543210",
  "region": "South",
  "status": "inactive"
}
```
Response: `200` + `{ "message": "agent updated successfully", "agent": { ... } }`, or `404` not found.

**5. Delete agent(s)**
```http
DELETE http://localhost:3001/api/agent/delete
Content-Type: application/json
```
```json
{
  "ids": ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]
}
```
Response: `200` + `{ "message": "N agent(s) deleted successfully", "deletedCount": N, "ids": [...] }`.

---

### Driver (driver / truck owner)

#### Driver API – Request examples (base URL: `http://localhost:3001`)

**1. List all drivers**  
`GET http://localhost:3001/api/driver/all`

**2. View one driver**  
`GET http://localhost:3001/api/driver/:id`

**3. Create driver**
```http
POST http://localhost:3001/api/driver/add
Content-Type: application/json
```
```json
{
  "name": "Ramesh Kumar",
  "contactMobile": "9876543210",
  "contactEmail": "ramesh@mail.com",
  "licenseNumber": "DL-12345",
  "status": "available"
}
```
`status`: `available` | `on-trip` | `off-duty` | `inactive`. Response: `201` + `{ "message": "driver created successfully", "driver": { ... } }`.

**4. Edit driver**  
`PUT http://localhost:3001/api/driver/edit/:id`  
Body: same fields as create.

**5. Delete driver(s)**  
`DELETE http://localhost:3001/api/driver/delete`  
Body: `{ "ids": ["id1", "id2"] }`.

---

### Truck

#### Truck API – Request examples (base URL: `http://localhost:3001`)

**1. List all trucks**  
`GET http://localhost:3001/api/truck/all`

**2. View one truck**  
`GET http://localhost:3001/api/truck/:id`

**3. Create truck**
```http
POST http://localhost:3001/api/truck/add
Content-Type: application/json
```
```json
{
  "registrationNumber": "TN-01-AB-1234",
  "driverName": "Ramesh Kumar",
  "driverId": "507f1f77bcf86cd799439011",
  "capacity": "9 tonnes",
  "status": "available",
  "currentLocation": "Chennai",
  "contactNumber": "9876543210"
}
```
`driverId` optional (ref to Driver). `currentLocation` for nearby-matching. Response: `201` + `{ "message": "truck created successfully", "truck": { ... } }`.

**4. Edit truck**  
`PUT http://localhost:3001/api/truck/edit/:id`  
Body: same fields as create.

**5. Delete truck(s)**  
`DELETE http://localhost:3001/api/truck/delete`  
Body: `{ "ids": ["id1", "id2"] }`.

---

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/dashboard/stats` | Aggregated counts: loads by status (pending, assigned, delivered), trucks by status (available, in-transit, maintenance, unavailable), totals |

---

## Authentication & Authorization

- **Session:** Cookie-based (express-session + MongoDB store). CORS allows origins: localhost:3000, 3001, GitHub Pages, Vercel, 7501; credentials true.
- **Login flow:**  
  1. POST `/api/login` (email, password) → session created, OTP sent to user's mobile.  
  2. POST `/api/otp/verify-login` (otp) → clears `pendingOtpVerification`, returns JWT and user with `modules`.
- **Modules:** `helpers/permissions.js` builds a nested `modules` object from user's `permissions` (e.g. `dashboard:access`, `load_management:create`). Admin (role `Admin` or email `admin@mail.com`) gets full access.
- **Password update:** Only Admin (role or admin@mail.com) can set `newPassword` in `/api/user/edit`.
- **Mobile:** Normalized to E.164 (e.g. 10 digits → +91). Used for OTP SMS and login verification.

---

## Seeding & Default Data

`seedData.js` runs after DB connect (from `server.js`):

- If **Permissions** collection is empty → seeds `read`, `write`, `delete`.
- If **Roles** collection is empty → seeds Admin, Dev, Viewer + Buy/Sell, Shipper, Agent, Transporter with predefined permissions.
- If **Users** collection is empty → seeds Admin, Dev, Viewer + business users (buysell@mail.com, shipper@mail.com, agent@mail.com, transporter@mail.com) with hashed passwords.
- Always ensures business roles and business users exist (upsert/find-or-create).

---

## Scripts

| Command   | Description |
|-----------|-------------|
| `npm start` | `node server.js` |
| `npm run dev` | `nodemon server.js` |
| `npm test` | Placeholder (no tests) |

---

## Summary

This server powers the iTruck web app with:

- **Auth:** Local + OTP (Twilio) + Google + GitHub, session + optional JWT after OTP.
- **RBAC:** Users, roles, permissions, activity logs; module-based permissions for dashboard, load/truck/user management, reports, payments, roles, permissions, logs.
- **Logistics:** Trucks and loads CRUD; dashboard stats.
- **Security:** OTP encrypted in DB, E.164 mobile, Admin-only password change, CORS and cookie settings for production.

For local development, set `.env` (including MongoDB and optionally Twilio/Google/GitHub), run `npm run dev`, and use the API base URL (e.g. `http://localhost:3001`) from the frontend.

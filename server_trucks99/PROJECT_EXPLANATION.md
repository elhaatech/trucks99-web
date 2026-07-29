# iTruck — Project Explanation

## What is it?

**iTruck** is a **truck transport management** backend (API server) for a logistics platform. It helps manage:

- **Who** is involved: Shippers, Buyers/Sellers, Transport Agents, Drivers
- **What** is moving: Loads (shipments) from one place to another (e.g. Dubai → Chennai)
- **How** it moves: Trucks (and drivers) that can be assigned to loads

The server exposes **REST APIs** so a frontend (web or mobile app) can perform login, manage users and roles, and run the full logistics workflow (create loads, assign trucks, track status).

---

## Who uses it?

| Role | Who they are | What they do in the system |
|------|----------------|----------------------------|
| **Shipper** | Company/person who wants to send goods | Create and manage loads (shipments); linked to loads via `shipperId` |
| **Buyer/Seller** | Party in the transaction (buy/sell/vendor) | Linked to loads via `buySellId`; tracked for each shipment |
| **Transport Agent** | Coordinates between shippers and transporters | Manages trucks, assigns loads to trucks, uses “available loads” to find work |
| **Loader** | Party that loads goods | Linked to loads via `loaderId` |
| **Agent** | Transport agent | Manages trucks, assigns loads; uses available loads to find work |
| **Driver** (optional) | Person who drives/owns the truck | Registered as Driver; trucks can be linked to them |
| **Admin/User** | Logged-in user (any role) | Uses the app via session; permissions control what they can see/do |

**Four main user types with CRUD:** Buy/Sell, Shipper, Loader, Agent.

---

## How does the flow work?

1. **Shipper** (or agent) creates a **Load**: origin, destination, weight, optional link to Shipper and Buyer/Seller.
2. Load starts as **pending**. System can list **available loads** (pending) e.g. by location: `GET /api/load/available?location=Chennai`.
3. **Transport Agent** (or similar) **assigns a truck** to the load: update the load with `assignedTruckId`. Load status becomes **assigned**.
4. **Truck** has a **Driver** (optional link), capacity, and **current location** (for future “nearby” matching).
5. When delivery is done, load status is set to **delivered**.

So: **Load** = shipment; **Truck** = vehicle (+ driver); **Assign** = set `assignedTruckId` on the load.

---

## Main features

### 1. Authentication

- **OTP-only login**: User enters **mobile number** → receives OTP via SMS (Twilio) → enters OTP → logged in (session). No email/password login.
- Optional: Google and GitHub OAuth.
- Session stored in MongoDB; CORS set for allowed frontend origins.

### 2. Users and permissions (RBAC)

- **Users** have **roles** (e.g. Admin, Shipper, Agent) and **permissions** (e.g. `load_management:create`, `truck_management:view`).
- The API returns a **modules** object so the frontend can show/hide features by permission.
- **Activity log**: Important actions (add/edit/delete user, load, truck, etc.) are logged with who did it and when.

### 3. Truck transport domain (CRUD)

Each of these has **full CRUD** (Create, Read, Update, Delete) with the same pattern:

- **Shipper** — `/api/shipper` (name, company, contact, status)
- **Buy/Sell** — `/api/buysell` (name, type: buy/sell/vendor, contact, address, status)
- **Agent** — `/api/agent` (name, region, contact, status)
- **Driver** — `/api/driver` (name, contact, license, status: available / on-trip / off-duty)
- **Truck** — `/api/truck` (registration, driver/driverId, capacity, status, currentLocation)
- **Load** — `/api/load` (title, origin, destination, weight, status, shipperId, buySellId, assignedTruckId)

**Load** additionally has:

- **GET /api/load/available** — list **pending** loads, with optional filters: `?location=`, `?origin=`, `?destination=` to find loads (e.g. by nearby location).

**Delete** for these resources uses an **ids array** in the body (bulk delete). **Edit** uses **id in the URL**: `PUT /api/.../edit/:id`.

### 4. Dashboard

- **GET /api/dashboard/stats** — aggregated counts (e.g. loads by status, trucks by status) for summary views.

---

## Tech stack (server)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Session | express-session + MongoDB store |
| Auth | Passport (OTP flow + optional Google/GitHub) |
| OTP | Twilio (SMS), crypto-js (encrypt OTP in DB) |
| Config | .env (dotenv) |

---

## Project structure (high level)

```
server/
├── server.js           # Starts app, connects to MongoDB, runs seed
├── app.js              # Express app: CORS, session, passport, routes
├── seedData.js         # Seeds roles, permissions, default users
├── schema/             # MongoDB models (User, Load, Truck, Shipper, Agent, Driver, etc.)
├── views/              # Route handlers (login, signup, otp, handleLoad, handleTruck, handleDriver, etc.)
├── helpers/            # permissions, JWT, Twilio SMS
└── PROJECT.md          # Full API reference and request examples
```

---

## How to run

1. Install dependencies: `npm install`
2. Create `.env` with at least: `MONGODB_ATLAS`, `SESSION_SECRET`, and (for OTP) Twilio credentials.
3. Start: `npm run dev` or `npm start`. Server listens on **port 3001** (or `PORT` in `.env`).
4. Use **base URL** `http://localhost:3001` for all API requests.

---

## Summary

- **iTruck server** = REST API backend for a **truck transport management** system.
- It supports **OTP-based login**, **RBAC**, and full **CRUD** for **Shipper, Buyer/Seller, Agent, Driver, Truck, and Load**.
- **Loads** can be linked to Shippers and Buyers/Sellers and **assigned to Trucks**; **available loads** can be listed (e.g. by location) for efficient assignment.
- All main actions are **audited** in the activity log. Full request/response details are in **PROJECT.md**.

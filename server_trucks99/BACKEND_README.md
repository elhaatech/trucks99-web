# iTruck — Backend Documentation

One document that explains the **iTruck** backend: what it is, who uses it, how it works, and how to run it. For full request/response samples, see **API_DOCUMENTATION_FULL.md**.

---

## 1. What is iTruck?

**iTruck** is a **truck transport management** API server for a logistics platform. It manages:

| Concept | Description |
|--------|-------------|
| **Who** | Shippers, Buyers/Sellers, Agents, Loaders, Drivers |
| **What** | Loads (shipments) from one place to another |
| **How** | Trucks (and drivers) assigned to loads |

The backend exposes **REST APIs** so a frontend (e.g. itruck_ui) can handle login, users/roles, and the full workflow: create loads, assign agents, assign driver & truck, track status.

---

## 2. Who uses it?

| Role | Who they are | What they do |
|------|--------------|--------------|
| **Shipper** | Company/person who sends goods | Create loads; linked to loads via `shipperId`. View “my loads” via GET /api/load/by-shipper |
| **Buyer/Seller** | Party in the transaction (buy/sell/vendor) | Post load requests (pickup/drop, material, price). View “my requests” via GET /api/load/my |
| **Agent** | Transport agent | Assign agent to load; assign driver & truck to load. View “my assigned loads” via GET /api/load/by-agent |
| **Loader** | Party that loads goods | Linked to loads via `loaderId` |
| **Driver** | Person who drives the truck | Registered as Driver; assigned to load via PUT /api/load/assign-driver-truck |
| **Admin/User** | Logged-in user (any role) | Session-based; permissions control what they can see/do |

---

## 3. Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Session | express-session + MongoDB store |
| Auth | Passport (OTP flow + optional Google/GitHub) |
| OTP | Twilio (SMS), crypto (OTP in DB) |
| Config | .env (dotenv) |

---

## 4. Project structure (server)

```
server/
├── server.js              # Entry: connects MongoDB, runs app + seed
├── app.js                 # Express app: CORS, session, passport, routes
├── seedData.js            # Seeds roles, permissions, default users
├── schema/                # Mongoose models
│   ├── user.js, role.js, permission.js, log.js, otp.js
│   ├── load.js, truck.js, driver.js
│   ├── shipper.js, agent.js, loader.js, buySell.js
│   └── ...
├── views/                 # Route handlers
│   ├── login.js, signup.js, logout.js, otp.js
│   ├── handleLoad.js, handleTruck.js, handleDriver.js
│   ├── handleShipper.js, handleAgent.js, handleLoader.js, handleBuySell.js
│   ├── handleDashboard.js
│   ├── rbac/              # handleUser, handleRole, handlePermission, handleLog
│   └── google.js, github.js
├── helpers/               # permissions, Twilio SMS, OTP, JWT
├── API_DOCUMENTATION_FULL.md   # Full API (payloads & responses)
├── BACKEND_README.md           # This file
├── FLOW_EXPLAINED.md           # Flow narrative
└── PROJECT_EXPLANATION.md      # High-level explanation
```

---

## 5. Main entities and APIs

### Auth & users
- **OTP login:** POST /api/otp/send, POST /api/otp/verify (session created on verify).
- **User (RBAC):** GET /api/user (current user), signup, logout.
- **Role:** GET /api/role, POST /api/role/add, PUT /api/role/edit, DELETE /api/role/delete.
- **Permission:** GET /api/permission, POST /api/permission/add, PUT /api/permission/edit, DELETE /api/permission/delete.

### Domain entities (CRUD pattern)
Each has: **GET /all**, **GET /:id**, **POST /add**, **PUT /edit/:id**, **DELETE /delete** (body: `{ ids: [...] }`).

| Entity | Base path | Main fields |
|--------|-----------|-------------|
| **Buy/Sell** | /api/buysell | name, description, contactEmail, contactMobile, address, type (buy/sell/vendor), status |
| **Shipper** | /api/shipper | name, description, contactEmail, contactMobile, company, status, createdBy |
| **Loader** | /api/loader | name, description, contactEmail, contactMobile, company, status |
| **Agent** | /api/agent | name, description, contactEmail, contactMobile, region, status |
| **Driver** | /api/driver | name, contactMobile, contactEmail, licenseNumber, status |
| **Truck** | /api/truck | registrationNumber, driverName, driverId, capacity, status, currentLocation, contactNumber |
| **Load** | /api/load | title, origin, destination, status, weight, shipperId, buySellId, loaderId, agentId, assignedTruckId, assignedDriverId, pickupLocation, dropLocation, material, truckType, price, scheduledDate, userId, createdBy |

### Load-specific endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/load/all | List all loads |
| GET | /api/load/my?userId= | Buyer/Seller: loads where createdBy or userId = user |
| GET | /api/load/by-shipper?shipperId= | Shipper: loads where shipperId = shipper |
| GET | /api/load/by-agent?agentId= | Agent: loads where agentId = agent |
| GET | /api/load/available | Pending loads (optional: ?location=, ?origin=, ?destination=) |
| PUT | /api/load/assign-agent | Body: `{ loadId, agentId }` — assign agent to load |
| PUT | /api/load/assign-driver-truck | Body: `{ loadId, driverId, truckId }` — agent assigns driver & truck; load status → assigned |

### Shipper / Agent “my” lists
- **GET /api/shipper/my?userId=** — Shippers where createdBy = user (for Shipper view in UI).
- **GET /api/agent/my?userId=** — Agents where createdBy = user (for Agent view in UI).

### Dashboard
- **GET /api/dashboard/stats** — Aggregated counts (e.g. loads by status, trucks by status).

---

## 6. How the flows work

### 6.1 Main shipment flow
1. **Create load** — Shipper/Agent creates a load (origin, destination, weight, shipperId, buySellId, etc.). Status = **pending**.
2. **Available loads** — GET /api/load/available (optional filters) returns pending loads.
3. **Assign agent** — PUT /api/load/assign-agent with `{ loadId, agentId }`.
4. **Assign driver & truck** — PUT /api/load/assign-driver-truck with `{ loadId, driverId, truckId }`. Load status → **assigned**.
5. **Delivered** — Edit load and set status = **delivered**.

### 6.2 Buyer / Seller flow
1. **Post load request** — POST /api/load/add with `userId`, `pickupLocation`, `dropLocation`, `material`, `weight`, `truckType`, `price`, `scheduledDate`.
2. **My requests** — GET /api/load/my?userId=&lt;current_user_id&gt;.
3. **Cancel** — DELETE /api/load/delete with body `{ ids: [loadId] }`.

### 6.3 Shipper view
- **My shippers** — GET /api/shipper/my?userId= (shippers created by user).
- **My loads** — GET /api/load/by-shipper?shipperId= (loads linked to that shipper).

### 6.4 Agent view
- **My agents** — GET /api/agent/my?userId= (agents created by user).
- **My assigned loads** — GET /api/load/by-agent?agentId= (loads assigned to that agent).

### 6.5 Agent assignment payloads
- **Assign agent to load:** `PUT /api/load/assign-agent` — Body: `{ "loadId": "...", "agentId": "..." }`.
- **Assign driver & truck to load:** `PUT /api/load/assign-driver-truck` — Body: `{ "loadId": "...", "driverId": "...", "truckId": "..." }`.

---

## 7. Load model (summary)

Load has both “legacy” and “new” fields:

- **Legacy:** title, description, origin, destination, status, weight, shipperId, buySellId, loaderId, assignedTruckId, createdBy.
- **New (e.g. buyer/seller request):** userId, pickupLocation { address, lat, lng }, dropLocation { address, lat, lng }, material, truckType, price, scheduledDate.
- **Assignment:** agentId, assignedDriverId, assignedTruckId.

Status: **pending** → **assigned** (when truck/driver assigned) → **delivered**.

---

## 8. How to run

1. **Install:** `npm install`
2. **Environment:** Create `.env` with at least:
   - `MONGODB_ATLAS` (or your MongoDB connection string)
   - `SESSION_SECRET`
   - For OTP: Twilio credentials (see API_DOCUMENTATION_FULL.md or FLOW_EXPLAINED.md)
3. **Start:** `npm run dev` or `npm start`
4. **Base URL:** `http://localhost:3001` (or `PORT` in .env)

---

## 9. Where to look next

| Need | File |
|------|------|
| Full API (every endpoint, request/response samples) | **API_DOCUMENTATION_FULL.md** |
| Step-by-step flow narrative | **FLOW_EXPLAINED.md** |
| High-level project explanation | **PROJECT_EXPLANATION.md** |
| This backend overview | **BACKEND_README.md** (this file) |

---

## 10. Short summary

- **iTruck backend** = REST API for truck transport management: loads, shippers, agents, drivers, trucks, buy/sell.
- **Auth:** OTP-only login (Twilio), optional Google/GitHub; session in MongoDB.
- **RBAC:** Users, roles, permissions; activity log for key actions.
- **Flows:** Create load → assign agent → assign driver & truck → delivered; plus Buyer/Seller (post request, my requests) and Shipper/Agent views (my loads / my assigned loads).
- **Payloads:** Assign agent: `{ loadId, agentId }`. Assign driver & truck: `{ loadId, driverId, truckId }`.

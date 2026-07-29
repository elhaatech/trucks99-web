# iTruck Server — Documentation

This is the main documentation for the **iTruck** backend (Node.js/Express). Use it to understand, run, and integrate with the API.

---

## 1. What is iTruck?

iTruck is a **truck transport management** API server for a logistics platform. It supports:

- **Login:** OTP-only (mobile number → SMS OTP → session)
- **Four user/party types:** Buy/Sell, Shipper, Loader, Agent (each with full CRUD)
- **Transport:** Drivers, Trucks, Loads (shipments); assign trucks to loads
- **RBAC:** Users, roles, permissions, activity logs
- **Dashboard:** Aggregated stats (loads/trucks by status)

**Base URL:** `http://localhost:3001` (or your `PORT`)

---

## 2. Quick start

```bash
cd server
npm install
```

Create a `.env` file with at least:

| Variable | Description |
|----------|-------------|
| `MONGODB_ATLAS` | MongoDB connection URI |
| `SESSION_SECRET` | Secret for session |
| `TWILIO_ACCOUNT_SID` | (Optional) For OTP SMS |
| `TWILIO_AUTH_TOKEN` | (Optional) For OTP SMS |
| `TWILIO_PHONE_NUMBER` | (Optional) Sender number (E.164) |

Run:

```bash
npm run dev
```

Server listens on **port 3001** (or `PORT` in `.env`). Open `http://localhost:3001/` to see "server is up and running!".

---

## 3. Four user types (CRUD)

Each has the same pattern: **List all**, **Get one**, **Create**, **Edit by id**, **Delete by ids array**.

| User type | API base | List | Get one | Create | Edit | Delete |
|-----------|----------|------|---------|--------|------|--------|
| **Buy/Sell** | `/api/buysell` | GET `/all` | GET `/:id` | POST `/add` | PUT `/edit/:id` | DELETE `/delete` body `{ "ids": [...] }` |
| **Shipper** | `/api/shipper` | GET `/all` | GET `/:id` | POST `/add` | PUT `/edit/:id` | DELETE `/delete` body `{ "ids": [...] }` |
| **Loader** | `/api/loader` | GET `/all` | GET `/:id` | POST `/add` | PUT `/edit/:id` | DELETE `/delete` body `{ "ids": [...] }` |
| **Agent** | `/api/agent` | GET `/all` | GET `/:id` | POST `/add` | PUT `/edit/:id` | DELETE `/delete` body `{ "ids": [...] }` |

**Create/Edit body (example for any):**  
`name`, `description`, `contactEmail`, `contactMobile`, plus entity-specific fields (e.g. Shipper: `company`; Agent: `region`; Buy/Sell: `address`, `type`). Optional: `user` or `requestingUser` for audit log.

---

## 4. Other entities

| Entity | API base | Purpose |
|--------|----------|---------|
| **Driver** | `/api/driver` | Driver / truck owner; link to trucks |
| **Truck** | `/api/truck` | Vehicle (registration, driver, capacity, currentLocation, status) |
| **Load** | `/api/load` | One shipment (origin, destination, weight, status; link shipperId, buySellId, loaderId, assignedTruckId) |

**Load flow:** Create load (pending) → **GET /api/load/available** (optional `?location=`) → Assign truck (PUT load with `assignedTruckId`) → Mark delivered (PUT load `status: "delivered"`).

---

## 5. Login (OTP only)

1. **Send OTP:**  
   `POST /api/otp/send`  
   Body: `{ "mobile": "9876543210" }`  
   (User must exist in DB with that mobile.)

2. **Verify and log in:**  
   `POST /api/otp/verify`  
   Body: `{ "mobile": "9876543210", "otp": "123456" }`  
   Response: session cookie + user object.

---

## 6. API summary

| Area | Endpoints |
|------|-----------|
| **Health** | GET `/` |
| **Auth** | POST `/api/login`, POST `/api/signup`, DELETE `/api/logout` |
| **OTP** | POST `/api/otp/send`, POST `/api/otp/verify` |
| **User (RBAC)** | GET `/api/user`, GET `/api/user/all`, GET `/api/user/:id`, POST `/api/user/add`, PUT `/api/user/edit/:id`, DELETE `/api/user/delete` |
| **Roles** | GET/POST/PUT/DELETE `/api/role` |
| **Permissions** | GET/POST/PUT/DELETE `/api/permission` |
| **Log** | GET `/api/log`, POST `/api/log/add` |
| **Buy/Sell** | GET `/api/buysell/all`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Shipper** | GET `/api/shipper/all`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Loader** | GET `/api/loader/all`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Agent** | GET `/api/agent/all`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Driver** | GET `/api/driver/all`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Truck** | GET `/api/truck/all`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Load** | GET `/api/load/all`, GET `/api/load/available`, GET `/:id`, POST `/add`, PUT `/edit/:id`, DELETE `/delete` |
| **Dashboard** | GET `/api/dashboard/stats` |

---

## 7. Project structure

```
server/
├── server.js           # Entry: DB connect, seed, listen
├── app.js              # Express app, routes
├── seedData.js         # Seed roles, permissions, users
├── schema/             # Mongoose models (user, load, truck, shipper, loader, agent, buySell, driver, log, otp, etc.)
├── views/              # Route handlers (login, signup, otp, handleLoad, handleTruck, handleShipper, handleLoader, handleAgent, handleBuySell, handleDriver, rbac/, etc.)
└── helpers/            # permissions, JWT, Twilio SMS
```

---

## 8. Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Session | express-session + MongoDB store |
| Auth | Passport; OTP via Twilio SMS |
| Config | .env (dotenv) |

---

## 9. Other doc files in this project

| File | Contents |
|------|----------|
| **PROJECT.md** | Full API reference, env vars, schemas, request/response examples for every endpoint |
| **PROJECT_EXPLANATION.md** | High-level explanation: what the project is, who uses it, how the flow works |
| **FLOW_EXPLAINED.md** | Step-by-step flow (e.g. Dubai → Chennai) and who does what |
| **DOCUMENTATION.md** | This file — overview and quick reference |

For **detailed request/response examples** (headers, body, status codes) for each API, see **PROJECT.md**.

---

## 10. Contact / support

- **Author:** Roxylius  
- **License:** ISC  
- For full endpoint details and examples, open **PROJECT.md** in the `server` folder.

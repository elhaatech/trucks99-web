# iTruck — Frontend Documentation

One document that explains the **iTruck** frontend (itruck_ui): what it is, structure, routes, API client, components, and how to run it. The backend is documented in **server/BACKEND_README.md** and **server/API_DOCUMENTATION_FULL.md**.

---

## 1. What is it?

**itruck_ui** is the web frontend for the iTruck logistics platform. It talks to the iTruck backend (REST API) and provides:

- **Auth:** OTP login (send OTP → verify → session), signup (with role), logout.
- **Dashboard:** Main dashboard, sidebar navigation, profile/settings.
- **RBAC:** Roles and Permissions CRUD (list, add, edit, delete, bulk delete).
- **Domain CRUD:** Loads, Agents, Shippers, Buy/Sell — list, add, edit, delete, bulk delete.
- **Load flows:** Assign agent to load; assign driver & truck to load; view filters (All / By Shipper / By Agent).
- **Role views:** Shipper view (my loads), Agent view (my assigned loads), Buyer/Seller flow (post load request, my requests).

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| UI | React 19, Material UI (MUI) v7, Emotion |
| Charts | Recharts |
| Language | TypeScript |
| API | Fetch with credentials (session cookie); base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) |

---

## 3. Project structure (itruck_ui)

```
itruck_ui/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (theme, fonts)
│   ├── page.tsx                  # Home (renders dashboard)
│   ├── globals.css
│   ├── ThemeRegistry.tsx         # MUI theme provider
│   ├── login/page.tsx            # OTP login (send OTP → verify → redirect dashboard)
│   ├── register/page.tsx         # Signup (email, name, mobile, roleId)
│   └── dashboard/
│       ├── layout.tsx            # Fetches user, wraps children in DashboardLayout
│       ├── page.tsx              # Dashboard home (stats, charts)
│       ├── profile/page.tsx      # Profile
│       ├── settings/page.tsx     # Settings
│       ├── roles/page.tsx        # Roles CRUD
│       ├── permissions/page.tsx  # Permissions CRUD
│       ├── load/page.tsx         # Loads CRUD + assign agent + assign driver & truck + view filters
│       ├── agent/page.tsx        # Agents CRUD + link to Agent view
│       ├── shipper/page.tsx      # Shippers CRUD + link to Shipper view
│       ├── buysell/page.tsx      # Buy/Sell CRUD + link to Buyer/Seller flow
│       ├── buyer-seller/page.tsx # Buyer/Seller flow: post load request, my requests
│       ├── shipper-view/page.tsx # Shipper view: my shippers, loads by shipper
│       ├── agent-view/page.tsx   # Agent view: my agents, loads by agent
│       ├── admin/page.tsx
│       └── messages/page.tsx
├── components/
│   ├── dashboard/                # Dashboard layout and widgets
│   │   ├── AppSidebar.tsx        # Sidebar nav (Dashboard, Roles, Loads, Agents, Shippers, Buy/Sell, Profile, Settings, Logout)
│   │   ├── DashboardLayout.tsx   # Wrapper: sidebar + main content area
│   │   ├── DashboardCard.tsx
│   │   ├── ProgressRing.tsx
│   │   └── SectionTitle.tsx
│   ├── layout/                   # Auth layout and panels
│   │   ├── AuthLayout.tsx
│   │   ├── WelcomePanel.tsx
│   │   └── index.ts
│   └── ui/                       # Shared UI
│       ├── DataTable.tsx         # Table with columns, actions, selectable rows
│       ├── FormDialog.tsx        # Modal form (title, content, submit/cancel)
│       ├── PageHeader.tsx        # Page title, subtitle, action button
│       ├── AuthTextField.tsx
│       ├── GradientButton.tsx
│       ├── SocialLoginButton.tsx
│       ├── ModulesSelector.tsx
│       └── index.ts
├── lib/
│   ├── api.ts                    # All API types and functions (auth, RBAC, domain, load flows)
│   ├── theme.ts                  # PRIMARY, SECONDARY, GRADIENT, CHART_COLORS
│   └── modules.ts
├── next.config.ts
├── package.json
└── FRONTEND_README.md            # This file
```

---

## 4. Routes and pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Renders dashboard (getCurrentUser; redirects handled by app). |
| `/login` | Login | OTP: enter mobile → send OTP → enter OTP → verify → redirect `/dashboard`. |
| `/register` | Register | Signup: email, name, mobile, roleId (roles from API). |
| `/dashboard` | Dashboard | Main dashboard (stats, charts). Uses DashboardLayout (sidebar + content). |
| `/dashboard/roles` | Roles | Roles CRUD; permissions per role. |
| `/dashboard/permissions` | Permissions | Permissions CRUD. |
| `/dashboard/load` | Loads | Loads CRUD; view filters (All / By Shipper / By Agent); row actions: Edit, Assign agent, Assign driver & truck, Delete; bulk delete. |
| `/dashboard/agent` | Agents | Agents CRUD; button "View my loads" → `/dashboard/agent-view`. |
| `/dashboard/shipper` | Shippers | Shippers CRUD; button "View my loads" → `/dashboard/shipper-view`. |
| `/dashboard/buysell` | Buy/Sell | Buy/Sell CRUD; button "Post load request" → `/dashboard/buyer-seller`. |
| `/dashboard/buyer-seller` | Buyer/Seller flow | Post load request (pickup, drop, material, weight, truck type, price, date); table "My load requests" (getMyLoads); cancel. |
| `/dashboard/shipper-view` | Shipper view | Select shipper (my shippers or all); table of loads (getLoadsByShipper) with Agent column. |
| `/dashboard/agent-view` | Agent view | Select agent (my agents or all); table of loads (getLoadsByAgent) with Shipper column. |
| `/dashboard/profile` | Profile | User profile. |
| `/dashboard/settings` | Settings | Settings. |

---

## 5. Sidebar navigation

**Main nav:** Dashboard, Roles, Loads, Agents, Shippers, Buy/Sell.  
**Bottom:** Profile, Settings, Logout.

View/flow pages (Shipper view, Agent view, Buyer/Seller flow) are **not** in the sidebar; they are reached from Shippers, Agents, and Buy/Sell pages via buttons.

---

## 6. API client (lib/api.ts)

All backend calls go through a single `api<T>(path, options)` helper with `credentials: "include"` and JSON headers. Base URL: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"`.

### Auth
- `sendOtp(mobile)`, `verifyOtp(mobile, otp)` — OTP login.
- `signup({ email, password, name, mobile, roleId })`.
- `getCurrentUser()`, `logout()`.

### RBAC
- Roles: `getRoles()`, `createRole(body)`, `updateRole(body)`, `deleteRole(name, user?)`.
- Permissions: `getPermissions()`, `createPermission(body)`, `updatePermission(body)`, `deletePermission(title_name, user?)`.

### Domain entities (CRUD)
- **Buy/Sell:** `getBuySellAll()`, `getBuySell(id)`, `createBuySell(body)`, `updateBuySell(id, body)`, `deleteBuySell(ids)`.
- **Shipper:** `getShipperAll()`, `getMyShippers(userId)`, `getShipper(id)`, `createShipper(body)`, `updateShipper(id, body)`, `deleteShipper(ids)`.
- **Agent:** `getAgentAll()`, `getMyAgents(userId)`, `getAgent(id)`, `createAgent(body)`, `updateAgent(id, body)`, `deleteAgent(ids)`.
- **Loader:** `getLoaderAll()` (for Load form).
- **Truck:** `getTruckAll()` (for Load form and assign driver/truck).
- **Driver:** `getDriverAll()` (for assign driver/truck).

### Load
- `getLoadAll()`, `getLoad(id)`, `getMyLoads(userId)`, `getLoadsByShipper(shipperId)`, `getLoadsByAgent(agentId)`.
- `createLoad(body)` — body: CreateLoadPayload (title, pickupLocation, dropLocation, material, weight, truckType, price, scheduledDate, userId, etc.).
- `updateLoad(id, body)`, `deleteLoad(ids)`.
- `assignLoadAgent(loadId, agentId)` — PUT /api/load/assign-agent.
- `assignLoadDriverTruck(loadId, driverId, truckId)` — PUT /api/load/assign-driver-truck.

### Types (summary)
- **User**, **Role**, **Permission**, **RolePermission**, **PermissionAccess**, **ApiUser**.
- **BuySell**, **Shipper**, **Agent**, **Loader**, **Truck**, **Driver**.
- **Load**, **LoadLocation**, **CreateLoadPayload**.

---

## 7. Shared UI components

| Component | Purpose |
|-----------|---------|
| **DataTable** | Table with configurable columns, row actions (e.g. Edit, Delete), optional selectable rows and bulk actions, loading/empty state. |
| **FormDialog** | Modal with title, content, submit/cancel; handles submit loading. |
| **PageHeader** | Page title, subtitle, and optional action (e.g. "Add …" button). |
| **AuthTextField**, **GradientButton**, **SocialLoginButton** | Used on login/register. |

---

## 8. Main flows in the UI

### 8.1 Login
1. User opens `/login`.
2. Enters mobile → "Send OTP" → `sendOtp(mobile)`.
3. Enters OTP → "Verify" → `verifyOtp(mobile, otp)` → on success redirect to `/dashboard`.

### 8.2 Loads (full flow)
1. **List:** All loads, or filter By Shipper / By Agent (dropdowns).
2. **Add/Edit:** FormDialog with title, material, pickup/drop locations (address, lat, lng), weight, truck type, price, scheduled date, userId, shipper, buy/sell, loader, agent, assigned truck.
3. **Assign agent:** Row action → dialog with agent dropdown → `assignLoadAgent(loadId, agentId)`.
4. **Assign driver & truck:** Row action → dialog with driver and truck dropdowns → `assignLoadDriverTruck(loadId, driverId, truckId)`.
5. **Delete:** Single or bulk (select rows → Delete selected).

### 8.3 Shipper view
1. User goes to Shippers → "View my loads" or directly to `/dashboard/shipper-view`.
2. Select shipper (my shippers from `getMyShippers(userId)` or all).
3. Table shows loads from `getLoadsByShipper(shipperId)` with columns including **Agent**.

### 8.4 Agent view
1. User goes to Agents → "View my loads" or directly to `/dashboard/agent-view`.
2. Select agent (my agents from `getMyAgents(userId)` or all).
3. Table shows loads from `getLoadsByAgent(agentId)` with columns including **Shipper**.

### 8.5 Buyer/Seller flow
1. User goes to Buy/Sell → "Post load request" or directly to `/dashboard/buyer-seller`.
2. Form: pickup (address, lat, lng), drop (address, lat, lng), material, weight, truck type, price, scheduled date → `createLoad({ userId: currentUser.id, ... })`.
3. Table "My load requests" from `getMyLoads(currentUser.id)`; optional "Cancel" per row → `deleteLoad([id])`.

---

## 9. Theme and config

- **lib/theme.ts:** `PRIMARY` (#6B4EAA), `SECONDARY`, `GRADIENT`, `CHART_COLORS` — used for buttons and charts.
- **API base:** `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Must match backend URL and CORS.

---

## 10. How to run

1. **Install:** `npm install`
2. **Env (optional):** Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001` if the API is elsewhere.
3. **Backend:** Ensure the iTruck server is running (e.g. `npm run dev` in `server/` on port 3001).
4. **Local development:** `npm start` or `npm run dev` — Next.js development server on port 3004 with hot reload. Do not run `npm run build` for UI/code changes.
5. **Production only:** `npm run build` then `npm run start:prod`.

---

## 11. Where to look next

| Need | Location |
|------|----------|
| Backend overview and API summary | **server/BACKEND_README.md** |
| Full API request/response samples | **server/API_DOCUMENTATION_FULL.md** |
| Backend flow narrative | **server/FLOW_EXPLAINED.md** |
| This frontend overview | **itruck_ui/FRONTEND_README.md** (this file) |

---

## 12. Short summary

- **itruck_ui** = Next.js (App Router) + React + MUI frontend for iTruck.
- **Auth:** OTP login, signup with role, session cookie to backend.
- **Dashboard:** Sidebar (Dashboard, Roles, Loads, Agents, Shippers, Buy/Sell, Profile, Settings); each CRUD page uses DataTable, FormDialog, PageHeader.
- **Loads:** CRUD + assign agent + assign driver & truck + view by All / Shipper / Agent.
- **Role views:** Shipper view (my loads), Agent view (my assigned loads), Buyer/Seller flow (post request, my requests) — reached from Shippers, Agents, Buy/Sell pages.
- **API:** All calls in `lib/api.ts`; types for User, Role, Permission, BuySell, Shipper, Agent, Loader, Truck, Driver, Load; assign agent and assign driver/truck helpers.

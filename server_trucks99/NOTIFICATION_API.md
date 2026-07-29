# Notification API

Base URL for all requests: your API root (e.g. `http://localhost:3001`).  
Send `Authorization: Bearer <token>` and `Content-Type: application/json` where a body is used.

---

## 1. List notifications

**Request**

```http
GET /api/notification
GET /api/notification?userId=USER_ID
```

| Param    | Type   | Description |
|----------|--------|-------------|
| `userId` | string | Optional. User's `_id` or uuid. If omitted, server uses the authenticated user. |

**Response (200)** — array of notifications (latest first, max 100):

```json
[
  {
    "_id": "69aa861b906ab59c442129b8",
    "id": "b2beae47-79ab-4a7d-b75f-daa58a486f1d",
    "userId": "69a981a17077c79150784242",
    "title": "New Bid",
    "message": "Joy (+919600793434) placed a bid of ₹8,500 on your load — Fuel and toll",
    "loadId": "69aa8548906ab59c44212975",
    "read": false,
    "createdAt": "2026-03-06T07:45:31.762Z",
    "updatedAt": "2026-03-06T07:45:31.762Z"
  }
]
```

**No request body.**

---

## 2. Mark one notification as read

**Request**

```http
PUT /api/notification/:id/read
```

| Path param | Type   | Description |
|------------|--------|-------------|
| `id`       | string | Notification `_id` or `id` (uuid). |

**Response (200)** — updated notification object (e.g. `read: true`).

**No request body.**

---

## 3. Mark all notifications as read

**Request**

```http
PUT /api/notification/read-all
```

**Request body (optional)**

```json
{
  "userId": "69a981a17077c79150784242"
}
```

| Field    | Type   | Description |
|----------|--------|-------------|
| `userId` | string | Optional. User's `_id` or uuid. If omitted, server uses the authenticated user. |

**Response (200)**

```json
{
  "message": "All notifications marked as read"
}
```

---

## Summary

| Method | Endpoint                      | Payload / query              | Purpose            |
|--------|-------------------------------|------------------------------|--------------------|
| GET    | `/api/notification`           | Query: `userId` (optional)   | List notifications |
| PUT    | `/api/notification/read-all`  | Body: `{ "userId": "..." }` (optional) | Mark all read   |
| PUT    | `/api/notification/:id/read`   | —                            | Mark one as read   |

---

## Who receives notifications

Only the **load owner** receives notifications.

- **Load owner** = user identified by `load.createdBy` or `load.userId`.

---

## When notifications are created (server-side)

The client **does not** create notifications via the notification API. The server creates them in these cases:

### 1. Someone places or updates a bid on a load

- **POST** `/api/load/bit-records` (create bit record)
- **PUT** `/api/load/edit/:id` (when `bit` is sent and a new bit record is created)

If the actor is **not** the load owner, the server creates one notification for the owner:

- **title:** `"New Bid"`
- **message:** `"{userName} ({userEmail}) placed a bid of ₹{amount} on your load — {bitReason}"`  
  (contact and reason omitted if not present)
- **loadId:** load’s `_id`

### 2. Driver accepts or rejects the load

- **PUT** `/api/load/driver-status`  
  Body: `{ "loadId", "driverId", "status": "accepted" | "rejected", "rejectReason?" }`

The server creates one notification for the load owner:

- **Accepted:**  
  **title:** `"Load Accepted"`  
  **message:** `"{driverName} accepted your load"`
- **Rejected:**  
  **title:** `"Load Rejected"`  
  **message:** `"{driverName} rejected your load: {rejectReason}"`  
  (reason only if provided)

---

## Notification model (schema)

| Field       | Type    | Description                    |
|------------|---------|--------------------------------|
| `id`       | string  | UUID (optional, generated)     |
| `_id`      | ObjectId| Mongo ID                       |
| `userId`   | ObjectId| Recipient user (ref: User)     |
| `title`    | string  | Required                       |
| `message`  | string  | Required                       |
| `loadId`   | ObjectId| Optional; ref: Load           |
| `read`     | boolean | Default `false`                |
| `createdAt`| Date    | Set by timestamps              |
| `updatedAt`| Date    | Set by timestamps              |

---

## UI behaviour

- **Bell icon** (top of dashboard): shows unread count; dropdown lists latest notifications and links to load view.
- **“View load details”** / notification click: navigates to `/dashboard/new-load/view/{loadId}`.
- **Notifications page** (`/dashboard/notifications`): full list, “Mark read” and “Mark all read” use the APIs above.

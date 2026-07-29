# iTruck API Documentation

**Base URL:** `http://localhost:3001` (or your server URL)

**Content-Type:** `application/json`

**Credentials:** Session cookie (credentials: include) for authenticated endpoints

---

## 1. Create Load

**HTTP Request**

```
POST /api/load/add
Content-Type: application/json
```

**Request Payload**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| createdBy | string | No | User ID (ObjectId). Uses session user if logged in. |
| mobileNumber | string | No | Contact mobile (e.g. 9876543210) |
| loadType | string | No | Type of load (e.g. Steel) |
| weight | number/string | No | Weight (e.g. 20) |
| price | number | No | Price (e.g. 50000) |
| distanceKm | number | No | Distance in km (e.g. 350) |
| pickupLocation | string \| object | No | Address string (e.g. "Chennai") or `{ address, lat, lng }` |
| dropLocation | string \| object | No | Address string (e.g. "Delhi") or `{ address, lat, lng }` |
| title | string | No | Load title (auto-derived from locations if omitted) |
| material | string | No | Material type |
| truckType | string | No | Truck type |
| scheduledDate | string | No | ISO date (e.g. "2026-02-25") |
| shipperId | string | No | Shipper ObjectId |
| agentId | string | No | Agent ObjectId |

**Example Request**

```json
{
  "createdBy": "USER_ID",
  "mobileNumber": "9876543210",
  "loadType": "Steel",
  "weight": 20,
  "price": 50000,
  "distanceKm": 350,
  "pickupLocation": "Chennai",
  "dropLocation": "Delhi"
}
```

**Response (201 Created)**

```json
{
  "success": true,
  "message": "Load created successfully",
  "data": {
    "loadId": "LOAD123",
    "status": "pending"
  },
  "load": {
    "_id": "LOAD123",
    "title": "Chennai → Delhi",
    "status": "pending",
    "loadType": "Steel",
    "weight": 20,
    "price": 50000,
    "distanceKm": 350,
    "mobileNumber": "9876543210",
    "pickupLocation": { "address": "Chennai", "lat": 0, "lng": 0 },
    "dropLocation": { "address": "Delhi", "lat": 0, "lng": 0 },
    "createdAt": "2026-02-22T10:00:00.000Z",
    "updatedAt": "2026-02-22T10:00:00.000Z"
  }
}
```

---

## 2. Assign Driver

**HTTP Request**

```
PUT /api/load/assign-driver
Content-Type: application/json
```

**Request Payload**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| loadId | string | Yes | Load ObjectId |
| driverId | string | Yes | Driver ObjectId |
| assignedBy | string | No | User ID (uses session user if omitted) |

**Example Request**

```json
{
  "loadId": "LOAD123",
  "driverId": "DRIVER_ID",
  "assignedBy": "USER_ID"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "load": {
    "_id": "LOAD123",
    "assignedDriverId": "DRIVER_ID",
    "status": "assigned",
    "title": "Chennai → Delhi",
    ...
  }
}
```

---

## 3. Driver Accept / Reject Load

**HTTP Request**

```
PUT /api/load/driver-status
Content-Type: application/json
```

**Request Payload (Accept)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| loadId | string | Yes | Load ObjectId |
| driverId | string | Yes | Driver ObjectId |
| status | string | Yes | `"accepted"` or `"rejected"` |
| rejectReason | string | No | Required when status is `"rejected"` |

**Example Request (Accept)**

```json
{
  "loadId": "LOAD123",
  "driverId": "DRIVER_ID",
  "status": "accepted"
}
```

**Example Request (Reject)**

```json
{
  "loadId": "LOAD123",
  "driverId": "DRIVER_ID",
  "status": "rejected",
  "rejectReason": "Truck problem"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Status updated successfully",
  "load": {
    "_id": "LOAD123",
    "status": "accepted",
    "assignedDriverId": "DRIVER_ID",
    ...
  }
}
```

**Note:** When driver accepts or rejects, a notification is automatically created for the load creator (userId).

---

## 4. Bit Accept / Reject (Load & Truck)

Bit records track bargaining history. Use the edit endpoints with `bit`, `bitReason`, and `bitStatus` to add a new bit record with accept/reject status.

**Shared HTTP Request Format**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bit | number | Yes | Bit amount (e.g. 50000) |
| bitStatus | string | No | `"accept"`, `"reject"`, or `"pending"` (default: `"pending"`) |
| bitReason | string | No | Reason for the bit |

**Load — HTTP Request**

```
PUT /api/load/edit/:id
Content-Type: application/json
```

**Example Request (Bit Accept)**

```json
{
  "bit": 50000,
  "bitStatus": "accept",
  "bitReason": "Final price agreed"
}
```

**Example Request (Bit Reject)**

```json
{
  "bit": 45000,
  "bitStatus": "reject",
  "bitReason": "Price too low"
}
```

**Truck — HTTP Request**

```
PUT /api/truck/edit/:id
Content-Type: application/json
```

Same payload: `{ "bit", "bitStatus", "bitReason" }` — `bitStatus` values: `"accept"`, `"reject"`, `"pending"`.

**Get Bit Records**

- Load: `GET /api/load/bit-records/:loadId`
- Truck: `GET /api/truck/bit-records/:truckId`

**Update bit record status only (no new bid)**

- Load: `PUT /api/load/bit-records/:id` — body: `{ "status": "accept" | "reject" | "pending" }` (`:id` = bit record _id or uuid)
- Truck: `PUT /api/truck/bit-records/:id` — same body (`:id` = bit record _id or uuid)

---

## 5. Notification Payload (Auto by Backend)

When driver accepts:

```json
{
  "userId": "USER_ID",
  "title": "Load Accepted",
  "message": "Driver accepted your load",
  "loadId": "LOAD123"
}
```

When driver rejects:

```json
{
  "userId": "USER_ID",
  "title": "Load Rejected",
  "message": "Driver rejected your load",
  "loadId": "LOAD123"
}
```

---

## 6. Driver Update Location

**HTTP Request**

```
PUT /api/driver/update-location
Content-Type: application/json
```

**Request Payload**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driverId | string | Yes | Driver ObjectId |
| latitude | number | Yes | Latitude (e.g. 13.0827) |
| longitude | number | Yes | Longitude (e.g. 80.2707) |

**Example Request**

```json
{
  "driverId": "DRIVER_ID",
  "latitude": 13.0827,
  "longitude": 80.2707
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Location updated",
  "driver": {
    "_id": "DRIVER_ID",
    "name": "John Driver",
    "latitude": 13.0827,
    "longitude": 80.2707,
    ...
  }
}
```

---

## 7. Get Nearby Loads

**HTTP Request**

```
GET /api/load/nearby?latitude=13.0827&longitude=80.2707&radiusKm=50
```

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| latitude | number | Yes | Your latitude |
| longitude | number | Yes | Your longitude |
| radiusKm | number | No | Search radius in km (default: 50) |

**Example Request**

```
GET /api/load/nearby?latitude=13.0827&longitude=80.2707&radiusKm=50
```

**Response (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "_id": "LOAD123",
      "title": "Chennai → Delhi",
      "status": "pending",
      "pickupLocation": { "address": "Chennai", "lat": 13.0827, "lng": 80.2707 },
      "dropLocation": { "address": "Delhi", "lat": 28.6139, "lng": 77.209 },
      "loadType": "Steel",
      "weight": 20,
      "price": 50000,
      "distanceKm": 350,
      ...
    }
  ]
}
```

---

## 8. Get Notifications

**HTTP Request**

```
GET /api/notification
GET /api/notification?userId=USER_ID
```

**Response (200 OK)**

```json
[
  {
    "_id": "NOTIF123",
    "userId": "USER_ID",
    "title": "Load Accepted",
    "message": "Driver accepted your load",
    "loadId": "LOAD123",
    "read": false,
    "createdAt": "2026-02-22T10:05:00.000Z"
  }
]
```

---

## 9. Mark Notification Read

**HTTP Request**

```
PUT /api/notification/:id/read
```

**Response (200 OK)**

```json
{
  "_id": "NOTIF123",
  "userId": "USER_ID",
  "title": "Load Accepted",
  "message": "Driver accepted your load",
  "loadId": "LOAD123",
  "read": true,
  "createdAt": "2026-02-22T10:05:00.000Z"
}
```

---

## 10. Mark All Notifications Read

**HTTP Request**

```
PUT /api/notification/read-all
Content-Type: application/json
```

**Request Payload (optional)**

```json
{
  "userId": "USER_ID"
}
```

**Response (200 OK)**

```json
{
  "message": "All notifications marked as read"
}
```

---

## 11. Additional Load Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/load/all` | List all loads |
| GET | `/api/load/my?userId=xxx` | Loads for buyer/seller |
| GET | `/api/load/available` | Pending loads (optional: `?location=`, `?origin=`, `?destination=`) |
| GET | `/api/load/by-driver?driverId=xxx` | Loads assigned to driver |
| GET | `/api/load/by-shipper?shipperId=xxx` | Loads by shipper |
| GET | `/api/load/by-agent?agentId=xxx` | Loads by agent |
| GET | `/api/load/:id` | Get one load |
| GET | `/api/load/bit-records/:loadId` | Get bit records (bargaining history) |
| PUT | `/api/load/bit-records/:id` | Update only bit record status (body: `{ status: "accept" \| "reject" \| "pending" }`, `:id` = bit record _id or uuid) |
| PUT | `/api/load/assign-agent` | Assign agent (body: `{ loadId, agentId }`) |
| PUT | `/api/load/assign-driver-truck` | Assign driver & truck (body: `{ loadId, driverId, truckId }`) |
| PUT | `/api/load/edit/:id` | Update load |
| DELETE | `/api/load/delete` | Delete loads (body: `{ ids: ["id1", "id2"] }`) |

---

## cURL Examples

### Create Load

```bash
curl -X POST http://localhost:3001/api/load/add \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "USER_ID",
    "mobileNumber": "9876543210",
    "loadType": "Steel",
    "weight": 20,
    "price": 50000,
    "distanceKm": 350,
    "pickupLocation": "Chennai",
    "dropLocation": "Delhi"
  }'
```

### Assign Driver

```bash
curl -X PUT http://localhost:3001/api/load/assign-driver \
  -H "Content-Type: application/json" \
  -d '{
    "loadId": "LOAD123",
    "driverId": "DRIVER_ID",
    "assignedBy": "USER_ID"
  }'
```

### Driver Accept Load

```bash
curl -X PUT http://localhost:3001/api/load/driver-status \
  -H "Content-Type: application/json" \
  -d '{
    "loadId": "LOAD123",
    "driverId": "DRIVER_ID",
    "status": "accepted"
  }'
```

### Driver Reject Load

```bash
curl -X PUT http://localhost:3001/api/load/driver-status \
  -H "Content-Type: application/json" \
  -d '{
    "loadId": "LOAD123",
    "driverId": "DRIVER_ID",
    "status": "rejected",
    "rejectReason": "Truck problem"
  }'
```

### Update bit record status only (Load)

Update only the status of an existing bit record (no new bid amount). `BIT_RECORD_ID` is the bit record's `_id` or `id` (uuid).

```bash
curl -X PUT http://localhost:3001/api/load/bit-records/BIT_RECORD_ID \
  -H "Content-Type: application/json" \
  -d '{ "status": "accept" }'
```

**Request body:** `{ "status": "accept" | "reject" | "pending" }`  
**Response (200):** `{ "message": "Bit record status updated", "bitRecord": { ... } }`

### Bit Accept (Load)

```bash
curl -X PUT http://localhost:3001/api/load/edit/LOAD123 \
  -H "Content-Type: application/json" \
  -d '{
    "bit": 50000,
    "bitStatus": "accept",
    "bitReason": "Final price agreed"
  }'
```

### Bit Reject (Load)

```bash
curl -X PUT http://localhost:3001/api/load/edit/LOAD123 \
  -H "Content-Type: application/json" \
  -d '{
    "bit": 45000,
    "bitStatus": "reject",
    "bitReason": "Price too low"
  }'
```

### Bit Accept/Reject (Truck)

Same format — use `PUT /api/truck/edit/:truckId` with `{ "bit", "bitStatus", "bitReason" }`. To update only the status of an existing bit record, use `PUT /api/truck/bit-records/BIT_RECORD_ID` with body `{ "status": "accept" | "reject" | "pending" }`.

### Driver Update Location

```bash
curl -X PUT http://localhost:3001/api/driver/update-location \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "DRIVER_ID",
    "latitude": 13.0827,
    "longitude": 80.2707
  }'
```

### Get Nearby Loads

```bash
curl "http://localhost:3001/api/load/nearby?latitude=13.0827&longitude=80.2707&radiusKm=50"
```

### Get Notifications

```bash
curl http://localhost:3001/api/notification \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

---

## Load Status Values

| Status | Description |
|--------|-------------|
| pending | Load created, not yet assigned |
| assigned | Driver assigned, awaiting accept/reject |
| accepted | Driver accepted the load |
| rejected | Driver rejected the load |
| delivered | Load delivered |

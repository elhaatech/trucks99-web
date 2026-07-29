# Truck API – Payload & Response

Base URL: `http://localhost:3001/api/truck`

---

## GET /api/truck/all

**Request:**
```
GET /api/truck/all
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012366",
    "registrationNumber": "TN-01-AB-1234",
    "driverName": "Raj Kumar",
    "driverId": "674a1b2c3d4e5f6789012345",
    "capacity": "10 tonne",
    "status": "available",
    "currentLocation": "Chennai",
    "contactNumber": "9876543210",
    "createdBy": "674a1b2c3d4e5f6789012300",
    "createdAt": "2025-02-22T10:00:00.000Z",
    "updatedAt": "2025-02-22T10:00:00.000Z"
  }
]
```

---

## GET /api/truck/:id

**Request:**
```
GET /api/truck/674a1b2c3d4e5f6789012366
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "674a1b2c3d4e5f6789012366",
  "registrationNumber": "TN-01-AB-1234",
  "driverName": "Raj Kumar",
  "driverId": "674a1b2c3d4e5f6789012345",
  "capacity": "10 tonne",
  "status": "available",
  "currentLocation": "Chennai",
  "contactNumber": "9876543210",
  "createdBy": "674a1b2c3d4e5f6789012300",
  "createdAt": "2025-02-22T10:00:00.000Z",
  "updatedAt": "2025-02-22T10:00:00.000Z"
}
```

---

## POST /api/truck/add

**Request:**
```
POST /api/truck/add
Content-Type: application/json
Authorization: Bearer <token>

{
  "registrationNumber": "TN-01-AB-1234",
  "driverName": "Raj Kumar",
  "driverId": "674a1b2c3d4e5f6789012345",
  "truckType": "LCV",
  "capacity": "10 tonne",
  "vehicleBody": "Closed Body",
  "containerFeet": "",
  "status": "available",
  "currentLocation": "Chennai",
  "contactNumber": "9876543210",
  "createdBy": "674a1b2c3d4e5f6789012300",
  "user": {
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Payload fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| registrationNumber | string | No | Vehicle registration number |
| driverName | string | No | Driver name (text) |
| driverId | string | No | ObjectId of Driver (ref) |
| truckType | string | No | `LCV`, `Container` |
| capacity | string | **Yes** | e.g. "10 tonne", "5 tonne" |
| vehicleBody | string | No | `Open Body`, `Closed Body` |
| containerFeet | string | No | `32 ft Mxl`, `32 ft Mxl HQ` (for Container type) |
| status | string | No | `available`, `in-transit`, `maintenance`, `unavailable` (default: `available`) |
| currentLocation | string | No | Current location |
| contactNumber | string | No | Contact number |
| createdBy | string | No | User ObjectId who created |
| user | object | No | Audit: `{ name, email, role }` |

**Response (201):**
```json
{
  "message": "truck created successfully",
  "truck": {
    "_id": "674a1b2c3d4e5f6789012366",
    "registrationNumber": "TN-01-AB-1234",
    "driverName": "Raj Kumar",
    "driverId": "674a1b2c3d4e5f6789012345",
    "capacity": "10 tonne",
    "status": "available",
    "currentLocation": "Chennai",
    "contactNumber": "9876543210",
    "createdBy": "674a1b2c3d4e5f6789012300",
    "createdAt": "2025-02-22T10:00:00.000Z",
    "updatedAt": "2025-02-22T10:00:00.000Z"
  }
}
```

---

## PUT /api/truck/edit/:id

**Request:**
```
PUT /api/truck/edit/674a1b2c3d4e5f6789012366
Content-Type: application/json
Authorization: Bearer <token>

{
  "registrationNumber": "TN-01-AB-5678",
  "driverName": "Suresh",
  "driverId": "674a1b2c3d4e5f6789012346",
  "capacity": "15 tonne",
  "status": "in-transit",
  "currentLocation": "Bengaluru",
  "contactNumber": "9876543211",
  "user": {
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Response (200):**
```json
{
  "message": "truck updated successfully",
  "truck": {
    "_id": "674a1b2c3d4e5f6789012366",
    "registrationNumber": "TN-01-AB-5678",
    "driverName": "Suresh",
    "driverId": "674a1b2c3d4e5f6789012346",
    "capacity": "15 tonne",
    "status": "in-transit",
    "currentLocation": "Bengaluru",
    "contactNumber": "9876543211",
    "createdBy": "674a1b2c3d4e5f6789012300",
    "createdAt": "2025-02-22T10:00:00.000Z",
    "updatedAt": "2025-02-22T11:30:00.000Z"
  }
}
```

---

## DELETE /api/truck/delete

**Request:**
```
DELETE /api/truck/delete
Content-Type: application/json
Authorization: Bearer <token>

{
  "ids": ["674a1b2c3d4e5f6789012366", "674a1b2c3d4e5f6789012367"],
  "user": {
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Response (200):**
```json
{
  "message": "2 truck(s) deleted successfully",
  "deletedCount": 2,
  "ids": ["674a1b2c3d4e5f6789012366", "674a1b2c3d4e5f6789012367"]
}
```

---

## Schema (server/schema/truck.js)

```javascript
{
  registrationNumber: String,
  driverName: String,
  driverId: ObjectId (ref: 'Driver'),
  truckType: String,        // LCV, Container
  capacity: String (required),
  containerFeet: String,    // 32 ft Mxl, 32 ft Mxl HQ
  vehicleBody: String,      // Open Body, Closed Body
  status: 'available' | 'in-transit' | 'maintenance' | 'unavailable',
  currentLocation: String,
  contactNumber: String,
  createdBy: ObjectId (ref: 'User'),
  timestamps: true
}
```

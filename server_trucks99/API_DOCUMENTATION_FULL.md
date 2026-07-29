# iTruck Server — Full API Documentation (Payload & Response Samples)

**Base URL:** `http://localhost:3001`  
**Headers:** `Content-Type: application/json` for all POST, PUT, DELETE with body.  
**Auth:** Send session cookie for protected routes.

---

## Table of Contents

1. [Health](#1-health)
2. [Auth](#2-auth)
3. [OTP](#3-otp)
4. [User (RBAC)](#4-user-rbac)
5. [Role](#5-role)
6. [Permission](#6-permission)
7. [Log](#7-log)
8. [Buy/Sell](#8-buysell)
9. [Shipper](#9-shipper)
10. [Loader](#10-loader)
11. [Agent](#11-agent)
12. [Driver](#12-driver)
13. [Truck](#13-truck)
14. [Load](#14-load)
15. [Dashboard](#15-dashboard)
16. [Common Errors](#16-common-errors)

---

## 1. Health

### GET /
**Request**
- Method: `GET`
- URL: `http://localhost:3001/`
- Body: none

**Response 200**
```json
"server is up and running!"
```

---

## 2. Auth

### POST /api/login
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/login`
- Body: (email/password login disabled; login is OTP-only)

```json
{}
```

**Response 400**
```json
{
  "message": "Login is OTP-only. Send OTP request first, then verify with mobile + OTP.",
  "loginType": "otp_only",
  "steps": [
    { "step": 1, "action": "Request OTP", "method": "POST", "url": "/api/otp/send", "body": { "mobile": "9876543210" } },
    { "step": 2, "action": "Verify and log in", "method": "POST", "url": "/api/otp/verify", "body": { "mobile": "9876543210", "otp": "123456" } }
  ]
}
```
*To log in: 1) POST /api/otp/send with `{ "mobile": "9876543210" }`, 2) POST /api/otp/verify with `{ "mobile": "9876543210", "otp": "123456" }`. Session is created on successful verify.*

---

### POST /api/signup 
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/signup`
- Auth: None (public).
- Body: **mobile** is required (for OTP login). **roleId** = Role `_id` from GET /api/role. Login is OTP-only: after signup, user must call POST /api/otp/verify with `{ mobile, otp }` to log in (no session until then).

```json
{
  "email": "newuser@mail.com",
  "password": "secret123",
  "name": "John Doe",
  "roleId": "674a1b2c3d4e5f6789012340",
  "mobile": "9876543210"
}
```

**Response 200**
```json
{
  "message": "Signup successful. Verify OTP to log in: POST /api/otp/verify with { mobile, otp }.",
  "loginType": "otp_only",
  "otpSentToMobile": true,
  "userObj": {
    "_id": "674a1b2c3d4e5f6789012345",
    "name": "John Doe",
    "email": "newuser@mail.com",
    "mobile": "+919876543210",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "description": "Posts shipment details and manages load requests",
      "permissions": []
    },
    "permissions": [],
    "provider": "local",
    "data": null
  }
}
```
*No session yet. OTP is sent to mobile; user logs in via POST /api/otp/verify with the same mobile and OTP.*

**Response 400**
```json
{ "message": "Mobile number is required for OTP login." }
```
```json
{ "message": "This mobile number is already registered." }
```
```json
{ "message": "Invalid roleId" }
```

**Response 401**
```json
{
  "message": "The email already exists!"
}
```

---

### DELETE /api/logout
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/logout`
- Body: none (session cookie required)

**Response 200**  
(Session destroyed; body may be empty or simple message.)

---

## 3. OTP

### POST /api/otp/send
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/otp/send`
- Body:

```json
{
  "mobile": "9876543210"
}
```

**Response 200**
```json
{
  "message": "OTP sent to your mobile number.",
  "otpSentViaSms": true
}
```

**Response 400**
```json
{
  "message": "Mobile number is required."
}
```

**Response 404**
```json
{
  "message": "User not found with this mobile number."
}
```

**Response 503**
```json
{
  "message": "Could not send OTP to your mobile. Try again later.",
  "otpSentViaSms": false
}
```
*When Twilio fails (e.g. trial account / unverified number), set **DEV_OTP_FALLBACK=true** in .env (or run with NODE_ENV !== production): then /api/otp/send returns 200 with **otpForDev** so you can still verify and log in during development. In production, do not use this; verify the number at twilio.com or upgrade Twilio.*

---

### POST /api/otp/verify
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/otp/verify`
- Body:

```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Response 200**
```json
{
  "message": "Login successful.",
  "user": {
    "id": "674a1b2c3d4e5f6789012345",
    "email": "shipper@mail.com",
    "name": "Shipper User",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "description": "Posts shipment details and manages load requests",
      "permissions": ["dashboard:access", "load_management:create", "load_management:edit", "load_management:view"]
    },
    "mobile": "+919876543210",
    "modules": {
      "dashboard": { "access": true },
      "load_management": { "create": true, "edit": true, "delete": false, "view": true },
      "truck_management": { "view": true }
    }
  }
}
```

**Response 400**
```json
{
  "message": "Mobile number and OTP are required."
}
```

**Response 401**
```json
{
  "message": "No OTP found. Please request a new one."
}
```
```json
{
  "message": "OTP has expired. Please request a new one."
}
```
```json
{
  "message": "Incorrect OTP."
}
```

---

### POST /api/otp/verify-login
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/otp/verify-login`
- Session: required  
- Body:

```json
{
  "otp": "123456"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "OTP verified successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "674a1b2c3d4e5f6789012345",
    "email": "shipper@mail.com",
    "name": "Shipper User",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "permissions": ["dashboard:access", "load_management:create", "load_management:view"]
    },
    "mobile": "+919876543210",
    "modules": { "dashboard": { "access": true }, "load_management": { "view": true } }
  }
}
```

---

### POST /api/otp/mobile/send
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/otp/mobile/send`
- Session: required  
- Body:

```json
{
  "mobile": "9876543210"
}
```

**Response 200**
```json
{
  "message": "OTP sent to your mobile.",
  "otp": "123456",
  "otpSentViaSms": true
}
```
*(In production, `otp` may be omitted from response.)*

---

### POST /api/otp/mobile/verify
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/otp/mobile/verify`
- Session: required  
- Body:

```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Response 200**
```json
{
  "message": "Mobile number registered successfully.",
  "user": {
    "id": "674a1b2c3d4e5f6789012345",
    "email": "user@mail.com",
    "name": "John",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "permissions": ["dashboard:access", "load_management:view"]
    },
    "mobile": "+919876543210",
    "modules": { "dashboard": { "access": true }, "load_management": { "view": true } }
  }
}
```

---

## 4. User (RBAC)

*User stores `roleId` (Role ref) and `permissions` (array of Permission refs). All GET responses include `role` = populated role object with `permissions` = array of Permission objects. User `permissions` can be permission names (from populated refs) or Permission objects when populated.*

### GET /api/user
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/user`
- Session: required  
- Body: none

**Response 200**
```json
{
  "_id": "674a1b2c3d4e5f6789012345",
  "id": "674a1b2c3d4e5f6789012345",
  "name": "Shipper User",
  "email": "shipper@mail.com",
  "roleId": "674a1b2c3d4e5f6789012340",
  "role": {
    "_id": "674a1b2c3d4e5f6789012340",
    "name": "Shipper",
    "description": "Posts shipment details and manages load requests",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
    ]
  },
  "mobile": "+919876543210",
  "permissions": [
    { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
    { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
  ],
  "pendingOtpVerification": false,
  "modules": {
    "dashboard": { "access": true },
    "load_management": { "create": true, "edit": true, "delete": false, "view": true },
    "truck_management": { "view": true }
  }
}
```

**Response 401**
```json
{
  "message": "Authentication Error!"
}
```

---

### GET /api/user/all
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/user/all`
- Body: none

**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012345",
    "name": "Shipper User",
    "email": "shipper@mail.com",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "description": "Posts shipment details",
      "permissions": [
        { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
      ]
    },
    "mobile": "+919876543210",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
    ]
  },
  {
    "_id": "674a1b2c3d4e5f6789012346",
    "name": "Admin User",
    "email": "admin@mail.com",
    "roleId": "674a1b2c3d4e5f6789012339",
    "role": {
      "_id": "674a1b2c3d4e5f6789012339",
      "name": "Admin",
      "description": "Full access",
      "permissions": []
    },
    "mobile": "+919876543211",
    "permissions": []
  }
]
```

---

### GET /api/user/:id
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/user/674a1b2c3d4e5f6789012345`
- Body: none

**Response 200**
```json
{
  "_id": "674a1b2c3d4e5f6789012345",
  "name": "Shipper User",
  "email": "shipper@mail.com",
  "roleId": "674a1b2c3d4e5f6789012340",
  "role": {
    "_id": "674a1b2c3d4e5f6789012340",
    "name": "Shipper",
    "description": "Posts shipment details and manages load requests",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
    ]
  },
  "mobile": "+919876543210",
  "permissions": [
    { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
  ]
}
```

**Response 404**
```json
{
  "message": "User not found"
}
```

---

### POST /api/user/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/user/add`
- Body: **roleId** required (Role `_id`). **permissions**: array of permission **names** (e.g. `"dashboard:access"`) or Permission **ObjectIds**; resolved to Permission refs and stored.

```json
{
  "name": "Jane Agent",
  "email": "jane@mail.com",
  "password": "secret123",
  "roleId": "674a1b2c3d4e5f6789012340",
  "permissions": ["dashboard:access", "load_management:create", "load_management:view"],
  "mobile": "9876543210",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 201**
```json
{
  "message": "User created successfully. OTP sent to mobile for OTP login.",
  "loginType": "otp_only",
  "otpSentToUser": true,
  "user": {
    "name": "Jane Agent",
    "email": "jane@mail.com",
    "mobile": "+919876543210",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "description": "Posts shipment details",
      "permissions": [
        { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
      ]
    },
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
    ],
    "modules": {
      "dashboard": { "access": true },
      "load_management": { "create": true, "edit": false, "delete": false, "view": true }
    },
    "_id": "674a1b2c3d4e5f6789012347"
  }
}
```
*If **mobile** is provided, OTP is sent to that number so the new user can log in via POST /api/otp/verify. `otpSentToUser` is true when SMS was sent.*

**Response 400**
```json
{
  "message": "User already exists"
}
```
```json
{
  "message": "roleId is required"
}
```

---

### PUT /api/user/edit/:id
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/user/edit/674a1b2c3d4e5f6789012345`
- Body: **permissions**: array of permission names or Permission ObjectIds. **newPassword**: only Admin can set.

```json
{
  "name": "Jane Agent Updated",
  "email": "jane@mail.com",
  "roleId": "674a1b2c3d4e5f6789012341",
  "permissions": ["dashboard:access", "load_management:create", "load_management:edit", "load_management:view"],
  "mobile": "9876543210",
  "newPassword": "newsecret",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 200**
```json
{
  "message": "User updated successfully",
  "user": {
    "name": "Jane Agent Updated",
    "email": "jane@mail.com",
    "mobile": "+919876543210",
    "roleId": "674a1b2c3d4e5f6789012341",
    "role": {
      "_id": "674a1b2c3d4e5f6789012341",
      "name": "Agent",
      "description": "Coordinates between shipper and transporter",
      "permissions": [
        { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
      ]
    },
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
    ],
    "modules": { "dashboard": { "access": true }, "load_management": { "create": true, "edit": true, "view": true } },
    "_id": "674a1b2c3d4e5f6789012345"
  }
}
```

**Response 400**
```json
{
  "message": "Requesting user is required"
}
```
**Response 404**
```json
{
  "message": "User not found"
}
```

---

### DELETE /api/user/delete
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/user/delete`
- Body:

```json
{
  "name": "Jane Agent",
  "email": "jane@mail.com",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 200**
```json
{
  "message": "User 'Jane Agent' deleted successfully",
  "user": {
    "_id": "674a1b2c3d4e5f6789012347",
    "name": "Jane Agent",
    "email": "jane@mail.com",
    "roleId": "674a1b2c3d4e5f6789012340",
    "role": {
      "_id": "674a1b2c3d4e5f6789012340",
      "name": "Shipper",
      "permissions": [
        { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
      ]
    },
    "mobile": "+919876543210",
    "permissions": []
  }
}
```

**Response 404**
```json
{
  "message": "User not found"
}
```

---

## 5. Role

*Role stores `permissions` as array of Permission ObjectId refs. GET returns roles with `permissions` populated (array of `{ _id, name, description }`). Add/Edit accept `permissions` as names or ObjectIds; server resolves to Permission refs.*

### GET /api/role
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/role`
- Body: none

**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012339",
    "name": "Admin",
    "description": "Full access",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
    ]
  },
  {
    "_id": "674a1b2c3d4e5f6789012340",
    "name": "Shipper",
    "description": "Posts shipment details and manages load requests",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
    ]
  }
]
```

---

### POST /api/role/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/role/add`
- Body: **permissions**: array of permission **names** (e.g. `"dashboard:access"`) or Permission **ObjectIds**; resolved and stored as refs.

```json
{
  "name": "CustomRole",
  "description": "Custom role for limited access",
  "permissions": ["dashboard:access", "load_management:view", "truck_management:view"],
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 201**
```json
{
  "message": "Role created successfully",
  "role": {
    "_id": "674a1b2c3d4e5f6789012348",
    "name": "CustomRole",
    "description": "Custom role for limited access",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233c", "name": "load_management:view", "description": "Permission: load_management:view" }
    ]
  }
}
```

**Response 400**
```json
{
  "message": "Role already exists"
}
```

---

### PUT /api/role/edit
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/role/edit`
- Body:

```json
{
  "name": "CustomRole",
  "description": "Updated description",
  "permissions": ["dashboard:access", "load_management:view", "load_management:create", "truck_management:view"],
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 200**
```json
{
  "message": "Role updated successfully",
  "role": {
    "_id": "674a1b2c3d4e5f6789012348",
    "name": "CustomRole",
    "description": "Updated description",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" },
      { "_id": "674a1b2c3d4e5f678901233c", "name": "load_management:view", "description": "Permission: load_management:view" },
      { "_id": "674a1b2c3d4e5f678901233b", "name": "load_management:create", "description": "Permission: load_management:create" }
    ]
  }
}
```

**Response 404**
```json
{
  "message": "Role not found"
}
```

---

### DELETE /api/role/delete
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/role/delete`
- Body:

```json
{
  "name": "CustomRole",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 200**
```json
{
  "message": "Role 'CustomRole' deleted successfully",
  "role": {
    "_id": "674a1b2c3d4e5f6789012348",
    "name": "CustomRole",
    "description": "Updated description",
    "permissions": [
      { "_id": "674a1b2c3d4e5f678901233a", "name": "dashboard:access", "description": "Permission: dashboard:access" }
    ]
  }
}
```

---

## 6. Permission

### GET /api/permission
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/permission`
- Body: none

**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012330",
    "name": "read",
    "description": "Permission to view and read data"
  },
  {
    "_id": "674a1b2c3d4e5f6789012331",
    "name": "write",
    "description": "Permission to create and edit data"
  },
  {
    "_id": "674a1b2c3d4e5f6789012332",
    "name": "delete",
    "description": "Permission to delete data"
  }
]
```

---

### POST /api/permission/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/permission/add`
- Body:

```json
{
  "name": "reports:view",
  "description": "View reports",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 201**
```json
{
  "message": "Permission created successfully",
  "newPerm": {
    "_id": "674a1b2c3d4e5f6789012349",
    "name": "reports:view",
    "description": "View reports"
  }
}
```

**Response 400**
```json
{
  "message": "Perm already exists"
}
```

---

### PUT /api/permission/edit
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/permission/edit`
- Body:

```json
{
  "name": "reports:view",
  "description": "View and export reports",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 200**
```json
{
  "message": "Perm updated successfully",
  "name": {
    "_id": "674a1b2c3d4e5f6789012349",
    "name": "reports:view",
    "description": "View and export reports"
  }
}
```

---

### DELETE /api/permission/delete
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/permission/delete`
- Body:

```json
{
  "name": "reports:view",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 200**
```json
{
  "message": "Perm 'reports:view' deleted successfully",
  "name": {
    "_id": "674a1b2c3d4e5f6789012349",
    "name": "reports:view",
    "description": "View and export reports"
  }
}
```

**Response 404**
```json
{
  "message": "permission not found"
}
```

---

## 7. Log

### GET /api/log
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/log`
- Body: none

**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012350",
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin",
    "timestamp": "2025-02-19 14:30:00",
    "action": "added new user: Jane Agent"
  },
  {
    "_id": "674a1b2c3d4e5f6789012351",
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin",
    "timestamp": "2025-02-19 14:25:00",
    "action": "added new role: CustomRole"
  }
]
```

---

### POST /api/log/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/log/add`
- Body:

```json
{
  "name": "Admin User",
  "email": "admin@mail.com",
  "role": "Admin",
  "timestamp": "2025-02-19 14:35:00",
  "action": "Manual log entry: configuration updated"
}
```

**Response 201**
```json
{
  "message": "log created successfully",
  "log": {
    "_id": "674a1b2c3d4e5f6789012352",
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin",
    "timestamp": "2025-02-19 14:35:00",
    "action": "Manual log entry: configuration updated"
  }
}
```

---

## 8. Buy/Sell

### GET /api/buysell/all
**Request:** `GET http://localhost:3001/api/buysell/all`  
**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012360",
    "name": "ABC Traders",
    "description": "Buying steel rods",
    "contactEmail": "abc@mail.com",
    "contactMobile": "+919876543210",
    "address": "Chennai",
    "type": "buy",
    "status": "active",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
]
```

---

### GET /api/buysell/:id
**Request:** `GET http://localhost:3001/api/buysell/674a1b2c3d4e5f6789012360`  
**Response 200**
```json
{
  "_id": "674a1b2c3d4e5f6789012360",
  "name": "ABC Traders",
  "description": "Buying steel rods",
  "contactEmail": "abc@mail.com",
  "contactMobile": "+919876543210",
  "address": "Chennai",
  "type": "buy",
  "status": "active",
  "createdAt": "2025-02-19T10:00:00.000Z",
  "updatedAt": "2025-02-19T10:00:00.000Z"
}
```
**Response 404:** `{ "message": "buy/sell not found" }`

---

### POST /api/buysell/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/buysell/add`
- Body:

```json
{
  "name": "ABC Traders",
  "description": "Buying steel rods",
  "contactEmail": "abc@mail.com",
  "contactMobile": "9876543210",
  "address": "Chennai",
  "type": "buy",
  "status": "active",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```
*`type`: `buy` | `sell` | `vendor`. `status`: `active` | `inactive`.*

**Response 201**
```json
{
  "message": "buy/sell created successfully",
  "buySell": {
    "_id": "674a1b2c3d4e5f6789012360",
    "name": "ABC Traders",
    "description": "Buying steel rods",
    "contactEmail": "abc@mail.com",
    "contactMobile": "+919876543210",
    "address": "Chennai",
    "type": "buy",
    "status": "active",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

---

### PUT /api/buysell/edit/:id
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/buysell/edit/674a1b2c3d4e5f6789012360`
- Body: same fields as POST add (name, description, contactEmail, contactMobile, address, type, status; optional user)

**Response 200**
```json
{
  "message": "buy/sell updated successfully",
  "buySell": {
    "_id": "674a1b2c3d4e5f6789012360",
    "name": "ABC Traders",
    "description": "Buying steel rods",
    "contactEmail": "abc@mail.com",
    "contactMobile": "+919876543210",
    "address": "Chennai",
    "type": "sell",
    "status": "inactive",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T11:00:00.000Z"
  }
}
```

---

### DELETE /api/buysell/delete
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/buysell/delete`
- Body:

```json
{
  "ids": ["674a1b2c3d4e5f6789012360", "674a1b2c3d4e5f6789012361"]
}
```

**Response 200**
```json
{
  "message": "2 buy/sell(s) deleted successfully",
  "deletedCount": 2,
  "ids": ["674a1b2c3d4e5f6789012360", "674a1b2c3d4e5f6789012361"]
}
```

---

## 9. Shipper

### GET /api/shipper/all
**Request:** `GET http://localhost:3001/api/shipper/all`  
**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012362",
    "name": "Fast Cargo",
    "description": "Logistics partner",
    "contactEmail": "fast@mail.com",
    "contactMobile": "+919876543210",
    "company": "Fast Cargo Pvt Ltd",
    "status": "active",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
]
```

---

### GET /api/shipper/:id
**Request:** `GET http://localhost:3001/api/shipper/674a1b2c3d4e5f6789012362`  
**Response 200:** Single shipper object (same shape as above).  
**Response 404:** `{ "message": "shipper not found" }`

---

### POST /api/shipper/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/shipper/add`
- Body:

```json
{
  "name": "Fast Cargo",
  "description": "Logistics partner",
  "contactEmail": "fast@mail.com",
  "contactMobile": "9876543210",
  "company": "Fast Cargo Pvt Ltd",
  "status": "active",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```

**Response 201**
```json
{
  "message": "shipper created successfully",
  "shipper": {
    "_id": "674a1b2c3d4e5f6789012362",
    "name": "Fast Cargo",
    "description": "Logistics partner",
    "contactEmail": "fast@mail.com",
    "contactMobile": "+919876543210",
    "company": "Fast Cargo Pvt Ltd",
    "status": "active",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

---

### PUT /api/shipper/edit/:id
**Request:** `PUT http://localhost:3001/api/shipper/edit/674a1b2c3d4e5f6789012362`  
**Body:** same as POST add.  
**Response 200:** `{ "message": "shipper updated successfully", "shipper": { ... } }`

---

### DELETE /api/shipper/delete
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/shipper/delete`
- Body: `{ "ids": ["674a1b2c3d4e5f6789012362"] }`

**Response 200**
```json
{
  "message": "1 shipper(s) deleted successfully",
  "deletedCount": 1,
  "ids": ["674a1b2c3d4e5f6789012362"]
}
```

---

## 10. Loader

### GET /api/loader/all
**Request:** `GET http://localhost:3001/api/loader/all`  
**Response 200:** Array of loader objects.

### GET /api/loader/:id
**Request:** `GET http://localhost:3001/api/loader/674a1b2c3d4e5f6789012363`  
**Response 200:** Single loader. **Response 404:** `{ "message": "loader not found" }`

### POST /api/loader/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/loader/add`
- Body:

```json
{
  "name": "Warehouse Loaders Co",
  "description": "Loading and unloading services",
  "contactEmail": "loaders@mail.com",
  "contactMobile": "9876543210",
  "company": "Warehouse Loaders Co",
  "status": "active",
  "user": { "name": "Admin User", "email": "admin@mail.com", "role": "Admin" }
}
```

**Response 201**
```json
{
  "message": "loader created successfully",
  "loader": {
    "_id": "674a1b2c3d4e5f6789012363",
    "name": "Warehouse Loaders Co",
    "description": "Loading and unloading services",
    "contactEmail": "loaders@mail.com",
    "contactMobile": "+919876543210",
    "company": "Warehouse Loaders Co",
    "status": "active",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

### PUT /api/loader/edit/:id
**Request:** `PUT http://localhost:3001/api/loader/edit/674a1b2c3d4e5f6789012363`  
**Body:** same as add.  
**Response 200:** `{ "message": "loader updated successfully", "loader": { ... } }`

### DELETE /api/loader/delete
**Request:** `DELETE http://localhost:3001/api/loader/delete`  
**Body:** `{ "ids": ["674a1b2c3d4e5f6789012363"] }`  
**Response 200:** `{ "message": "1 loader(s) deleted successfully", "deletedCount": 1, "ids": [...] }`

---

## 11. Agent

### GET /api/agent/all
**Request:** `GET http://localhost:3001/api/agent/all`  
**Response 200:** Array of agent objects.

### GET /api/agent/:id
**Request:** `GET http://localhost:3001/api/agent/674a1b2c3d4e5f6789012364`  
**Response 200:** Single agent. **Response 404:** `{ "message": "agent not found" }`

### POST /api/agent/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/agent/add`
- Body:

```json
{
  "name": "South Zone Agent",
  "description": "Coordinates south region",
  "contactEmail": "agent@mail.com",
  "contactMobile": "9876543210",
  "region": "South",
  "status": "active",
  "user": { "name": "Admin User", "email": "admin@mail.com", "role": "Admin" }
}
```

**Response 201**
```json
{
  "message": "agent created successfully",
  "agent": {
    "_id": "674a1b2c3d4e5f6789012364",
    "name": "South Zone Agent",
    "description": "Coordinates south region",
    "contactEmail": "agent@mail.com",
    "contactMobile": "+919876543210",
    "region": "South",
    "status": "active",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

### PUT /api/agent/edit/:id
**Request:** `PUT http://localhost:3001/api/agent/edit/674a1b2c3d4e5f6789012364`  
**Body:** same as add.  
**Response 200:** `{ "message": "agent updated successfully", "agent": { ... } }`

### DELETE /api/agent/delete
**Request:** `DELETE http://localhost:3001/api/agent/delete`  
**Body:** `{ "ids": ["674a1b2c3d4e5f6789012364"] }`  
**Response 200:** `{ "message": "1 agent(s) deleted successfully", "deletedCount": 1, "ids": [...] }`

---

## 12. Driver

### GET /api/driver/all
**Request:** `GET http://localhost:3001/api/driver/all`  
**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012365",
    "name": "Ramesh Kumar",
    "contactMobile": "+919876543210",
    "contactEmail": "ramesh@mail.com",
    "licenseNumber": "DL-12345",
    "status": "available",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
]
```

### GET /api/driver/:id
**Request:** `GET http://localhost:3001/api/driver/674a1b2c3d4e5f6789012365`  
**Response 200:** Single driver (same shape). **Response 404:** `{ "message": "driver not found" }`

### POST /api/driver/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/driver/add`
- Body:

```json
{
  "name": "Ramesh Kumar",
  "contactMobile": "9876543210",
  "contactEmail": "ramesh@mail.com",
  "licenseNumber": "DL-12345",
  "status": "available",
  "user": { "name": "Admin User", "email": "admin@mail.com", "role": "Admin" }
}
```
*`status`: `available` | `on-trip` | `off-duty` | `inactive`.*

**Response 201**
```json
{
  "message": "driver created successfully",
  "driver": {
    "_id": "674a1b2c3d4e5f6789012365",
    "name": "Ramesh Kumar",
    "contactMobile": "+919876543210",
    "contactEmail": "ramesh@mail.com",
    "licenseNumber": "DL-12345",
    "status": "available",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

### PUT /api/driver/edit/:id
**Request:** `PUT http://localhost:3001/api/driver/edit/674a1b2c3d4e5f6789012365`  
**Body:** same as add.  
**Response 200:** `{ "message": "driver updated successfully", "driver": { ... } }`

### DELETE /api/driver/delete
**Request:** `DELETE http://localhost:3001/api/driver/delete`  
**Body:** `{ "ids": ["674a1b2c3d4e5f6789012365"] }`  
**Response 200:** `{ "message": "1 driver(s) deleted successfully", "deletedCount": 1, "ids": [...] }`

---

## 13. Truck

### GET /api/truck/all
**Request:** `GET http://localhost:3001/api/truck/all`  
**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012366",
    "registrationNumber": "TN-01-AB-1234",
    "driverName": "Ramesh Kumar",
    "driverId": "674a1b2c3d4e5f6789012365",
    "capacity": "9 tonnes",
    "status": "available",
    "currentLocation": "Chennai",
    "contactNumber": "9876543210",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
]
```

### GET /api/truck/:id
**Request:** `GET http://localhost:3001/api/truck/674a1b2c3d4e5f6789012366`  
**Response 200:** Single truck (same shape). **Response 404:** `{ "message": "truck not found" }`

### POST /api/truck/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/truck/add`
- Body:

```json
{
  "registrationNumber": "TN-01-AB-1234",
  "driverName": "Ramesh Kumar",
  "driverId": "674a1b2c3d4e5f6789012365",
  "capacity": "9 tonnes",
  "status": "available",
  "currentLocation": "Chennai",
  "contactNumber": "9876543210",
  "user": { "name": "Admin User", "email": "admin@mail.com", "role": "Admin" }
}
```
*`status`: `available` | `in-transit` | `maintenance` | `unavailable`.*

**Response 201**
```json
{
  "message": "truck created successfully",
  "truck": {
    "_id": "674a1b2c3d4e5f6789012366",
    "registrationNumber": "TN-01-AB-1234",
    "driverName": "Ramesh Kumar",
    "driverId": "674a1b2c3d4e5f6789012365",
    "capacity": "9 tonnes",
    "status": "available",
    "currentLocation": "Chennai",
    "contactNumber": "9876543210",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

### PUT /api/truck/edit/:id
**Request:** `PUT http://localhost:3001/api/truck/edit/674a1b2c3d4e5f6789012366`  
**Body:** same as add.  
**Response 200:** `{ "message": "truck updated successfully", "truck": { ... } }`

### DELETE /api/truck/delete
**Request:** `DELETE http://localhost:3001/api/truck/delete`  
**Body:** `{ "ids": ["674a1b2c3d4e5f6789012366"] }`  
**Response 200:** `{ "message": "1 truck(s) deleted successfully", "deletedCount": 1, "ids": [...] }`

---

## 14. Load

### GET /api/load/all
**Request:** `GET http://localhost:3001/api/load/all`  
**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012367",
    "title": "Dubai to Chennai",
    "description": "Electronics consignment",
    "origin": "Dubai",
    "destination": "Chennai",
    "status": "pending",
    "weight": "500kg",
    "shipperId": "674a1b2c3d4e5f6789012362",
    "buySellId": "674a1b2c3d4e5f6789012360",
    "loaderId": "674a1b2c3d4e5f6789012363",
    "assignedTruckId": null,
    "createdBy": "674a1b2c3d4e5f6789012345",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
]
```

---

### GET /api/load/my (Buyer / Seller flow)
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/load/my?userId=674a1b2c3d4e5f6789012345`
- Query: **userId** (required) – user ID of the buyer/seller. Returns loads where `createdBy` or `userId` matches.

**Response 200:** Array of load objects (same shape as GET /api/load/all) that belong to this user.

**Response 400:** `{ "message": "Query userId is required for GET /api/load/my" }`

*Use this in the **Buyer / Seller flow**: after a buyer/seller posts a load request (POST /api/load/add with `userId`), they can list "my load requests" via GET /api/load/my?userId=&lt;current_user_id&gt;.*

---

### GET /api/load/by-shipper (Shipper view)
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/load/by-shipper?shipperId=674a1b2c3d4e5f6789012362`
- Query: **shipperId** (required) – Shipper `_id`. Returns loads where `shipperId` matches (loads created/linked to this shipper).

**Response 200:** Array of load objects. Shipper can view loads they are linked to.

**Response 400:** `{ "message": "Query shipperId is required for GET /api/load/by-shipper" }`

---

### GET /api/load/by-agent (Agent view)
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/load/by-agent?agentId=674a1b2c3d4e5f6789012364`
- Query: **agentId** (required) – Agent `_id`. Returns loads where `agentId` matches (loads assigned to this agent).

**Response 200:** Array of load objects. Agent can view loads assigned to them.

**Response 400:** `{ "message": "Query agentId is required for GET /api/load/by-agent" }`

---

### PUT /api/load/assign-agent
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/load/assign-agent`
- Body:

```json
{
  "loadId": "674a1b2c3d4e5f6789012367",
  "agentId": "674a1b2c3d4e5f6789012364"
}
```

**Response 200**
```json
{
  "message": "Agent assigned to load successfully",
  "load": {
    "_id": "674a1b2c3d4e5f6789012367",
    "title": "Dubai to Chennai",
    "description": "Electronics consignment",
    "origin": "Dubai",
    "destination": "Chennai",
    "status": "pending",
    "weight": "500kg",
    "shipperId": "674a1b2c3d4e5f6789012362",
    "buySellId": "674a1b2c3d4e5f6789012360",
    "loaderId": "674a1b2c3d4e5f6789012363",
    "assignedTruckId": null,
    "agentId": "674a1b2c3d4e5f6789012364",
    "createdBy": "674a1b2c3d4e5f6789012345",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T11:00:00.000Z"
  }
}
```

**Response 400:** `{ "message": "loadId is required in body" }` or `{ "message": "agentId is required in body" }`  
**Response 404:** `{ "message": "Load not found" }`

---

### PUT /api/load/assign-driver-truck (agent payload)
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/load/assign-driver-truck`
- Body:

```json
{
  "loadId": "674a1b2c3d4e5f6789012367",
  "driverId": "674a1b2c3d4e5f6789012365",
  "truckId": "674a1b2c3d4e5f6789012366"
}
```

**Response 200**
```json
{
  "message": "Driver and truck assigned to load successfully",
  "load": {
    "_id": "674a1b2c3d4e5f6789012367",
    "title": "Dubai to Chennai",
    "origin": "Dubai",
    "destination": "Chennai",
    "status": "assigned",
    "weight": "500kg",
    "shipperId": "674a1b2c3d4e5f6789012362",
    "assignedDriverId": "674a1b2c3d4e5f6789012365",
    "assignedTruckId": "674a1b2c3d4e5f6789012366",
    "agentId": "674a1b2c3d4e5f6789012364",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T11:00:00.000Z"
  }
}
```

*Sets load `assignedDriverId`, `assignedTruckId`, and `status` to `assigned`.*

**Response 400:** `{ "message": "loadId is required in body" }`, `{ "message": "driverId is required in body" }`, or `{ "message": "truckId is required in body" }`  
**Response 404:** `{ "message": "Load not found" }`

---

### GET /api/load/available
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/load/available`
- Query (optional): `location`, `origin`, `destination`  
  Example: `http://localhost:3001/api/load/available?location=Chennai`

**Response 200**
```json
[
  {
    "_id": "674a1b2c3d4e5f6789012367",
    "title": "Dubai to Chennai",
    "description": "Electronics consignment",
    "origin": "Dubai",
    "destination": "Chennai",
    "status": "pending",
    "weight": "500kg",
    "shipperId": "674a1b2c3d4e5f6789012362",
    "buySellId": "674a1b2c3d4e5f6789012360",
    "loaderId": "674a1b2c3d4e5f6789012363",
    "assignedTruckId": null,
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
]
```

---

### GET /api/load/:id
**Request:** `GET http://localhost:3001/api/load/674a1b2c3d4e5f6789012367`  
**Response 200:** Single load (same shape as in list).  
**Response 404:** `{ "message": "Load not found" }`

---

### POST /api/load/add
**Request**
- Method: `POST`
- URL: `http://localhost:3001/api/load/add`
- Body:

```json
{
  "title": "Dubai to Chennai",
  "description": "Electronics consignment",
  "origin": "Dubai",
  "destination": "Chennai",
  "status": "pending",
  "weight": "500kg",
  "shipperId": "674a1b2c3d4e5f6789012362",
  "buySellId": "674a1b2c3d4e5f6789012360",
  "loaderId": "674a1b2c3d4e5f6789012363",
  "assignedTruckId": null,
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```
*If `assignedTruckId` is set, status becomes `assigned`. `status`: `pending` | `assigned` | `delivered`.*

**Response 201**
```json
{
  "message": "Load created successfully",
  "load": {
    "_id": "674a1b2c3d4e5f6789012367",
    "title": "Dubai to Chennai",
    "description": "Electronics consignment",
    "origin": "Dubai",
    "destination": "Chennai",
    "status": "pending",
    "weight": "500kg",
    "shipperId": "674a1b2c3d4e5f6789012362",
    "buySellId": "674a1b2c3d4e5f6789012360",
    "loaderId": "674a1b2c3d4e5f6789012363",
    "assignedTruckId": null,
    "createdBy": "674a1b2c3d4e5f6789012345",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T10:00:00.000Z"
  }
}
```

---

### PUT /api/load/edit/:id
**Request**
- Method: `PUT`
- URL: `http://localhost:3001/api/load/edit/674a1b2c3d4e5f6789012367`
- Body:

```json
{
  "title": "Dubai to Chennai",
  "description": "Electronics consignment",
  "origin": "Dubai",
  "destination": "Chennai",
  "status": "assigned",
  "weight": "500kg",
  "shipperId": "674a1b2c3d4e5f6789012362",
  "buySellId": "674a1b2c3d4e5f6789012360",
  "loaderId": "674a1b2c3d4e5f6789012363",
  "assignedTruckId": "674a1b2c3d4e5f6789012366",
  "user": {
    "name": "Admin User",
    "email": "admin@mail.com",
    "role": "Admin"
  }
}
```
*Setting `assignedTruckId` sets status to `assigned` (unless status is `delivered`).*

**Response 200**
```json
{
  "message": "Load updated successfully",
  "load": {
    "_id": "674a1b2c3d4e5f6789012367",
    "title": "Dubai to Chennai",
    "description": "Electronics consignment",
    "origin": "Dubai",
    "destination": "Chennai",
    "status": "assigned",
    "weight": "500kg",
    "shipperId": "674a1b2c3d4e5f6789012362",
    "buySellId": "674a1b2c3d4e5f6789012360",
    "loaderId": "674a1b2c3d4e5f6789012363",
    "assignedTruckId": "674a1b2c3d4e5f6789012366",
    "createdBy": "674a1b2c3d4e5f6789012345",
    "createdAt": "2025-02-19T10:00:00.000Z",
    "updatedAt": "2025-02-19T11:00:00.000Z"
  }
}
```

**Response 404:** `{ "message": "Load not found" }`

---

### DELETE /api/load/delete
**Request**
- Method: `DELETE`
- URL: `http://localhost:3001/api/load/delete`
- Body:

```json
{
  "ids": ["674a1b2c3d4e5f6789012367", "674a1b2c3d4e5f6789012368"]
}
```

**Response 200**
```json
{
  "message": "2 load(s) deleted successfully",
  "deletedCount": 2,
  "ids": ["674a1b2c3d4e5f6789012367", "674a1b2c3d4e5f6789012368"]
}
```

**Response 200 (none found)**
```json
{
  "message": "No loads found to delete",
  "deletedCount": 0,
  "ids": ["674a1b2c3d4e5f6789012367"]
}
```

---

## 15. Dashboard

### GET /api/dashboard/stats
**Request**
- Method: `GET`
- URL: `http://localhost:3001/api/dashboard/stats`
- Body: none

**Response 200**
```json
{
  "loads": {
    "total": 10,
    "pending": 5,
    "assigned": 3,
    "delivered": 2,
    "byStatus": {
      "pending": 5,
      "assigned": 3,
      "delivered": 2
    }
  },
  "trucks": {
    "total": 8,
    "available": 4,
    "busy": 4,
    "inTransit": 2,
    "maintenance": 1,
    "unavailable": 1,
    "byStatus": {
      "available": 4,
      "in-transit": 2,
      "maintenance": 1,
      "unavailable": 1
    }
  }
}
```

**Response 500**
```json
{
  "message": "Error fetching dashboard stats",
  "error": "..."
}
```

---

## 16. Common Errors

| Status | Meaning        | Body example |
|--------|----------------|--------------|
| **400** | Bad request    | `{ "message": "roleId is required" }` |
| **401** | Unauthorized   | `{ "message": "Authentication Error!" }` |
| **403** | Forbidden      | `{ "message": "Only Admin can update user password" }` |
| **404** | Not found      | `{ "message": "User not found" }` |
| **500** | Server error   | `{ "message": "Error creating load", "error": "..." }` |

- Use **`Content-Type: application/json`** for all POST, PUT, DELETE with body.
- Send **session cookie** for routes that require login (e.g. GET /api/user, OTP verify-login, mobile verify).
- **User/Role permissions:** Stored as Permission ObjectId refs. Responses return **`permissions`** populated as array of `{ _id, name, description }`. APIs accept **permissions** as permission names (strings) or Permission ObjectIds; server resolves to refs.
- **Signup:** Payload uses **roleId** (Role `_id`); no permissions in payload. **User add/edit:** Payload uses **roleId** and optional **permissions** (names or ids).

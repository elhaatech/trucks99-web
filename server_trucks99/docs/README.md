# iTruck Backend API Documentation (OpenAPI / Swagger)

Swagger UI is available at **`/api-docs`** when the server is running (e.g. http://localhost:3001/api-docs).

## Source

- **Base spec and schemas:** `base.js` (info, servers, tags, components/schemas). Bids: **CreateBitRecordRequest**, **BidRecordUpdateRequest**, **BidRecordMutationResponse**, **BitRecordRouteMap**, **BidStatusInput**.
- **Path definitions:** `paths/*.js` — one file per module, each with `@openapi` JSDoc blocks.

## Documented modules (by tag)

| Tag | Path file | Endpoints |
|-----|-----------|-----------|
| Health | auth.js | GET / |
| Auth | auth.js | POST /api/login, POST /api/signup, DELETE /api/logout, GET /api/auth/google, redirect, fail, GET /api/auth/github, redirect, fail |
| OTP | otp.js | POST /api/otp/send, verify, mobile/send, verify-login, mobile/verify |
| Users | users.js | GET /api/user, GET/POST /api/user/all, GET /api/user/:id, POST /api/user/add, PUT /api/user/edit/:id, DELETE /api/user/delete |
| Roles | roles.js | GET/POST /api/role, POST /api/role/add, PUT /api/role/edit, DELETE /api/role/delete |
| Permissions | permissions.js | GET /api/permission, POST /api/permission/add, PUT /api/permission/edit, DELETE /api/permission/delete |
| Logs | logs.js | GET /api/log, POST /api/log/add |
| Loads | loads.js | GET/POST /api/load/all, GET /api/load/my, available, nearby, by-driver, by-shipper, by-agent, PUT assign-agent, assign-driver, assign-driver-truck, cancel/:id, driver-status, POST /api/load/add, GET /api/load/:id, PUT /api/load/edit/:id, DELETE /api/load/delete |
| Materials | materials.js | GET /api/material/all, GET /api/material/:id, POST /api/material/add, PUT /api/material/edit/:id, DELETE /api/material/delete |
| Vehicle Types | vehicleTypes.js | GET /api/vehicle-type/all, GET /api/vehicle-type/:id, POST /api/vehicle-type/add, PUT /api/vehicle-type/edit/:id, DELETE /api/vehicle-type/delete |
| Vehicle Body Types | vehicleBodyTypes.js | GET /api/vehicle-body-type/all, GET /api/vehicle-body-type/:id, POST add, PUT edit/:id, DELETE delete |
| Drivers | drivers.js | GET /api/driver/all, PUT /api/driver/update-location, GET /api/driver/:id, POST /api/driver/add, PUT /api/driver/edit/:id, DELETE /api/driver/delete |
| Trucks | trucks.js | GET/POST /api/truck/all, GET /api/truck/:id/routes, PATCH /api/truck/:id/status-location, GET /api/truck/:id, POST /api/truck/add, PUT /api/truck/edit/:id, DELETE /api/truck/delete |
| Bids | bitRecords.js | POST /api/bit-records/list, POST /api/bit-records, PUT /api/bit-records/:id (`services/bitService.js`) |
| Dashboard | dashboard.js | GET /api/dashboard/stats |
| Notifications | notifications.js | GET /api/notification, PUT /api/notification/read-all, PUT /api/notification/:id/read |
| Income Expense Category | incomeExpenseCategory.js | GET all, GET /:id, POST add, PUT edit/:id, DELETE delete |
| Income Expense | incomeExpense.js | GET all, GET /:id, POST add, PUT edit/:id, DELETE delete |
| Upload | upload.js | POST /api/upload (multipart/form-data: file, key) |

## Per-endpoint coverage

Each documented API includes:

- **HTTP method** (GET, POST, PUT, DELETE)
- **Route path**
- **Tags** (module)
- **Request body schema** where applicable
- **Query and path parameters**
- **Response schema** (including `$ref` to components/schemas where used)
- **Status codes:** 200, 201, 400, 404, 500 as applicable

## Reusable schemas (components/schemas)

- User, Load, LoadLocation, Truck, Driver, Material, VehicleType, VehicleBodyType, Role, Permission, Error, Pagination

## Regenerating the spec

The OpenAPI spec is built at runtime by `swagger-jsdoc` from:

1. `docs/base.js`
2. All `docs/paths/*.js` files

No separate build step is required; restart the server and refresh `/api-docs` to see changes.

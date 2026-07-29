/**
 * Base OpenAPI 3 definition for swagger-jsdoc.
 * Paths are loaded from ./paths/*.js
 */
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'iTruck Backend API',
    version: '1.0.0',
    description: 'Complete API documentation for the iTruck logistics backend. Most endpoints require a valid session (cookie) or Bearer token. Public endpoints: OTP send/verify, signup, OAuth init.',
  },
  servers: [
    { url: 'http://localhost:3003', description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Server health' },
    { name: 'Auth', description: 'Login, signup, logout, OAuth' },
    { name: 'OTP', description: 'OTP send and verify' },
    { name: 'Users', description: 'User CRUD' },
    { name: 'Roles', description: 'Role CRUD' },
    { name: 'Permissions', description: 'Permission CRUD' },
    { name: 'Logs', description: 'Audit logs' },
    {
      name: 'Loads',
      description: 'Load management (creation, assignment, cancel). Embedded `bitRecords` on GET load; bid CRUD lives under **Bids** (`/api/bit-records`).',
    },
    { name: 'Materials', description: 'Material CRUD' },
    { name: 'Vehicle Types', description: 'Vehicle type CRUD' },
    { name: 'Vehicle Body Types', description: 'Vehicle body type CRUD' },
    {
      name: 'Trucks',
      description: 'Truck CRUD and truck route CRUD (/api/truck/{id}/routes). Embedded `bitRecords` on GET truck; bid CRUD under **Bids** (`/api/bit-records`).',
    },
    { name: 'Bids', description: 'Unified bids (bits) for loads and trucks — `services/bitService.js`' },
    { name: 'Dashboard', description: 'Dashboard stats' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Income Expense Category', description: 'Income/expense category CRUD' },
    { name: 'Income Expense', description: 'Income/expense CRUD' },
    { name: 'Upload', description: 'File upload' },
    { name: 'Block Unblock', description: 'Common block/unblock (status) for multiple entities' },
    { name: 'Location', description: 'Country, state and city lookup APIs' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Express-session cookie',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          mobile: { type: 'string' },
          role: { type: 'object', description: 'Populated role' },
          roleId: { type: 'string' },
          permissions: { type: 'array', items: { type: 'object' } },
          modules: { type: 'object' },
        },
      },
      LoadLocation: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
        },
      },
      Load: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          loadNumber: { type: 'string', description: 'Human–friendly load number like L001, L002' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'assigned', 'accepted', 'rejected', 'delivered', 'cancelled'] },
          pickupLocation: { $ref: '#/components/schemas/LoadLocation' },
          dropLocation: { $ref: '#/components/schemas/LoadLocation' },
          materialId: { type: 'string' },
          vehicleType: { type: 'string' },
          vehicleBodyType: { type: 'string' },
          vehicleCapacity: { type: 'number' },
          bit: { type: 'number' },
          distanceKm: { type: 'number' },
          rejectReason: { type: 'string' },
          ownerId: { type: 'string' },
          ownerUser: { type: 'object' },
          cancelOwnerId: { type: 'string', description: 'User id who cancelled the load (set on cancel)' },
          bitRecords: { type: 'array', items: { $ref: '#/components/schemas/LoadBitRecord' } },
          pickupTime: { type: 'string', description: 'Pickup time (e.g. ISO date or "Today 2 PM")' },
          date: { type: 'string', format: 'date-time', description: 'Scheduled/pickup date' },
        },
      },
      LoadBitRecord: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          loadId: { type: 'string' },
          bit: { type: 'number', description: 'Bid amount' },
          bitReason: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'accept', 'reject'] },
          userId: { type: 'string', description: 'Bidder user id' },
          userName: { type: 'string', description: 'Bidder name' },
          userEmail: { type: 'string', description: 'Bidder contact (email/mobile)' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TruckBitRecord: {
        type: 'object',
        description: 'Bid history entry for a truck (same shape as load bids but keyed by truckId)',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          truckId: { type: 'string' },
          bit: { type: 'number', description: 'Bid amount' },
          bitReason: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'accept', 'reject'] },
          userId: { type: 'string', description: 'Bidder user id' },
          userName: { type: 'string', description: 'Bidder name' },
          userEmail: { type: 'string', description: 'Bidder contact (email/mobile)' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      /**
       * Stored bid status is always pending | accept | reject.
       * Request bodies may use **approved** / **rejected** / **accepted** — normalized by the API.
       */
      BitRecordStatus: {
        type: 'string',
        enum: ['pending', 'accept', 'reject'],
        description: 'Stored value returned on bitRecord',
      },
      BidStatusInput: {
        type: 'string',
        enum: ['pending', 'approved', 'rejected', 'accept', 'reject', 'accepted'],
        description: 'Input alias: approved|accepted→accept, rejected|reject→reject',
      },
      /**
       * POST /api/bit-records — discriminated by `type` (load vs truck). Implemented by `bitService.createBid`.
       */
      CreateBitRecordRequest: {
        oneOf: [
          {
            title: 'Load bid',
            type: 'object',
            required: ['bit', 'loadId'],
            properties: {
              type: {
                type: 'string',
                enum: ['load'],
                default: 'load',
                description: 'Omit or set `load` when bidding on a load',
              },
              loadId: { type: 'string', description: 'Target load (Mongo _id or uuid)' },
              truckId: {
                type: 'string',
                description: 'Optional; ignored for storage when type is load (may be empty string)',
              },
              bit: { type: 'number', description: 'Bid amount' },
              bitReason: { type: 'string' },
              status: { $ref: '#/components/schemas/BidStatusInput' },
              user: { type: 'object', description: 'Optional actor for bidder fields (name, mobile, _id)' },
              requestingUser: { type: 'object', description: 'Alias for user' },
            },
          },
          {
            title: 'Truck bid',
            type: 'object',
            required: ['type', 'bit', 'truckId'],
            properties: {
              type: { type: 'string', enum: ['truck'] },
              truckId: { type: 'string', description: 'Target truck (Mongo _id or uuid)' },
              loadId: { type: 'string', description: 'Optional; ignored when type is truck' },
              bit: { type: 'number', description: 'Bid amount' },
              bitReason: { type: 'string' },
              status: { $ref: '#/components/schemas/BidStatusInput' },
              user: { type: 'object' },
              requestingUser: { type: 'object' },
            },
          },
        ],
      },
      /**
       * Unified `/api/bit-records` routing. List: POST /list (payload). Create: POST. Update: PUT /:id.
       */
      BitRecordRouteMap: {
        type: 'object',
        description: 'Reference — not sent on the wire',
        properties: {
          list: { type: 'string', example: 'POST /api/bit-records/list body: { type, entityId }' },
          create: { type: 'string', example: 'POST /api/bit-records' },
          update: { type: 'string', example: 'PUT /api/bit-records/{bitRecordId}' },
        },
      },
      /** PUT /api/bit-records/:id — `bitService.updateBid` */
      BidRecordUpdateRequest: {
        type: 'object',
        description: 'At least one of bit, bitReason, status. Optional type/loadId/truckId to validate against the stored record.',
        properties: {
          bit: { type: 'number' },
          bitReason: { type: 'string' },
          status: { $ref: '#/components/schemas/BidStatusInput' },
          type: { type: 'string', enum: ['load', 'truck'], description: 'Must match record kind if sent' },
          loadId: { type: 'string', description: 'Must match record when kind is load' },
          truckId: { type: 'string', description: 'Must match record when kind is truck' },
          user: { type: 'object' },
          requestingUser: { type: 'object' },
        },
      },
      /** POST create / PUT update success envelope */
      BidRecordMutationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          type: { type: 'string', enum: ['load', 'truck'], description: 'load vs truck for this bid row' },
          bitRecord: {
            oneOf: [{ $ref: '#/components/schemas/LoadBitRecord' }, { $ref: '#/components/schemas/TruckBitRecord' }],
          },
        },
      },
      LoadBitRecordListResponse: {
        type: 'object',
        properties: {
          bitRecords: { type: 'array', items: { $ref: '#/components/schemas/LoadBitRecord' } },
        },
      },
      TruckBitRecordListResponse: {
        type: 'object',
        properties: {
          bitRecords: { type: 'array', items: { $ref: '#/components/schemas/TruckBitRecord' } },
        },
      },
      Truck: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          registrationNumber: { type: 'string' },
          driverId: { type: 'string' },
          capacity: { type: 'number' },
          bit: { type: 'number', description: 'Current / last accepted bid amount (updated when a truck bid is accepted)' },
          bitReason: { type: 'string' },
          vehicleImages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of vehicle image URLs/paths',
          },
          status: {
            type: 'string',
            enum: ['available', 'in-transit', 'maintenance', 'unavailable'],
            description: 'Truck availability status (change via PATCH /api/truck/{id}/status-location)',
          },
          ownerId: { type: 'string' },
          ownerUser: { type: 'object' },
          routes: { type: 'array', items: { $ref: '#/components/schemas/TruckRoute' } },
          bitRecords: { type: 'array', items: { $ref: '#/components/schemas/TruckBitRecord' } },
        },
      },
      TruckRoute: {
        type: 'object',
        description: 'One route on a truck (from → to, price)',
        properties: {
          _id: { type: 'string', description: 'Route subdocument id (use for PUT/DELETE)' },
          from: { $ref: '#/components/schemas/LoadLocation' },
          to: { $ref: '#/components/schemas/LoadLocation' },
          price: { type: 'number' },
        },
      },
      Driver: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          contactMobile: { type: 'string' },
          contactEmail: { type: 'string' },
          licenseNumber: { type: 'string' },
          status: { type: 'string' },
        },
      },
      Material: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          materials_type: { type: 'string' },
          subcommodity: { type: 'string' },
          commodity: { type: 'string' },
          is_insurance_available: { type: 'boolean' },
        },
      },
      VehicleType: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          vehicle_type: { type: 'string' },
          description: { type: 'string' },
          minimumCapacity: { type: 'string' },
          maximumCapacity: { type: 'string' },
          image: { type: 'string' },
        },
      },
      VehicleBodyType: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          vehicle_name: { type: 'string' },
          image: { type: 'string' },
        },
      },
      LocationCountry: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          uuid: { type: 'string' },
          externalId: { type: 'integer', description: 'Legacy numeric country id from dataset' },
          countryId: { type: 'integer', description: 'Alias for externalId' },
          sortname: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      LocationState: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          uuid: { type: 'string' },
          externalId: { type: 'integer', description: 'Legacy numeric state id from dataset' },
          stateId: { type: 'integer', description: 'Alias for externalId' },
          name: { type: 'string' },
          countryExternalId: { type: 'integer' },
          countryId: { type: 'integer', description: 'Alias for countryExternalId' },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      LocationCity: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          uuid: { type: 'string' },
          externalId: { type: 'integer', description: 'Legacy numeric city id from dataset' },
          cityId: { type: 'integer', description: 'Alias for externalId' },
          name: { type: 'string' },
          stateExternalId: { type: 'integer' },
          stateId: { type: 'integer', description: 'Alias for stateExternalId' },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      Role: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          permissions: { type: 'array' },
        },
      },
      Permission: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title_name: { type: 'string' },
          description: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', description: 'Current page (1-based)' },
          limit: { type: 'integer', description: 'Items per page' },
          total: { type: 'integer', description: 'Total count' },
          totalPages: { type: 'integer', description: 'Total pages' },
        },
      },
    },
  },
};

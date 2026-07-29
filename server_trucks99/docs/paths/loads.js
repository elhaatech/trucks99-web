/**
 * @openapi
 * /api/load/all:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get all loads (paginated)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Loads with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loads:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Load' }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Error fetching loads
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @openapi
 * /api/load/all:
 *   post:
 *     tags:
 *       - Loads
 *     summary: Get loads with filters and pagination
 *     description: Filter by userId, pickup/drop location, vehicle type/body, and date range (load date or pickupTime date). Date filter uses dateFrom/dateTo (YYYY-MM-DD).
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, default: 1 }
 *               limit: { type: integer, default: 20 }
 *               userId: { type: string, description: "Filter by owner/user id" }
 *               pickLocation: { type: string }
 *               dropLocation: { type: string }
 *               vehicleType: { type: string }
 *               vehicleBodyType: { type: string }
 *               dateFrom: { type: string, format: date, description: "Filter by load date from (YYYY-MM-DD)" }
 *               dateTo: { type: string, format: date, description: "Filter by load date to (YYYY-MM-DD)" }
 *               search:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     pickupLocation: { type: object, properties: { address: { type: string } } }
 *                     dropLocation: { type: object, properties: { address: { type: string } } }
 *                     vehicleType: { type: string }
 *                     vehicleBodyType: { type: string }
 *                     dateFrom: { type: string, format: date }
 *                     dateTo: { type: string, format: date }
 *                     date: { type: string, format: date, description: "Single date for filter" }
 *           example:
 *             page: 1
 *             limit: 50
 *             dateFrom: "2025-03-01"
 *             dateTo: "2025-03-31"
 *             search:
 *               - pickupLocation: { address: "dd" }
 *                 dropLocation: { address: "xx" }
 *                 vehicleType: "537a2d2a-221d-4eef-87ea-710bc020c9bc"
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Loads with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loads:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Load' }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Error fetching loads
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @openapi
 * /api/load/my:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get my loads (by userId)
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of loads for the user
 *       400:
 *         description: userId required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/available:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get available loads
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of available loads
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/nearby:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get loads nearby coordinates
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, default: 50 }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: success and data array of loads
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/by-driver:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get loads by driver ID
 *     parameters:
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of loads
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/by-shipper:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get loads by shipper ID
 *     parameters:
 *       - in: query
 *         name: shipperId
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of loads
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/by-agent:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get loads by agent ID
 *     parameters:
 *       - in: query
 *         name: agentId
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of loads
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/assign-agent:
 *   put:
 *     tags:
 *       - Loads
 *     summary: Assign agent to load
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loadId: { type: string }
 *               agentId: { type: string }
 *             required: [loadId, agentId]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Agent assigned
 *       400:
 *         description: loadId and agentId required
 *       404:
 *         description: Load or agent not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/assign-driver:
 *   put:
 *     tags:
 *       - Loads
 *     summary: Assign driver to load
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loadId: { type: string }
 *               driverId: { type: string }
 *               assignedBy: { type: string }
 *             required: [loadId, driverId]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Driver assigned
 *       400:
 *         description: loadId and driverId required
 *       404:
 *         description: Load or driver not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/assign-driver-truck:
 *   put:
 *     tags:
 *       - Loads
 *     summary: Assign driver and truck to load
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loadId: { type: string }
 *               driverId: { type: string }
 *               truckId: { type: string }
 *             required: [loadId, driverId, truckId]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Driver and truck assigned
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/cancel/{id}:
 *   put:
 *     tags:
 *       - Loads
 *     summary: Cancel load (set reason and cancel owner)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *               user: { type: object, properties: { id: { type: string }, name: { type: string }, role: {}, mobile: { type: string } } }
 *               requestingUser: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cancel reason saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 load: { $ref: '#/components/schemas/Load' }
 *       400:
 *         description: Load ID required
 *       404:
 *         description: Load not found
 *       500:
 *         description: Error saving cancel reason
 */

/**
 * @openapi
 * /api/load/driver-status:
 *   put:
 *     tags:
 *       - Loads
 *     summary: Driver accept/reject load
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loadId: { type: string }
 *               driverId: { type: string }
 *               status: { type: string, enum: [accepted, rejected] }
 *               rejectReason: { type: string }
 *             required: [loadId, driverId, status]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: loadId, driverId, status required
 *       404:
 *         description: Load or driver not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/add:
 *   post:
 *     tags:
 *       - Loads
 *     summary: Create load
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               pickupLocation: { $ref: '#/components/schemas/LoadLocation' }
 *               dropLocation: { $ref: '#/components/schemas/LoadLocation' }
 *               materialId: { type: string }
 *               vehicleType: { type: string }
 *               vehicleBodyType: { type: string }
 *               vehicleCapacity: { type: number }
 *               pickupTime: { type: string }
 *               bit: { type: number }
 *               distanceKm: { type: number }
 *               ownerId: { type: string }
 *               userId: { type: string }
 *               status: { type: string, enum: [pending, assigned, accepted, rejected, delivered, cancelled] }
 *               user: { type: object }
 *               requestingUser: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Load created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/{id}:
 *   get:
 *     tags:
 *       - Loads
 *     summary: Get load by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Load object with ownerUser, bitRecords and cancelOwnerId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Load'
 *       404:
 *         description: Load not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/edit/{id}:
 *   put:
 *     tags:
 *       - Loads
 *     summary: Update load
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               pickupLocation: { $ref: '#/components/schemas/LoadLocation' }
 *               dropLocation: { $ref: '#/components/schemas/LoadLocation' }
 *               materialId: { type: string }
 *               vehicleType: { type: string }
 *               status: { type: string }
 *               ownerId: { type: string }
 *               userId: { type: string }
 *               user: { type: object }
 *               bitStatus: { type: string, enum: [accept, reject, pending] }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Load updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Load not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/load/delete:
 *   delete:
 *     tags:
 *       - Loads
 *     summary: Delete loads by ids
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids: { type: array, items: { type: string } }
 *               user: { type: object }
 *             required: [ids]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Deleted count
 *       400:
 *         description: ids array required
 *       500:
 *         description: Server error
 */

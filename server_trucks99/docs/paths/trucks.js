/**
 * @openapi
 * /api/truck/all:
 *   get:
 *     tags:
 *       - Trucks
 *     summary: Get all trucks (with optional query filters)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: ownerId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of trucks (or paginated response)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items: { $ref: '#/components/schemas/Truck' }
 *                 - type: object
 *                   properties:
 *                     trucks: { type: array }
 *                     pagination: { type: object }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/all:
 *   post:
 *     tags:
 *       - Trucks
 *     summary: Get trucks with filters in body
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer }
 *               limit: { type: integer }
 *               userId: { type: string }
 *               ownerId: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Trucks list
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/{id}/routes:
 *   get:
 *     tags:
 *       - Trucks
 *     summary: Get routes for a truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Truck id (Mongo _id or uuid)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: routes array
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 routes:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TruckRoute' }
 *       404:
 *         description: Truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/{id}/status-location:
 *   patch:
 *     tags:
 *       - Trucks
 *     summary: Update only status and currentLocation for a truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Truck id (Mongo _id or uuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, in-transit, maintenance, unavailable]
 *               currentLocation:
 *                 type: string
 *                 description: New current location for the truck
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Truck status/location updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 truck: { $ref: '#/components/schemas/Truck' }
 *       400:
 *         description: Validation error (e.g. missing both status and currentLocation)
 *       404:
 *         description: Truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/routes/{routeId}:
 *   get:
 *     tags:
 *       - Trucks
 *     summary: Get one route by route id (finds truck that contains it)
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema: { type: string }
 *         description: Route subdocument _id
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Route with truckId
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/TruckRoute' }
 *                 - type: object
 *                   properties:
 *                     truckId: { type: string }
 *       404:
 *         description: Route not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/{id}/routes:
 *   post:
 *     tags:
 *       - Trucks
 *     summary: Add routes to a truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Truck id (Mongo _id or uuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               routes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [from, to]
 *                   properties:
 *                     from: { $ref: '#/components/schemas/LoadLocation' }
 *                     to: { $ref: '#/components/schemas/LoadLocation' }
 *                     price: { type: 'number' }
 *             required: [routes]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Routes added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Routes added' }
 *                 routes:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TruckRoute' }
 *       400:
 *         description: At least one route with from.address and to.address required
 *       404:
 *         description: Truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/{id}/routes/{routeId}:
 *   put:
 *     tags:
 *       - Trucks
 *     summary: Update one route on a truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Truck id
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema: { type: string }
 *         description: Route subdocument _id (from GET routes response)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from: { $ref: '#/components/schemas/LoadLocation' }
 *               to: { $ref: '#/components/schemas/LoadLocation' }
 *               price: { type: 'number' }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Route updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Route updated' }
 *                 route: { $ref: '#/components/schemas/TruckRoute' }
 *                 routes: { type: array, items: { $ref: '#/components/schemas/TruckRoute' } }
 *       404:
 *         description: Truck not found or Route not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/{id}/routes/{routeId}:
 *   delete:
 *     tags:
 *       - Trucks
 *     summary: Delete one route from a truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Truck id
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema: { type: string }
 *         description: Route subdocument _id
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Route deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Route deleted' }
 *                 routes: { type: array, items: { $ref: '#/components/schemas/TruckRoute' } }
 *       404:
 *         description: Truck not found or Route not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/{id}:
 *   get:
 *     tags:
 *       - Trucks
 *     summary: Get truck by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Truck object with ownerUser, bitRecords
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Truck' }
 *       404:
 *         description: Truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/add:
 *   post:
 *     tags:
 *       - Trucks
 *     summary: Create truck
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registrationNumber: { type: string }
 *               capacity: { type: number }
 *               vehicleImages:
 *                 type: array
 *                 items: { type: string }
 *                 description: Array of vehicle image URLs/paths
 *               driverId: { type: string }
 *               ownerId: { type: string }
 *               userId: { type: string }
 *               routes: { type: array }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Truck created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/edit/{id}:
 *   put:
 *     tags:
 *       - Trucks
 *     summary: Update truck
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
 *               registrationNumber: { type: string }
 *               capacity: { type: number }
 *               vehicleImages:
 *                 type: array
 *                 items: { type: string }
 *                 description: Array of vehicle image URLs/paths
 *               driverId: { type: string }
 *               ownerId: { type: string }
 *               routes: { type: array }
 *               user: { type: object }
 *               bitStatus: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Truck updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/truck/delete:
 *   delete:
 *     tags:
 *       - Trucks
 *     summary: Delete trucks by ids
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

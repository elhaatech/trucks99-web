/**
 * @openapi
 * /api/vehicle-type/all:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Get all vehicle types
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of vehicle types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/VehicleType' }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-type/{id}:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Get vehicle type by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Vehicle type object
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-type/add:
 *   post:
 *     tags:
 *       - Vehicle Types
 *     summary: Create vehicle type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_type: { type: string }
 *               description: { type: string }
 *               minimumCapacity: { type: string }
 *               maximumCapacity: { type: string }
 *               image: { type: string }
 *               user: { type: object }
 *             required: [vehicle_type]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Vehicle type created
 *       400:
 *         description: vehicle_type required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-type/edit/{id}:
 *   put:
 *     tags:
 *       - Vehicle Types
 *     summary: Update vehicle type
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
 *               vehicle_type: { type: string }
 *               description: { type: string }
 *               minimumCapacity: { type: string }
 *               maximumCapacity: { type: string }
 *               image: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Vehicle type updated
 *       400:
 *         description: ID required
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-type/delete:
 *   delete:
 *     tags:
 *       - Vehicle Types
 *     summary: Delete vehicle types by ids
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
 *         description: ids required
 *       500:
 *         description: Server error
 */

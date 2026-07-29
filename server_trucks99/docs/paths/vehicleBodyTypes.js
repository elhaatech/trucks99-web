/**
 * @openapi
 * /api/vehicle-body-type/all:
 *   get:
 *     tags:
 *       - Vehicle Body Types
 *     summary: Get all vehicle body types
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of vehicle body types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/VehicleBodyType' }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-body-type/{id}:
 *   get:
 *     tags:
 *       - Vehicle Body Types
 *     summary: Get vehicle body type by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Vehicle body type object
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-body-type/add:
 *   post:
 *     tags:
 *       - Vehicle Body Types
 *     summary: Create vehicle body type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_name: { type: string }
 *               image: { type: string }
 *               user: { type: object }
 *             required: [vehicle_name]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Vehicle body type created
 *       400:
 *         description: vehicle_name required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-body-type/edit/{id}:
 *   put:
 *     tags:
 *       - Vehicle Body Types
 *     summary: Update vehicle body type
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
 *               vehicle_name: { type: string }
 *               image: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Vehicle body type updated
 *       400:
 *         description: ID required
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/vehicle-body-type/delete:
 *   delete:
 *     tags:
 *       - Vehicle Body Types
 *     summary: Delete vehicle body types by ids
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

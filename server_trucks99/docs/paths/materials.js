/**
 * @openapi
 * /api/material/all:
 *   get:
 *     tags:
 *       - Materials
 *     summary: Get all materials
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of materials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Material' }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/material/{id}:
 *   get:
 *     tags:
 *       - Materials
 *     summary: Get material by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Material object
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Material' }
 *       404:
 *         description: Material not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/material/add:
 *   post:
 *     tags:
 *       - Materials
 *     summary: Create material
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               materials_type: { type: string }
 *               subcommodity: { type: string }
 *               commodity: { type: string }
 *               is_insurance_available: { type: boolean }
 *               user: { type: object }
 *             required: [materials_type]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Material created
 *       400:
 *         description: materials_type required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/material/edit/{id}:
 *   put:
 *     tags:
 *       - Materials
 *     summary: Update material
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
 *               materials_type: { type: string }
 *               subcommodity: { type: string }
 *               commodity: { type: string }
 *               is_insurance_available: { type: boolean }
 *               user: { type: object }
 *             required: [materials_type]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Material updated
 *       400:
 *         description: ID or materials_type required
 *       404:
 *         description: Material not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/material/delete:
 *   delete:
 *     tags:
 *       - Materials
 *     summary: Delete materials by ids
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

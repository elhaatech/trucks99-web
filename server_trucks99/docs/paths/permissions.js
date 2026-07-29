/**
 * @openapi
 * /api/permission:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all permissions
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/permission/add:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Create permission
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title_name: { type: string }
 *               description: { type: string }
 *               user: { type: object }
 *             required: [title_name]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Permission created
 *       400:
 *         description: title_name required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/permission/edit:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Update permission
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title_name: { type: string }
 *               description: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Permission updated
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/permission/delete:
 *   delete:
 *     tags:
 *       - Permissions
 *     summary: Delete permission
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title_name: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Permission deleted
 *       400:
 *         description: title_name required
 *       500:
 *         description: Server error
 */

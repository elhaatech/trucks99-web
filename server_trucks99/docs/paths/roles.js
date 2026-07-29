/**
 * @openapi
 * /api/role:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get all roles (no filter)
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of roles with permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       500:
 *         description: Server error
 *   post:
 *     tags:
 *       - Roles
 *     summary: List roles with optional search by name (payload)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search: { type: string, description: "Filter by role name (case-insensitive partial match)" }
 *           example:
 *             search: "admin"
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of roles (filtered when search provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/role/add:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               permissions: { type: array, items: { type: string } }
 *               user: { type: object }
 *             required: [name]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         description: name required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/role/edit:
 *   put:
 *     tags:
 *       - Roles
 *     summary: Update role
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *               permissions: { type: array }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/role/delete:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Delete role
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Role deleted
 *       400:
 *         description: name required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/user:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user
 *     description: Returns the authenticated user with role and modules.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Token missing or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 */

/**
 * @openapi
 * /api/user/all:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users (no filter)
 *     description: Returns all users with role populated.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 *   post:
 *     tags:
 *       - Users
 *     summary: List users with optional search (payload)
 *     description: Filter by user name, mobile, or company name (case-insensitive partial match).
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search: { type: string, description: "Search in name, mobile, company_name" }
 *           example:
 *             search: "admin"
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of users (filtered when search provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/user/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: id can be uuid or _id.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/user/add:
 *   post:
 *     tags:
 *       - Users
 *     summary: Add new user (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               mobile: { type: string }
 *               roleId: { type: string, description: "Role id or _id" }
 *               permissions: { type: array, items: { type: string } }
 *               user: { type: object }
 *               requestingUser: { type: object }
 *             required: [roleId, mobile]
 *           example:
 *             name: "New User"
 *             mobile: "9876543210"
 *             roleId: "role-uuid-or-objectid"
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: roleId/mobile required or mobile already registered
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/user/edit/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user
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
 *               name: { type: string }
 *               roleId: { type: string }
 *               permissions: { type: array }
 *               mobile: { type: string }
 *               user: { type: object }
 *               requestingUser: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/user/delete:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete users by ids
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 deletedCount: { type: number }
 *       400:
 *         description: ids array required
 *       500:
 *         description: Server error
 */

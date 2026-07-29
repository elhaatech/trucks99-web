/**
 * @openapi
 * /api/log:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get audit logs
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id: { type: string }
 *                   name: { type: string }
 *                   action: { type: string }
 *                   timestamp: { type: string }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/log/add:
 *   post:
 *     tags:
 *       - Logs
 *     summary: Add log entry
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string }
 *               action: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Log created
 *       500:
 *         description: Server error
 */

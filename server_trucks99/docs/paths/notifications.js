/**
 * @openapi
 * /api/notification:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notifications for current user
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id: { type: string }
 *                   userId: { type: string }
 *                   title: { type: string }
 *                   body: { type: string }
 *                   read: { type: boolean }
 *                   createdAt: { type: string }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/notification/read-all:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Mark all notifications as read
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/notification/{id}/read:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Mark one notification as read
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
 *               userId: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

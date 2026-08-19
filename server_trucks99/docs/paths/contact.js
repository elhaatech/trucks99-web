/**
 * @openapi
 * /api/contact/list:
 *   post:
 *     tags:
 *       - Contact
 *     summary: List contact enquiries
 *     description: Admin enquiry list. Filters are sent in the JSON body (not query params).
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 20 }
 *               search: { type: string, example: uma, description: Matches name, email, mobile, or message }
 *               status: { type: string, enum: [new, read, closed, ""], example: "" }
 *           example:
 *             page: 1
 *             limit: 20
 *             search: uma
 *             status: ""
 *     responses:
 *       200:
 *         description: Paginated enquiry list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       mobile: { type: string }
 *                       email: { type: string }
 *                       message: { type: string }
 *                       attachment: { type: string, nullable: true }
 *                       status: { type: string, enum: [new, read, closed] }
 *                       createdAt: { type: string }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401:
 *         description: Token missing or expired
 */

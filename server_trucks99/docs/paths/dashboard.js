/**
 * @openapi
 * /api/dashboard/access-check:
 *   post:
 *     tags: [Dashboard]
 *     summary: Check dashboard subscription access
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Access status
 *
 * /api/dashboard/overview:
 *   post:
 *     tags: [Dashboard]
 *     summary: Combined dashboard overview (requires subscription)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Overview payload
 *       403:
 *         description: Subscription required
 *
 * /api/dashboard/weekly-income:
 *   post:
 *     tags: [Dashboard]
 *     summary: Weekly total income (income only, no expenses)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: { weeklyIncome }
 *
 * /api/dashboard/weekly-bookings:
 *   post:
 *     tags: [Dashboard]
 *     summary: Loads and trucks booked this week
 *     security: [{ bearerAuth: [] }]
 *
 * /api/dashboard/transaction-summary:
 *   post:
 *     tags: [Dashboard]
 *     summary: Load, truck, and buy/sell transaction totals
 *     security: [{ bearerAuth: [] }]
 *
 * /api/buy-sell/{id}/view:
 *   patch:
 *     tags: [BuySell]
 *     summary: Increment market item view count
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated view count
 */

/**
 * @openapi
 * /api/block-unblock:
 *   post:
 *     tags:
 *       - Block Unblock
 *     summary: Block or unblock an entity (common API for all supported entities)
 *     description: |
 *       Updates the entity's status field. Supported entities: agent, shipper, loader, buySell, driver, income-expense-category, user, vehicle-type, vehicle-body-type, material, income-expense.
 *       Block sets status to inactive (or Inactive for income-expense-category); unblock sets active/available/Active.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entity, id, action]
 *             properties:
 *               entity:
 *                 type: string
 *                 enum: [agent, shipper, loader, buySell, driver, income-expense-category, user, vehicle-type, vehicle-body-type, material, income-expense]
 *                 description: Entity type to block/unblock
 *               id:
 *                 type: string
 *                 description: Entity id (uuid or Mongo _id)
 *               action:
 *                 type: string
 *                 enum: [block, unblock]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Entity block/unblock success; response includes updated entity under entity-specific key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 agent: { type: object }
 *                 driver: { type: object }
 *                 incomeExpenseCategory: { type: object }
 *       400:
 *         description: Missing entity/id/action or invalid action or unknown entity
 *       404:
 *         description: Entity not found
 *       500:
 *         description: Server error
 */

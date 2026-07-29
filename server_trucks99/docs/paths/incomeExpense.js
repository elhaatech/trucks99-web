/**
 * @openapi
 * /api/income-expense/all:
 *   get:
 *     tags:
 *       - Income Expense
 *     summary: Get all income/expense entries
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of income/expense entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id: { type: string }
 *                   amount: { type: number }
 *                   type: { type: string }
 *                   categoryId: { type: string }
 *                   description: { type: string }
 *                   date: { type: string }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense/{id}:
 *   get:
 *     tags:
 *       - Income Expense
 *     summary: Get income/expense entry by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Entry object with category
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense/add:
 *   post:
 *     tags:
 *       - Income Expense
 *     summary: Create income/expense entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               type: { type: string }
 *               categoryId: { type: string }
 *               description: { type: string }
 *               date: { type: string }
 *               user: { type: object }
 *             required: [amount, type, categoryId]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Entry created
 *       400:
 *         description: amount, type, categoryId required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense/edit/{id}:
 *   put:
 *     tags:
 *       - Income Expense
 *     summary: Update income/expense entry
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
 *               amount: { type: number }
 *               type: { type: string }
 *               categoryId: { type: string }
 *               description: { type: string }
 *               date: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Entry updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense/delete:
 *   delete:
 *     tags:
 *       - Income Expense
 *     summary: Delete income/expense entries by ids
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

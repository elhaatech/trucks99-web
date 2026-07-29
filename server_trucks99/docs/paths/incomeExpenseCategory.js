/**
 * @openapi
 * /api/income-expense-category/all:
 *   get:
 *     tags:
 *       - Income Expense Category
 *     summary: Get all income/expense categories
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id: { type: string }
 *                   id: { type: string }
 *                   categoryName: { type: string }
 *                   type: { type: string }
 *                   status: { type: string }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense-category/{id}:
 *   get:
 *     tags:
 *       - Income Expense Category
 *     summary: Get category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Category object
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense-category/add:
 *   post:
 *     tags:
 *       - Income Expense Category
 *     summary: Create category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryName: { type: string }
 *               type: { type: string }
 *               status: { type: string }
 *               user: { type: object }
 *             required: [categoryName]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: categoryName required
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense-category/edit/{id}:
 *   put:
 *     tags:
 *       - Income Expense Category
 *     summary: Update category
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
 *               categoryName: { type: string }
 *               type: { type: string }
 *               status: { type: string }
 *               user: { type: object }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/income-expense-category/delete:
 *   delete:
 *     tags:
 *       - Income Expense Category
 *     summary: Delete categories by ids
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

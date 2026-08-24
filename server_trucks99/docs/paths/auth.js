/**
 * @openapi
 * /:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: Verify that the server is up.
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "server is up and running!"
 */

/**
 * @openapi
 * /api/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Admin email/password login
 *     description: Authenticates an Admin/Super Admin account and returns the same JWT/session as OTP login. Marketplace users continue to use OTP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       400:
 *         description: Missing email or password
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/signup:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Create a new user (signup)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               mobile: { type: string }
 *               password: { type: string, format: password }
 *             required:
 *               - name
 *               - mobile
 *           example:
 *             name: "John Doe"
 *             mobile: "9876543210"
 *             email: "john@example.com"
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/logout:
 *   delete:
 *     tags:
 *       - Auth
 *     summary: Logout (destroy session)
 *     responses:
 *       200:
 *         description: Logged out
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Initiate Google OAuth
 *     description: Redirects to Google consent screen.
 *     responses:
 *       302:
 *         description: Redirect to Google
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/auth/google/redirect:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Google OAuth callback
 *     responses:
 *       302:
 *         description: Redirect to app or fail URL
 */

/**
 * @openapi
 * /api/auth/google/fail:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Google OAuth failure
 *     responses:
 *       200:
 *         description: Failure message
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/auth/github:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Initiate GitHub OAuth
 *     responses:
 *       302:
 *         description: Redirect to GitHub
 */

/**
 * @openapi
 * /api/auth/github/redirect:
 *   get:
 *     tags:
 *       - Auth
 *     summary: GitHub OAuth callback
 *     responses:
 *       302:
 *         description: Redirect to app or fail URL
 */

/**
 * @openapi
 * /api/auth/github/fail:
 *   get:
 *     tags:
 *       - Auth
 *     summary: GitHub OAuth failure
 *     responses:
 *       200:
 *         description: Failure message
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/otp/send:
 *   post:
 *     tags:
 *       - OTP
 *     summary: Send OTP to mobile
 *     description: Public. Sends a login OTP to an existing user. Registration uses POST /api/signup, which sends its registration OTP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile: { type: string, example: "9876543210" }
 *             required: [mobile]
 *     responses:
 *       200:
 *         description: OTP sent (or otpForDev in dev)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 otpSentViaSms: { type: boolean }
 *                 otpForDev: { type: string, description: "Dev only" }
 *       400:
 *         description: Mobile number is required
 *       404:
 *         description: No account found for this mobile number
 *       429:
 *         description: Resend cooldown
 *       500:
 *         description: Failed to send OTP
 */

/**
 * @openapi
 * /api/otp/verify:
 *   post:
 *     tags:
 *       - OTP
 *     summary: Verify OTP and log in
 *     description: Public. Verifies mobile + OTP and creates session. Returns user and optionally token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile: { type: string, example: "9876543210" }
 *               otp: { type: string, example: "123456" }
 *             required: [mobile, otp]
 *     responses:
 *       200:
 *         description: OTP verified, session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Mobile and OTP required
 *       404:
 *         description: User not found
 *       401:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Verification failed
 */

/**
 * @openapi
 * /api/otp/mobile/send:
 *   post:
 *     tags:
 *       - OTP
 *     summary: Send OTP to register mobile (logged-in user)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile: { type: string }
 *             required: [mobile]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OTP sent
 *       400:
 *         description: Mobile required
 *       401:
 *         description: Must be logged in
 *       500:
 *         description: Failed to send OTP
 */

/**
 * @openapi
 * /api/otp/verify-login:
 *   post:
 *     tags:
 *       - OTP
 *     summary: Verify OTP after email/password login
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp: { type: string }
 *             required: [otp]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token: { type: string }
 *                 user: { type: object }
 *       400:
 *         description: OTP required
 *       401:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Verification failed
 */

/**
 * @openapi
 * /api/otp/mobile/verify:
 *   post:
 *     tags:
 *       - OTP
 *     summary: Verify OTP and save mobile on user (logged-in)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile: { type: string }
 *               otp: { type: string }
 *             required: [mobile, otp]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Mobile registered
 *       400:
 *         description: Mobile and OTP required
 *       401:
 *         description: Must be logged in or invalid OTP
 *       500:
 *         description: Verification failed
 */

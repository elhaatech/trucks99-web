/**
 * @openapi
 * /api/upload:
 *   post:
 *     tags:
 *       - Upload
 *     summary: Upload a file
 *     description: >
 *       Multipart form upload. Use field name **"file"** for the binary file and optional **"key"** to choose a logical folder
 *       (e.g. `vehicle_type`, `vehicle_body`, `truck_image`, `truck_rc_doc`). The server will store the file under
 *       `/uploads/{key}/...` and return the final URL.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (image or document)
 *               key:
 *                 type: string
 *                 description: >
 *                   Optional folder key to categorize the upload. Common values:
 *                   `vehicle_type`, `vehicle_body`, `truck_image`, `truck_rc_doc`. When provided, the file is stored under
 *                   `/uploads/{key}/...`.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "File uploaded" }
 *                 path: { type: string, description: "URL path e.g. /uploads/truck_image/file_123.jpg" }
 *                 url: { type: string, description: "Same as path (public URL)" }
 *                 filename: { type: string }
 *       400:
 *         description: No file provided or invalid file
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Upload failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

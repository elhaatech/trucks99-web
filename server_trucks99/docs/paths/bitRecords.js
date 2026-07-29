/**
 * @openapi
 * /api/bit-records/list:
 *   post:
 *     tags:
 *       - Bids
 *     summary: List bids for a load or truck
 *     description: |
 *       Returns `bitRecords` for the given parent entity using payload (no query params).
 *       Implemented by `bitService.listBitRecords`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [load, truck] }
 *               entityId: { type: string, description: 'loadId when type=load, truckId when type=truck' }
 *             required: [type, entityId]
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Sorted by createdAt ascending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 bitRecords:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - { $ref: '#/components/schemas/LoadBitRecord' }
 *                       - { $ref: '#/components/schemas/TruckBitRecord' }
 *       400:
 *         description: Missing type or entityId, or invalid type
 *       404:
 *         description: Load or truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/bit-records:
 *   post:
 *     tags:
 *       - Bids
 *     summary: Create bid (load or truck)
 *     description: |
 *       Single entry point for new bids. Body **oneOf** — see **CreateBitRecordRequest** / `bitService.createBid`.
 *       Status in request may be `pending`, `approved`, `rejected`, or legacy `accept`/`reject`/`accepted`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateBitRecordRequest' }
 *           examples:
 *             loadBid:
 *               summary: Load
 *               value:
 *                 type: load
 *                 loadId: 84537dee-a2cc-4573-ad64-df6d256c1b80
 *                 truckId: ''
 *                 bit: 7500
 *                 bitReason: Fuel and toll
 *                 status: pending
 *             truckBid:
 *               summary: Truck
 *               value:
 *                 type: truck
 *                 loadId: ''
 *                 truckId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *                 bit: 8000
 *                 status: approved
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BidRecordMutationResponse' }
 *       400:
 *         description: Validation error
 *       404:
 *         description: Load or truck not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/bit-records/{id}:
 *   put:
 *     tags:
 *       - Bids
 *     summary: Update bid by record id
 *     description: |
 *       Resolves **LoadBitRecord** or **TruckBitRecord** by `id` (Mongo _id or uuid). Same handler for both — `bitService.updateBid`.
 *       Provide at least one of `bit`, `bitReason`, `status`. Optional `type`, `loadId`, `truckId` validate against the stored row.
 *       When status becomes approved/accept: other bids on the same load/truck are rejected; load status or truck bit fields update per business rules.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BidRecordUpdateRequest' }
 *           examples:
 *             approve:
 *               summary: Approve bid
 *               value:
 *                 type: load
 *                 status: approved
 *             adjustAmount:
 *               summary: Change amount only
 *               value:
 *                 bit: 8200
 *                 bitReason: Updated estimate
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BidRecordMutationResponse' }
 *       400:
 *         description: Validation error
 *       404:
 *         description: Bit record not found
 *       500:
 *         description: Server error
 */

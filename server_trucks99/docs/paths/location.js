/**
 * @openapi
 * /api/location/countries/all:
 *   get:
 *     tags:
 *       - Location
 *     summary: Get all countries
 *     description: Returns all countries sorted by name.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Countries list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/LocationCountry' }
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/location/states/by-country:
 *   post:
 *     tags:
 *       - Location
 *     summary: Get states by selected country
 *     description: >
 *       Used by Create Location UI. Accepts either `countryId` (preferred) or `countryExternalId`
 *       and also supports snake_case `country_id`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryId: { type: string, example: "101" }
 *               countryExternalId: { type: integer, example: 101 }
 *               country_id: { type: string, example: "101" }
 *               countryName: { type: string, example: "India" }
 *               q: { type: string, example: "" }
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 2000 }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: State list for selected country
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 country: { $ref: '#/components/schemas/LocationCountry' }
 *                 items:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/LocationState' }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *       400:
 *         description: Missing country identifier
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/location/cities/by-state:
 *   post:
 *     tags:
 *       - Location
 *     summary: Get cities by selected state
 *     description: >
 *       Used by Create Location UI. Accepts either `stateId` (preferred) or `stateExternalId`
 *       and also supports snake_case `state_id`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stateId: { type: string, example: "35" }
 *               stateExternalId: { type: integer, example: 35 }
 *               state_id: { type: string, example: "35" }
 *               q: { type: string, example: "" }
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 2000 }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: City list for selected state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 country:
 *                   oneOf:
 *                     - { $ref: '#/components/schemas/LocationCountry' }
 *                     - { type: 'null' }
 *                 state:
 *                   oneOf:
 *                     - { $ref: '#/components/schemas/LocationState' }
 *                     - { type: 'null' }
 *                 items:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/LocationCity' }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *       400:
 *         description: Missing state identifier
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/location/seed:
 *   post:
 *     tags:
 *       - Location
 *     summary: Seed location data (countries/states/cities)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force: { type: boolean, example: false }
 *               seedCountries: { type: boolean, example: true }
 *               seedStates: { type: boolean, example: true }
 *               seedCities: { type: boolean, example: true }
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Seed result
 *       500:
 *         description: Server error
 */

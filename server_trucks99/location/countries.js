/**
 * Country list for LocationCountry seed (`externalId` = numeric `id` from dataset).
 * Edit `countries.rows.js` to change data; this file maps rows to { id, sortname, name }.
 */
const rows = require('./countries.rows');

module.exports = rows.map(([id, sortname, name]) => ({ id, sortname, name }));

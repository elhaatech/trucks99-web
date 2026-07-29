const LocationCountry = require('../schema/locationCountry');
const LocationState = require('../schema/locationState');
const LocationCity = require('../schema/locationCity');

// Static datasets (huge arrays)
// These files may be missing in some environments (or after cleanup / disk-full events),
// so we must not crash the whole server at import-time.
let countriesData = [];
let statesData = [];
let citiesData = [];
try {
  countriesData = require('../location/countries');
} catch (e) {
  console.warn('Location seed: missing countries dataset:', e?.message || String(e));
}
try {
  statesData = require('../location/states');
} catch (e) {
  console.warn('Location seed: missing states dataset:', e?.message || String(e));
}
try {
  citiesData = require('../location/cities');
} catch (e) {
  console.warn('Location seed: missing cities dataset:', e?.message || String(e));
}

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function insertInChunks(Model, totalCount, chunkSize, makeDocsForRange) {
  for (let start = 0; start < totalCount; start += chunkSize) {
    const end = Math.min(totalCount, start + chunkSize);
    const docs = makeDocsForRange(start, end);
    if (!docs.length) continue;
    await Model.insertMany(docs, { ordered: false });
  }
}

/**
 * Seeds Country/State/City using server/location/* datasets.
 * This is intentionally bulk/insert-chunk based because `cities` is very large.
 */
async function seedLocationData({
  force = false,
  seedCountries = true,
  seedStates = true,
  seedCities = true,
  chunkSize = 1000,
} = {}) {
  let seededAnything = false;
  const existingCountries = await LocationCountry.estimatedDocumentCount();

  // Force re-seed (useful during development)
  if (force) {
    await Promise.all([LocationCity.deleteMany({}), LocationState.deleteMany({}), LocationCountry.deleteMany({})]);
  }

  const results = {};

  if (seedCountries) {
    if (force || existingCountries === 0) {
      const countriesToInsert = countriesData || [];
      if (!countriesToInsert.length) {
        console.warn('Location seed: countries dataset is empty; skipping country inserts.');
      } else {
        await insertInChunks(
          LocationCountry,
          countriesToInsert.length,
          chunkSize,
          (start, end) =>
            countriesToInsert
              .slice(start, end)
              .map((c) => ({
                externalId: toFiniteNumber(c.id),
                sortname: c.sortname ?? '',
                name: c.name ?? '',
                status: 'active',
              }))
              .filter((d) => d.externalId != null && d.name)
        );
        results.countriesInserted = countriesToInsert.length;
        seededAnything = true;
      }
    }
  }

  if (seedStates) {
    // If countries weren't inserted (e.g. force false but partial state exists),
    // we still allow states insert as long as collection is empty/force is true.
    const existingStates = await LocationState.estimatedDocumentCount();
    if (force || existingStates === 0) {
      const statesToInsert = statesData || [];
      if (!statesToInsert.length) {
        console.warn('Location seed: states dataset is empty; skipping state inserts.');
      } else {
        await insertInChunks(
          LocationState,
          statesToInsert.length,
          chunkSize,
          (start, end) =>
            statesToInsert
              .slice(start, end)
              .map((s) => ({
                externalId: toFiniteNumber(s.id),
                name: s.name ?? '',
                countryExternalId: toFiniteNumber(s.country_id),
                status: 'active',
              }))
              .filter((d) => d.externalId != null && d.countryExternalId != null && d.name)
        );
        results.statesInserted = statesToInsert.length;
        seededAnything = true;
      }
    }
  }

  if (seedCities) {
    const existingCities = await LocationCity.estimatedDocumentCount();
    if (force || existingCities === 0) {
      const citiesToInsert = citiesData || [];
      if (!citiesToInsert.length) {
        console.warn('Location seed: cities dataset is empty; skipping city inserts.');
      } else {
        await insertInChunks(
          LocationCity,
          citiesToInsert.length,
          chunkSize,
          (start, end) =>
            citiesToInsert
              .slice(start, end)
              .map((ct) => ({
                externalId: toFiniteNumber(ct.id),
                name: ct.name ?? '',
                stateExternalId: toFiniteNumber(ct.state_id),
                status: 'active',
              }))
              .filter((d) => d.externalId != null && d.stateExternalId != null && d.name)
        );
        results.citiesInserted = citiesToInsert.length;
        seededAnything = true;
      }
    }
  }

  if (!seededAnything) {
    return { seeded: false, reason: 'location already seeded' };
  }
  return { seeded: true, ...results };
}

module.exports = { seedLocationData };


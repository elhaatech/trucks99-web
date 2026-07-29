const express = require('express');
const LocationCountry = require('../schema/locationCountry');
const LocationState = require('../schema/locationState');
const LocationCity = require('../schema/locationCity');
const Log = require('../schema/log');
const { seedLocationData } = require('../location/seedLocationData');
const { toResponse, isObjectId } = require('../helpers/uuidHelper');

const locationRouter = express.Router();
const entityName = 'location';

function escapeRegex(s) {
  return String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function resolveCountryExternalIdFromInput({ countryId, countryExternalId, country_id }) {
  const idCandidate = countryExternalId ?? countryId ?? country_id;
  if (idCandidate == null || String(idCandidate).trim() === '') return null;
  const n = Number(idCandidate);
  return Number.isFinite(n) ? n : null;
}

function resolveStateExternalIdFromInput({ stateId, stateExternalId, state_id }) {
  const idCandidate = stateExternalId ?? stateId ?? state_id;
  if (idCandidate == null || String(idCandidate).trim() === '') return null;
  const n = Number(idCandidate);
  return Number.isFinite(n) ? n : null;
}

/** Ensures clients always get a stable `id` (bulk inserts may omit schema default `id`). */
function normalizeLocationDoc(doc) {
  const o = toResponse(doc);
  if (!o) return o;
  if (!o.id && o._id) o.id = String(o._id);
  return o;
}

function normalizeLocationList(docs) {
  if (!Array.isArray(docs)) return docs;
  return docs.map((d) => normalizeLocationDoc(d));
}

function toCountryDto(doc) {
  const o = normalizeLocationDoc(doc);
  if (!o) return o;
  return {
    ...o,
    countryId: o.externalId ?? null,
  };
}

function toStateDto(doc) {
  const o = normalizeLocationDoc(doc);
  if (!o) return o;
  return {
    ...o,
    stateId: o.externalId ?? null,
    countryId: o.countryExternalId ?? null,
  };
}

function toCityDto(doc) {
  const o = normalizeLocationDoc(doc);
  if (!o) return o;
  return {
    ...o,
    cityId: o.externalId ?? null,
    stateId: o.stateExternalId ?? null,
  };
}

function mapDtoList(docs, mapper) {
  const list = normalizeLocationList(docs);
  if (!Array.isArray(list)) return list;
  return list.map(mapper);
}

async function resolveCountryExternalId({ countryId, countryExternalId, country_id, countryName }) {
  let resolved = resolveCountryExternalIdFromInput({ countryId, countryExternalId, country_id });
  if (resolved != null) return resolved;

  if (countryId != null && String(countryId).trim() !== '') {
    const raw = String(countryId).trim();
    if (isObjectId(raw)) {
      const cByMongo = await LocationCountry.findById(raw).select('externalId').lean();
      if (cByMongo?.externalId != null) return cByMongo.externalId;
    }
    const cById = await LocationCountry.findOne({
      $or: [{ id: raw }, { uuid: raw }],
    })
      .select('externalId')
      .lean();
    if (cById?.externalId != null) return cById.externalId;
  }

  if (countryName != null && String(countryName).trim() !== '') {
    const cByName = await LocationCountry.findOne({ name: String(countryName).trim() }).select('externalId').lean();
    if (cByName?.externalId != null) return cByName.externalId;
  }

  return null;
}

async function resolveStateExternalId({ stateId, stateExternalId, state_id }) {
  let resolved = resolveStateExternalIdFromInput({ stateId, stateExternalId, state_id });
  if (resolved != null) return resolved;

  if (stateId != null && String(stateId).trim() !== '') {
    const raw = String(stateId).trim();
    if (isObjectId(raw)) {
      const sByMongo = await LocationState.findById(raw).select('externalId').lean();
      if (sByMongo?.externalId != null) return sByMongo.externalId;
    }
    const sById = await LocationState.findOne({
      $or: [{ id: raw }, { uuid: raw }],
    })
      .select('externalId')
      .lean();
    if (sById?.externalId != null) return sById.externalId;
  }

  return null;
}

// GET /api/location/countries/all
locationRouter.get('/countries/all', async (req, res) => {
  try {
    const list = await LocationCountry.find().sort({ name: 1 }).lean();
    res.status(200).json(mapDtoList(list, toCountryDto));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName} countries`, error: error?.message || String(error) });
  }
});

// GET /api/location/states/all?countryId=101 or countryName=India&q=ap
locationRouter.get('/states/all', async (req, res) => {
  try {
    const { countryId, countryExternalId, country_id, countryName, q } = req.query;
    const limit = Math.min(parsePositiveInt(req.query.limit, 200), 2000);
    const page = parsePositiveInt(req.query.page, 1);
    const skip = (page - 1) * limit;

    const resolvedCountryExternalId = await resolveCountryExternalId({ countryId, countryExternalId, country_id, countryName });

    if (resolvedCountryExternalId == null) {
      return res.status(400).json({ message: 'countryId/countryExternalId or countryName is required' });
    }

    const filter = { countryExternalId: resolvedCountryExternalId };
    if (q != null && String(q).trim() !== '') {
      filter.name = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
    }

    const [total, list] = await Promise.all([
      LocationState.countDocuments(filter),
      LocationState.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({
      country: toCountryDto(await LocationCountry.findOne({ externalId: resolvedCountryExternalId }).lean()),
      items: mapDtoList(list, toStateDto),
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName} states`, error: error?.message || String(error) });
  }
});

// POST /api/location/states/by-country
// Body: { countryId?: number|string, countryExternalId?: number|string, countryName?: string, q?: string, page?: number, limit?: number }
locationRouter.post('/states/by-country', async (req, res) => {
  try {
    const { countryId, countryExternalId, country_id, countryName, q } = req.body || {};
    const limit = Math.min(parsePositiveInt(req.body?.limit, 200), 2000);
    const page = parsePositiveInt(req.body?.page, 1);
    const skip = (page - 1) * limit;

    const resolvedCountryExternalId = await resolveCountryExternalId({ countryId, countryExternalId, country_id, countryName });

    if (resolvedCountryExternalId == null) {
      return res.status(400).json({ message: 'countryId/countryExternalId or countryName is required in body' });
    }

    const filter = { countryExternalId: resolvedCountryExternalId };
    if (q != null && String(q).trim() !== '') {
      filter.name = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
    }

    const [total, list] = await Promise.all([
      LocationState.countDocuments(filter),
      LocationState.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({
      country: toCountryDto(await LocationCountry.findOne({ externalId: resolvedCountryExternalId }).lean()),
      items: mapDtoList(list, toStateDto),
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName} states`, error: error?.message || String(error) });
  }
});

// GET /api/location/cities/all?stateId=1&q=ch
locationRouter.get('/cities/all', async (req, res) => {
  try {
    const { stateId, stateExternalId, state_id, q } = req.query;
    const limit = Math.min(parsePositiveInt(req.query.limit, 200), 2000);
    const page = parsePositiveInt(req.query.page, 1);
    const skip = (page - 1) * limit;

    const resolvedStateExternalId = await resolveStateExternalId({ stateId, stateExternalId, state_id });

    if (resolvedStateExternalId == null) {
      return res.status(400).json({ message: 'stateId/stateExternalId is required' });
    }

    const filter = { stateExternalId: resolvedStateExternalId };
    if (q != null && String(q).trim() !== '') {
      filter.name = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
    }

    const [total, list, stateDoc] = await Promise.all([
      LocationCity.countDocuments(filter),
      LocationCity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      LocationState.findOne({ externalId: resolvedStateExternalId }).lean(),
    ]);

    const state = toStateDto(stateDoc);
    const country = state?.countryId != null
      ? toCountryDto(await LocationCountry.findOne({ externalId: state.countryId }).lean())
      : null;

    res.status(200).json({
      country,
      state,
      items: mapDtoList(list, toCityDto),
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName} cities`, error: error?.message || String(error) });
  }
});

// POST /api/location/cities/by-state
// Body: { stateId?: number|string, stateExternalId?: number|string, q?: string, page?: number, limit?: number }
locationRouter.post('/cities/by-state', async (req, res) => {
  try {
    const { stateId, stateExternalId, state_id, q } = req.body || {};
    const limit = Math.min(parsePositiveInt(req.body?.limit, 200), 2000);
    const page = parsePositiveInt(req.body?.page, 1);
    const skip = (page - 1) * limit;

    const resolvedStateExternalId = await resolveStateExternalId({ stateId, stateExternalId, state_id });
    if (resolvedStateExternalId == null) {
      return res.status(400).json({ message: 'stateId/stateExternalId is required in body' });
    }

    const filter = { stateExternalId: resolvedStateExternalId };
    if (q != null && String(q).trim() !== '') {
      filter.name = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
    }

    const [total, list, stateDoc] = await Promise.all([
      LocationCity.countDocuments(filter),
      LocationCity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      LocationState.findOne({ externalId: resolvedStateExternalId }).lean(),
    ]);

    const state = toStateDto(stateDoc);
    const country = state?.countryId != null
      ? toCountryDto(await LocationCountry.findOne({ externalId: state.countryId }).lean())
      : null;

    res.status(200).json({
      country,
      state,
      items: mapDtoList(list, toCityDto),
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName} cities`, error: error?.message || String(error) });
  }
});

// POST /api/location/seed (optional manual seed)
// Body: { force?: boolean, seedCountries?: boolean, seedStates?: boolean, seedCities?: boolean }
locationRouter.post('/seed', async (req, res) => {
  try {
    const actor = req.user || {};
    const { force, seedCountries, seedStates, seedCities } = req.body || {};

    const result = await seedLocationData({
      force: Boolean(force),
      seedCountries: seedCountries !== false,
      seedStates: seedStates !== false,
      seedCities: seedCities !== false,
    });

    const newLog = new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || 'unknown',
      role: actor?.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `seeded location data: countries=${result.countriesInserted ?? 'n/a'}, states=${result.statesInserted ?? 'n/a'}, cities=${result.citiesInserted ?? 'n/a'}`,
    });
    await newLog.save();

    res.status(200).json({ message: 'Location seed finished', result });
  } catch (error) {
    res.status(500).json({ message: `Error seeding location data`, error: error?.message || String(error) });
  }
});

module.exports = locationRouter;


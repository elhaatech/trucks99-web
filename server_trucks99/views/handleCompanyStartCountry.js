const express = require('express');
const CompanyStartCountry = require('../schema/companyStartCountry');
const Log = require('../schema/log');
const {
  findByIdOrUuid,
  resolveToObjectId,
  resolveIdsToObjectIds,
  toResponse,
  toResponseList,
  generateUuid,
} = require('../helpers/uuidHelper');

const companyStartCountryRouter = express.Router();
const entityName = 'company-start-country';

function cleanRequiredString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function escapeRegex(s) {
  return String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getNextExternalId(Model) {
  const last = await Model.findOne().sort({ externalId: -1 }).select('externalId').lean();
  return Number(last?.externalId || 0) + 1;
}

async function syncLocationHierarchy({ country, state, city }) {
  const LocationCountry = require('../schema/locationCountry');
  const LocationState = require('../schema/locationState');
  const LocationCity = require('../schema/locationCity');

  const countryName = cleanRequiredString(country);
  const stateName = cleanRequiredString(state);
  const cityName = cleanRequiredString(city);

  const countryPattern = new RegExp(`^${escapeRegex(countryName)}$`, 'i');
  let countryDoc = await LocationCountry.findOne({ name: countryPattern }).lean();
  if (!countryDoc) {
    countryDoc = await LocationCountry.create({
      externalId: await getNextExternalId(LocationCountry),
      sortname: countryName.slice(0, 2).toUpperCase(),
      name: countryName,
      status: 'active',
    });
    countryDoc = countryDoc.toObject();
  }

  const statePattern = new RegExp(`^${escapeRegex(stateName)}$`, 'i');
  let stateDoc = await LocationState.findOne({
    name: statePattern,
    countryExternalId: countryDoc.externalId,
  }).lean();
  if (!stateDoc) {
    stateDoc = await LocationState.create({
      externalId: await getNextExternalId(LocationState),
      name: stateName,
      countryExternalId: countryDoc.externalId,
      status: 'active',
    });
    stateDoc = stateDoc.toObject();
  }

  const cityPattern = new RegExp(`^${escapeRegex(cityName)}$`, 'i');
  let cityDoc = await LocationCity.findOne({
    name: cityPattern,
    stateExternalId: stateDoc.externalId,
  }).lean();
  if (!cityDoc) {
    cityDoc = await LocationCity.create({
      externalId: await getNextExternalId(LocationCity),
      name: cityName,
      stateExternalId: stateDoc.externalId,
      status: 'active',
    });
  }

  return { country: countryDoc, state: stateDoc, city: cityDoc };
}

// GET /api/company-start-country/all
companyStartCountryRouter.get('/all', async (req, res) => {
  try {
    const list = await CompanyStartCountry.find().sort({
      city: 1,
      state: 1,
      country: 1,
    }).lean();
    res.status(200).json(toResponseList(list));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}s`, error: error?.message || String(error) });
  }
});

// GET /api/company-start-country/:id (id can be uuid or _id)
companyStartCountryRouter.get('/:id', async (req, res) => {
  try {
    const item = await findByIdOrUuid(CompanyStartCountry, req.params.id);
    if (!item) return res.status(404).json({ message: `${entityName} not found` });
    res.status(200).json(toResponse(item));
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${entityName}`, error: error?.message || String(error) });
  }
});

// POST /api/company-start-country/add
companyStartCountryRouter.post('/add', async (req, res) => {
  try {
    const { city, state, country, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const resolvedCity = cleanRequiredString(city);
    const resolvedState = cleanRequiredString(state);
    const resolvedCountry = cleanRequiredString(country);
    if (!resolvedCity) return res.status(400).json({ message: 'city is required' });
    if (!resolvedState) return res.status(400).json({ message: 'state is required' });
    if (!resolvedCountry) return res.status(400).json({ message: 'country is required' });

    const existing = await CompanyStartCountry.findOne({
      city: resolvedCity,
      state: resolvedState,
      country: resolvedCountry,
    }).lean();
    if (existing) return res.status(400).json({ message: 'This location already exists' });

    const newId = generateUuid();
    const item = await CompanyStartCountry.create({
      id: newId,
      uuid: newId,
      city: resolvedCity,
      state: resolvedState,
      country: resolvedCountry,
      status: 'active',
    });

    try {
      await syncLocationHierarchy({
        city: resolvedCity,
        state: resolvedState,
        country: resolvedCountry,
      });
    } catch (syncError) {
      await CompanyStartCountry.deleteOne({ _id: item._id });
      return res.status(500).json({
        message: 'Failed to sync location master data',
        error: syncError?.message || String(syncError),
      });
    }

    const newLog = new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || 'unknown',
      role: actor?.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `added new ${entityName}: ${item.city}, ${item.state}, ${item.country} (${item._id})`,
    });
    await newLog.save();

    res.status(201).json({ message: `${entityName} created successfully`, companyStartCountry: toResponse(item) });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${entityName}`, error: error?.message || String(error) });
  }
});

// PUT /api/company-start-country/edit/:id
companyStartCountryRouter.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      city,
      state,
      country,
      user,
      requestingUser,
    } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: 'ID is required' });

    const resolvedId = await resolveToObjectId(CompanyStartCountry, id);
    if (!resolvedId) return res.status(404).json({ message: `${entityName} not found` });

    const updateFields = {};
    if (city !== undefined) {
      const resolvedCity = cleanRequiredString(city);
      if (!resolvedCity) return res.status(400).json({ message: 'city cannot be empty' });
      updateFields.city = resolvedCity;
    }

    if (state !== undefined) {
      const resolvedState = cleanRequiredString(state);
      if (!resolvedState) return res.status(400).json({ message: 'state cannot be empty' });
      updateFields.state = resolvedState;
    }

    if (country !== undefined) {
      const resolvedCountry = cleanRequiredString(country);
      if (!resolvedCountry) return res.status(400).json({ message: 'country cannot be empty' });
      updateFields.country = resolvedCountry;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'At least one of city, state, or country is required' });
    }

    const existing = await CompanyStartCountry.findById(resolvedId).lean();
    if (!existing) return res.status(404).json({ message: `${entityName} not found` });

    const nextCity = updateFields.city ?? existing.city;
    const nextState = updateFields.state ?? existing.state;
    const nextCountry = updateFields.country ?? existing.country;

    const duplicate = await CompanyStartCountry.findOne({
      city: nextCity,
      state: nextState,
      country: nextCountry,
      _id: { $ne: resolvedId },
    }).lean();
    if (duplicate) return res.status(400).json({ message: 'Duplicate city/state/country not allowed' });

    await syncLocationHierarchy({
      city: nextCity,
      state: nextState,
      country: nextCountry,
    });

    const updated = await CompanyStartCountry.findByIdAndUpdate(resolvedId, updateFields, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ message: `${entityName} not found` });

    const newLog = new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || 'unknown',
      role: actor?.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `updated ${entityName}: ${updated.city}, ${updated.state}, ${updated.country} (${id})`,
    });
    await newLog.save();

    res.status(200).json({ message: `${entityName} updated successfully`, companyStartCountry: toResponse(updated) });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${entityName}`, error: error?.message || String(error) });
  }
});

// DELETE /api/company-start-country/delete
companyStartCountryRouter.delete('/delete', async (req, res) => {
  try {
    const { ids, id, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};

    const idList = Array.isArray(ids)
      ? ids
      : ids != null
        ? [ids]
        : id != null
          ? [id]
          : [];

    if (idList.length === 0) return res.status(400).json({ message: 'ids array is required (e.g. ids: ["id1","id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(CompanyStartCountry, idList);
    const result = await CompanyStartCountry.deleteMany({ _id: { $in: resolvedIds } });
    const deletedCount = result.deletedCount || 0;

    const newLog = new Log({
      name: actor?.name || 'unknown',
      email: actor?.mobile || 'unknown',
      role: actor?.role || 'unknown',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      action: `deleted ${deletedCount} ${entityName}(s): ${idList.join(', ')}`,
    });
    await newLog.save();

    res.status(200).json({
      message: deletedCount === 0 ? `No ${entityName}s found to delete` : `${deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({ message: `Error deleting ${entityName}s`, error: error?.message || String(error) });
  }
});

module.exports = companyStartCountryRouter;


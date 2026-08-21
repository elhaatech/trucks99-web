const mongoose = require('mongoose');
const Specification = require('../../../schema/specificationModel');
const SpecificationValue = require('../../../schema/specificationValueModel');
const SubCategory = require('../../../schema/subcategorymodel');
const { resolveToObjectId, toResponse } = require('../../../helpers/uuidHelper');

const GLOBAL_SUBCATEGORY_IDS = ['*', 'ALL'];

function actorName(req) {
  return req?.user?.name || req?.user?.email || 'system';
}

async function resolveSpecificationId(specificationId) {
  return resolveToObjectId(Specification, specificationId);
}

async function resolveSpecificationValueId(specificationValueId) {
  return resolveToObjectId(SpecificationValue, specificationValueId);
}

async function findSpecificationOrNull(specificationId) {
  const resolved = await resolveSpecificationId(specificationId);
  if (!resolved) return null;
  const doc = await Specification.findById(resolved).lean();
  return doc ? toResponse(doc) : null;
}

async function ensureSelectableSpecification(specificationId) {
  const resolved = await resolveSpecificationId(specificationId);
  if (!resolved) return { error: 'Specification not found', specification: null };
  const specification = await Specification.findById(resolved).lean();
  if (!specification) return { error: 'Specification not found', specification: null };
  // if (specification.type !== 'selectable') {
  //   return { error: 'Specification values are allowed only for type selectable', specification };
  // }
  return { error: null, specification };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idString(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
    if (value.$oid) return String(value.$oid);
  }
  return String(value);
}

function serializeDoc(doc) {
  const row = toResponse(doc) || {};
  const mongoId = idString(doc && doc._id) || idString(row._id);
  return {
    ...row,
    _id: mongoId || idString(row.id),
    id: row.id || mongoId,
  };
}

function statusQuery(status) {
  const raw = String(status || '').trim();
  if (!raw) return null;
  return {
    $or: [
      { status: { $regex: `^${escapeRegex(raw)}$`, $options: 'i' } },
      { status: { $exists: false } },
      { status: null },
      { status: '' },
    ],
  };
}

async function listSpecifications(filters) {
  const query = {};
  const statusClause = statusQuery(filters.status);
  if (statusClause) Object.assign(query, statusClause);
  if (filters.search) {
    query.specification_name = { $regex: filters.search, $options: 'i' };
  }
  if (filters.specification_id) {
    const resolved = await resolveSpecificationId(filters.specification_id);
    if (!resolved) return [];
    query._id = resolved;
  }
  const rows = await Specification.find(query).sort({ created_date: -1 }).lean();
  return rows.map(serializeDoc);
}

async function resolveSubcategoryFilterKeys(subcategoryId) {
  const raw = String(subcategoryId || '').trim();
  if (!raw) return [];
  const keys = new Set([raw, ...GLOBAL_SUBCATEGORY_IDS]);
  const clauses = [{ id: raw }, { uuid: raw }];
  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    clauses.push({ _id: new mongoose.Types.ObjectId(raw) });
  }
  const sub = await SubCategory.findOne({ $or: clauses }).select('_id id uuid').lean();
  if (sub) {
    keys.add(String(sub._id));
    if (sub.id) keys.add(String(sub.id));
    if (sub.uuid) keys.add(String(sub.uuid));
  }
  return [...keys].filter(Boolean);
}

async function listSpecificationValues(filters) {
  const query = {};
  const statusClause = statusQuery(filters.status);
  if (statusClause) Object.assign(query, statusClause);
  if (filters.search) {
    query.specification_value_name = { $regex: filters.search, $options: 'i' };
  }
  if (filters.specification_id) {
    const resolvedSpecificationId = await resolveSpecificationId(filters.specification_id);
    if (!resolvedSpecificationId) return [];
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { specification_id: resolvedSpecificationId },
          { specification_id: String(resolvedSpecificationId) },
        ],
      },
    ];
  }
  if (filters.specification_value_id) {
    const resolvedSpecificationValueId = await resolveSpecificationValueId(filters.specification_value_id);
    if (!resolvedSpecificationValueId) return [];
    query._id = resolvedSpecificationValueId;
  }
  if (filters.subcategory_id) {
    const subcategoryKeys = await resolveSubcategoryFilterKeys(filters.subcategory_id);
    if (subcategoryKeys.length) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { subcategory_id: { $in: subcategoryKeys } },
            { subcategory_id: { $exists: false } },
            { subcategory_id: null },
            { subcategory_id: '' },
          ],
        },
      ];
    }
  }
  const rows = await SpecificationValue.find(query)
    .populate('specification_id', 'id specification_name type status')
    .sort({ created_date: -1 })
    .lean();
  return rows.map((row) => {
    const specification = row.specification_id && typeof row.specification_id === 'object'
      ? row.specification_id
      : null;
    const parentMongoId = specification
      ? idString(specification._id)
      : idString(row.specification_id);
    return {
      ...serializeDoc(row),
      specification: specification ? serializeDoc(specification) : null,
      specification_id: parentMongoId || (specification && specification.id) || '',
    };
  });
}

module.exports = {
  actorName,
  findSpecificationOrNull,
  ensureSelectableSpecification,
  listSpecifications,
  listSpecificationValues,
  resolveSpecificationId,
  resolveSpecificationValueId,
};

const Specification = require('../../../schema/specificationModel');
const SpecificationValue = require('../../../schema/specificationValueModel');
const { resolveToObjectId, toResponse, toResponseList } = require('../../../helpers/uuidHelper');

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

async function listSpecifications(filters) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.specification_name = { $regex: filters.search, $options: 'i' };
  }
  if (filters.specification_id) {
    const resolved = await resolveSpecificationId(filters.specification_id);
    if (!resolved) return [];
    query._id = resolved;
  }
  const rows = await Specification.find(query).sort({ created_date: -1 }).lean();
  return toResponseList(rows);
}

async function listSpecificationValues(filters) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.specification_value_name = { $regex: filters.search, $options: 'i' };
  }
  if (filters.specification_id) {
    const resolvedSpecificationId = await resolveSpecificationId(filters.specification_id);
    if (!resolvedSpecificationId) return [];
    query.specification_id = resolvedSpecificationId;
  }
  if (filters.specification_value_id) {
    const resolvedSpecificationValueId = await resolveSpecificationValueId(filters.specification_value_id);
    if (!resolvedSpecificationValueId) return [];
    query._id = resolvedSpecificationValueId;
  }
  const rows = await SpecificationValue.find(query)
    .populate('specification_id', 'id specification_name type status')
    .sort({ created_date: -1 })
    .lean();
  return rows.map((row) => {
    const specification = row.specification_id || null;
    return {
      ...toResponse(row),
      specification: specification ? toResponse(specification) : null,
      specification_id: specification ? specification.id || String(specification._id) : row.specification_id,
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

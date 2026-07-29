const { randomUUID } = require('crypto');

/** Check if string looks like MongoDB ObjectId (24 hex chars) */
function isObjectId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/** Find document by id (id or _id). Use for GET /:id routes. */
async function findByIdOrUuid(Model, id) {
  if (!id) return null;
  let doc = await Model.findOne({ id }).lean();
  if (doc) return doc;
  doc = await Model.findOne({ uuid: id }).lean();
  if (doc) return doc;
  if (isObjectId(id)) {
    return Model.findById(id).lean();
  }
  return null;
}

/** Find document by id, returns Mongoose document (not lean) for updates */
async function findByIdOrUuidDoc(Model, id) {
  if (!id) return null;
  let doc = await Model.findOne({ id });
  if (doc) return doc;
  doc = await Model.findOne({ uuid: id });
  if (doc) return doc;
  if (isObjectId(id)) {
    return Model.findById(id);
  }
  return null;
}

/** Resolve id or ObjectId string to ObjectId for refs. Returns ObjectId or null. */
async function resolveToObjectId(Model, id) {
  if (!id) return null;
  const mongoose = require('mongoose');
  let doc = await Model.findOne({ id }).select('_id').lean();
  if (doc) return doc._id;
  doc = await Model.findOne({ uuid: id }).select('_id').lean();
  if (doc) return doc._id;
  if (isObjectId(id)) {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
  }
  return null;
}

/** Generate new id */
function generateUuid() {
  return randomUUID();
}

/** Add id to doc for API response. Use id field, fallback to uuid for backward compat. */
function toResponse(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (!obj.id && obj.uuid) obj.id = obj.uuid;
  // Normalize scheduledDate -> date for Load (backward compat)
  if (obj.scheduledDate != null && obj.date == null) obj.date = obj.scheduledDate;
  // Ensure stop_all is always array for Load (pickupLocation) and Truck (registrationNumber)
  if (obj && (obj.pickupLocation != null || obj.registrationNumber != null) && !Array.isArray(obj.stop_all)) obj.stop_all = [];
  // For Truck responses, prefer vehicleImages and drop legacy vehicleImage when empty
  if (obj && Array.isArray(obj.vehicleImages)) {
    if (!obj.vehicleImages.length && obj.vehicleImage) {
      obj.vehicleImages = [obj.vehicleImage];
    }
    if (!obj.vehicleImage) {
      delete obj.vehicleImage;
    }
  }
  // Ensure vehicleCapacity is present for Load (use null if missing)
  if (obj && obj.pickupLocation != null && obj.vehicleCapacity === undefined) obj.vehicleCapacity = obj.truckCapacity != null ? parseFloat(String(obj.truckCapacity).replace(/[^\d.]/g, '')) || null : null;
  return obj;
}

/** Map array of docs to include id */
function toResponseList(docs) {
  if (!Array.isArray(docs)) return docs;
  return docs.map((d) => toResponse(d));
}

/** Resolve array of ids (uuid or ObjectId) to ObjectIds */
async function resolveIdsToObjectIds(Model, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const resolved = await Promise.all(ids.map((id) => resolveToObjectId(Model, id)));
  return resolved.filter(Boolean);
}

module.exports = {
  uuidv4: randomUUID,
  isObjectId,
  findByIdOrUuid,
  findByIdOrUuidDoc,
  resolveToObjectId,
  resolveIdsToObjectIds,
  generateUuid,
  toResponse,
  toResponseList,
};

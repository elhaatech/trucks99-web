const Subscription = require("../schema/Subscriptionschema"); // ← NEW schema
const Log = require("../schema/log");
const {
  findByIdOrUuid,
  resolveToObjectId,
  resolveIdsToObjectIds,
  generateUuid,
} = require("../helpers/uuidHelper");

// Group subscriptions by fieldName (e.g., "load", "truck", "product")
const groupByFieldName = (subscriptions) => {
  return subscriptions.reduce((acc, item) => {
    const key = item.fieldName?.toLowerCase();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

// Format response with grouped subscriptions
const formatResponse = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return {
    _id: obj._id,
    subscriptions: groupByFieldName(obj.subscriptions || []),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = { groupByFieldName, formatResponse };
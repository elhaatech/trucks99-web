const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
const { randomUUID } = require('crypto');

// Get the Schema object from Mongoose
const Schema = mongoose.Schema;

// Create a schema to define the structure of the log data
const activityLogSchema = new Schema({
    id: { type: String, default: randomUUID, unique: true, index: true },
    name: String,
    email: String, 
    role: String,
    timestamp: String,
    action: String
});

// find or create permission
activityLogSchema.plugin(findOrCreate);

// Create a model using the permission schema
const Log = mongoose.model('Log', activityLogSchema);

module.exports = Log;

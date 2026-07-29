const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const findOrCreate = require("mongoose-findorcreate");

const Schema = mongoose.Schema;

const AccessSchema = new Schema(
  {
    create: { type: Boolean, default: false },
    view:   { type: Boolean, default: false },
    edit:   { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    list:   { type: Boolean, default: false },
  },
  { _id: false }
);

const PermissionItemSchema = new Schema(
  {
    title_name: { type: String,  },
    display_name: { type: String,  },
    access:     { type: AccessSchema,  },
  },
  { _id: false }
);

const PermissionSchema = new Schema(
  {
    id:          { type: String, default: () => uuidv4(), unique: true },
    name:        { type: String, required: true, unique: true },
    description: { type: String },
    permissions: { type: [PermissionItemSchema], default: [] },
  },
  { timestamps: true }
);

PermissionSchema.plugin(findOrCreate);

const Permission = mongoose.model("Permission", PermissionSchema);

module.exports = Permission;
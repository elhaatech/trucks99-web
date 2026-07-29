const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

const Schema = mongoose.Schema;

const RoleSchema = new Schema(
  {
    id: {
      type: String,
      default: () => require("crypto").randomUUID(),
      unique: true,
      index: true,
    },

    name: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },

    // Single Permission Reference
    permissions: {
      type: Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

RoleSchema.plugin(findOrCreate);

const Role = mongoose.model("Role", RoleSchema);

module.exports = Role;
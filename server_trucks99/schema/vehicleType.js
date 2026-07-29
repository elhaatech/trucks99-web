const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const { Schema } = mongoose;

const vehicleTypeSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String }, // legacy id alias
    name: { type: String }, // legacy label (some docs use name instead of vehicle_type)
    vehicle_type: { type: String }, // LCV, Container, 7-60 Tonnes, etc.
    description: { type: String, default: "" },
    minimumCapacity: { type: String },
    maximumCapacity: { type: String },
    available_body_type: [{ type: String, ref: "VehicleBodyType" }],
    /** Optional image URL or uploaded path for this vehicle type */
    image: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, strict: false },
);

module.exports = mongoose.model("VehicleType", vehicleTypeSchema);

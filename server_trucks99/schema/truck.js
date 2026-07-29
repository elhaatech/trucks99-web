"use strict";

const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const { Schema } = mongoose;

// ── Route Location Schema ─────────────────────────────────────────
const routeLocationSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Schema.Types.Mixed, default: 0 },
    lng: { type: Schema.Types.Mixed, default: 0 },
  },
  { _id: false },
);

// ── Route Schema ──────────────────────────────────────────────────
const routeSchema = new Schema({
  from: { type: routeLocationSchema, required: true },
  to: { type: routeLocationSchema, required: true },
  price: { type: Schema.Types.Mixed, default: 0 },
});

// ── Truck Schema ──────────────────────────────────────────────────
const truckSchema = new Schema(
  {
    // ── Identity ─────────────────────────────────────────────────
    id: { type: String, default: randomUUID, unique: true, index: true },
    registrationNumber: { type: String, default: "" },
    truckNumber: { type: String, unique: true, sparse: true, index: true },

    // ── Vehicle Type ─────────────────────────────────────────────
    vehicleType: {
      _id: { type: Schema.Types.ObjectId, ref: "VehicleType" },
      uuid: { type: String },
      name: { type: String },
    },

    // ── Vehicle details ───────────────────────────────────────────
    truckType: { type: String, default: "" },
    capacity: { type: String, default: "" },
    loadCapacity: { type: String, default: "" },
    containerFeet: { type: String, default: "" },
    vehicleBody: { type: String, default: "" },
    vehicleBodyType: { type: String, default: "" },
    vehicleBodyLength: { type: String, default: "" },
    total_tire: { type: String, default: "" },

    // ── Media & documents ─────────────────────────────────────────
    vehicleImage: { type: String, default: "" },
    vehicleImages: { type: [String], default: [] },
    vehicleRCDocument: { type: String, default: "" },

    // ── Routes ────────────────────────────────────────────────────
    routes: [routeSchema],

    // ── Truck Status ──────────────────────────────────────────────
    // FIX: allow empty string so omitting truck_status doesn't cause validation error
    truck_status: {
      type: String,
      enum: ["half body", "empty body", "return truck", "forward", ""],
      default: "",
    },

    stop_all: [
      {
        address: { type: String, default: "" },
        lat: { type: Schema.Types.Mixed, default: 0 },
        lng: { type: Schema.Types.Mixed, default: 0 },
      },
    ],

    // ── Status & location ─────────────────────────────────────────
    // FIX: added "draft" to match router usage
    status: {
      type: String,
      enum: ["available", "in-transit", "maintenance", "unavailable", "draft"],
      default: "available",
    },
    currentLocation: { type: String, default: "" },
    contactNumber: { type: String, default: "" },

    // ── Bid / Bit ─────────────────────────────────────────────────
    bit: { type: Number },
    bitReason: { type: String },

    // ── Load info ────────────────────────────────────────────────
    load_status: {
      type: String,
      enum: ["full load", "half load", "part load", ""],
      default: "",
    },
    dropLocation: { type: String, default: "" },
    price: { type: String, default: "" },

    // ── Ownership ────────────────────────────────────────────────
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Truck", truckSchema);
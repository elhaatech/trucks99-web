const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const loadSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    title: { type: String, required: true },
    loadNumber: { type: String, unique: true, sparse: true, index: true },
    description: String,
    origin: String,
    destination: String,
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "accepted",
        "rejected",
        "delivered",
        "cancelled",
        "draft",
      ],
      default: "pending",
    },
    loadType: String,
    distanceKm: Number,
    mobileNumber: String,
    rejectReason: String,
    weight: Schema.Types.Mixed, // String (e.g. "500kg") or Number (e.g. 10)
    shipperId: { type: Schema.Types.ObjectId, ref: "Shipper" },
    buySellId: { type: Schema.Types.ObjectId, ref: "BuySell" },
    loaderId: { type: Schema.Types.ObjectId, ref: "Loader" },
    truck_id: { type: Schema.Types.ObjectId, ref: "Truck" },
    truckRegistrationNumber: String,
    truckCapacity: String,
    truckDriverName: String,
    truckStatus: String,
    loadCapacity: Schema.Types.Mixed,
    truck_status: {
      type: String,
      enum: ["half body", "empty body", "return truck"],
      default: null,
    },
    agentId: { type: Schema.Types.ObjectId, ref: "Agent" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" }, // selected owner (user) id
    cancelOwnerId: { type: Schema.Types.ObjectId, ref: "User" }, // user who cancelled the load (set on cancel)
    pickupLocation: locationSchema,
    accepted_truckIds: [{ type: Schema.Types.ObjectId, ref: "Truck" }], // trucks that accepted the load
    dropLocation: locationSchema,
    stop_all: [locationSchema], // intermediate stops (address, lat, lng)
    material: String,
    materialId: { type: Schema.Types.ObjectId, ref: "Material" },
    truckType: String,
    vehicleBody: String, // Open Body, Closed Body, Other Type
    vehicleBodyType: String, // Open Full Body, Open Half Body
    vehicleType: String, // LCV, Container, 7-60 Tonnes, etc.
    vehicleCapacity: Number, // tonnes
    tyreCount: String, // 3 Tyres, 4 Tyres
    total_tire: String, // total tire count (from truck when assigned)
    containerFeet: String, // 32 ft Mxl, 32 ft Mxl HQ
    pickupTime: String, // Today 2 PM, Today 5 PM, Schedule
    price: Number,
    bit: Number, // bid/bit amount
    bitReason: String, // reason for bit (e.g. bargaining note)
    date: Date,
    // Set once when delivery income/expense transactions are created (prevents duplicates)
    deliveryTransactionsCreatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Load", loadSchema);

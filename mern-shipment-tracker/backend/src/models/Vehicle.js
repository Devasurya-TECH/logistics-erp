import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    model: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    status: { type: String, enum: ["on-route", "idle", "maintenance"], default: "on-route" },
    speedKmh: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    temperatureC: { type: Number, default: 0 },
    capacityPercent: { type: Number, min: 0, max: 100, default: 0 },
    currentDriver: { type: String, default: "" },
    lastLocation: {
      label: { type: String, default: "" },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);

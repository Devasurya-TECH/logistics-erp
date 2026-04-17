import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    tripTime: { type: String, required: true },
    routeText: { type: String, required: true },
    vehicleCode: { type: String, required: true },
    distanceKm: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Trip = mongoose.model("Trip", tripSchema);

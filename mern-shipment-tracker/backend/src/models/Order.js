import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true, trim: true },
    commodity: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },
    pickupDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["in-transit", "no-connection", "idle-timeout", "delivered"],
      default: "in-transit",
      index: true,
    },
    etaHours: { type: Number, default: 0 },
    currentLocationLabel: { type: String, default: "" },
    lastStopLabel: { type: String, default: "" },
    routeDistance: { type: String, default: "" },
    currentSpeed: { type: String, default: "" },
    driver: {
      name: { type: String, default: "" },
      role: { type: String, default: "Driver" },
      experienceYears: { type: Number, default: 0 },
      drivingLicense: { type: String, default: "" },
      idNumber: { type: String, default: "" },
      licenseClass: { type: String, default: "" },
      insuranceNumber: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);

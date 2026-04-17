import mongoose from "mongoose";

const waypointSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { _id: false },
);

const loadSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["upcoming", "in-transit", "delivered"],
      default: "upcoming",
      index: true,
    },
    customer: { type: String, required: true, trim: true },
    carrier: { type: String, required: true, trim: true },
    tractor: { type: String, default: "" },
    trailer: { type: String, default: "" },
    miles: { type: Number, default: 0 },
    pickupDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    pickupLocation: { type: String, required: true },
    deliveryLocation: { type: String, required: true },
    teamRoute: { type: String, default: "" },
    waypoints: { type: [waypointSchema], default: [] },
  },
  { timestamps: true },
);

export const Load = mongoose.model("Load", loadSchema);

import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Expense = mongoose.model("Expense", expenseSchema);

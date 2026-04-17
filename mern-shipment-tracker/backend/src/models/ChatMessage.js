import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    loadExternalId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true },
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

import mongoose from "mongoose";


const conversationSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    lastMessage: String,

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);
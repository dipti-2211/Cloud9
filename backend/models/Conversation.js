const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    fieldOfficerId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    fieldOfficerName: {
      type: String,
      default: "Field Officer",
    },
    relatedIncidentId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    incidentSummary: {
      type: String,
      default: "",
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCountAdmin: {
      type: Number,
      default: 0,
    },
    unreadCountOfficer: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Conversation", conversationSchema);

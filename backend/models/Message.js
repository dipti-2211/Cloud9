const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["ADMIN", "FIELD_OFFICER", "VEHICLE_OPERATOR"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);

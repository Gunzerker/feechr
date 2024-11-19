const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messagesReaderSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    channel_id: { type: Schema.Types.ObjectId, ref: "channels" },
    message_id: { type: Schema.Types.ObjectId, ref: "messages" },
    status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("messageReader", messagesReaderSchema);

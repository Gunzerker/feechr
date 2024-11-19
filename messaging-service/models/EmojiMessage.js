const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Channels = require("./Channels");

const emojiMessageSchema = new Schema(
  {
    user_auth: { type: Number },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    messageId: { type: Schema.Types.ObjectId, ref: "messages" },
    emoji: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("emojimessage", emojiMessageSchema);

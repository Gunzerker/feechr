const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messagesSchema = new Schema(
  {
    channel_id: { type: Schema.Types.ObjectId, ref: "channels" },
    from_user: Schema.Types.Mixed,
    message: Schema.Types.Mixed,
    read_status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("messages", messagesSchema);
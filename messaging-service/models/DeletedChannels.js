const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deletedChannelsSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    channel_id: { type: Schema.Types.ObjectId, ref: "channels" },
    status: { type: String, default: "D" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("deletedchannels", deletedChannelsSchema);

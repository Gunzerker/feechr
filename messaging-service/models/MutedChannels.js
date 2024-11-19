const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mutedChannelsSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    channel_id: { type: Schema.Types.ObjectId, ref: "channels" },
    to_user: { type: Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("mutedchannels", mutedChannelsSchema);

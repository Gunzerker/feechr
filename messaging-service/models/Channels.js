const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const channelsSchema = new Schema(
  {
    members: [{ type: Schema.Types.ObjectId, ref: "users" }],
    last_message: { type: Schema.Types.ObjectId, ref: "messages" },
    creator: { type: Schema.Types.ObjectId, ref: "users" },
    friends: { type: Boolean, default: true },
    status: { type: String, default: "A" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("channels", channelsSchema);

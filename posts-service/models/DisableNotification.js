const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const disableNotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users" },
    post: { type: Schema.Types.ObjectId, ref: "posts" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("disablenotification", disableNotificationSchema);

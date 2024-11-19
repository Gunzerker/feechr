const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subPostSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users" },
    post: { type: Schema.Types.ObjectId, ref: "posts" },
    user_profile: { type: Schema.Types.ObjectId, ref: "users" },
    club: { type: Schema.Types.ObjectId, ref: "clubs" },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "subpost",
  subPostSchema
);

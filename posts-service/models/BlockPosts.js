const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blockedPostsSchema = new Schema(
  {
    user_id: String,
    post_id: { type: Schema.Types.ObjectId, ref: "posts" },
    expiration_data : Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("blockedposts", blockedPostsSchema);

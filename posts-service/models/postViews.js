const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const postViewsSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "posts" },
    viewedBy: { type: Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("postViews", postViewsSchema);

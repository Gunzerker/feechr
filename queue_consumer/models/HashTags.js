const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hashTagsSchema = new Schema(
  {
   tag:String
  },
  { timestamps: true }
);

module.exports = mongoose.model("hashTags", hashTagsSchema);
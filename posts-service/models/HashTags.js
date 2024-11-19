const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hashTagsSchema = new Schema(
  {
   tag:String,
   posts_count :{type:Number ,default:0}
  },
  { timestamps: true }
);

module.exports = mongoose.model("hashTags", hashTagsSchema);
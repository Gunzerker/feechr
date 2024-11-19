const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const MusicSchema = new Schema(
  {
    name: { type: String },
    author: { type: String },
    albumImage: { type: String },
    s3Url: { type: String },
    gender: { type: String },
    usedCount: { type: Number, default: 0, min: 0 },
    duration: { type: Number },
    status: { type: Boolean, default: true },
    autogenerated:{type: Boolean , default :false},
    generatedby:{ type: Schema.Types.ObjectId, ref: "users" },
    generatedByName:{type:String}
  },
  { timestamps: true }
);
module.exports = mongoose.model("Music", MusicSchema);

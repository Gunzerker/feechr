const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const RecentSearchSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: "users" },
    talent: { type: Schema.Types.ObjectId, ref: "users" },
    hashTag: { type: Schema.Types.ObjectId, ref: "hashTags" },
    club: { type: Schema.Types.ObjectId, ref: "clubs" },
    event: { type: Schema.Types.ObjectId, ref: "events" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("RecentSearch", RecentSearchSchema);

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reportSchema = new Schema(
  {
    user_id: String,
    post_id: { type: Schema.Types.ObjectId, ref: "posts" },
    club_id: { type: Schema.Types.ObjectId, ref: "clubs" },
    active: { type: Boolean, default: true },
    reportMotif_id: { type: Schema.Types.ObjectId, ref: "reports" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("reports", reportSchema);

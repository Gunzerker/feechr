const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const efileSchema = new Schema(
  {
    message_id: { type: Schema.Types.ObjectId, ref: "messages" },
    path: { type: String },
    mimeType: { type: String },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("efiles", efileSchema);

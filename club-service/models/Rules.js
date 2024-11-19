const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rulesSchema = new Schema(
  {
    club: { type: Schema.Types.ObjectId, ref: "clubs" },
    title: String,
    description: String,
    isDefault:{type:Boolean , default : false}
  },
  { timestamps: true }
);

module.exports = mongoose.model("rules", rulesSchema);

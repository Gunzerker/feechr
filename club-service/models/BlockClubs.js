const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blockedClubSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users" },
    club: { type: Schema.Types.ObjectId, ref: "clubs" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("blockedClubs", blockedClubSchema);

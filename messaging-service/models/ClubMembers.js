const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const requestsSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users" },
    clubId: { type: Schema.Types.ObjectId, ref: "clubs" },
    status: { type: String, default: "member" }, // member , moderator , admin , owner , banned , pending-invite
  },
  { timestamps: true }
);

module.exports = mongoose.model("clubMembers", requestsSchema);

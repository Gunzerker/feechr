const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventMemberSchema = new Schema(
  {
    event_id:{ type: Schema.Types.ObjectId, ref: "events" },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    invitationStatus: String // invited; going; notGoing;
  },
  { timestamps: true }
);

module.exports = mongoose.model("eventMembers", eventMemberSchema);

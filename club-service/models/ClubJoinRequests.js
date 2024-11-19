const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const requestsSchema = new Schema(
  {
    from_user: { type: Schema.Types.ObjectId, ref: "users" },
    clubId: { type: Schema.Types.ObjectId, ref: "clubs" },
    status: { type: String, default: "pending" }, // pending , accepted , refused
  },
  { timestamps: true }
);

module.exports=mongoose.model('clubsJoinRequest',requestsSchema);

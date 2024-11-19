const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventCommentsSchema = new Schema(
  {
    event_id:{ type: Schema.Types.ObjectId, ref: "events" },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    tags: [{ type: Schema.Types.ObjectId, ref: "users" }],
    hashTags: [Schema.Types.Mixed],
    comment: String 
  },
  { timestamps: true }
);

module.exports = mongoose.model("eventComments", eventCommentsSchema);

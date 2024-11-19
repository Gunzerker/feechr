const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deletedConversationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    channel_id: { type: Schema.Types.ObjectId, ref: "channels" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("deletedConversation", deletedConversationSchema);

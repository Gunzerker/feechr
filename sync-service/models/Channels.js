const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const channelsSchema = new Schema(
  {
    members: [Schema.Types.Mixed],
    messages_counts: { type: Number, default: 1 },
    last_message: { type: Schema.Types.ObjectId, ref: "messages" },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

module.exports=mongoose.model('channels',channelsSchema);

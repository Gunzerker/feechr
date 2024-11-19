const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Channels = require("./Channels");

const efileSchema = new Schema(
  {
    message_id: { type: Schema.Types.ObjectId, ref: "messages" },
    path: { type: String },
    mimeType: { type: String },
    audioMetrics: [{ type: Number }],
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const messagesSchema = new Schema(
  {
    parent_id: { type: Schema.Types.ObjectId, ref: "messages" },
    channel_id: { type: Schema.Types.ObjectId, ref: "channels" },
    text: { type: String },
    forward: { type: Boolean },
    from: { type: Schema.Types.ObjectId, ref: "users" },
    medias: [{ type: efileSchema, default: null }],
    postId: { type: Schema.Types.ObjectId, ref: "posts" },
    isChallenge : {type:Boolean},
    status: { type: String }
  },
  { timestamps: true }
);

messagesSchema.post("save", async function (doc) {
  try {
    console.log("DOCC AFTER SAVE :: ", doc);
    const Channel = await Channels.findOneAndUpdate(
      { _id: doc.channel_id },
      {
        updatedAt: Date.now(),
        last_message: doc,
      },
      { new: true }
    );
    console.log("NEW MESSAGE ADDED ", doc, Channel);
  } catch (e) {
    console.log(e.message);
  }
});

module.exports = mongoose.model("messages", messagesSchema);

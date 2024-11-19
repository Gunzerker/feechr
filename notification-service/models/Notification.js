const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationType = [
  "INVITATION_CLUB",
  "RFEECHER_POST_CLUB",
  "MODERATOR_INVITATION_CLUB",
  "ADMIN_INVITATION_CLUB",
  "OWNER_INVITATION_CLUB",
  "MEMBER_INVITATION_CLUB",
  "ACCEPT_JOIN_CLUB",
  "POST_CREATION_CLUB",
  "LEFT_CLUB",
  "MEMBER_REACHED",
  "INVITATION_EVENT",
  "CANCELED_EVENT",
  "EVENT_CREATION",
  "ATTENDING_EVENT",
  "REACHED_VIWES",
  "FEECHERED",
  "ACCEPT_CHALLENGE",
  "LIKE_POST",
  "LIKE_COMMENT",
  "COMMENT_POST",
  "REPLAY_COMMENT",
  "TAG_POST",
  "SAVE_POST",
  "CONGRATULATION",
  "OTHER_NOTIFICATION",
  "SUGGESTION",
  "HAREDFROM",
  "REFEECHR",
  "PUBLIC_FOLLOW_REQUEST",
  "PRIVATE_FOLLOW_REQUEST",
  "ACCEPT_FOLLOW",
  "SUB_CLUB",
  "POST_CLUB_APPROVEL",
  "POST_CLUB_PENDING",
  "MESSAGE_MEDIA",
  "MESSAGE_TEXT",
  "MESSAGE_POST",
  "MESSAGE_REACTION",
];
const payloadSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "posts" },
    club: { type: Schema.Types.ObjectId, ref: "clubs" },
    event: { type: Schema.Types.ObjectId, ref: "events" },
    eventName: String,
  },
  { _id: false }
);

const notificationSchema = new Schema(
  {
    from_user: { type: Schema.Types.ObjectId, ref: "users" },
    to_user: { type: Schema.Types.ObjectId, ref: "users" },
    tag: { type: String, enum: notificationType },
    payload: payloadSchema,
    readStatus: { type: Boolean, default: false },
    origin: String,
    users_count: { type: Number, default: 0 },
    relationStatus: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("notifications", notificationSchema);

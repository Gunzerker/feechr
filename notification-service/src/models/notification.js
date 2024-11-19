const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationType = [
    "INVITATION_CLUB",
    "RFEECHER_POST_CLUB",
    "MODERATOR_INVITATION_CLUB",
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
];
exports = notificationType;

const notificationSchema = new Schema(
    {
        userId: {
            type: String,
            index: true,
        },
        type: {
            type: String,
            enum: notificationType,
        },
        readStatus: {
            type: Boolean,
            default: false,
        },
        contentId: {
            type: String,
        },
        content: {
            type: String,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("notification", notificationSchema);

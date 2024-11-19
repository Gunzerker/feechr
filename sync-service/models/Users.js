const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const usersSchema = new Schema(
  {
    user_id: Number,
    fullName: String,
    email: String,
    phone_number: String,
    country_code: String,
    gender: String,
    visibility: String,
    profile_image: String,
    cover_image: String,
    status: String,
    followers_count: Number,
    following_count: Number,
    likes_count: Number,
    posts_count: Number,
    views_count: Number,
    description: String,
    speciality: String,
    isTalent: Boolean,
    isVerified: Boolean,
    country: String,
    city: String,
    location: String,
    profile_image_compressed: String,
    category: [Schema.Types.Mixed],
    talent: Schema.Types.Mixed,
    type: String /* "this is used to identify if the user is a club for the messaging" */,
    post_notifications: { type: Boolean, default: true },
    feechrup_notifications: { type: Boolean, default: true },
    message_notifications: { type: Boolean, default: true },
    event_notifications: { type: Boolean, default: true },
    user_notifications: { type: Boolean, default: true },
    profilLink: String,
    newNotification: { type: Boolean, default: false },
    active : String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", usersSchema);
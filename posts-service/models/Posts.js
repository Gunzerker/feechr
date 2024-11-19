const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const FileSchema = new Schema({
  type: String,
  url: String,
  file_name: String,
  order: Number,
  song: { type: Schema.Types.ObjectId, ref: "Music" },
  compressed_video: String,
  thumbnail: String,
  video_speed: Number,
  isLandscape: { type: Boolean, default: false },
});

const postsSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "users" },
    user_id: String,
    type: String, // feechring or post or refeechr or feechred or event
    // takes 'either' after or 'with'
    feechering_video_position: String,
    description: String,
    tags: [{ type: Schema.Types.ObjectId, ref: "users" }],
    hashTags: [Schema.Types.Mixed],
    textColor: String,
    medias: {
      original_post_id: { type: Schema.Types.ObjectId, ref: "posts" },
      images: [FileSchema],
      videos: [FileSchema],
    },
    clubId: { type: Schema.Types.ObjectId, ref: "clubs" },
    post_comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: "users" },
        comments_comments: [
          {
            user: { type: Schema.Types.ObjectId, ref: "users" },
            comment: String,
            likes: [{ type: Schema.Types.ObjectId, ref: "users" }],
            comments_likes_total: { type: Number, default: 0 },
            tags: [{ type: Schema.Types.ObjectId, ref: "users" }],
            hashTags: [String],
            createdAt: String,
          },
        ],
        likes: [{ type: Schema.Types.ObjectId, ref: "users" }],
        comments_likes_total: { type: Number, default: 0 },
        comments_comments_total: { type: Number, default: 0 },
        comment: String,
        tags: [{ type: Schema.Types.ObjectId, ref: "users" }],
        hashTags: [String],
        createdAt: String,
      },
    ],
    allowComments: { type: Boolean, default: true },
    post_likes: [{ type: Schema.Types.ObjectId, ref: "users" }],
    post_likes_total: { type: Number, default: 0, min: 0 },
    post_comments_total: { type: Number, default: 0, min: 0 },
    post_views_total: { type: Number, default: 0, min: 0 },
    post_parent_id: { type: Schema.Types.ObjectId, ref: "posts" },
    post_viwers: [{ type: Schema.Types.ObjectId, ref: "users" }],
    visibility: Number, // 0:public , 1:friends only , 2 private , 3 await approuvel by club , 4 approuved by club
    category: String,
    draft: { type: Boolean, default: false },
    // active indicates if a post has done it's all traitements (espacialy video traitement)
    active: { type: Boolean, default: false },
    location: String,
    feechr_up_count: { type: Number, default: 0, min: 0 },
    feechr_up_user: [{ type: Schema.Types.ObjectId, ref: "users" }],
    posted_as_admin: { type: Boolean, default: false },
    eventId: { type: Schema.Types.ObjectId, ref: "events" },
  },
  { timestamps: true }
);

module.exports = mongoose.model('posts', postsSchema);

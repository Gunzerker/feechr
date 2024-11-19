const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const postsSchema = new Schema(
  {
    owner: {
      id: String,
      fullname: String,
      profile_image: String,
    },
    type: String,
    // takes 'either' after or 'with'
    feechering_video_position : String,
    description: String,
    tags:[Schema.Types.Mixed],
    hashTags:[Schema.Types.Mixed],
    textColor: String,
    medias: Schema.Types.Mixed,
    clubId: { type: Schema.Types.ObjectId, ref: "clubs" },
    post_comments: [
      {
        user_id: String,
        fullname: String,
        comment: String,
        profile_image: String,
        comments_comments: [
          {
            user_id: String,
            fullname: String,
            comment: String,
            profile_image: String,
            likes: [
              {
                user_id: String,
                fullname: String,
                profile_image: String,
              },
            ],
            comments_likes_total: { type: Number, default: 0 },
          },
        ],
        likes: [
          {
            user_id: String,
            fullname: String,
            profile_image: String,
          },
        ],
        comments_likes_total: { type: Number, default: 0 },
        comments_comments_total: { type: Number, default: 0 },
      },
    ],
    post_likes: [
      {
        user_id: String,
        fullname: String,
        profile_image: String,
      },
    ],
    post_likes_total: { type: Number, default: 0 },
    post_comments_total: { type: Number, default: 0 },
    post_views_total: { type: Number, default: 0 },
    post_parent_id: { type: Schema.Types.ObjectId, ref: "posts" },
    post_viwers: [
      {
        user_id: String,
        fullname: String,
        profile_image: String,
      },
    ],
    visibility: Number, // 0:public , 1:friends only , 2 private
    category: String,
    draft:{type: Boolean , default:false}
  },
  { timestamps: true }
);

module.exports=mongoose.model('posts',postsSchema);

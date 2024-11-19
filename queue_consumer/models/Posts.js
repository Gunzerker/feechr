const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const postsSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "users" },
    user_id:String,
    type: String,
    // takes 'either' after or 'with'
    feechering_video_position: String,
    description: String,
    tags: [Schema.Types.Mixed],
    hashTags: [Schema.Types.Mixed],
    textColor: String,
    medias: Schema.Types.Mixed,
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
            createdAt: String,
          },
        ],
        likes: [{ type: Schema.Types.ObjectId, ref: "users" }],
        comments_likes_total: { type: Number, default: 0 },
        comments_comments_total: { type: Number, default: 0 },
        comment: String,
        createdAt: String,
      },
    ],
    allowComments: {type:Boolean , default:true},
    post_likes: [{ type: Schema.Types.ObjectId, ref: "users" }],
    post_likes_total: { type: Number, default: 0, min: 0 },
    post_comments_total: { type: Number, default: 0, min: 0 },
    post_views_total: { type: Number, default: 0, min: 0 },
    post_parent_id: { type: Schema.Types.ObjectId, ref: "posts" },
    post_viwers: [{ type: Schema.Types.ObjectId, ref: "users" }],
    visibility: Number, // 0:public , 1:friends only , 2 private
    category: String,
    draft: { type: Boolean, default: false },
    // active indicates if a post has done it's all traitements (espacialy video traitement)
    active : {type: Boolean , default : false},
  },
  { timestamps: true }
);

module.exports=mongoose.model('posts',postsSchema);

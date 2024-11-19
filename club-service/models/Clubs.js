const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  category_id: Number,
  parent_category_id: Number,
  categoryName: String,
  categoryIconeUrl: String,
  categoryImageUrl: String,
  active: String,
  language:String,
  createdAt: String,
  updatedAt: String,
});

const clubsSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "users" },
    clubCoverImage: String,
    clubImage: String,
    compressedClubImage: String,
    clubName: String,
    clubPurpose: String,
    category: CategorySchema,
    privacy: Number, // 0:public , 2 private
    members_count: { type: Number, default: 1 },
    allowMembersToPost: Boolean,
    tiktok: String,
    instagram: String,
    twitter: String,
    facebook: String,
    youtube: String,
    tumblr: String,
    vkontakte: String,
    skype: String,

    // members: [{ type: Schema.Types.ObjectId, ref: "users" }],
    // admins: [{ type: Schema.Types.ObjectId, ref: "users" }],
    // moderateurs: [{ type: Schema.Types.ObjectId, ref: "users" }],
    rules: [
      {
        titleRule: String,
        descriptionRule: String,
      },
    ],
    post_counter_total: { type: Number, default: 0 },
    likes_counter_total: { type: Number, default: 0 },
    vues_counter_total: { type: Number, default: 0 },
    user_club: { type: Schema.Types.ObjectId, ref: "users" }, // this is usded for the messaging system only
  },
  { timestamps: true }
);

module.exports=mongoose.model('clubs',clubsSchema);

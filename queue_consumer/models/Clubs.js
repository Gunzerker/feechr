const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const clubsSchema = new Schema(
  {
    owner: {
      id: String,
      fullname: String,
      profile_image: String,
    },
    clubCoverImage: String,
    clubName: String,
    clubPurpose: String,
    category: [String],
    privacy: Number, // 0:public , 2 private
    members: [
      {
        id: String,
        fullname: String,
        profile_image: String,
      },
    ],
    admins: [
      {
        id: String,
        fullname: String,
        profile_image: String,
      },
    ],
    moderateurs: [
      {
        id: String,
        fullname: String,
        profile_image: String,
      },
    ],
    rules: [
      {
        titleRule: String,
        descriptionRule: String,
      },
    ],
    post_counter_total: { type: Number, default: 0 },
    likes_counter_total: { type: Number, default: 0 },
    vues_counter_total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports=mongoose.model('clubs',clubsSchema);

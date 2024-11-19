const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const usersSchema = new Schema(
{
    user_id: Number,
      fullName:  String
      ,
      email:  String
      ,
      phone_number:  String
      ,
      country_code:  String
      ,
      gender:  String
      ,
      visibility:  String
      ,
      profile_image:  String
      ,
      cover_image:  String
      ,
      status:  String
      ,
      followers_count:  Number
      ,
      following_count:  Number
      ,
      likes_count:  Number
      ,
      posts_count:  Number
      ,
      views_count:  Number
      ,
      description:  String
      ,
      speciality:  String
      ,
      isTalent:  String
      ,
      country:  String
      ,
      city:  String
      ,
      location:  String
      ,


},
{ timestamps: true }
);

module.exports=mongoose.model('users',usersSchema);

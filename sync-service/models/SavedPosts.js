const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const savedPostsSchema = new Schema(
{
    user_id:String,
    post_id: { type: Schema.Types.ObjectId, ref: "posts" },

},
{ timestamps: true }
);

module.exports=mongoose.model('savedposts',savedPostsSchema);

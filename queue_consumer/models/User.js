const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const userSchema = new Schema(
{
   
    id:String,
    fullname:String,
    profile_image:String,
    bio:String

},
{ timestamps: true }
);

module.exports=mongoose.model('user',userSchema);

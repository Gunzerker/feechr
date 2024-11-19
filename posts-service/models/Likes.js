const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const likesSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users" },
    post: { type: Schema.Types.ObjectId, ref: "posts" },
    parent: { type: Schema.Types.ObjectId, ref: "posts" },
  },
  { timestamps: true }
);

module.exports=mongoose.model('likes',likesSchema);

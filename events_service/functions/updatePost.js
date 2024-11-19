const Posts = require ("../models/Posts")
const mongoose = require("mongoose")
const config = require("../config/config.json")
module.exports = async function updatePost(traitement_result, returned_result , position) {
  return new Promise (async(resolve,reject)=>{
      await Posts.findOneAndUpdate(
           {
             _id: returned_result.postId,
             "medias.videos.url": returned_result.videos_urls[position],
           },
           {
             $set: {
               "medias.videos.$.compressed_video":
                 traitement_result.result_resized_video.key,
               "medias.videos.$.thumbnail":
                 traitement_result.result_thumbnail_video.key,
                 active:true
             },
           },
           { useFindAndModify: true }
         );
                  return resolve("done")

     /*mongoose
       .connect(
         `${config.MONGO_DB}`,
         {
           auth: { authSource: "admin" },
           user: `${config.MONGO_USER}`,
           pass: `${config.MONGO_PSW}`,
           useUnifiedTopology: true,
           useNewUrlParser: true,
         },
         { useFindAndModify: false }
       )
       .then(async () => {
         console.log("mongodb connected");
       
         mongoose.connection.close();
         return resolve("done")
       })
       .catch((err) => {
         return reject(err);
       });*/
  })

};

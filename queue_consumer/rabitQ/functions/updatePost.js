const Posts = require ("../../models/Posts")
const mongoose = require("mongoose")
const config = require("../../config/config.json")
module.exports = async function updatePost(traitement_result, parsed_result , position) {
  return new Promise ((resolve,reject)=>{
     mongoose
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
         await Posts.findOneAndUpdate(
           {
             _id: parsed_result.postId,
             "medias.videos.url": parsed_result.videos_urls[position],
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
         mongoose.connection.close();
         return resolve("done")
       })
       .catch((err) => {
         return reject(err);
       });
  })

};

const Posts = require ("../models/Posts")
const mongoose = require("mongoose")
const config = require("../config/config.json")
const axios = require("axios")
const ClubMember = require("../models/ClubMembers");
const SubPost = require("../models/subToPost");
module.exports = async function updatePost(traitement_result, returned_result , position) {
  return new Promise (async(resolve,reject)=>{
    const updated_post = await Posts.findOneAndUpdate(
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
          active: true,
        },
      },
      { useFindAndModify: true , new:true }
    ).populate("post_parent_id")
    if (updated_post == null) return resolve("done");
    // also send a like to those who are subbed for the post
        let or_constraint = [{ user_porfile: updated_post.owner }];
        if (updated_post.clubId)
          or_constraint.push({ club: updated_post.clubId });
        const subbed_for_post = await SubPost.find({
          $or: or_constraint,
        });
        let tag_notif;
        let payload_notif;
    const mapped_subs = subbed_for_post.map((sub) => sub.user);
    for (let i = 0; i < mapped_subs.length; i++) {
       if (subbed_for_post[i].user_profile != null) {
         tag_notif = "CREATE_POST_SUB";
         payload_notif = { post: mongoose.Types.ObjectId(updated_post._id) };
       } else {
         tag_notif = "CLUB_SUB";
            payload_notif = {
              post: mongoose.Types.ObjectId(updated_post._id),
              club: mongoose.Types.ObjectId(updated_post.clubId),
            };
       }
      axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "post",
          from_user: updated_post.owner,
          to_user: mapped_subs[i],
          tag: tag_notif,
          payload: payload_notif,
        }
      );
    }
    if (updated_post.type == "feechred")
      /* send notification CHALLENGE_FEECHRUP*/
      axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "feechrup",
          from_user: updated_post.owner,
          to_user: updated_post.post_parent_id.owner,
          tag: "CHALLENGE_FEECHRUP",
          payload: { post: mongoose.Types.ObjectId(updated_post._id) },
        }
      );
    if (updated_post.clubId) {
      const fetched_admins = await ClubMember.find({
        clubId: updated_post.clubId,
        status: { $in: ["owner", "admin", "moderator"] },
      });
      /* map the ids */
      const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
      /* loop and send notifications to them */
      for (let i = 0; i < mapped_admins_ids.length; i++){
        if (updated_post.visibility == 4)
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "club",
              from_user: updated_post.owner,
              to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
              tag: "POST_CREATION_CLUB",
              payload: {
                club: mongoose.Types.ObjectId(updated_post.clubId),
                post: mongoose.Types.ObjectId(updated_post._id),
              },
            }
          );
        else
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "club",
              from_user: updated_post.owner,
              to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
              tag: "POST_CLUB_PENDING",
              payload: {
                club: mongoose.Types.ObjectId(updated_post.clubId),
                post: mongoose.Types.ObjectId(updated_post._id),
              },
            }
          );
        }

    }
    return resolve("done");

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

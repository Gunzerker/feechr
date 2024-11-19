const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
const Posts = require("../../models/Posts");
const mongoose = require("mongoose");
const { ApolloError } = require("apollo-server-errors");
const config = require("../../config/config.json");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-media-resources", Key: "", Body: "" };
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");
const Clubs = require("../../models/Clubs");
const SavePosts = require("../../models/SavedPosts");
const HashTags = require("../../models/HashTags");
const BlockPosts = require("../../models/BlockPosts");
const Users = require("../../models/Users");
const Likes = require("../../models/Likes");
const Music = require("../../models/Music");
const ClubMember = require("../../models/ClubMembers");
const Event = require("../../models/event")
const axios = require("axios");
const sharp = require("sharp");
const { streamToBuffer } = require("@jorgeferrero/stream-to-buffer");
const producer = require("../../rabitQ/send.js");
const reportMotifSchema = require("../../models/reportMotif");
const reportSchema = require("../../models/report");
const RecentSearch = require("../../models/recentSearches")
const DisableNotification = require("../../models/DisableNotification");
const SubPost = require("../../models/subToPost");
const EventMember = require("../../models/eventMember");
const EventComments = require("../../models/eventComments");
const PostViews = require("../../models/postViews")

const createOrUpdateHashTag = require("../../functions/createHashTag")
const { findOptionsWhere } = require("../../functions/advancedMongoSearch")
const shuffle = require("../../functions/shuffleArray.js");
const musicRecognition = require("../../functions/musicRecognition") 
const generateMP3 = require("../../functions/converMP4toMP3")
const dynamicLinkInfo = require("../../functions/dynamicLink")
const banCheck = require("../../middleware/banCheck")

function compressImage(file) {
  return new Promise((resolve, reject) => {
    sharp(file)
      .resize(1080)
      .jpeg({ quality: 60, force: true, mozjpeg: true })
      .toBuffer()
      .then((data) => {
        return resolve(data);
      })
      .catch((err) => { });
  });
}

function uploadMedia(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const { createReadStream, filename, mimetype, enconding } = await file;
      console.log(file);
      // Configure the file stream and obtain the upload parameters
      var fileStream = await createReadStream();

      fileStream.on("error", function (err) {
        console.log("File Error", err);
      });
      if (mimetype.includes("image")) {
        const new_file = await streamToBuffer(createReadStream());
        //const fileBuffer = await streamToBuffer(fileStream);
        //console.log(fileBuffer);
        const returned_file = await compressImage(new_file);
        uploadParams.Body = returned_file;
        uploadParams.Key = uuidv4() + "." + mime.getExtension("image/jpeg");
        uploadParams.ACL = "public-read";
        uploadParams.ContentType = "image/jpeg";
      } else {
        uploadParams.Body = fileStream;
        uploadParams.Key = uuidv4() + "." + mime.getExtension(mimetype);
        console.log(uploadParams.Key);
        uploadParams.ACL = "public-read";
        uploadParams.ContentType = mimetype;
      }

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve({
        _id: mongoose.Types.ObjectId(),
        file_name: upload.Key,
        mimetype,
        url: upload.Location,
      });
    } catch (err) {
      return reject(err);
    }
  });
}
async function findLikes(post_comments, _id) {
  // check if any comments got a like
  for (let i = 0; i < post_comments.length; i++) {
    // find the like
    const found = post_comments[i].likes.find((like) => {
      like._id == _id;
    });
    if (found) post_comments[i].user_liked_post = true;
    else post_comments[i].user_liked_post = false;
    // check if the comment has sub comments
    if (post_comments[i].comments_comments.length != 0) {
      for (let j = 0; j < post_comments[i].comments_comments.length; j++) {
        // find the like
        if (post_comments[i].comments_comments[j].likes.length == 0) continue;

        const found_sub_like = post_comments[i].comments_comments[j].likes.find(
          (like) => {
            like._id == _id;
          }
        );
        if (found_sub_like)
          post_comments[i].comments_comments[j].user_liked_post = true;
        else post_comments[i].comments_comments[j].user_liked_post = false;
      }
    }
  }
}

module.exports = {
  Query: {
    uploads: (parent, args) => {},
    fetcheSavedPosts: async (parent, args, context, info) => {
      return await SavePosts.find({ user_id: context.decoded.id }).populate(
        "post_id"
      );
    },
    fetchClubPostForSuggestion: async (parent, args, context) => {
      // fetch the clubs that i am a member of
      let clubs_i_member = await ClubMember.find({
        user: context.decoded.obj._id,
      });
      clubs_i_member = clubs_i_member.map((club) => club.clubId);
      if (!context.decoded.obj.category) context.decoded.obj.category = [];
      let my_categories = context.decoded.obj.category.map(
        (category) => category.category_id
      );
      const result = await Posts.aggregate([
        { $match: { clubId: { $ne: null }, clubId: { $nin: clubs_i_member } } },
        {
          $lookup: {
            from: "clubs",
            localField: "clubId",
            foreignField: "_id",
            as: "club",
          },
        },
        { $unwind: "$club" },
        { $match: { "club.category.category_id": { $in: my_categories } } },
        { $sort: { vues_counter_total: -1 } },
        { $limit: 1 },
      ]);
      await Posts.populate(result, "owner");
      await Posts.populate(result, "post_likes");
      await Posts.populate(result, "post_comments.user");
      await Posts.populate(result, "tags");
      await Posts.populate(result, { path: "post_comments.likes" });
      await Posts.populate(result, { path: "post_comments.tags" });
      await Posts.populate(result, {
        path: "post_comments.comments_comments.user",
      });
      await Posts.populate(result, {
        path: "post_comments.comments_comments.likes",
      });
      await Posts.populate(result, {
        path: "post_comments.comments_comments.tags",
      });
      await Posts.populate(result, "clubId");
      await Posts.populate(result, {
        path: "post_parent_id",
        populate: { path: "owner" },
      });
      await Posts.populate(result, { path: "medias.videos.song" });
      await Posts.populate(result, "feechr_up_user");
      await Posts.populate(result, {
        path: "post_parent_id",
        populate: { path: "feechr_up_user" },
      });
      //fetch the user liked posts
      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");

      for (let i = 0; i < result.length; i++) {
        const found_like = user_likes_posts.findIndex((element) => {
          return element.post.equals(result[i]._id);
        });
        if (found_like != -1) result[i].user_liked_post = true;
        else result[i].user_liked_post = false;
      }
      return result;
    },
  },
  Mutation: {
    uploadToS3: async (parent, args, context) => {
      const {
        createReadStream,
        filename,
        mimetype,
        enconding,
      } = await args.object;
      uploadParams.Body = createReadStream();
      uploadParams.Key = uuidv4() + "." + mime.getExtension(mimetype);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = mimetype;
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload);
      return "done";
    },
    getMusics: async (parent, args) => {
      let { offset, limit, searchType, name } = args;
      const params =
        name != null ? { name: { $regex: name, $options: "i" } } : {};
      searchType = searchType === "recent" ? "updatedAt" : "usedCount";
      try {
        const musics = await Music.find(params)
          .limit(limit)
          .skip(offset)
          .sort([[searchType, -1]]);

        return musics;
      } catch (error) {
        throw error;
      }
    },
    getPostsByMusic: async (parent, args, context) => {
      const { offset, limit, musicId } = args;
      try {
        let posts = await Posts.find({
          "medias.videos": {
            $elemMatch: { song: mongoose.Types.ObjectId(musicId) },
          },
        })
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.tags" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_comments.comments_comments.tags" })
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "medias.videos.song" })
          .populate("feechr_up_user")
          .populate({
            path: "post_parent_id",
            populate: { path: "feechr_up_user" },
          })
          .limit(limit)
          .skip(offset);

        //fetch the user liked posts
        const user_likes_posts = await Likes.find({
          user: context.decoded.obj._id,
        }).select("post");
        for (let i = 0; i < posts.length; i++) {
          const found_like = user_likes_posts.findIndex((element) => {
            return element.post.equals(posts[i]._id);
          });
          if (found_like != -1) posts[i].user_liked_post = true;
          else posts[i].user_liked_post = false;
        }

        return posts;
      } catch (error) {
        throw error;
      }
    },
    singleUpload: async (parent, args, context) => {
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      const {
        createReadStream,
        filename,
        mimetype,
        encoding,
      } = await args.file;
      let promise_array = [];
      let images = [];
      let videos = [];
      promise_array.push(uploadMedia(args.file));
      let resolved_uploads = await Promise.all(promise_array);
      let array_song_index = 0;
      for (let i = 0; i < resolved_uploads.length; i++) {
        if (resolved_uploads[i].mimetype.includes("image"))
          images.push({
            _id: resolved_uploads[i]._id,
            type: "image",
            url: resolved_uploads[i].url,
            file_name: resolved_uploads[i].file_name,
            order: args.order,
          });
        else {
          videos.push({
            _id: resolved_uploads[i]._id,
            type: "video",
            url: resolved_uploads[i].url,
            file_name: resolved_uploads[i].file_name,
            song: args.songs[array_song_index],
            order: args.order,
          });
          array_song_index++;
        }
      }

      if (!args.postId) {
        //
        if (!args.clubId) args.clubId = null;
        /* create the post */
        args.visibility = context.decoded.obj.visibility == "public" ? 0 : 2;
        const post_to_create = {
          owner: context.decoded.obj._id,
          type: args.type,
          description: args.description,
          medias: { images: images, videos: videos },
          visibility: args.visibility,
          category: args.category,
          textColor: args.textColor,
          clubId: args.clubId,
          tags: args.tags,
          hashTags: args.hashTags,
          allowComments: args.allowComments,
        };

        const created_post = await Posts.create(post_to_create);
        if (args.clubId)
          await Clubs.findOneAndUpdate(
            { _id: args.clubId },
            { $inc: { post_counter_total: 1 } }
          );

        //update posts count
        await axios.post(
          `${config.auth_service_url}api/user/profilCountServices`,
          {
            type: "posts_count",
            user_id: context.decoded.obj.user_id,
            step: 1,
          }
        );

        await Posts.populate(created_post, "owner");
        //subscribe the owner to the topic TODO

        return created_post;
      } else {
        // fetch the post
        const post = await Posts.findOne({ _id: args.postId });
        if (images.length != 0) post.medias.images.push(images[0]);
        else post.medias.videos.push(videos[0]);
        await post.save();
        await Posts.populate(post, "owner");
        return post;
      }

      return { createReadStream, filename, mimetype, encoding };
    },
    createPostS3: async (parent, args, context, info) => {
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      console.log("CREATE POST");
      console.log(args.filters);
      let images = [];
      let videos = [];
      let video_to_producer = [];
      let filters_to_producer = [];
      let keys_to_producer = [];
      // set the active variable for the post
      args.active = true;
      if (args.media) {
        let array_song_index = 0;
        for (let i = 0; i < args.media.length; i++) {
          if (!args.media[i].includes("mp4"))
            images.push({
              _id: mongoose.Types.ObjectId(),
              type: "image",
              url: config.bucket_url + args.media[i],
              file_name: args.media[i],
              order: i,
            });
          else {
            args.active = false;
            video_to_producer.push(config.bucket_url + args.media[i]);
            filters_to_producer.push(args.filters[i]);
            if (args.filters[i] == null)
              throw new ApolloError("Filter Error", 400, {
                code: 400,
                message: "Filters should not be null",
              });
            keys_to_producer.push(args.media[i]);
            videos.push({
              _id: mongoose.Types.ObjectId(),
              type: "video",
              url: config.bucket_url + args.media[i],
              file_name: args.media[i],
              song: args.songs[i],
              video_speed: args.video_speed[i],
              order: i,
            });
            array_song_index++;
          }
        }
      }
      /* Handle auth */
      if (!args.clubId) args.clubId = null;
      /* create the post */
      args.visibility = context.decoded.obj.visibility == "public" ? 0 : 2;
      const post_to_create = {
        owner: context.decoded.obj._id,
        user_id: context.decoded.obj.user_id,
        type: args.type,
        description: args.description,
        medias: { images: images, videos: videos },
        visibility: args.visibility,
        category: args.category,
        textColor: args.textColor,
        clubId: args.clubId,
        tags: args.tags,
        hashTags: args.hashTags,
        allowComments: args.allowComments,
        active: args.active,
        location: args.location,
      };
      const created_post = await Posts.create(post_to_create);
      if (args.clubId)
        await Clubs.findOneAndUpdate(
          { _id: args.clubId },
          { $inc: { post_counter_total: 1 } }
        );

      //update posts count
      await axios.post(
        `${config.auth_service_url}api/user/profilCountServices`,
        { type: "posts_count", user_id: context.decoded.obj.user_id, step: 1 }
      );

      //pass the video process to the sender
      let producer_payload = {
        postId: created_post._id,
        userId: context.decoded.obj.user_id,
        videos_urls: video_to_producer,
        filters_urls: filters_to_producer,
        keys: keys_to_producer,
      };
      if (args.active == false) await producer(producer_payload);

      await Posts.populate(created_post, "owner");
      //subscribe the owner to the topic TODO

      return created_post;
    },
    createPost: async (parent, args, context, info) => {
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      console.log("CREATE POST");
      console.log(args.filters);
      console.log(args.songs);
      let promise_array = [];
      let images = [];
      let videos = [];
      let video_to_producer = [];
      let filters_to_producer = [];
      let keys_to_producer = [];
      // set the active variable for the post
      args.active = true;
      let resolved_uploads = [];
      let detectedSongs = [];
      let mutable_song = JSON.parse(JSON.stringify(args.songs));
      console.log("mutable_song" + mutable_song);
      if (args.media) {
        for (let i = 0; i < args.media.length; i++) {
          promise_array.push(uploadMedia(args.media[i]));
          // const { createReadStream, filename, mimetype, enconding } = await args.media[i];
          // if (mimetype.includes("video") && args.songs[i]=="original"){
          //   console.log("sending to recognition ...")
          //   const fileStream = await createReadStream();
          //   args.songs[i] = await musicRecognition(fileStream);
          //   detectedSongs.push(args.songs[i]);
          // }
        }
        // resolve all promises
        resolved_uploads = await Promise.all(promise_array);
        // prepare the post to create
        // split the videos and images
        for (let i = 0; i < resolved_uploads.length; i++) {
          if (resolved_uploads[i].mimetype.includes("image"))
            images.push({
              type: "image",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              order: i,
              isLandscape: args.isLandscape[i],
            });
          else {
            if (args.songs[i] == "original" || args.songs[i] == null) {
              // generate MP3
              const generated_mp3 = await generateMP3(
                resolved_uploads[i].url,
                resolved_uploads[i].file_name
              );
              args.songs[i] = await musicRecognition(
                generated_mp3,
                context.decoded.obj
              );
              detectedSongs.push(args.songs[i]);
            }
            args.active = false;
            video_to_producer.push(resolved_uploads[i].url);
            filters_to_producer.push(args.filters[i]);
            if (args.filters[i] == null)
              throw new ApolloError("Filter Error", 400, {
                code: 400,
                message: "Filters should not be null",
              });
            keys_to_producer.push(resolved_uploads[i].file_name);
            videos.push({
              type: "video",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              song: args.songs[i],
              video_speed: args.video_speed[i],
              order: i,
              isLandscape: args.isLandscape[i],
            });
          }
        }
      }
      /* Handle auth */
      if (!args.clubId) args.clubId = null;
      /* create the post */
      args.visibility = context.decoded.obj.visibility == "public" ? 0 : 2;
      let post_to_create = {
        owner: context.decoded.obj._id,
        user_id: context.decoded.obj.user_id,
        type: args.type,
        description: args.description,
        medias: { images: images, videos: videos },
        visibility: args.visibility,
        category: args.category,
        textColor: args.textColor,
        clubId: args.clubId,
        tags: args.tags,
        hashTags: args.hashTags,
        allowComments: args.allowComments,
        active: args.active,
        location: args.location,
      };

      let songs = [];
      console.log(mutable_song);
      //TODO : fetch the song object once it's ready
      for (let i = 0; i < args.songs.length; i++) {
        //get the music url
        if (resolved_uploads[i].mimetype.includes("image")) continue;
        if (args.songs[i] == "original") {
          args.songs[i] = null;
          continue;
        }
        if (mutable_song[i] == "original" || mutable_song[i] == null) {
          console.log("here");
          args.songs[i] = "original";
          songs[i] = "original";
          continue;
        }
        let music = await Music.findOne({ _id: args.songs[i] });
        if (music) {
          if (!music.s3Url) songs.push("original");
          else songs.push(music.s3Url);
          music.usedCount++;
          await music.save();
        } else songs.push("original");
      }

      if (args.clubId) {
        // check if the user is admin or owner
        const check_status = await ClubMember.findOne({
          user: context.decoded.obj._id,
          clubId: args.clubId,
        }).populate("clubId");
        if (check_status.status == "member") {
          post_to_create.visibility = 3;
        } else {
          post_to_create.visibility = 4;
          await Clubs.findOneAndUpdate(
            { _id: args.clubId },
            { $inc: { post_counter_total: 1 } }
          );
        }
        if (check_status) {
          if (check_status.status == "owner" || check_status.status == "admin")
            post_to_create.posted_as_admin = true;
        }
      }

      const created_post = await Posts.create(post_to_create);
      for (let i = 0; i < args.hashTags.length; i++) {
        createOrUpdateHashTag(args.hashTags[i], true);
      }
      for (let i = 0; i < args.tags.length; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "user",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(args.tags[i]),
            tag: "TAG_POST",
            payload: { post: mongoose.Types.ObjectId(created_post._id) },
          }
        );

      //update posts count
      await axios.post(
        `${config.auth_service_url}api/user/profilCountServices`,
        { type: "posts_count", user_id: context.decoded.obj.user_id, step: 1 }
      );

      //pass the video process to the sender
      let producer_payload = {
        postId: created_post._id,
        userId: context.decoded.obj.user_id,
        videos_urls: video_to_producer,
        filters_urls: filters_to_producer,
        songs,
        keys: keys_to_producer,
        generatedsong: detectedSongs,
      };
      console.log(producer_payload);
      if (args.active == false) await producer(producer_payload);

      await Posts.populate(created_post, "owner");
      await Posts.populate(created_post, "tags");
      if (args.active == true) {
        // also send a like to those who are subbed for the post
        let or_constraint = [{ user_porfile: created_post.owner._id }];
        if (created_post.clubId)
          or_constraint.push({ club: created_post.clubId });
        const subbed_for_post = await SubPost.find({
          $or: or_constraint,
        });
        let tag_notif;
        let payload_notif;
        const mapped_subs = subbed_for_post.map((sub) => sub.user);
        for (let i = 0; i < mapped_subs.length; i++) {
          if (subbed_for_post[i].user_profile != null) {
            tag_notif = "CREATE_POST_SUB";
            payload_notif = { post: mongoose.Types.ObjectId(created_post._id) };
          } else {
            tag_notif = "CLUB_SUB";
            payload_notif = {
              post: mongoose.Types.ObjectId(created_post._id),
              club: mongoose.Types.ObjectId(created_post.clubId),
            };
          }
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "post",
              from_user: context.decoded.obj._id,
              to_user: mapped_subs[i],
              tag: tag_notif,
              payload: payload_notif,
            }
          );
        }
      }
      if (args.active == true && args.clubId) {
        const fetched_admins = await ClubMember.find({
          clubId: args.clubId,
          status: { $in: ["owner", "admin", "moderator"] },
        });
        /* map the ids */
        const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
        /* loop and send notifications to them */
        for (let i = 0; i < mapped_admins_ids.length; i++)
          if (created_post.visibility == 3)
            axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "club",
                from_user: context.decoded.obj._id,
                to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
                tag: "POST_CLUB_PENDING",
                payload: {
                  club: mongoose.Types.ObjectId(args.clubId),
                  post: mongoose.Types.ObjectId(created_post._id),
                },
              }
            );
          else
            axios.post(
              `${config.notification_service_url}api/notifications/sendToUser`,
              {
                origin: "club",
                from_user: context.decoded.obj._id,
                to_user: mongoose.Types.ObjectId(mapped_admins_ids[i]),
                tag: "POST_CREATION_CLUB",
                payload: {
                  club: mongoose.Types.ObjectId(args.clubId),
                  post: mongoose.Types.ObjectId(created_post._id),
                },
              }
            );
      }

      return created_post;
    },

    likePost: async (parent, args, context, info) => {

      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)
      
      /* check if it's a like or remove like */

      let post = await Posts.findOne({ _id: args.postId }).populate({
        path: "post_parent_id",
        populate: { path: "owner" },
      });
      const found_like = await Likes.findOne({
        post: args.postId,
        user: context.decoded.obj._id,
      });
      if (found_like) {
        /* delete the like */
        await Likes.deleteOne({ _id: found_like });
        /* remove the like from the total */
        post.post_likes_total--;
        /* update the user profile */
        axios.post(`${config.auth_service_url}api/user/profilCountServices`, {
          type: "likes_count",
          user_id: post.user_id,
          step: -1,
        });
        if (post.post_parent_id)
          axios.post(`${config.auth_service_url}api/user/profilCountServices`, {
            type: "likes_count",
            user_id: post.post_parent_id.user_id,
            step: -1,
          });
        await post.save();
        /* if it has a club update the club */
        if (post.clubId) {
          console.log("here");
          await Clubs.findOneAndUpdate(
            { _id: post.clubId },
            { $inc: { likes_counter_total: -1 } }
          );
        }
        return post._id;
      } else {
        /* create the like */
        const new_like = await Likes.create({
          user: context.decoded.obj._id,
          post: args.postId,
        });
        /* add the like to the total*/
        post.post_likes_total++;
        /* update the user profile */
        axios.post(`${config.auth_service_url}api/user/profilCountServices`, {
          type: "likes_count",
          user_id: post.user_id,
          step: 1,
        });
        if (post.post_parent_id)
          axios.post(`${config.auth_service_url}api/user/profilCountServices`, {
            type: "likes_count",
            user_id: post.post_parent_id.user_id,
            step: 1,
          });
        await post.save();
        /* if it has a club update the club */
        if (post.clubId)
          await Clubs.findOneAndUpdate(
            { _id: post.clubId },
            { $inc: { likes_counter_total: 1 } }
          );
        const subbed_for_post = await SubPost.find({ post: post._id });
        const mapped_subs = subbed_for_post.map((sub) => sub.user);
        for (let i = 0; i < mapped_subs.length; i++) {
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "post",
              from_user: context.decoded.obj._id,
              to_user: mapped_subs[i],
              tag: "LIKE_POST_SUB",
              payload: { post: mongoose.Types.ObjectId(post._id) },
            }
          );
        }
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "post",
            from_user: context.decoded.obj._id,
            to_user: post.owner,
            tag: "LIKE_POST",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
        return post._id;
      }
      // if (post.type == "refeechr" && post.post_parent_id != null) {
      //   if (
      //     post.post_parent_id.type == "feechring" ||
      //     post.post_parent_id.type == "feechred"
      //   ) {
      //     // don't take into considiration the refeeching like
      //     //check if the like exists
      //     const found_like = await Likes.findOne({
      //       post: args.postId,
      //       user: context.decoded.obj._id,
      //     });
      //     if (found_like) {
      //       post.post_likes_total--;
      //       await Likes.deleteOne({
      //         _id: found_like._id,
      //       });
      //       if (post.clubId)
      //         await Clubs.findOneAndUpdate(
      //           { _id: post.clubId },
      //           { $inc: { likes_counter_total: -1 } }
      //         );
      //       await post.save();
      //       await axios.post(
      //         `${config.auth_service_url}api/user/profilCountServices`,
      //         { type: "likes_count", user_id: post.user_id, step: -1 }
      //       );
      //       return post._id;
      //     } else {
      //       const new_like = await Likes.create({
      //         user: context.decoded.obj._id,
      //         post: args.postId,
      //       });
      //       if (post.clubId){
      //         console.log("inside club check like")
      //         await Clubs.findOneAndUpdate(
      //           { _id: post.clubId },
      //           { $inc: { likes_counter_total: 1 } }
      //         );
      //       }
      //       post.post_likes_total++;
      //       //if (post.post_parent_id) post.post_parent_id.post_slikes_total++;
      //       await post.save();
      //       //update likes count
      //       await axios.post(
      //         `${config.auth_service_url}api/user/profilCountServices`,
      //         { type: "likes_count", user_id: post.user_id, step: 1 }
      //       );
      //       // also send a like to those who are subbed for the post
      //       const subbed_for_post = await SubPost.find({post:post._id})
      //       const mapped_subs = subbed_for_post.map(sub => sub.user);
      //       for (let i=0 ; i< mapped_subs.length ; i++) {
      //         axios.post(
      //           `${config.notification_service_url}api/notifications/sendToUser`,
      //           {
      //             origin: "post",
      //             from_user: context.decoded.obj._id,
      //             to_user: mapped_subs[i],
      //             tag: "LIKE_POST_SUB",
      //             payload: { post: mongoose.Types.ObjectId(post._id) },
      //           }
      //         );
      //       }
      //       axios.post(
      //         `${config.notification_service_url}api/notifications/sendToUser`,
      //         {
      //           origin: "post",
      //           from_user: context.decoded.obj._id,
      //           to_user: post.owner,
      //           tag: "LIKE_POST",
      //           payload: { post: mongoose.Types.ObjectId(post._id) },
      //         }
      //       );
      //     }
      //     /* call the notification service */

      //     return post._id;
      //   }
      // }
      // if (post.type == "feechring" || post.type == "feechred") {
      //   // don't take into considiration the refeeching like
      //   //check if the like exists
      //   const found_like = await Likes.findOne({
      //     post: args.postId,
      //     user: context.decoded.obj._id,
      //   });
      //   if (found_like) {
      //     post.post_likes_total--;
      //     await Likes.deleteOne({
      //       _id: found_like._id,
      //     });
      //     if (post.clubId)
      //       await Clubs.findOneAndUpdate(
      //         { _id: post.clubId },
      //         { $inc: { likes_counter_total: -1 } }
      //       );
      //     await post.save();
      //     await axios.post(
      //       `${config.auth_service_url}api/user/profilCountServices`,
      //       { type: "likes_count", user_id: post.user_id, step: -1 }
      //     );
      //     return post._id;
      //   } else {
      //     const new_like = await Likes.create({
      //       user: context.decoded.obj._id,
      //       post: args.postId,
      //     });
      //     post.post_likes_total++;
      //     if (post.clubId)
      //       await Clubs.findOneAndUpdate(
      //         { _id: post.clubId },
      //         { $inc: { likes_counter_total: 1 } }
      //       );
      //     //if (post.post_parent_id) post.post_parent_id.post_slikes_total++;
      //     await post.save();
      //     //update likes count
      //     await axios.post(
      //       `${config.auth_service_url}api/user/profilCountServices`,
      //       { type: "likes_count", user_id: post.user_id, step: 1 }
      //     );
      //     axios.post(
      //       `${config.notification_service_url}api/notifications/sendToUser`,
      //       {
      //         origin: "post",
      //         from_user: context.decoded.obj._id,
      //         to_user: post.owner,
      //         tag: "LIKE_POST",
      //         payload: { post: mongoose.Types.ObjectId(post._id) },
      //       }
      //     );
      //   }
      //   return post._id;
      // }

      // //fetch the post to verify if it has a parent
      // const check_post = await Posts.findOne({ _id: args.postId }).populate({
      //   path: "post_parent_id",
      //   populate: { path: "owner" },
      // });
      // //check if user liked the posts
      // const find_like = await Likes.findOne({
      //   $or: [{ post: args.postId }, { parent: args.postId }],
      //   user: context.decoded.obj._id,
      // });
      // //check if the user liked the original post
      // let promise_resolver = [];
      // if (find_like) {
      //   if (find_like.parent == args.postId)
      //     return "user already liked the post";
      //   promise_resolver.push(Likes.deleteOne({ _id: find_like._id }));
      //   if (find_like.parent) {
      //     promise_resolver.push(
      //       Posts.updateMany(
      //         {
      //           $or: [{ _id: find_like.parent }, { _id: args.postId }],
      //         },
      //         { $inc: { post_likes_total: -1 } }
      //       )
      //     );
      //     promise_resolver.push(
      //       axios.post(
      //         `${config.auth_service_url}api/user/profilCountServices`,
      //         {
      //           type: "likes_count",
      //           user_id: check_post.post_parent_id.user_id,
      //           step: -1,
      //         }
      //       )
      //     );
      //   } else
      //     promise_resolver.push(
      //       Posts.updateMany(
      //         { _id: args.postId },
      //         { $inc: { post_likes_total: -1 } }
      //       )
      //     );
      //   promise_resolver.push(
      //     axios.post(`${config.auth_service_url}api/user/profilCountServices`, {
      //       type: "likes_count",
      //       user_id: check_post.user_id,
      //       step: -1,
      //     })
      //   );
      //           if (check_post.clubId)
      //             await Clubs.findOneAndUpdate(
      //               { _id: check_post.clubId },
      //               { $inc: { likes_counter_total: -1 } }
      //             );
      //   await Promise.all(promise_resolver);
      //   return find_like._id;
      // } else {
      //   //like to create
      //   let like_to_create = {
      //     user: context.decoded.obj._id,
      //     post: args.postId,
      //   };

      //   if (check_post.post_parent_id) {
      //     const verify_original_post = await Likes.findOne({
      //       post: check_post.post_parent_id,
      //     });
      //     if (!verify_original_post)
      //       like_to_create.parent = check_post.post_parent_id;
      //     //verifiy if the user liked the original post
      //     if (!verify_original_post)
      //       promise_resolver.push(
      //         Posts.updateMany(
      //           { _id: check_post.post_parent_id },
      //           { $inc: { post_likes_total: 1 } }
      //         )
      //       );

      //     promise_resolver.push(
      //       Posts.updateMany(
      //         {
      //           _id: args.postId,
      //         },
      //         { $inc: { post_likes_total: 1 } }
      //       )
      //     );

      //     promise_resolver.push(
      //       axios.post(
      //         `${config.auth_service_url}api/user/profilCountServices`,
      //         {
      //           type: "likes_count",
      //           user_id: check_post.post_parent_id.user_id,
      //           step: 1,
      //         }
      //       )
      //     );
      //   } else {
      //     promise_resolver.push(
      //       Posts.updateMany(
      //         {
      //           _id: args.postId,
      //         },
      //         { $inc: { post_likes_total: 1 } }
      //       )
      //     );
      //   }
      //   promise_resolver.push(
      //     axios.post(`${config.auth_service_url}api/user/profilCountServices`, {
      //       type: "likes_count",
      //       user_id: check_post.user_id,
      //       step: 1,
      //     })
      //   );
      //       const subbed_for_post = await SubPost.find({ post: post._id });
      //       const mapped_subs = subbed_for_post.map((sub) => sub.user);
      //       for (let i = 0; i < mapped_subs.length; i++) {
      //         axios.post(
      //           `${config.notification_service_url}api/notifications/sendToUser`,
      //           {
      //             origin: "post",
      //             from_user: context.decoded.obj._id,
      //             to_user: mapped_subs[i],
      //             tag: "LIKE_POST_SUB",
      //             payload: { post: mongoose.Types.ObjectId(post._id) },
      //           }
      //         );
      //       }
      //   axios.post(
      //     `${config.notification_service_url}api/notifications/sendToUser`,
      //     {
      //       origin: "post",
      //       from_user: context.decoded.obj._id,
      //       to_user: post.owner,
      //       tag: "LIKE_POST",
      //       payload: { post: mongoose.Types.ObjectId(post._id) },
      //     }
      //   );
      //   promise_resolver.push(Likes.create(like_to_create));
      //   if (check_post.clubId)
      //   await Clubs.findOneAndUpdate(
      //     { _id: check_post.clubId },
      //     { $inc: { likes_counter_total: 1 } }
      //   );
      //   await Promise.all(promise_resolver);
      //   return check_post._id;
      // }
    },
    fetchLikes: async (parent, args, context) => {
      //fetch post likes paginated
      //fetch the post
      const post = await Posts.findOne({ _id: args.postId });

      if (post.type == "feechring" || post.type == "feechred") {
        let post_likes = await Likes.find({
          post: args.postId,
        })
          .limit(args.limit)
          .skip(args.offset)
          .populate("user")
          .populate("post")
          .sort([["createdAt", 1]]);
        // check the relation between the users
        //console.log(post_likes);
        for (let i = 0; i < post_likes.length; i++) {
          //fetch the relation
          const relation = await axios.post(
            `${config.auth_service_url}api/friendRequest/fetchUserProfil_service`,
            {
              from_user_id: context.decoded.obj.user_id,
              to_user_id: post_likes[i].user.user_id,
            }
          );
          let new_object = JSON.parse(JSON.stringify(post_likes[i]));
          if (relation.data.data.relation == null)
            new_object.relation = relation.data.data.relation;
          else
            new_object.relation = relation.data.data.relation.following_status;
          post_likes[i] = new_object;
        }
        return post_likes;
      } else {
        let post_likes = await Likes.find({
          $or: [{ post: args.postId }, { parent: args.postId }],
        })
          .limit(args.limit)
          .skip(args.offset)
          .populate("user")
          .populate("post")
          .sort([["createdAt", 1]]);
        // check the relation between the users
        //console.log(post_likes);
        for (let i = 0; i < post_likes.length; i++) {
          if (
            post_likes[i].post.type != "refeechr" &&
            post_likes[i].post.type != "post"
          )
            post_likes.splice(i, 1);
          //fetch the relation
          const relation = await axios.post(
            `${config.auth_service_url}api/friendRequest/fetchUserProfil_service`,
            {
              from_user_id: context.decoded.obj.user_id,
              to_user_id: post_likes[i].user.user_id,
            }
          );
          let new_object = JSON.parse(JSON.stringify(post_likes[i]));
          if (relation.data.data.relation == null)
            new_object.relation = relation.data.data.relation;
          else
            new_object.relation = relation.data.data.relation.following_status;
          post_likes[i] = new_object;
        }
        return post_likes;
      }
    },
    uploadMedia: async (parent, args) => {
      const {
        createReadStream,
        filename,
        mimetype,
        enconding,
      } = await args.media;
      // Configure the file stream and obtain the upload parameters
      var fileStream = await createReadStream();
      await fileStream.on("error", function (err) {
        console.log("File Error", err);
      });
      uploadParams.Body = fileStream;
      uploadParams.Key = uuidv4() + "." + mime.getExtension(mimetype);
      console.log(uploadParams.Key);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = mimetype;

      // call S3 to retrieve upload file to specified bucket
      try {
        const upload = await s3.upload(uploadParams).promise();
        return {
          _id: mongoose.Types.ObjectId(),
          type: args.type,
          file_name: uploadParams.Key,
          url: upload.Location,
        };
      } catch (err) {
        throw err;
      }
    },
    discoverPosts: async (parent, args, context) => {
      // fetch the blocked posts
      let blocked_posts = await BlockPosts.find({
        $or: [
          {
            user_id: context.decoded.obj.user_id,
            expiration_data: { $gte: new Date() },
          },
          { user_id: context.decoded.obj.user_id, expiration_data: null },
        ],
      }).select("post_id -_id");

      // check expired events
      let now = new Date().toISOString();
      let expired_events;
      let expiredEvents = await Event.find({
        endOfEvent: { $lt: now },
      });

      expired_events = expiredEvents.map(
        (event) => `${mongoose.Types.ObjectId(event._id)}`
      );

      blocked_posts = blocked_posts.map((blocked_post) => blocked_post.post_id);

      // get users that i hid, blocked or blocked me
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );

      // fetch the user friends
      const friends_lists = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.user_id}&following_status=following`
      );

      const fetched_friend_list = friends_lists.data.data;
      let friends_ids = [];
      for (let i = 0; i < fetched_friend_list.length; i++)
        friends_ids.push(fetched_friend_list[i].to_user.user_id);

      friends_ids.push(context.decoded.obj.user_id);

      // apply filter of posts either post or feechring
      // to force pipeline
      let type = "all";
      let fullscreen_condition = {};
      if (args.filter == "fullScreen")
        fullscreen_condition = {
          $or: [{ type: "post" }, { type: "refeechr" }],
        };
      if (args.filter == "post") type = "post";
      if (args.filter == "feechring") type = "feechring";
      if (args.filter == "feechred") type = "feechred";
      // filter the content type
      let posts;
      let total_posts;
      // fetch the clubs i am member of
      const members_of = await ClubMember.find({
        user: context.decoded.obj._id,
      });
      const mapped_members_of = members_of.map((member) => member.clubId);

      if (type != "all") {
        console.log("here 1");
        // get the total count for the query
        total_posts = await Posts.countDocuments({
          _id: { $nin: blocked_posts },
          draft: false,
          clubId: null,
          eventId: { $nin: expired_events },
          user_id: { $nin: blocked_ids },
          $or: [
            {
              $and: [{ user_id: { $in: friends_ids } }, { visibility: 2 }],
            },
            {
              $and: [{ clubId: { $in: mapped_members_of } }, { visibility: 4 }],
            },
            { visibility: 0 },
          ],
          active: true,
          type,
        });
        //get the posts
        posts = await Posts.find({
          _id: { $nin: blocked_posts },
          draft: false,
          clubId: null,
          eventId: { $nin: expired_events },
          user_id: { $nin: blocked_ids },
          $or: [
            {
              $and: [{ user_id: { $in: friends_ids } }, { visibility: 2 }],
            },
            {
              $and: [{ clubId: { $in: mapped_members_of } }, { visibility: 4 }],
            },
            { visibility: 0 },
          ],
          active: true,
          type,
        })
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.tags" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_comments.comments_comments.tags" })
          .populate("clubId")
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "post_parent_id", populate: { path: "clubId" } })
          .populate({ path: "medias.videos.song" })
          .populate("feechr_up_user")
          .populate({
            path: "post_parent_id",
            populate: { path: "feechr_up_user" },
          })
          .populate({
            path: "post_parent_id",
            populate: { path: "medias.videos.song" },
          })
          .limit(args.limit)
          .skip(args.offset)
          .sort([["createdAt", -1]]);

        // find the likes

        for (let i = 0; i < posts.length; i++) {
          posts[i].visibility = posts[i].owner.visibility == "public" ? 0 : 2;
          findLikes(posts[i].post_comments, context.decoded.obj._id);
        }
        // update the visibility
      } else {
        console.log("here 2");
        friends_ids.push(context.decoded.obj.user_id);
        // get the total count for the query
        total_posts = await Posts.countDocuments({
          _id: { $nin: blocked_posts },
          draft: false,
          $or: fullscreen_condition,
          user_id: { $nin: blocked_ids },
          eventId: { $nin: expired_events },
          $or: [
            {
              $and: [{ user_id: { $in: friends_ids } }, { visibility: 2 }],
            },
            { visibility: 0 },
            {
              $and: [{ clubId: { $in: mapped_members_of } }, { visibility: 4 }],
            },
          ],
          active: true,
        });
        //get the posts
        console.log(fullscreen_condition);
        // const test = await Posts.find({
        //   $or: [{ type: "post" }, { type: "refeechr" }],
        // });
        // return test
        posts = await Posts.find({
          _id: { $nin: blocked_posts },
          draft: false,
          user_id: { $nin: blocked_ids },
          eventId: { $nin: expired_events },
          $and: [
            {
              $or: [
                {
                  $and: [{ user_id: { $in: friends_ids } }, { visibility: 2 }],
                },
                { visibility: 0 },
                {
                  $and: [
                    { clubId: { $in: mapped_members_of } },
                    { visibility: 4 },
                  ],
                },
              ],
            },
            fullscreen_condition,
          ],
          active: true,
        })
          .limit(args.limit)
          .skip(args.offset)
          .sort([["createdAt", -1]])
          .populate("owner")
          .populate("post_likes")
          .populate("tags")
          .populate("post_comments.user")
          .populate("post_comments.tags")
          .populate({ path: "post_comments.likes" })
          // .populate({ path: "post_comments.tags" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_comments.comments_comments.tags" })
          .populate("clubId")
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "post_parent_id", populate: { path: "clubId" } })
          .populate({ path: "medias.videos.song" })
          .populate("feechr_up_user")
          .populate({
            path: "post_parent_id",
            populate: { path: "feechr_up_user" },
          })
          .populate({
            path: "post_parent_id",
            populate: { path: "medias.videos.song" },
          });
        for (let i = 0; i < posts.length; i++) {
          posts[i].visibility = posts[i].owner.visibility == "public" ? 0 : 2;
          findLikes(posts[i].post_comments, context.decoded.obj._id);
        }
      }

      //fetch the user liked posts
      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");
      for (let i = 0; i < posts.length; i++) {
        posts[i].total_posts = total_posts;
        const found_like = user_likes_posts.findIndex((element) => {
          return element.post.equals(posts[i]._id);
        });
        if (found_like != -1) posts[i].user_liked_post = true;
        else posts[i].user_liked_post = false;
      }
      /* fetch the posts that i am subbed to */
      const my_subs = await SubPost.find({ user: context.decoded.obj._id });
      /*map the subs */
      const mapped_my_subs = my_subs.map((sub) => String(sub.post));
      for (let i = 0; i < posts.length; i++) {
        if (mapped_my_subs.includes(String(posts._id)))
          posts[i].subbedToPost = true;
        else posts[i].subbedToPost = false;
        // get the correct like numbers
        let post_likes = await Likes.find({
          $or: [{ post: posts[i]._id }, { parent: posts[i]._id }],
        });
        posts[i].post_likes_total = post_likes.length;
        //get the feechrup_users
        if (posts[i].type == "feechred" && posts[i].post_parent_id != null) {
          posts[i].feechr_up_user = posts[i].post_parent_id.feechr_up_user;
        }
        // check if the user is friends with
        if (friends_ids.includes(Number(posts[i].owner.user_id)))
          posts[i].owner.user_friends_with = true;
        else posts[i].owner.user_friends_with = false;
        if (posts[i].post_parent_id != null) {
          if (
            friends_ids.includes(Number(posts[i].post_parent_id.owner.user_id))
          )
            posts[i].post_parent_id.owner.user_friends_with = true;
          else posts[i].post_parent_id.owner.user_friends_with = false;
        }
        for (let j = 0; j < posts[i].post_likes.length; j++) {
          if (friends_ids.includes(Number(posts[i].post_likes[j].user_id)))
            posts[i].post_likes[j].user_friends_with = true;
          else posts[i].post_likes[j].user_friends_with = false;
        }
      }

      // check if belong to event
      let checkBelongToEvent = await Event.find({
        $or: [
          { owner: mongoose.Types.ObjectId(context.decoded.obj._id) },
          {
            members: {
              $elemMatch: {
                $and: [
                  { user_id: mongoose.Types.ObjectId(context.decoded.obj._id) },
                  { invitationStatus: "going" },
                ],
              },
            },
          },
        ],
      });

      // belong status
      let belongArray = [];
      belongArray = checkBelongToEvent.map((event) => event._id);
      let arrayIdToString = belongArray.toString().split(",");

      // if refeechred event : update "i'm in", update going count , update comments count
      await Posts.populate(posts, "eventId");
      await Posts.populate(posts, "eventId.owner");
      await Posts.populate(posts, "eventId.clubId");
      await Posts.populate(posts, "eventId.members");
      await Posts.populate(posts, "eventId.members.user_id");

      for await (let post of posts) {
        if (post.eventId) {
          let newString = post.eventId._id.toString();
          if (arrayIdToString.includes(newString)) {
            post.eventId.belongStatus = true;
          } else {
            post.eventId.belongStatus = false;
          }

          // update members count
          let membersCount = await EventMember.find({
            event_id: post.eventId._id,
            invitationStatus: "going",
          });
          post.eventId.members_total_count = membersCount.length;

          // update comments count
          let commentsCount = await EventComments.find({
            event_id: post.eventId._id,
          });
          post.eventId.comment_total_count = commentsCount.length;
        }
      }

      return posts;
    },
    updatePost: async (parent, args, context) => {
      /*fetch the user_id from token*/
      const user_id = context.decoded.obj._id;
      /*fetch the post*/
      const post = await Posts.findById(args.postId);
      /*check if the user has permission on the post */
      if (!post.owner.equals(user_id)) {
        throw new ApolloError("Forbidden", 403, {
          code: 403,
          message: "Forbidden",
        });
      }
      /* remove the object null prototype */
      let obj = JSON.parse(JSON.stringify(args["postUpdate"]));
      /*update the post*/
      obj.visibility = post.visibility;
      const updated_post = await Posts.findOneAndUpdate(
        { _id: args.postId },
        { ...obj },
        { new: true }
      )
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" });
      for (let i = 0; i < obj.hashTags.length; i++)
        createOrUpdateHashTag(obj.hashTags[i], true);
      for (let i = 0; i < obj.tags.length; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "user",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(obj.tags[i]),
            tag: "TAG_POST",
            payload: { post: mongoose.Types.ObjectId(updated_post._id) },
          }
        );
      return updated_post;
    },
    findPostById: async (parent, args, context) => {
      /* fetch the required post */
      let required_post = await Posts.findById(args.postId)
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.tags" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_comments.comments_comments.tags" })
        .populate("clubId")
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" })
        .populate("feechr_up_user")
        .populate({
          path: "post_parent_id",
          populate: { path: "feechr_up_user" },
        })
        .populate({ path: "post_parent_id", populate: { path: "clubId" } })

      findLikes(required_post.post_comments, context.decoded.obj._id);

      //fetch the user liked posts
      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");
      const found_like = user_likes_posts.findIndex((element) => {
        return element.post.equals(required_post._id);
      });
      if (found_like != -1) required_post.user_liked_post = true;
      else required_post.user_liked_post = false;

      const my_subs = await SubPost.find({ user: context.decoded.obj._id });
      /*map the subs */
      const mapped_my_subs = my_subs.map((sub) => String(sub.post));
      if (mapped_my_subs.includes(String(required_post._id)))
        required_post.subbedToPost = true;
      else required_post.subbedToPost = false;

      // fetch the user friends
      const friends_lists = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.user_id}&following_status=following`
      );

      const fetched_friend_list = friends_lists.data.data;
      let friends_ids = [];
      for (let i = 0; i < fetched_friend_list.length; i++)
        friends_ids.push(fetched_friend_list[i].to_user.user_id);

      friends_ids.push(context.decoded.obj.user_id);

      // check if the user is friends with
      if (friends_ids.includes(Number(required_post.owner.user_id)))
        required_post.owner.user_friends_with = true;
      else required_post.owner.user_friends_with = false;
      if (required_post.post_parent_id != null) {
        if (
          friends_ids.includes(
            Number(required_post.post_parent_id.owner.user_id)
          )
        )
          required_post.post_parent_id.owner.user_friends_with = true;
        else required_post.post_parent_id.owner.user_friends_with = false;
      }
      for (let j = 0; j < required_post.post_likes.length; j++) {
        if (
          friends_ids.includes(Number(required_post[i].post_likes[j].user_id))
        )
          required_post[i].post_likes[j].user_friends_with = true;
        else required_post[i].post_likes[j].user_friends_with = false;
      }
      if (
        required_post.type == "feechred" &&
        required_post.post_parent_id != null
      ) {
        required_post.feechr_up_user =
          required_post.post_parent_id.feechr_up_user;
      }
      return required_post;
    },
    commentPost: async (parent, args, context) => {

      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      /* fetch the post */
      const post = await Posts.findOne({ _id: args.postId });
      /* add the comment in the array of comments */
      post.post_comments.unshift({
        user: context.decoded.obj._id,
        comment: args.comment,
        tags: args.tags,
        hashTags: args.hashTags,
        createdAt: new Date().toISOString(),
      });
      for (let i = 0; i < args.hashTags.length; i++)
        createOrUpdateHashTag(args.hashTags[i], false);
      post.post_comments_total++;
      await post.save();
      await Posts.populate(post, "owner");
      await Posts.populate(post, "post_comments.tags");
      await Posts.populate(post, "post_comments.user");
      axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "post",
          from_user: context.decoded.obj._id,
          to_user: post.owner._id,
          tag: "COMMENT_POST",
          payload: { post: mongoose.Types.ObjectId(post._id) },
        }
      );
      const subbed_for_post = await SubPost.find({ post: post._id });
      const mapped_subs = subbed_for_post.map((sub) => sub.user);
      for (let i = 0; i < mapped_subs.length; i++) {
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "post",
            from_user: context.decoded.obj._id,
            to_user: mapped_subs[i],
            tag: "LIKE_POST_SUB",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
      }
      for (let i = 0; i < args.tags.length; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "user",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(args.tags[i]),
            tag: "TAG_POST",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
      return post;
    },
    likeComment: async (parent, args, context) => {

      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)
      
      /* check if it's a like or remove like */
      try {
        let post = await Posts.findOne({ _id: args.postId }).populate({
          path: "post_comments",
          populate: { path: "likes" },
        });
        //console.log(post)
        /* find the comment */
        const found_comment = post.post_comments.find(
          (comment_find) => comment_find._id == args.commentId
        );
        /* get the found comment index */
        const found_comment_index = post.post_comments.indexOf(found_comment);
        /* find the like */
        const found_like = post.post_comments[found_comment_index].likes.find(
          (found_like) => found_like.user_id == context.decoded.obj.user_id
        );
        /* get the found like index */
        const found_like_index = post.post_comments[
          found_comment_index
        ].likes.indexOf(found_like);
        /* if like found then go for remove like */
        if (found_like) {
          post.post_comments[found_comment_index].comments_likes_total--;
          post.post_comments[found_comment_index].likes.splice(
            found_like_index,
            1
          );
          await post.save();
          post.post_comments[found_comment_index].user_liked_post = false;
          return post;
        }
        post.post_comments[found_comment_index].likes.unshift(
          context.decoded.obj._id
        );
        post.post_comments[found_comment_index].comments_likes_total++;
        await post.save();
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "post",
            from_user: context.decoded.obj._id,
            to_user: post.owner,
            tag: "LIKE_COMMENT",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
        post.post_comments[found_comment_index].user_liked_post = true;
        return post;
      } catch (err) {
        console.log(err);
      }
    },
    commentAComment: async (parent, args, context) => {
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      /* fetch the post */
      const post = await Posts.findOne({ _id: args.postId })
        .populate("post_likes")
        .populate("owner")
        .populate("post_parent_id")
        .populate("post_comments")
        .populate("tags")
        .populate({ path: "post_comments.user" })
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.tags" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_comments.comments_comments.tags" })
        .populate({ path: "medias.videos.song" });
      /* find the main comment and it's index*/
      //console.log(post.post_comments[0].comments_comments);
      const found_comment = post.post_comments.find(
        (comment) => comment._id == args.commentId
      );
      const found_comment_index = post.post_comments.indexOf(found_comment);
      /* add the comment */
      post.post_comments[found_comment_index].comments_comments.unshift({
        user: context.decoded.obj._id,
        comment: args.comment,
        tags: args.tags,
        hashTags: args.hashTags,
        createdAt: new Date().toISOString(),
      });
      // incriment the sub comment total
      post.post_comments[found_comment_index].comments_comments_total++;
      post.post_comments_total++;
      for (let i = 0; i < args.hashTags.length; i++)
        createOrUpdateHashTag(args.hashTags[i], false);
      await post.save();
      await Posts.populate(post, {
        path: "post_comments.comments_comments.tags",
      });
      for (let i = 0; i < args.tags; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "user",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(args.tags[i]),
            tag: "TAG_POST",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
      if (`${context.decoded.obj._id}` != `${found_comment.user._id}`) {
        console.log("here ________________________");
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "post",
            from_user: context.decoded.obj._id,
            to_user: found_comment.user,
            tag: "REPLAY_COMMENT",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
      }

      return post;
    },
    likeCommentComment: async (parent, args, context) => {
      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      /* check if it's a like or remove like */
      try {
        let post = await Posts.findOne({ _id: args.postId }).populate({
          path: "post_comments",
          populate: { path: "comments_comments" },
          populate: { path: "comments_comments.likes" },
        });
        /* find the comment */
        const found_comment = post.post_comments.find(
          (comment_find) => comment_find._id == args.commentId
        );
        /* get the found comment index */
        const found_comment_index = post.post_comments.indexOf(found_comment);
        /* find the sub comment */
        const sub_comment = post.post_comments[
          found_comment_index
        ].comments_comments.find(
          (found_sub_comment) => found_sub_comment._id == args.subComment
        );
        /*find the sub comment index */
        const sub_comment_id = post.post_comments[
          found_comment_index
        ].comments_comments.indexOf(sub_comment);
        /* find the like */
        const found_like = post.post_comments[
          found_comment_index
        ].comments_comments[sub_comment_id].likes.find(
          (found_like) => found_like.user_id == context.decoded.obj.user_id
        );
        /* get the found like index */
        const found_like_index = post.post_comments[
          found_comment_index
        ].comments_comments[sub_comment_id].likes.indexOf(found_like);
        /* if like found then go for remove like */
        if (found_like) {
          post.post_comments[found_comment_index].comments_comments[
            sub_comment_id
          ].comments_likes_total--;
          post.post_comments[found_comment_index].comments_comments[
            sub_comment_id
          ].likes.splice(found_like_index, 1);
          await post.save();
          post.post_comments[found_comment_index].comments_comments[
            sub_comment_id
          ].user_liked_post = false;
          return post;
        }
        post.post_comments[found_comment_index].comments_comments[
          sub_comment_id
        ].likes.unshift(context.decoded.obj._id);
        post.post_comments[found_comment_index].comments_comments[
          sub_comment_id
        ].comments_likes_total++;
        await post.save();
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "post",
            from_user: context.decoded.obj._id,
            to_user: sub_comment.user,
            tag: "LIKE_COMMENT",
            payload: { post: mongoose.Types.ObjectId(post._id) },
          }
        );
        //post.post_comments[like_data_index].user_liked_post = true;
        return post;
      } catch (err) {
        console.log(err);
      }
    },

    feechrup: async (parent, args, context) => {

      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)

      let promise_array = [];
      let images = [];
      let videos = [];
      let video_to_producer = [];
      let filters_to_producer = [];
      let keys_to_producer = [];
      // set the active variable for the post
      args.active = true;
      if (args.media) {
        for (let i = 0; i < args.media.length; i++) {
          promise_array.push(uploadMedia(args.media[i]));
        }
        // resolve all promises
        const resolved_uploads = await Promise.all(promise_array);
        // prepare the post to create
        // split the videos and images
        for (let i = 0; i < resolved_uploads.length; i++) {
          if (resolved_uploads[i].mimetype.includes("image"))
            images.push({
              type: "image",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              order: i,
            });
          else {
            args.active = false;
            video_to_producer.push(resolved_uploads[i].url);
            filters_to_producer.push(args.filters[i]);
            if (args.filters[i] == null)
              throw new ApolloError("Filter Error", 400, {
                code: 400,
                message: "Filters should not be null",
              });
            keys_to_producer.push(resolved_uploads[i].file_name);
            videos.push({
              type: "video",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              song: args.song[i],
              video_speed: args.video_speed[i],
              order: i,
            });
          }
        }
      }
      /* create the post */
      const post_to_create = {
        owner: context.decoded.obj._id,
        type: "feechred",
        user_id: context.decoded.obj.user_id,
        description: args.description,
        medias: { images: images, videos: videos },
        visibility: context.decoded.obj.visibility == "public" ? 0 : 2,
        category: args.category,
        active: false,
        post_parent_id: args.post_parent_id,
        hashTags: args.hashTags,
        tags: args.tags,
      };
      for (let i = 0; i < args.hashTags.length; i++) {
        createOrUpdateHashTag(args.hashTags[i], true);
      }
      const created_post = await Posts.create(post_to_create);
      let songs = [];
      //TODO : fetch the song object once it's ready
      for (let i = 0; i < args.song.length; i++) {
        //get the music url
        if (args.song[i] == "original") args.song[i] = null;
        let music = await Music.findOne({ _id: args.song[i] });
        if (music) {
          songs.push(music.s3Url);
          music.usedCount++;
          await music.save();
        } else songs.push("original");
      }
      let producer_payload = {
        postId: created_post._id,
        userId: context.decoded.obj.user_id,
        videos_urls: video_to_producer,
        filters_urls: filters_to_producer,
        songs,
        keys: keys_to_producer,
      };
      if (args.type == "with") {
        //fetch the feechring post
        const fetched_feechring_post = await Posts.findOne({
          _id: args.post_parent_id,
        });
        producer_payload.videos_urls.unshift(
          `${config.bucket_url}` +
            fetched_feechring_post.medias.videos[0].compressed_video
        );
        producer_payload.keys.unshift(
          fetched_feechring_post.medias.videos[0].compressed_video
        );
        producer_payload.type = "feechr-up-with";
        console.log("producer object: ", producer_payload);
        await producer(producer_payload);
      } else {
        producer_payload.type = "feechr-up-after";
        if (args.active == false) await producer(producer_payload);
      }

      //fetch the feechring post
      let feechring_post = await Posts.findOne({ _id: args.post_parent_id });
      feechring_post.feechr_up_count++;
      if (feechring_post.feechr_up_user.length < 4)
        feechring_post.feechr_up_user.unshift(context.decoded.obj._id);
      else {
        feechring_post.feechr_up_user.pop();
        feechring_post.feechr_up_user.unshift(context.decoded.obj._id);
      }
      await feechring_post.save();

      return "post feechruped successfully";
    },
    sharePost: async (parent, args, context) => {
      //fetch the post to share
      const post_to_share = await Posts.findOne({ _id: args.postId });
      /* create the post */
      let post_to_create = {
        owner: context.decoded.obj._id,
        type: "refeechr",
        user_id: context.decoded.obj.user_id,
        description: args.description,
        visibility: context.decoded.obj.visibility == "public" ? 0 : 2,
        category: args.category,
        active: true,
        post_parent_id: args.postId,
        textColor: args.textColor,
        clubId: args.clubId,
        tags: args.tags,
        hashTags: args.hashTags,
      };

      if (post_to_share.type == "feechred") {
        post_to_create.medias = post_to_share.medias;
        post_to_create.medias.original_post_id = post_to_share.post_parent_id;
      }
      const created_post = await Posts.create(post_to_create);
      //update posts count
      await axios.post(
        `${config.auth_service_url}api/user/profilCountServices`,
        { type: "posts_count", user_id: context.decoded.obj.user_id, step: 1 }
      );
      await Posts.populate(created_post, "owner");
      await Posts.populate(created_post, "tags");
      if (!args.hashTags) args.hashTags = [];
      for (let i = 0; i < args.hashTags.length; i++) {
        createOrUpdateHashTag(args.hashTags[i], true);
      }
      if (!args.tags) args.tags = [];
      for (let i = 0; i < args.tags.length; i++)
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "user",
            from_user: context.decoded.obj._id,
            to_user: mongoose.Types.ObjectId(args.tags[i]),
            tag: "TAG_POST",
            payload: { post: mongoose.Types.ObjectId(created_post._id) },
          }
        );
      if (post_to_share.clubId) {
        console.log("sending refeechr club");
        // fetch the admins and owner of the club
        const fetched_admins = await ClubMember.find({
          clubId: post_to_share.clubId,
          status: { $in: ["owner", "admin"] },
        });
        /* map the ids */
        const mapped_admins_ids = fetched_admins.map((admin) => admin.user);
        /* loop and send notifications to them */
        for (let i = 0; i < mapped_admins_ids.length; i++)
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "club",
              from_user: context.decoded.obj._id,
              to_user: mapped_admins_ids[i],
              tag: "RFEECHER_POST_CLUB",
              payload: {
                post: mongoose.Types.ObjectId(created_post._id),
                club: mongoose.Types.ObjectId(post_to_share.clubId),
              },
            }
          );
      } else {
        console.log("sending refeechr");
        axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "post",
            from_user: context.decoded.obj._id,
            to_user: post_to_share.owner,
            tag: "REFEECHR",
            payload: { post: mongoose.Types.ObjectId(created_post._id) },
          }
        );
      }
      return created_post;
    },
    // ARRIVED HERE TODO
    friendsPosts: async (parent, args, context) => {
      /* fetch current user friends list need to be implemented with users service*/
      const friends_lists = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.id}&following_status=accepted`
      );
      const fetched_friend_list = friends_lists.data.data;
      let friends_ids = [];
      for (let i = 0; i < fetched_friend_list.length; i++)
        friends_ids.push(fetched_friend_list[i].to_user.user_id);
      // fetch hiden posts
      let blocked_posts = await BlockPosts.find({
        $or: [
          {
            user_id: context.decoded.id,
            expiration_data: { $gte: new Date() },
          },
          { user_id: context.decoded.id, expiration_data: null },
        ],
      }).select("post_id -_id");
      blocked_posts = blocked_posts.map((blocked_post) => blocked_post.post_id);
      /*fetch the related posts sorted */
      const posts = await Posts.find({
        _id: { $nin: blocked_posts },
        "owner.id": { $in: friends_ids },
        draft: false,
        visibility: { $in: [0, 1] },
      })
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" })
        .limit(args.limit)
        .skip(args.offset)
        .sort([["createdAt", -1]])
        .populate("post_parent_id");

      for (let i = 0; i < posts.length; i++) {
        findLikes(posts[i].post_comments, context.decoded.obj._id);
      }
      return posts;
    },
    deletePosts: async (parent, args, context) => {
      /* check if user is allowed to delete the post */
      const post = await Posts.findOne({
        _id: args.postId,
        owner: context.decoded.obj._id,
      });
      if (post) {
        await Posts.updateMany(
          { post_parent_id: args.postId },
          { post_parent_id: null }
        );
        await Posts.deleteOne({ _id: args.postId });
        await Users.findOneAndUpdate(
          { _id: context.decoded.obj._id },
          { $set: { $inc: { posts_count: -1 } } }
        );
        await axios.post(
          `${config.auth_service_url}api/user/profilCountServices`,
          { type: "posts_count", user_id: post.user_id, step: -1 }
        );
        if (post.clubId) {
          await Clubs.findOneAndUpdate(
            {
              _id: post.clubId,
            },
            { $inc: { post_counter_total: -1 } }
          );
        }
        return "post deleted";
      }
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },
    updateViewsCounter: async (parent, args, context) => {
      /* fetch post */
      const post = await Posts.findOne({ _id: args.postId })
        .populate("clubId")
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" });
      /* check if the user already saw the post  */
      /* check the view Model */
      if ( post.owner._id == context.decoded.obj._id )
        return post
      const found_view_model = await PostViews.findOne({
        post: post._id,
        viewedBy: context.decoded.obj._id,
      });
      const found_view = post.post_viwers.includes(context.decoded.obj._id);
      if (found_view || found_view_model) return post;
      post.post_viwers.push(context.decoded.obj._id);
      post.post_views_total++;
      /* update the view model */
      await PostViews.create({
        post: post._id,
        viewedBy: context.decoded.obj._id,
      });
      if (post.clubId) {
        await Clubs.findOneAndUpdate(
          { _id: post.clubId },
          { $inc: { vues_counter_total: 1 } }
        );
      }

      //update the post_parent_id views if exists
      if (post.post_parent_id) {
        const found_view_model_parent = await PostViews.findOne({
          post: post.post_parent_id._id,
          viewedBy: context.decoded.obj._id,
        });
        const found_view_parent = post.post_parent_id.post_viwers.includes(
          context.decoded.obj._id
        );
        if (!found_view_parent && !found_view_model_parent) {
          await Posts.findOneAndUpdate(
            { _id: post.post_parent_id._id },
            { $inc: { post_views_total: 1 } }
          );
          await PostViews.create({
            post: post.post_parent_id._id,
            viewedBy: context.decoded.obj._id,
          });
          if (post.clubId) {
            await Clubs.findOneAndUpdate(
              { _id: post.clubId },
              { $inc: { vues_counter_total: 1 } }
            );
          }

          await axios.post(
            `${config.auth_service_url}api/user/profilCountServices`,
            {
              type: "views_count",
              user_id: post.post_parent_id.user_id,
              step: 1,
            }
          );
        }
      }

      if (post.post_views_total == 100) {
        if (post.type == "feechring")
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "feechrup",
              from_user: context.decoded.obj._id,
              to_user: post.owner._id,
              tag: "REACHED_VIWES",
              payload: { post: mongoose.Types.ObjectId(post._id) },
            }
          );
        else
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "post",
              from_user: context.decoded.obj._id,
              to_user: post.owner._id,
              tag: "CONGRATULATION",
              payload: { post: mongoose.Types.ObjectId(post._id) },
            }
          );
      }
      await post.save();
      //update likes count

      await axios.post(
        `${config.auth_service_url}api/user/profilCountServices`,
        { type: "views_count", user_id: post.user_id, step: 1 }
      );
      return post;
    },
    fetchClubPosts: async (parent, args, context) => {
      /*fetch posts with the club id*/
      const limit = args.limit ? args.limit : 10;
      let posts;
      if (args.filter == "all" || args.filter == undefined)
        posts = await Posts.find({
          clubId: args.clubId,
          draft: false,
          active: true,
          $or: [{ visibility: 0 }, { visibility: 4 }],
        })
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "medias.videos.song" })
          .populate("clubId")
          .limit(limit)
          .skip(args.page)
          .sort([["createdAt", -1]]);
      if (args.filter == "images") {
        posts = await Posts.find({
          clubId: args.clubId,
          active: true,
          draft: false,
          $or: [{ visibility: 0 }, { visibility: 4 }],
          "medias.images": { $exists: true, $not: { $size: 0 } },
          "medias.videos": { $exists: true, $size: 0 },
        })
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "medias.videos.song" })
          .populate("clubId")
          .limit(limit)
          .skip(args.offset)
          .sort([["createdAt", -1]]);
        for (let i = 0; i < posts.length; i++) {
          let found_like = posts[i].post_likes.find(
            (like_instanse) => like_instanse.user_id == context.decoded.id
          );
          if (found_like) posts[i].user_liked_post = true;
          else posts[i].user_liked_post = false;
        }
      }
      if (args.filter == "videos") {
        posts = await Posts.find({
          clubId: args.clubId,
          draft: false,
          active: true,
          "medias.videos": { $exists: true, $not: { $size: 0 } },
          "medias.images": { $exists: true, $size: 0 },
          $or: [{ visibility: 0 }, { visibility: 4 }],
        })
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "medias.videos.song" })
          .populate("clubId")
          .limit(limit)
          .skip(args.offset)

          .sort([["createdAt", -1]]);
        for (let i = 0; i < posts.length; i++) {
          let found_like = posts[i].post_likes.find(
            (like_instanse) => like_instanse.user_id == context.decoded.id
          );
          if (found_like) posts[i].user_liked_post = true;
          else posts[i].user_liked_post = false;
        }
      }
      const my_subs = await SubPost.find({ user: context.decoded.obj._id });
      /*map the subs */
      const mapped_my_subs = my_subs.map((sub) => String(sub.post));
      for (let i = 0; i < posts.length; i++) {
        if (mapped_my_subs.includes(String(posts._id)))
          posts[i].subbedToPost = true;
        else posts[i].subbedToPost = false;
        let post_likes = await Likes.find({
          $or: [{ post: posts[i]._id }, { parent: posts[i]._id }],
        });
        posts[i].post_likes_total = post_likes.length;
        findLikes(posts[i].post_comments, context.decoded.obj._id);
      }
      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");
      for (let i = 0; i < posts.length; i++) {
        const found_like = user_likes_posts.findIndex((element) => {
          return element.post.equals(posts[i]._id);
        });
        if (found_like != -1) posts[i].user_liked_post = true;
        else posts[i].user_liked_post = false;
      }
      return posts;
    },
    findPostByUserId: async (parent, args, context) => {
      /* fetch hidden posts  */
      let blocked_posts = await BlockPosts.find({
        $or: [
          {
            user_id: context.decoded.obj.user_id,
            expiration_data: { $gte: new Date() },
          },
          { user_id: context.decoded.obj.user_id, expiration_data: null },
        ],
      }).select("post_id -_id");
      blocked_posts = blocked_posts.map((blocked_post) => blocked_post.post_id);

      // get the user mongo id
      const user = await Users.findOne({ user_id: args.userId }).select({
        _id: 1,
      });

      const friends_lists = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.user_id}&following_status=following`
      );

      const fetched_friend_list = friends_lists.data.data;

      let friends_ids = [context.decoded.obj.user_id];
      for (let i = 0; i < fetched_friend_list.length; i++)
        friends_ids.push(fetched_friend_list[i].to_user.user_id);

      const limit = args.limit ? args.limit : 10;

      //prepare the filter on media
      //   "medias.videos": { $exists: true, $not: { $size: 0 } },
      //"medias.images": { $exists: true, $size: 0 },
      let conditions;
      // if fetching my own profil i can see the private posts
      if (args.userId == context.decoded.obj.user_id) {
        conditions = {
          type: { $ne: "event" },
          owner: user._id,
          draft: false,
          active: true,
          _id: { $nin: blocked_posts },
          clubId: null,
        };
        if (args.filter == "image") {
          conditions["medias.videos"] = { $exists: true, $size: 0 };
          conditions["medias.images"] = { $exists: true, $not: { $size: 0 } };
        }
        if (args.filter == "video") {
          conditions["medias.videos"] = { $exists: true, $not: { $size: 0 } };
          conditions["medias.images"] = { $exists: true, $size: 0 };
        }
        posts = await Posts.find(conditions)
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.tags" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.tags" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "medias.videos.song" })
          .populate("clubId")
          .limit(limit)
          .skip(args.offset)
          .sort([["createdAt", -1]]);
        const disabled_notif = await DisableNotification.find({
          user: context.decoded.obj._id,
        });
        const mapped_disabled_notif = disabled_notif.map((disabled_notif) =>
          String(disabled_notif.post)
        );
        for (let i = 0; i < posts.length; i++) {
          /* check if the owner disabled the notifications for him self */
          if (mapped_disabled_notif.includes(String(posts[i]._id)))
            posts[i].activeNotification = false;
          else posts[i].activeNotification = true;
          findLikes(posts[i].post_comments, context.decoded.obj_id);
        }
        for (let i = 0; i < posts.length; i++) {
          console.log("here");
          //fetch the user liked posts
          const user_likes_posts = await Likes.find({
            user: context.decoded.obj._id,
          }).select("post");
          for (let i = 0; i < posts.length; i++) {
            const found_like = user_likes_posts.findIndex((element) => {
              return element.post.equals(posts[i]._id);
            });
            if (found_like != -1) posts[i].user_liked_post = true;
            else posts[i].user_liked_post = false;
          }
        }
        return posts;
      } else {
        // if following user fetched
        if (args.following_status == "following") {
          conditions = {
            type: { $ne: "event" },
            owner: user._id,
            draft: false,
            active: true,
            _id: { $nin: blocked_posts },
            $or: [{ visibility: 0 }, { visibility: 1 }, { visibility: 2 }],
            clubId: null,
          };
          if (args.filter == "image") {
            conditions["medias.videos"] = { $exists: true, $size: 0 };
            conditions["medias.images"] = { $exists: true, $not: { $size: 0 } };
          }
          if (args.filter == "video") {
            conditions["medias.videos"] = { $exists: true, $not: { $size: 0 } };
            conditions["medias.images"] = { $exists: true, $size: 0 };
          }

          posts = await Posts.find(conditions)
            .populate("owner")
            .populate("post_likes")
            .populate("post_comments.user")
            .populate("tags")
            .populate({ path: "post_comments.likes" })
            .populate({ path: "post_comments.tags" })
            .populate({ path: "post_comments.comments_comments.user" })
            .populate({ path: "post_comments.comments_comments.likes" })
            .populate({ path: "post_comments.comments_comments.tags" })
            .populate({ path: "post_parent_id", populate: { path: "owner" } })
            .populate({ path: "medias.videos.song" })
            .populate("clubId")
            .limit(limit)
            .skip(args.offset)
            .sort([["createdAt", -1]]);
          for (let i = 0; i < posts.length; i++) {
            if (friends_ids.includes(Number(posts[i].owner.user_id)))
              posts[i].owner.user_friends_with = true;
            else posts[i].owner.user_friends_with = false;
            if (posts[i].post_parent_id != null) {
              if (
                friends_ids.includes(
                  Number(posts[i].post_parent_id.owner.user_id)
                )
              )
                posts[i].post_parent_id.owner.user_friends_with = true;
              else posts[i].post_parent_id.owner.user_friends_with = false;
            }
            findLikes(posts[i].post_comments, context.decoded.obj_id);
          }
          return posts;
        }
        // if fetching user only public posts are fetched

        conditions = {
          type: { $ne: "event" },
          owner: user._id,
          draft: false,
          active: true,
          _id: { $nin: blocked_posts },
          $or: [{ visibility: 0 }],
          clubId: null,
        };
        if (args.filter == "image") {
          conditions["medias.videos"] = { $exists: true, $size: 0 };
          conditions["medias.images"] = { $exists: true, $not: { $size: 0 } };
        }
        if (args.filter == "video") {
          conditions["medias.videos"] = { $exists: true, $not: { $size: 0 } };
          conditions["medias.images"] = { $exists: true, $size: 0 };
        }

        posts = await Posts.find(conditions)
          .populate("owner")
          .populate("post_likes")
          .populate("post_comments.user")
          .populate("tags")
          .populate({ path: "post_comments.likes" })
          .populate({ path: "post_comments.tags" })
          .populate({ path: "post_comments.comments_comments.user" })
          .populate({ path: "post_comments.comments_comments.likes" })
          .populate({ path: "post_comments.comments_comments.tags" })
          .populate({ path: "post_parent_id", populate: { path: "owner" } })
          .populate({ path: "medias.videos.song" })
          .populate("clubId")
          .limit(limit)
          .skip(args.offset)
          .sort([["createdAt", -1]]);

        for (let i = 0; i < posts.length; i++) {
          if (friends_ids.includes(Number(posts[i].owner.user_id)))
            posts[i].owner.user_friends_with = true;
          else posts[i].owner.user_friends_with = false;
          if (posts[i].post_parent_id != null) {
            if (
              friends_ids.includes(
                Number(posts[i].post_parent_id.owner.user_id)
              )
            )
              posts[i].post_parent_id.owner.user_friends_with = true;
            else posts[i].post_parent_id.owner.user_friends_with = false;
          }
          findLikes(posts[i].post_comments, context.decoded.obj_id);
        }
        for (let i = 0; i < posts.length; i++) {
          console.log("here");
          //fetch the user liked posts
          const user_likes_posts = await Likes.find({
            user: context.decoded.obj._id,
          }).select("post");
          for (let i = 0; i < posts.length; i++) {
            const found_like = user_likes_posts.findIndex((element) => {
              return element.post.equals(posts[i]._id);
            });
            if (found_like != -1) posts[i].user_liked_post = true;
            else posts[i].user_liked_post = false;
          }
        }
        return posts;
      }
    },
    saveDraft: async (parent, args, context) => {
      /* Handle auth */
      if (!args.clubId) args.clubId = null;

      // upload media
      let promise_array = [];
      let images = [];
      let videos = [];
      let video_to_producer = [];
      let filters_to_producer = [];
      let keys_to_producer = [];
      let resolved_uploads = [];
      if (args.media) {
        for (let i = 0; i < args.media.length; i++) {
          promise_array.push(uploadMedia(args.media[i]));
        }
        // resolve all promises
        resolved_uploads = await Promise.all(promise_array);
        // prepare the post to create
        // split the videos and images
        for (let i = 0; i < resolved_uploads.length; i++) {
          if (resolved_uploads[i].mimetype.includes("image"))
            images.push({
              _id: resolved_uploads[i]._id,
              type: "image",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              order: i,
            });
          else {
            console.log(resolved_uploads[i]);
            args.active = false;
            video_to_producer.push(resolved_uploads[i].url);
            filters_to_producer.push("original");
            keys_to_producer.push(resolved_uploads[i].file_name);
            videos.push({
              _id: resolved_uploads[i]._id,
              type: "video",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              song: args.songs[i],
              order: i,
            });
          }
        }
      }
      /* create the post */
      args.visibility = 0;
      const post_to_create = {
        owner: context.decoded.obj._id,
        type: args.type,
        description: args.description,
        medias: { images, videos },
        visibility: args.visibility,
        category: args.category,
        location: args.location,
        textColor: args.textColor,
        clubId: args.clubId,
        draft: true,
        tags: args.tags,
        hashTags: args.hashTags,
      };
      const created_post = await Posts.create(post_to_create);
      if (args.clubId)
        await Clubs.findOneAndUpdate(
          { _id: args.clubId },
          { $inc: { post_counter_total: 1 } }
        );
      let songs = [];
      //TODO : fetch the song object once it's ready
      for (let i = 0; i < args.songs.length; i++) {
        //get the music url
        if (resolved_uploads[i].mimetype.includes("image")) continue;
        if (args.songs[i] == "original") {
          args.songs[i] = null;
          continue;
        }
        let music = await Music.findOne({ _id: args.songs[i] });
        if (music) {
          songs.push(music.s3Url);
          music.usedCount++;
          await music.save();
        } else songs.push("original");
      }
      let producer_payload = {
        postId: created_post._id,
        userId: context.decoded.obj.user_id,
        videos_urls: video_to_producer,
        filters_urls: filters_to_producer,
        songs,
        keys: keys_to_producer,
      };
      console.log(producer_payload);
      if (args.active == false) await producer(producer_payload);
      return created_post;
    },
    saveDraftIOS: async (parent, args, context) => {
      /* Handle auth */
      if (!args.clubId) args.clubId = null;
      // upload media
      let promise_array = [];
      let images = [];
      let videos = [];
      if (args.media) {
        promise_array.push(uploadMedia(args.media));
        // resolve all promises
        const resolved_uploads = await Promise.all(promise_array);
        // prepare the post to create
        // split the videos and images
        let array_song_index = 0;
        for (let i = 0; i < resolved_uploads.length; i++) {
          if (resolved_uploads[i].mimetype.includes("image"))
            images.push({
              _id: resolved_uploads[i]._id,
              type: "image",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              order: i,
            });
          else {
            if (args.songs[array_song_index] == "original")
              args.songs[array_song_index] = null;
            videos.push({
              _id: resolved_uploads[i]._id,
              type: "video",
              url: resolved_uploads[i].url,
              file_name: resolved_uploads[i].file_name,
              song: args.songs[array_song_index],
              order: i,
            });
            array_song_index++;
          }
        }
      }
      /* create the post */
      const post_to_create = {
        owner: context.decoded.obj._id,
        type: args.type,
        description: args.description,
        medias: { images, videos },
        visibility: args.visibility,
        category: args.category,
        textColor: args.textColor,
        clubId: args.clubId,
        draft: true,
      };
      if (args.postId == null) {
        const created_post = await Posts.create(post_to_create);
        if (args.clubId)
          await Clubs.findOneAndUpdate(
            { _id: args.clubId },
            { $inc: { post_counter_total: 1 } }
          );
        return created_post;
      } else {
        const created_post = await Posts.findOneAndUpdate(
          { _id: args.postId },
          args,
          { useFindAndModify: false }
        );
        return created_post;
      }
    },
    fetchMyDrafts: async (parent, args, context) => {
      /*fetch by owner id */
      const user_drafts = await Posts.find({
        active: true,
        draft: true,
        owner: context.decoded.obj._id,
      })
        .limit(args.limit)
        .skip(args.offset)
        .sort([["createdAt", -1]])
        .populate("owner")
        .populate("post_likes")
        .populate("tags")
        .populate("post_comments.user")
        .populate("post_comments.tags")
        .populate({ path: "post_comments.likes" })
        // .populate({ path: "post_comments.tags" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_comments.comments_comments.tags" })
        .populate("clubId")
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" })
        .populate("feechr_up_user")
        .populate({
          path: "post_parent_id",
          populate: { path: "feechr_up_user" },
        });
      return user_drafts;
    },
    fetchDraftById: async (parent, args, context) => {
      /*fetch draft by id with the user authorization*/
      const draft = await Posts.find({
        active: true,
        _id: args.draftId,
      }).populate("owner", null, { user_id: context.decoded.obj.user_id });
      if (draft) return draft;
      throw new ApolloError("Forbidden", 403, {
        code: 403,
        message: "Forbidden",
      });
    },
    updateDraftToPost: async (parent, args, context) => {
      /* update draft to post */
      const obj = JSON.parse(JSON.stringify(args["postUpdate"]));
      obj.visibility = 0;
      obj.active = true;
      const draft_to_post = await Posts.findOneAndUpdate(
        { _id: args.postId },
        { ...obj },
        { new: true }
      )
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" });
      if (obj.draft == true)
        for (let i = 0; i < obj.hashTags.length; i++)
          createOrUpdateHashTag(draft_to_post.hashTags[i], true);
      if (obj.draft == true)
        for (let i = 0; i < obj.tags.length; i++)
          axios.post(
            `${config.notification_service_url}api/notifications/sendToUser`,
            {
              origin: "user",
              from_user: context.decoded.obj._id,
              to_user: mongoose.Types.ObjectId(args.tags[i]),
              tag: "TAG_POST",
              payload: { post: mongoose.Types.ObjectId(updated_post._id) },
            }
          );
      return draft_to_post;
    },

    savePost: async (parent, args, context) => {
      /* save the post to the user*/
      const save_post = await SavePosts.findOneAndUpdate(
        { user_id: context.decoded.obj._id, post_id: args.postId },
        {},
        { upsert: true, new: true }
      );
      return "post saved";
    },

    fetchMySavedPosts: async (parent, args, context) => {
      /*fetch my saved posts */
      const limit = args.limit ? args.limit : 10;

      const user_saved_posts = await SavePosts.find({
        user_id: context.decoded.obj._id,
      })
        .populate("post_id")
        .populate({ path: "post_id", populate: { path: "owner" } })
        .populate({ path: "post_id", populate: { path: "clubId" } })
        .populate({ path: "post_id", populate: { path: "post_likes" } })
        .populate({ path: "post_id", populate: { path: "tags" } })
        .populate({ path: "post_id", populate: { path: "post_comments.user" } })
        .populate({
          path: "post_id",
          populate: { path: "post_comments.likes" },
        })
        .populate({
          path: "post_id",
          populate: { path: "post_comments.comments_comments.user" },
        })
        .populate({
          path: "post_id",
          populate: { path: "post_comments.comments_comments.likes" },
        })
        .populate({ path: "post_id", populate: { path: "medias.videos.song" } })
        .populate({
          path: "post_id",
          populate: { path: "post_parent_id", populate: { path: "owner" } },
        })
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .limit(limit)
        .skip(args.offset)
        .sort([["createdAt", -1]]);
      let posts = user_saved_posts.filter((post) => post.post_id);
      let filtred_posts = posts.map((post) => post.post_id);
      return filtred_posts;
    },

    fetchUserStats: async (parent, args, context) => {
      /*fetch user stats */
      const stats = await Posts.aggregate([
        { $match: { "owner.id": String(context.decoded.id) } },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: "$post_likes_total" },
            totalViews: { $sum: "$post_views_total" },
          },
        },
      ]);
      return stats["0"];
    },
    searchHashTags: async (parent, args, context) => {
      /* suggest tags from user input */
      let { offset, limit, tag } = args;
      if (tag == "") return [];
      if (tag == null) tag = "";
      const regex = new RegExp(tag, "i");
      const suggest = await HashTags.find({ tag: regex })
        .limit(limit)
        .skip(offset);
      return suggest;
    },
    hidePost: async (parent, args, context) => {
      /* insert the post to hide */
      let expiration_data;
      if (args.always == true) expiration_data = null;
      else {
        expiration_data = new Date();
        expiration_data = expiration_data.setDate(
          expiration_data.getDate() + parseInt(7)
        );
        expiration_data = expiration_data;
      }
      await BlockPosts.create({
        user_id: context.decoded.obj.user_id,
        post_id: args.postId,
        expiration_data,
      });
      await SubPost.deleteOne({
        user: context.decoded.obj._id,
        post: args.postId,
      });
      return "post hidden";
    },
    //acceptFeechring: async (parent, args, context) => {},
    deleteComment: async (parent, args, context) => {
      // fetch the post
      const post = await Posts.findOne({ _id: args.postId })
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } });
      /* find the comment */
      const found_comment = post.post_comments.find(
        (comment_find) => comment_find._id == args.commentId
      );
      /* get the found comment index */
      const found_comment_index = post.post_comments.indexOf(found_comment);
      post.post_comments_total -=
        post.post_comments[found_comment_index].comments_comments.length + 1;

      // delete it
      post.post_comments.splice(found_comment_index, 1);
      //update the number of comments
      // update the db
      await post.save();
      return "delete done";
    },

    deleteCommentComment: async (parent, args, context) => {
      // get the post
      const post = await Posts.findOne({ _id: args.postId })
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } });
      /* find the comment */
      const found_comment = post.post_comments.find(
        (comment_find) => comment_find._id == args.commentId
      );
      /* get the found comment index */
      const found_comment_index = post.post_comments.indexOf(found_comment);
      /* find the sub comment */
      const sub_comment = post.post_comments[
        found_comment_index
      ].comments_comments.find(
        (found_sub_comment) => found_sub_comment._id == args.subComment
      );
      /*find the sub comment index */
      const sub_comment_id = post.post_comments[
        found_comment_index
      ].comments_comments.indexOf(sub_comment);
      //delete it
      post.post_comments[found_comment_index].comments_comments.splice(
        sub_comment_id,
        1
      );
      // update the comment total sub comments
      post.post_comments[found_comment_index].comments_comments_total--;
      post.post_comments_total--;
      //save it
      await post.save();
      return "comment deleted";
    },

    updateComment: async (parent, args, context) => {
      // fetch the post
      const post = await Posts.findOne({ _id: args.postId })
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } });
      /* find the comment */
      const found_comment = post.post_comments.find(
        (comment_find) => comment_find._id == args.commentId
      );
      /* get the found comment index */
      const found_comment_index = post.post_comments.indexOf(found_comment);
      // update the text
      post.post_comments[found_comment_index].comment = args.updatedText;
      post.post_comments[found_comment_index].hashTags = args.hashTags;
      if (args.tags) {
        post.post_comments[found_comment_index].tags = args.tags;
      }
      // we have to add the tags here
      // save it
      await post.save();
      for (let i = 0; i < args.hashTags.length; i++)
        createOrUpdateHashTag(args.hashTags[i], false);
      return "updated comment";
    },

    updateCommentCOmment: async (parent, args, context) => {
      // get the post
      const post = Post.findOne({ _id: args.postId })
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } });
      /* find the comment */
      const found_comment = post.post_comments.find(
        (comment_find) => comment_find._id == args.commentId
      );
      /* get the found comment index */
      const found_comment_index = post.post_comments.indexOf(found_comment);
      /* find the sub comment */
      const sub_comment = post.post_comments[
        found_comment_index
      ].comments_comments.find(
        (found_sub_comment) => found_sub_comment._id == args.subComment
      );
      /*find the sub comment index */
      const sub_comment_id = post.post_comments[
        found_comment_index
      ].comments_comments.indexOf(sub_comment);
      //update the text
      post.post_comments[found_comment_index].comments_comments[
        sub_comment_id
      ].comment = args.updatedText;
      post.post_comments[found_comment_index].hashTags = args.hashTags;
      if (args.tags) {
        post.post_comments[found_comment_index].comments_comments[
          sub_comment_id
        ].tags = args.tags;
      }
      await post.save();
      for (let i = 0; i < args.hashTags.length; i++)
        createOrUpdateHashTag(args.hashTags[i], false);
      return "comment deleted";
    },

    fetchRefeechredPosts: async (parent, args, context) => {
      //fetch refeechred posts
      const posts = await Posts.find({ post_parent_id: args.original_post_id })
        .limit(args.limit)
        .skip(args.offset)
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } });
      return posts;
    },

    fetchPostsCounts: async (parent, args, context) => {
      // fetch the blocked posts
      let blocked_posts = await BlockPosts.find({
        $or: [
          {
            user_id: context.decoded.obj.user_id,
            expiration_data: { $gte: new Date() },
          },
          { user_id: context.decoded.obj.user_id, expiration_data: null },
        ],
      }).select("post_id -_id");
      blocked_posts = blocked_posts.map((blocked_post) => blocked_post.post_id);
      // get the user that i blocked
      const blocked_users = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.id}&following_status=blocking`
      );
      const blocked_users_list = blocked_users.data.data;
      let blocked_ids = [];
      for (let i = 0; i < blocked_users_list.length; i++) {
        blocked_ids.push(blocked_users_list[i].to_user.user_id);
      }

      // fetch the user friends
      const friends_lists = await axios.get(
        `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.user_id}&following_status=following`
      );

      const fetched_friend_list = friends_lists.data.data;

      let friends_ids = [context.decoded.obj.user_id];
      for (let i = 0; i < fetched_friend_list.length; i++)
        friends_ids.push(fetched_friend_list[i].to_user.user_id);

      // apply filter of posts either post or feechring
      // to force pipeline
      let type = "all";
      if (args.filter == "post") type = "post";
      if (args.filter == "feechring") type = "feechring";
      // filter the content type
      let posts;
      let total_posts;
      if (type != "all") {
        // get the total count for the query
        total_posts = await Posts.countDocuments({
          _id: { $nin: blocked_posts },
          draft: false,
          user_id: { $nin: blocked_ids },
          $or: [
            {
              $and: [{ user_id: { $in: friends_ids } }, { visibility: 2 }],
            },
            { visibility: 0 },
          ],
          active: true,
          type,
        });
      } else {
        total_posts = await Posts.countDocuments({
          _id: { $nin: blocked_posts },
          draft: false,
          user_id: { $nin: blocked_ids },
          $or: [
            {
              $and: [{ user_id: { $in: friends_ids } }, { visibility: 2 }],
            },
            { visibility: 0 },
          ],
          active: true,
        });
      }
      return total_posts;
    },

    suggestUsers: async (parent, args, context) => {
      // get users that i hid, blocked or blocked me
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );
      // fetch users available and accessible
      var regex = new RegExp(args.searchName);
      let users = await Users.find({
        fullName: { $regex: regex, $options: "i" },
        user_id: { $nin: blocked_ids },
        type: { $ne: "club" },
      });
      return users;
    },

    report: async (parent, args, context, info) => {
      try {
        return await reportSchema.findOneAndUpdate(
          {
            user_id: context.decoded.obj._id,
            post_id: args.signalInput.post_id,
            reportMotif_id: args.signalInput.reportMotif_id,
          },
          {},
          { upsert: true, new: true }
        );
      } catch (err) {
        throw new ApolloError(err);
      }
    },

    reportMotif: async (parent, args, context, info) => {
      try {
        if (args.signalMotifInput.parentId) {
          const check = await reportMotifSchema.find({
            parentId: args.signalMotifInput.parentId,
          });
          if (check) {
            return await reportMotifSchema.create({
              tag_type: args.signalMotifInput.tag_type,
              parentId: args.signalMotifInput.parentId,
            });
          }
        } else {
          return await reportMotifSchema.create({
            tag_type: args.signalMotifInput.tag_type,
          });
        }
      } catch (err) {
        throw new ApolloError(err);
      }
    },

    fetchReportMotifs: async (parent, args, context, info) => {
      try {
        const motifs = await reportMotifSchema.find().populate("parentId");
        // i have to populate parentId

        return motifs;
      } catch (err) {
        throw new ApolloError(err);
      }
    },

    trendingTalent: async (parent, args, context, info) => {
      const { offset, limit, category } = args;
      // const aggregateBody= [];

      // get users that i hid, blocked or blocked me
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );

      let match_condition = {
        $match: {},
      };
      // if category is 0 then it's all categories
      if (category != 0)
        match_condition.$match.$or = [
          { "owner.talent.parent_category.category_id": category },
          { "owner.category.category_id": category },
        ];

      let trending_posts = await Posts.aggregate([
        {
          $match: {
            owner: { $ne: context.decoded.obj._id },
            clubId: null,
            user_id: { $nin: blocked_ids },
            visibility: 0,
            draft: false,
          },
        },
        { $match: { type: "post" } },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: "$owner" },
        match_condition,
        { $sort: { post_likes_total: -1, createdAt: -1 } },
        { $skip: offset },
        { $limit: limit },
      ]);
      await Posts.populate(trending_posts, "medias.videos.song");

      //fetch the user liked posts
      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");

      for (let i = 0; i < trending_posts.length; i++) {
        //fetch the user liked posts
        const found_like = user_likes_posts.findIndex((element) => {
          return element.post.equals(trending_posts[i]._id);
        });
        if (found_like != -1) trending_posts[i].user_liked_post = true;
        else trending_posts[i].user_liked_post = false;

        findLikes(trending_posts[i].post_comments, context.decoded.obj._id);
      }
      return shuffle(trending_posts);
    },
    discoverTalentPosts: async (parent, args, context, info) => {
      const { offset, limit, category } = args;
      // const aggregateBody= [];
      // get users that i hid, blocked or blocked me
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );
      console.log(blocked_ids);
      let match_condition = {
        $match: {},
      };
      // if category is 0 then it's all categories
      if (category != 0)
        match_condition.$match.$or = [
          { "owner.talent.parent_category.category_id": category },
          { "owner.category.category_id": category },
        ];
      let discover_talent_posts = await Posts.aggregate([
        {
          $match: {
            owner: { $ne: context.decoded.obj._id },
            clubId: null,
            user_id: { $nin: blocked_ids },
            visibility : 0,
          },
        },
        { $match: { type: "post" } },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: "$owner" },
        match_condition,
        { $skip: offset },
        { $limit: limit },
      ]);
      await Posts.populate(discover_talent_posts, "medias.videos.song");

      //fetch the user liked posts
      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");

      for (let i = 0; i < discover_talent_posts.length; i++) {
        //fetch the user liked posts
        const found_like = user_likes_posts.findIndex((element) => {
          return element.post.equals(discover_talent_posts[i]._id);
        });
        if (found_like != -1) discover_talent_posts[i].user_liked_post = true;
        else discover_talent_posts[i].user_liked_post = false;

        findLikes(
          discover_talent_posts[i].post_comments,
          context.decoded.obj._id
        );
      }

      return shuffle(discover_talent_posts);
    },
    talentsMayIntrestsYou: async (parent, args, context, info) => {
      //map my categories ids to my
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );

      const user = await Users.findOne({ _id: context.decoded.obj._id });
      const my_categories = user.category.map(
        (category) => category.category_id
      );
      const fetched_talents = await Users.find({
        _id: { $ne: context.decoded.obj._id },
        user_id: { $nin: blocked_ids },
        $or: [{ isTalent: true, isVerified: true }],
        $or: [
          { country: context.decoded.obj.country },
          {
            "talent.parent_category.category_id": {
              $in: my_categories,
            },
          },
          {
            "talent.category_id": {
              $in: my_categories,
            },
          },
        ],
      })
        .limit(args.limit)
        .skip(args.offset);
      return fetched_talents;
    },

    searchDiscoverTalents: async (parent, args, context, info) => {
      const { limit, offset, search, filter } = args;
      //check if it's empty strings
      if (search.trim() == "") {
        return [];
      }
      // get users that i hid, blocked or blocked me
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );
      // check if the filter if for friends
      const searchFields = ["email", "fullName", "phone_number"];
      let exactFields = [];
      if (filter == "top") {
        exactFields.push("isTalent");
        args.isTalent = true;
        delete args.filter;
      }
      let friends_id = [];
      let aggregate_conditions = [];
      if (filter == "friends") {
        //fetch friends list
        const friends_lists = await axios.get(
          `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.obj.user_id}&following_status=following`
        );
        friends_id = friends_lists.data.data.map(
          (friend) => friend.to_user.user_id
        );
        return await Users.find({
          user_id: { $nin: blocked_ids },
          user_id: { $in: friends_id },
          $or: [
            { email: { $regex: search, $options: "i" } },
            { fullName: { $regex: search, $options: "i" } },
            { phone_number: { $regex: search, $options: "i" } },
          ],
        })
          .skip(offset)
          .limit(limit);
      }
      delete args.offset;
      delete args.limit;
      const Filter = findOptionsWhere(args, exactFields, searchFields);
      //console.log(friends_id);
      aggregate_conditions = [
        {
          $match: { user_id: { $nin: blocked_ids } },
          $match: { user_id: { $in: friends_id } },
          $match: Filter,
        },
        { $sort: { followers_count: -1 } },
        {
          $facet: {
            metadata: [
              { $count: "totalItems" },
              {
                $addFields: {
                  limit: limit,
                  offset: offset,
                },
              },
            ],
            channels: [{ $skip: offset }, { $limit: limit }],
          },
        },
      ];

      const result_search = await Users.aggregate(aggregate_conditions);

      return shuffle(result_search[0].channels);
    },
    searchDiscoverClubs: async (parent, args, context, info) => {
      const { offset, limit, search } = args;
      if (search.trim() == "") {
        return [];
      }
      return await Clubs.find({
        clubName: { $regex: search, $options: "i" },
      })
        .skip(offset)
        .limit(limit);
    },
    searchDiscoverHashTags: async (parent, args, context, info) => {
      const { offset, limit, search } = args;
      if (search.trim() == "") {
        return [];
      }

      return await HashTags.find({
        tag: { $regex: search, $options: "i" },
      })
        .skip(offset)
        .limit(limit);
    },

    recentSearchTalent: async (parent, args, context, info) => {
      const { offset, limit } = args;

      const fetch_recent = await RecentSearch.find({
        from: context.decoded.obj._id,
        talent: { $ne: null },
      })
        .populate("talent")
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(offset);

      return fetch_recent.map((result) => result.talent);
    },
    recentSearchClubs: async (parent, args, context, info) => {
      const { offset, limit } = args;

      const fetch_recent = await RecentSearch.find({
        from: context.decoded.obj._id,
        club: { $ne: null },
      })
        .populate("club")
        .sort({ updatedAt: -1 })

        .limit(limit)
        .skip(offset);

      return fetch_recent.map((result) => result.talent);
    },
    recentSearchEvents: async (parent, args, context, info) => {
      const { offset, limit } = args;

      const fetch_recent = await RecentSearch.find({
        from: context.decoded.obj._id,
        event: { $ne: null },
      })
        .populate("event")
        .sort({ updatedAt: -1 })

        .limit(limit)
        .skip(offset);

      return fetch_recent.map((result) => result.talent);
    },
    recentSearchHashTags: async (parent, args, context, info) => {
      const { offset, limit } = args;

      const fetch_recent = await RecentSearch.find({
        from: context.decoded.obj._id,
        hashTag: { $ne: null },
      })
        .populate("hashTag")
        .sort({ updatedAt: -1 })

        .limit(limit)
        .skip(offset);

      return fetch_recent.map((result) => result.talent);
    },
    addRecent: async (parent, args, context, info) => {
      const { talentId, hashTagId, clubId, eventId } = args;
      let item_to_add = { from: context.decoded.obj._id };
      if (talentId) item_to_add.talent = talentId;
      if (hashTagId) item_to_add.hashTag = hashTagId;
      if (clubId) item_to_add.club = clubId;
      if (eventId) item_to_add.event = eventId;
      await RecentSearch.findOneAndUpdate(item_to_add, {}, { upsert: true });
      return "done";
    },
    fetchPostsByHashTags: async (parent, args, context, info) => {
      const count = await Posts.count({
        hashTags: { $elemMatch: { $regex: `^${args.tag}$`, $options: "i" } },
      });
      /* reupdate the hashtag count to fix any problems accured */
      await HashTags.findOneAndUpdate(
        { tag: { $regex: `^${args.tag}$`, $options: "i" } },
        { posts_count: count }
      );
      let result = await Posts.find({
        draft: false,
        hashTags: { $elemMatch: { $regex: `^${args.tag}$`, $options: "i" } },
      })
        .populate("owner")
        .populate("post_likes")
        .populate("post_comments.user")
        .populate("tags")
        .populate({ path: "post_comments.likes" })
        .populate({ path: "post_comments.tags" })
        .populate({ path: "post_comments.comments_comments.user" })
        .populate({ path: "post_comments.comments_comments.likes" })
        .populate({ path: "post_comments.comments_comments.tags" })
        .populate({ path: "post_parent_id", populate: { path: "owner" } })
        .populate({ path: "medias.videos.song" })
        .populate("feechr_up_user")
        .populate({
          path: "post_parent_id",
          populate: { path: "feechr_up_user" },
        })
        .limit(args.limit)
        .skip(args.offset)
        .sort([["createdAt", -1]]);

      const user_likes_posts = await Likes.find({
        user: context.decoded.obj._id,
      }).select("post");

      for (let i = 0; i < result.length; i++) {
        result[i].hashTagsCounts = count;
        //fetch the user liked posts
        const found_like = user_likes_posts.findIndex((element) => {
          return element.post.equals(result[i]._id);
        });
        if (found_like != -1) result[i].user_liked_post = true;
        else result[i].user_liked_post = false;

        findLikes(result[i].post_comments, context.decoded.obj._id);
      }
      return result;
    },
    searchDiscoverEvents: async (parent, args, context, info) => {
      const { offset, limit, search } = args;
      return await Event.find({
        eventName: { $regex: search, $options: "i" },
      })
        .populate("owner")
        .populate("clubId")
        .skip(offset)
        .limit(limit);
    },
    refeechrEvent: async (parent, args, context, info) => {

      // check if admin blocked this user : active = "Y" means not blocked "B" means blocked
      banCheck(context.decoded.obj.active)
      
      try {
        const event_to_refeechr = {
          type: "event",
          owner: `${context.decoded.obj._id}`,
          eventId: args.eventId,
          active: true,
          visibility: 0,
        };
        const refeechrEvent = await Posts.create(event_to_refeechr);
        await Event.populate(refeechrEvent, "owner");
        await Event.populate(refeechrEvent, "eventId");
        await Event.populate(refeechrEvent, "eventId.owner");
        await Event.populate(refeechrEvent, "eventId.clubId");
        await Event.populate(refeechrEvent, "eventId.members.user_id");
        return refeechrEvent;
      } catch (err) {
        return reject(err);
      }
    },
    createHashTag: async (parent, args, context, info) => {
      const { hashTag } = args;
      for (let i = 0; i < hashTag.length; i++)
        await createOrUpdateHashTag(hashTag[i], false);
      return "hashTag created";
    },
    recentSearchDelete: async (parent, args, context, info) => {
      const { from, _id } = args;
      let query = { from: context.decoded.obj._id };
      if (from == "event") query.event = _id;
      if (from == "club") query.club = _id;
      if (from == "hashTag") query.hashTag = _id;
      if (from == "talent") query.talent = _id;
      await RecentSearch.deleteOne(query);
      return "recent deleted";
    },
    searchAll: async (parent, args, context, info) => {
      const { search, limit, offset } = args;
      /* find from user */
      // get users that i hid, blocked or blocked me
      if (search == "") return [];
      let promise_array = [];
      const hidOrBlockedUsers = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchHiddenAndBlocked`,
        { myId: context.decoded.obj.id }
      );

      let blocked_ids = hidOrBlockedUsers.data.data.map(
        (user) => user.to_user_id
      );
      console.log(blocked_ids);
      promise_array.push(
        Users.find({
          user_id: { $nin: blocked_ids },
          type: { $ne: "club" },
          $or: [
            { email: { $regex: search, $options: "i" } },
            { fullName: { $regex: search, $options: "i" } },
            { phone_number: { $regex: search, $options: "i" } },
          ],
        })
          .skip(offset)
          .limit(limit)
      );
      promise_array.push(
        Clubs.find({
          clubName: { $regex: search, $options: "i" },
        })
          .skip(offset)
          .limit(limit)
      );
      promise_array.push(
        Event.find({
          eventName: { $regex: search, $options: "i" },
        })
          .skip(offset)
          .limit(limit)
      );
      const result_promise = await Promise.all(promise_array);
      let found_users = result_promise[0];
      let found_club = result_promise[1];
      let found_event = result_promise[2];
      found_users.forEach((user) => {
        user.type = "user";
        if (user.isTalent == true && user.talent)
          user.speciality = user.talent.parent_category.categoryName;
      });
      found_club.forEach((user) => (user.type = "club"));
      found_event.forEach((user) => (user.type = "event"));
      // let found_users = await Users.find({
      //   user_id: { $nin: blocked_ids },
      //   type:{$ne:"club"},
      //   $or: [
      //     { email: { $regex: search, $options: "i" } },
      //     { fullName: { $regex: search, $options: "i" } },
      //     { phone_number: { $regex: search, $options: "i" } },
      //   ],
      // })
      //   .skip(offset)
      //   .limit(limit);
      // found_users.forEach((user)=>user.type = "user")
      // /* find from club */
      // let found_club = await Clubs.find({
      //   clubName: { $regex: search, $options: "i" },
      // })
      //   .skip(offset)
      //   .limit(limit);
      // found_club.forEach((user) => (user.type = "club"));
      // /* find from event */
      // let found_event = await Event.find({
      //   eventName: { $regex: search, $options: "i" },
      // })
      //   .skip(offset)
      //   .limit(limit);
      // found_event.forEach((user) => (user.type = "event"));
      let result_array = [...found_users, ...found_club, ...found_event];
      result_array = shuffle(result_array);
      if (result_array.length > limit) return result_array.splice(0, limit);
      else return result_array;
    },
    fetchAllRecentSearch: async (parent, args, context, info) => {
      let fetch_recent = await RecentSearch.find({
        from: context.decoded.obj._id,
      })
        .populate("event")
        .populate("club")
        .populate("hashTag")
        .populate("talent")
        .sort({ updatedAt: -1 })
        .lean();
      let result_array = [];
      console.log(fetch_recent[0]);
      fetch_recent.forEach((recent) => {
        if (
          recent.talent == null &&
          recent.club == null &&
          recent.event == null &&
          recent.hashTag == null
        )
          return;
        let new_object = {};
        if (recent.talent) new_object.type = "user";
        if (recent.club) new_object.type = "club";
        if (recent.event) new_object.type = "event";
        if (recent.hashTag) new_object.type = "hashTag";
        //new_object._id = recent._id
        new_object = {
          ...new_object,
          ...recent.event,
          ...recent.club,
          ...recent.hashTag,
          ...recent.talent,
        };
        if (new_object._id != null) result_array.push(new_object);
      });
      return result_array;
    },
    externalSharePost: async (parent, args, context, info) => {
      // fetch the post to share
      const {postId} = args
      const post = await Posts.findOne({ active: true, _id: postId }).populate("post_parent_id").populate("eventId")
      if (!post)
        throw new ApolloError("no such post exists")
      let image_to_share;
      if (post.type != "refeechr" && post.medias.videos.length !=0)
        image_to_share = config.bucket_url + post.medias.videos[0].thumbnail;
      if (post.type != "refeechr" && post.medias.images.length !=0)
        image_to_share = config.bucket_url + post.medias.images[0].file_name;;

      if ( post.type == "event" )
        image_to_share = config.bucket_url + post.eventId.eventProfileImage;

      if (post.type == "refeechr"){
        if (post.post_parent_id.medias.videos.length !=0)
          image_to_share = config.bucket_url + post.post_parent_id.medias.videos[0].thumbnail;
        if (post.post_parent_id.medias.images.length !=0)
          image_to_share = config.bucket_url + post.post_parent_id.medias.images[0].file_name;
      }

      // call the dynamic link function
      try{
        const dynamic_url = await dynamicLinkInfo(
          postId,
          "postId",
          post.description,
          image_to_share
        );
        return dynamic_url;
      }catch(err){
        throw new ApolloError(err);
      }
    }
  },
  Subscription: {
    postUpdated: {
      subscribe: (_parent, args, _context, _info) => {
        //console.log(pubsub.asyncIterator(["POST_LIKED"]));
        return pubsub.asyncIterator([args.roomId]);
      },
    },
  },
};

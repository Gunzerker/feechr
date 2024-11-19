const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
const path = require("path");
const mongoose= require("mongoose");
const { ApolloError } = require ('apollo-server-errors');
const config = require("../../config/config.json");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const uploadParams = {Bucket: "digit-u-media-resources", Key: '', Body: ''};
const { v4: uuidv4 } = require('uuid')
const mime = require('mime');
const { addResolveFunctionsToSchema } = require("apollo-server-express");
const axios = require("axios");
const Pusher = require("pusher");
const Users = require("../../models/Users")
const DisableNotification = require("../../models/DisableNotification")
const Posts = require("../../models/Posts");
const Clubs = require("../../models/Clubs");
const Event = require("../../models/event");
const Notification = require("../../models/Notification");
const SubPost = require("../../models/subToPost")


const pusher = new Pusher({
  appId: config.pusher_appId,
  key: config.pusher_key,
  secret: config.pusher_secret,
  cluster: config.pusher_cluster,
  useTLS: config.pusher_useTLS,
});


module.exports = {
  Query: {
    fetchCurrentSetting: async (parent, args, context, info) => {
      return await Users.findOne({ _id: context.decoded.obj._id });
    },

  },
  Mutation: {
    updateUserNotificationStatus: async (parent, args, context, info) => {
      const { update } = args;
      console.log(context.decoded.obj._id);
      await Users.findOneAndUpdate({ _id: context.decoded.obj._id }, update);
      return "updated ";
    },
    disableNotificationPost: async (parent, args, context, info) => {
      const { postId } = args;
      await DisableNotification.findOneAndUpdate(
        { user: context.decoded.obj._id, post: postId },
        {},
        { upsert: true }
      );
      return "notification disabled";
    },
    enableNotificationPost: async (parent, args, context, info) => {
      const { postId } = args;
      await DisableNotification.deleteOne({
        user: context.decoded.obj._id,
        post: postId,
      });
      return "notification enabled";
    },
    fetchMyNotifications: async (parent, args, context, info) => {
      const { limit, offset, filter } = args;
      // handle the filters tags
      const likes_tags = ["LIKE_POST", "LIKE_COMMENT", "LIKE_POST_SUB"];
      const comments_tags = [
        "COMMENT_POST",
        "REPLAY_COMMENT",
        "COMMENT_POST_SUB",
      ];
      const mentions_tags = ["TAG_POST"];
      const followers_tags = [
        "PUBLIC_FOLLOW_REQUEST",
        "PRIVATE_FOLLOW_REQUEST",
        "ACCEPT_FOLLOW",
      ];
      const clubs_tags = [
        "INVITATION_CLUB",
        "RFEECHER_POST_CLUB",
        "MODERATOR_INVITATION_CLUB",
        "ADMIN_INVITATION_CLUB",
        "OWNER_INVITATION_CLUB",
        "MEMBER_INVITATION_CLUB",
        "ACCEPT_JOIN_CLUB",
        "POST_CREATION_CLUB",
        "LEFT_CLUB",
        "MEMBER_REACHED",
        "POST_CLUB_APPROVEL",
        "POST_CLUB_PENDING",
      ];
      const events_tags = [
        "INVITATION_EVENT",
        "CANCELED_EVENT",
        "EVENT_CREATION",
        "ATTENDING_EVENT",
      ];
      const followers_requests = ["PRIVATE_FOLLOW_REQUEST"];
      /* fetch the count of unread messages */
      const fetch_unread_messages = await axios.post(
        `${config.messaging_service_url}/api/messaging/count_unread_message`,
        { current_user_id: context.decoded.obj._id }
      );
      if (filter[0] == "all") {
        // get the total count
        const count = await Notification.countDocuments({
          to_user: context.decoded.obj._id,
          tag: {
            $nin: [
              "MESSAGE_MEDIA",
              "MESSAGE_TEXT",
              "MESSAGE_POST",
              "MESSAGE_REACTION",
            ],
          },
          readStatus: { $eq: false },
        });
        let result = await Notification.find({
          tag: {
            $nin: [
              "MESSAGE_MEDIA",
              "MESSAGE_TEXT",
              "MESSAGE_POST",
              "MESSAGE_REACTION",
            ],
          },
          to_user: context.decoded.obj._id,
        })
          .populate("from_user")
          .populate("payload.club")
          .populate("payload.post")
          .populate("payload.event")
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(offset);
        for (notification of result) {
          await Posts.populate(notification, "payload.post.post_parent_id");
          notification.unread_count = count;
          notification.unread_message_count = fetch_unread_messages.data.data;
          if (notification.tag == "CANCELED_EVENT"){
            const dumy_event = new Event({
              eventName: notification.payload.eventName,
            });
            notification.payload.event = dumy_event;
          }
        }
        return result;
      }
      // prepare the filters if not all
      let tags_filter = [];
      for (filters of filter) {
        if (filters == "likes") tags_filter = [...tags_filter, ...likes_tags];
        if (filters == "comments")
          tags_filter = [...tags_filter, ...comments_tags];
        if (filters == "mentions")
          tags_filter = [...tags_filter, ...mentions_tags];
        if (filters == "followers")
          tags_filter = [...tags_filter, ...followers_tags];
        if (filters == "clubs") tags_filter = [...tags_filter, ...clubs_tags];
        if (filters == "events") tags_filter = [...tags_filter, ...events_tags];
        if (filters == "follow_request")
          tags_filter = [...tags_filter, ...followers_requests];
      }
      // get the total count
      const count = await Notification.countDocuments({
        to_user: context.decoded.obj._id,
        tag: { $in: tags_filter },
        readStatus: false,
      });
      console.log(count);
      let result = await Notification.find({
        to_user: context.decoded.obj._id,
        tag: { $in: tags_filter },
      })
        .populate("from_user")
        .populate("to_user")
        .populate("payload.club")
        .populate("payload.post")
        .populate("payload.event")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      for (notification of result) {
        await Posts.populate(notification, "payload.post.post_parent_id");
        notification.unread_count = count;
        notification.unread_message_count = fetch_unread_messages.data.data;
      }
      return result;
    },
    updateFireBaseToken: async (parent, args, context, info) => {
      const { firebaseToken } = args;
      /* update the requested user firebase token */
      await Users.findOneAndUpdate(
        { _id: context.decoded.obj._id },
        { firebasetoken: firebaseToken }
      );
      return "token updated";
    },
    subToPostOrUser: async (parent, args, context, info) => {
      const { postId, userId, clubId } = args;
      await SubPost.findOneAndUpdate(
        {
          user: context.decoded.obj._id,
          post: postId,
          user_profile: userId,
          club: clubId,
        },
        {},
        { upsert: true }
      );
      return "subbed to post successfully";
    },
    unsubToPostOrUser: async (parent, args, context, info) => {
      const { postId, userId, clubId } = args;
      await SubPost.deleteOne({
        user: context.decoded.obj._id,
        post: postId,
        user_profile: userId,
        club: clubId,
      });
      return "unsubbed from post successfully";
    },
    deleteNotification: async (parent, args, context, info) => {
      const { notificationId } = args;
      await Notification.deleteOne({ _id: notificationId });
      return "notification deleted";
    },
    updateReadNotification: async (parent, args, context, info) => {
      const { notificationId } = args;
      await Notification.findOneAndUpdate(
        { _id: notificationId },
        { readStatus: true },
        {timestamps:false}
      );
      // await Notification.updateMany({}, { readStatus :false});
      return "notification updated";
    },
    updateNewNotification: async (parent, args, context, info) => {
      await Users.findOneAndUpdate(
        { _id: context.decoded.obj._id },
        { newNotification:args.status }
      );
      return args.status
    },
  },
};
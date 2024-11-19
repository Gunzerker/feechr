const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();
const path = require("path");
const Channels = require ('../../models/Channels');
const Messages = require ('../../models/Messages')
const mongoose= require("mongoose");
const { ApolloError } = require ('apollo-server-errors');
const config = require("../../config/config.json");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const uploadParams = {Bucket: "digit-u-media-resources", Key: '', Body: ''};
const { v4: uuidv4 } = require('uuid')
const mime = require('mime');
const SavePosts = require ("../../models/SavedPosts");
const { addResolveFunctionsToSchema } = require("apollo-server-express");
const axios = require("axios");
const Pusher = require("pusher");
const { create } = require("../../models/Channels");

const pusher = new Pusher({
  appId: config.pusher_appId,
  key: config.pusher_key,
  secret: config.pusher_secret,
  cluster: config.pusher_cluster,
  useTLS: config.pusher_useTLS,
});


module.exports = {
  Query: {},
  Mutation: {
    sendMessage: async (parent, args, context) => {
      if (args.channelId) {
        pusher.trigger(args.channelId, "send-message", args.message);
        const new_message = await Messages.create({
          channel_id: args.channelId,
          from_user: args.toUser,
          to_user: args.toUser,
          message: args.message,
        });
        await Channels.findOneAndUpdate(
          { _id: args.channelId },
          { $inc: { messages_counts: 1 }, last_message: new_message._id }
        );
        return {
          exists: true,
          channelId: args.channelId,
        };
      }

      const new_channel = await Channels.create({
        members: [context.decoded, args.toUser],
      });
      const new_message = await Messages.create({
        channel_id: new_channel._id,
        from_user: context.decoded,
        to_user: args.toUser,
        message: args.message,
      });
      await Channels.findOneAndUpdate(
        { _id: args.channelId },
        { last_message: new_message._id }
      );

      // TODO : send notification to user
      return {
        exists: false,
        channelId: new_channel._id,
      };
    },
    fetchMessagesHistory:async (parent, args, context) => {
      const result = await Messages.find({ channel_id : args.channelId}).sort([["updatedAt", -1]]).limit(args.limit).skip(args.offset);
      return result
    },
    readMessage:async (parent, args, context) => {
      try{
        await Messages.findOneAndUpdate(
          { _id: args.messageId },
          { read_status: true }
        );
        return "Updated"
      }catch(err){
        throw new ApolloError("Internal-Server-Error", 500, {
          code: 500,
          message: err,
        });
      }
    },
    fetchMessageFromUserId:async (parent , args , context) => {
      //fetch user to user channel
      const channel = await Channels.findOne({"members.id":{"$in":[context.decoded.id,String(args.userId)]} } );
      //if no channel exists
      if (!channel){
        return  null
      }
      //fetch messages for the existants channel
      const messages = await Messages.find({channel_id:channel._id}).sort([["createdAt", -1]]).limit(args.limit).skip(args.offset);
      return messages
    },

    fetchMyChannels:async (parent , args , context) => {
      let my_channels;
      // fetch the channels that i talked in sorted
      if (args.filter == "recent" || args.filter == "all")
        my_channels = await Channels.find({ "members.id": context.decoded.id })
          .populate("last_message")
          .sort([["updatedAt", -1]])
          .limit(args.limit)
          .skip(args.offset);
      // channels with read messages
      if (args.filter == "read"){
          my_channels = await Channels.aggregate([
            {
              $match: { "members.id": context.decoded.id },
            },
            {
              $lookup: {
                from: "messages",
                localField: "last_message",
                foreignField: "_id",
                as: "last_message",
              },
            },
            {
              $match: { "last_message.read_status": true },
            },
          ]);
          await Channels.populate(my_channels, { path: "last_message" });
        }
      // channels with unread messages
      if (args.filter == "unread"){
        my_channels = await Channels.aggregate([
          {
            $match: { "members.id": context.decoded.id },
          },
          {
            $lookup: {
              from: "messages",
              localField: "last_message",
              foreignField: "_id",
              as: "last_message",
            },
          },
          {
            $match: { "last_message.read_status": false },
          },
        ]);
        await Channels.populate(my_channels, { path: "last_message" });
      }
      // channels from strangers
      /* fetch current user friends list need to be implemented with users service*/
      if (args.filter == "stranger"){
        const friends_lists = await axios.get(
          `${config.auth_service_url}api/friendRequest/find?from_user_id=${context.decoded.id}&following_status=accepted`
        );
        const fetched_friend_list = friends_lists.data.data;
        let friends_ids = [];
        for (let i = 0; i < fetched_friend_list.length; i++)
          friends_ids.push(fetched_friend_list[i].to_user.user_id);
        my_channels = await Channels.find({
          $and:[{"members.id":context.decoded.id},{"members.id":{$nin:friends_ids}}]
        }).populate("last_message");
      }
      return my_channels;
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


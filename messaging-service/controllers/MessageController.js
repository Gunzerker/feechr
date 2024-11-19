const Messages = require("../models/Messages");
const Channels = require("../models/Channels");
const BlockedChannels = require("../models/BlockedChannels");

const Posts = require("../models/Posts");
const users = require("../models/Users");
const mime = require("mime");
const axios = require("axios");

const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  apiVersion: "2010-12-01",
  accessKeyId: "AKIAXMX22L756ZSFDO6P",
  secretAccessKey: "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",
});
const mongoose = require("mongoose");
const { pusher } = require("../helpers/PusherServer");
const Efile = require("../models/Efile");
const DeletedChannels = require("../models/DeletedChannels");
const deletedConversation = require("../models/deletedConversation");

const config = require('../config/config.json')

exports.createNewMessage = async (req, res, next) => {
  try {
    const current_channel = req.channel;
    const current_user = req.user;

    // console.log("Req.CHANNEL FROM CREATE MESSAGE", req.channel);
    // console.log(req.user, "IM USER ");
    if (
      current_channel?.creator.toString() !== current_user._id.toString() &&
      current_channel?.friends === false
    )
      await Channels.findOneAndUpdate(
        { _id: current_channel._id },
        { friends: true }
      );
    let files = [];
    let newMessage = req.body;
    newMessage.channel_id = req.channel._id;
    if (!req.body.from) newMessage.from = req.user._id;

    if (newMessage?.medias?.length > 0) {
      newMessage.medias.map(async (x) => {
        files.push({
          path: x,
          mimeType: mime.getType(x),
          audioMetrics: newMessage?.audioMetrics,
        });
        await checkMessageMedias(x);
      });
    }
    newMessage.medias = files;
    // console.log("SHARED MEDUIA ", files, newMessage);

    const message = await Messages.create(newMessage);
    await Messages.populate(message, { path: "from" });
    let returnedMsg = {
      _id: message._id,
      channel_id: message.channel_id,
      parent_id: message.parent_id,
      text: message.text,
      postId: message.postId,
      from: message.from,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      medias: files,
    };

    const otherSide = current_channel?.members.find(
      (x) => x.toString() !== req.user._id.toString()
    );
    // console.log("otherSide ______________________________________", otherSide);
    // console.log(req.user._id, "IM USER ");

    const myProfil = await users.findOne({
      _id: req.user._id
    }).lean()

    let userFormatted = {}
    userFormatted.user_id = myProfil.user_id;
    userFormatted._id = myProfil._id;
    userFormatted.fullName = myProfil.fullName;
    userFormatted.location = myProfil.location;
    userFormatted.category = myProfil.category;
    userFormatted.cover_image = myProfil.cover_image;
    userFormatted.profile_image = myProfil.profile_image;

    if (newMessage.medias.length > 0) {
      // "MESSAGE_MEDIA",
      // "MESSAGE_TEXT",
      // "MESSAGE_POST",
      // "MESSAGE_REACTION"
      await axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "message",
          from_user: req.user._id,
          to_user: otherSide,
          tag: "MESSAGE_MEDIA",
          payload: { user: userFormatted, channel_id: returnedMsg.channel_id },
        }
      );
    } else if (req.body.text) {
      await axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "message",
          from_user: req.user._id,
          to_user: otherSide,
          tag: "MESSAGE_TEXT",
          payload: { user: userFormatted, channel_id: returnedMsg.channel_id },
        }
      );
    } else if (req.body.postId) {
      await axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "message",
          from_user: req.user._id,
          to_user: otherSide,
          tag: "MESSAGE_POST",
          payload: { user: userFormatted, channel_id: returnedMsg.channel_id },
        }
      );
    }

    await DeletedChannels.deleteMany({
      channel_id: current_channel._id,
    });

    req.message = returnedMsg;
    next();
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_NEW_MESSAGE",
    });
  }
};

exports.createNewMessageMultiple = async (req, res, next) => {
  try {
    const current_user = req.user;
    req.message = [];
    for (let i = 0; i < req.channel.length; i++) {
      const current_channel = req.channel[i]

      // console.log("Req.CHANNEL FROM CREATE MESSAGE", req.channel);
      // console.log(req.user, "IM USER ");
      if (
        current_channel?.creator.toString() !== current_user._id.toString() &&
        current_channel?.friends === false
      )
        await Channels.findOneAndUpdate(
          { _id: current_channel._id },
          { friends: true }
        );
      let files = [];
      let newMessage = req.body;
      newMessage.channel_id = current_channel._id;
      newMessage.isChallenge = true;
      if (!req.body.from) newMessage.from = req.user._id;

      if (newMessage?.medias?.length > 0) {
        newMessage.medias.map(async (x) => {
          files.push({
            path: x,
            mimeType: mime.getType(x),
            audioMetrics: newMessage?.audioMetrics,
          });
          await checkMessageMedias(x);
        });
      }
      newMessage.medias = files;
      // console.log("SHARED MEDUIA ", files, newMessage);

      const message = await Messages.create(newMessage);
      await Messages.populate(message, { path: "from" });
      let returnedMsg = {
        _id: message._id,
        channel_id: message.channel_id,
        parent_id: message.parent_id,
        text: message.text,
        postId: message.postId,
        from: message.from,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        medias: files,
      };

      const otherSide = current_channel?.members.find(
        (x) => x.toString() !== req.user._id.toString()
      );
      // console.log("otherSide ______________________________________", otherSide);
      // console.log(req.user._id, "IM USER ");

      const myProfil = await users.findOne({
        _id: req.user._id
      }).lean()

      let userFormatted = {}
      userFormatted.user_id = myProfil.user_id;
      userFormatted._id = myProfil._id;
      userFormatted.fullName = myProfil.fullName;
      userFormatted.location = myProfil.location;
      userFormatted.category = myProfil.category;
      userFormatted.cover_image = myProfil.cover_image;
      userFormatted.profile_image = myProfil.profile_image;

      if (newMessage.medias.length > 0) {
        // "MESSAGE_MEDIA",
        // "MESSAGE_TEXT",
        // "MESSAGE_POST",
        // "MESSAGE_REACTION"
        await axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "message",
            from_user: req.user._id,
            to_user: otherSide,
            tag: "MESSAGE_MEDIA",
            payload: { user: userFormatted, channel_id: returnedMsg.channel_id },
          }
        );
      } else if (req.body.text) {
        await axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "message",
            from_user: req.user._id,
            to_user: otherSide,
            tag: "MESSAGE_TEXT",
            payload: { user: userFormatted, channel_id: returnedMsg.channel_id },
          }
        );
      } else if (req.body.postId) {
        await axios.post(
          `${config.notification_service_url}api/notifications/sendToUser`,
          {
            origin: "message",
            from_user: req.user._id,
            to_user: otherSide,
            tag: "MESSAGE_POST",
            payload: { user: userFormatted, channel_id: returnedMsg.channel_id },
          }
        );
      }

      await DeletedChannels.deleteMany({
        channel_id: current_channel._id,
      });

      req.message.push(returnedMsg);
    }
    next();
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_NEW_MESSAGE",
    });
  }
};

exports.getAllMessageByChannel = async (req, res, next) => {
  try {
    console.log("PARAMS", req.params);
    const { _id, members } = req.channel;
    let option = {          channel_id: mongoose.Types.ObjectId(_id),
    };
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const otherSide = members.find(
      (x) => x.toString() !== req.user._id.toString()
    );
    const blocking = await BlockedChannels.findOne({
      channel_id: _id,
      user_id: req.user._id,
    });
    const blocked = await BlockedChannels.findOne({
      channel_id: _id,
      user_id: otherSide,
    });
    const deleteConversation = await deletedConversation.findOne({
      user_id: req.user._id,
      channel_id: _id
    })
    
    if (deleteConversation) {
      console.log("here 1");
      option.createdAt = {
        $gt: new Date(deleteConversation.updatedAt)
      }
    } 

    console.log("BLOACKED BLOCKING :: ", blocking, blocked);
    let messages = await Messages.aggregate([
      {
        $match: option,
      },
      { $sort: { updatedAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "from",
        },
      },
      { $unwind: "$from" },
      {
        $lookup: {
          from: "messagereaders",
          localField: "_id",
          foreignField: "message_id",
          as: "readers",
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "postId",
        },
      },
      {
        $unwind: {
          path: "$postId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "postId.owner",
          foreignField: "_id",
          as: "postId.owner",
        },
      },
      {
        $unwind: {
          path: "$postId.owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "postId.post_parent_id",
          foreignField: "_id",
          as: "postId.post_parent_id",
        },
      },
      {
        $unwind: {
          path: "$postId.post_parent_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "postId.post_parent_id.owner",
          foreignField: "_id",
          as: "postId.post_parent_id.owner",
        },
      },
      {
        $unwind: {
          path: "$postId.post_parent_id.owner",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "postId.tags",
          foreignField: "_id",
          as: "postId.tags",
        },
      },
 {
        $lookup: {
          from: "posts",
          localField: "postId.post_parent_id.post_parent_id",
          foreignField: "_id",
          as: "postId.post_parent_id.post_parent_id",
        },
      },
      {
        $unwind: {
          path: "$postId.post_parent_id.post_parent_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "postId.post_parent_id.post_parent_id.owner",
          foreignField: "_id",
          as: "postId.post_parent_id.post_parent_id.owner",
        },
      },
      {
        $unwind: {
          path: "$postId.post_parent_id.post_parent_id.owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "postId.post_parent_id.post_parent_id.tags",
          foreignField: "_id",
          as: "postId.post_parent_id.post_parent_id.tags",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "postId.post_parent_id.tags",
          foreignField: "_id",
          as: "postId.post_parent_id.tags",
        },
      },
      {
        $lookup: {
          from: "emojimessages",
          localField: "_id",
          foreignField: "messageId",
          as: "emojis",
        },
      },
      ...replaysAgg,
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
          messages: [{ $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    messages[0].messages.map((x) => {
      if (!x.parent_id._id) x.parent_id = null;

      if (!x.postId._id) x.postId = null;

      if (x.postId?._id && !x.postId?.post_parent_id?._id)
        x.postId.post_parent_id = null;
      else if (x.postId?.post_parent_id?.owner)
        x.postId.post_parent_id.owner = x.postId?.post_parent_id?.owner[0];

      if (x.parent_id && !x.parent_id?.postId._id) x.parent_id.postId = null;
      if (x.parent_id?.postId?._id && !x.parent_id?.postId?.post_parent_id?._id)
        x.parent_id.postId.post_parent_id = null;
    });
    messages[0].channel_id = _id;
    messages[0].messages = messages[0].messages.reverse();
    messages[0].metadata =
      messages[0].metadata?.length === 1
        ? messages[0].metadata[0]
        : { totalItems: 0, where: req.query, offset: offset, limit: limit };
    messages[0].blocked = blocked ? true : false;
    messages[0].blocking = blocking ? true : false;
    console.log("GET MESSAGES");
    res.status(200).json({
      status: true,
      data: messages[0],
      message: "CHANNEL_MESSAGES_FETCHED_SUCCUSSFULLY",
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_FETCH_MESSAGES",
    });
  }
};
exports.NotifUsers = async (req, res, next) => {
  try {
    console.log("NOTIFI");
    const channel = req.channel;
    const members = req.members;
    const message = req.message;
    let result = await Channels.findOne({
      _id: channel._id,
    })
      .populate("members")
      .populate("last_message");
    if (result.status === "A" || result.status === "M") {
      let resultMessage = await Messages.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(message._id) } },
        {
          $lookup: {
            from: "users",
            localField: "from",
            foreignField: "_id",
            as: "from",
          },
        },
        { $unwind: { path: "$from", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "posts",
            localField: "postId",
            foreignField: "_id",
            as: "postId",
          },
        },
        {
          $unwind: {
            path: "$postId",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "postId.tags",
            foreignField: "_id",
            as: "postId.tags",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "postId.owner",
            foreignField: "_id",
            as: "postId.owner",
          },
        },
        {
          $unwind: {
            path: "$postId.owner",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "_id",
            foreignField: "postId.post_parent_id",
            as: "postId.post_parent_id",
          },
        },
        {
          $unwind: {
            path: "$postId.post_parent_id",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "postId.post_parent_id.owner",
            foreignField: "_id",
            as: "postId.post_parent_id.owner",
          },
        },
        {
          $unwind: {
            path: "$postId.post_parent_id.owner",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "postId.post_parent_id.owner",
            foreignField: "_id",
            as: "postId.post_parent_id.owner",
          },
        },
        {
          $unwind: {
            path: "$postId.post_parent_id.owner",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "postId.post_parent_id.tags",
            foreignField: "_id",
            as: "postId.post_parent_id.tags",
          },
        },
        {
          $lookup: {
            from: "messagereaders",
            localField: "_id",
            foreignField: "message_id",
            as: "readers",
          },
        },
        {
          $lookup: {
            from: "emojimessages",
            localField: "_id",
            foreignField: "messageId",
            as: "emojis",
          },
        },
        ...replaysAgg,
        // {
        //   $lookup: {
        //     from: "messages",
        //     localField: "_id",
        //     foreignField: "parent_id",
        //     as: "replays",
        //   },
        // },
      ]);
      resultMessage.map((x) => {
        if (!x.parent_id._id) x.parent_id = null;

        if (!x.postId._id) x.postId = null;
        if (x.postId?._id && !x.postId?.post_parent_id?._id)
          x.postId.post_parent_id = null;

        if (x.parent_id && !x.parent_id?.postId._id) x.parent_id.postId = null;
        if (
          x.parent_id?.postId?._id &&
          !x.parent_id?.postId?.post_parent_id?._id
        )
          x.parent_id.postId.post_parent_id = null;
        // if (!x.postId._id) x.postId = null;
        // if (x.postId?._id && !x.postId?.post_parent_id?._id)
        //   x.postId.post_parent_id = null;
      });

      members.map((x) => {
        console.log("BroadCast Channels newChannel : ", x);
        pusher.trigger(x + "", "newChannel", result);
      });
      pusher.trigger(channel._id + "", "newMessage", resultMessage[0]);
      console.log(
        "BroadCast Messages newMessage : ",
        // result,
        JSON.stringify(resultMessage)
      );
    }
    res.status(200).json({
      status: true,
      data: message,
      message: "NEW_MESSAGE_CREATED_SUCCESSFULLY",
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_MESSAGE",
    });
  }
};

exports.NotifUsersMultiple = async (req, res, next) => {
  console.log("req.members____________", req.members);
  try {
    console.log("NOTIFI");
    const channel_array = JSON.parse(JSON.stringify(req.channel))
    const members_array = JSON.parse(JSON.stringify(req.members))
    const message_array = JSON.parse(JSON.stringify(req.message))
    for (let i = 0; i < channel_array.length; i++) {
      let channel = channel_array[i];
      let members = members_array[i];
      let message = message_array[i];

      let result = await Channels.findOne({
        _id: channel._id,
      })
        .populate("members")
        .populate("last_message");
      if (result.status === "A" || result.status === "M") {
        let resultMessage = await Messages.aggregate([
          { $match: { _id: mongoose.Types.ObjectId(message._id) } },
          {
            $lookup: {
              from: "users",
              localField: "from",
              foreignField: "_id",
              as: "from",
            },
          },
          { $unwind: { path: "$from", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "posts",
              localField: "postId",
              foreignField: "_id",
              as: "postId",
            },
          },
          {
            $unwind: {
              path: "$postId",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "postId.tags",
              foreignField: "_id",
              as: "postId.tags",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "postId.owner",
              foreignField: "_id",
              as: "postId.owner",
            },
          },
          {
            $unwind: {
              path: "$postId.owner",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "posts",
              localField: "_id",
              foreignField: "postId.post_parent_id",
              as: "postId.post_parent_id",
            },
          },
          {
            $unwind: {
              path: "$postId.post_parent_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "postId.post_parent_id.owner",
              foreignField: "_id",
              as: "postId.post_parent_id.owner",
            },
          },
          {
            $unwind: {
              path: "$postId.post_parent_id.owner",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "postId.post_parent_id.owner",
              foreignField: "_id",
              as: "postId.post_parent_id.owner",
            },
          },
          {
            $unwind: {
              path: "$postId.post_parent_id.owner",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "postId.post_parent_id.tags",
              foreignField: "_id",
              as: "postId.post_parent_id.tags",
            },
          },
          {
            $lookup: {
              from: "messagereaders",
              localField: "_id",
              foreignField: "message_id",
              as: "readers",
            },
          },
          {
            $lookup: {
              from: "emojimessages",
              localField: "_id",
              foreignField: "messageId",
              as: "emojis",
            },
          },
          ...replaysAgg,
          // {
          //   $lookup: {
          //     from: "messages",
          //     localField: "_id",
          //     foreignField: "parent_id",
          //     as: "replays",
          //   },
          // },
        ]);
        resultMessage.map((x) => {
          if (!x.parent_id._id) x.parent_id = null;

          if (!x.postId._id) x.postId = null;
          if (x.postId?._id && !x.postId?.post_parent_id?._id)
            x.postId.post_parent_id = null;

          if (x.parent_id && !x.parent_id?.postId._id) x.parent_id.postId = null;
          if (
            x.parent_id?.postId?._id &&
            !x.parent_id?.postId?.post_parent_id?._id
          )
            x.parent_id.postId.post_parent_id = null;
          // if (!x.postId._id) x.postId = null;
          // if (x.postId?._id && !x.postId?.post_parent_id?._id)
          //   x.postId.post_parent_id = null;
        });

        members.map((x) => {
          console.log("BroadCast Channels newChannel : ", x);
          pusher.trigger(x + "", "newChannel", result);
        });
        pusher.trigger(channel._id + "", "newMessage", resultMessage[0]);
        console.log(
          "BroadCast Messages newMessage : ",
          // result,
          JSON.stringify(resultMessage)
        );
      }
      return res.status(200).json({
        status: true,
        data: message,
        message: "NEW_MESSAGE_CREATED_SUCCESSFULLY",
      });
    }


  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_MESSAGE",
    });
  }
};
exports.forwardMessage = async (req, res, next) => {
  try {
    const user = req.user;
    const channel = req.channel;
    const { message_id } = req.body;

    let forwarded_message = await Messages.findOne({
      _id: message_id,
    });

    let newMM = {
      text: forwarded_message?.text,
      channel_id: channel._id,
      from: user._id,
      medias: forwarded_message?.medias,
      postId: forwarded_message?.postId,
      forward: true,
    };

    const newMessage = await Messages.create(newMM);

    req.message = newMessage;
    next();
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_FORWORD_MESSAGE",
    });
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { message_id } = req.body;
    const find_channel = await Messages.findOne({ _id: message_id })
    console.log("find_channel", find_channel);
    await Messages.findOneAndUpdate({ _id: message_id }, { status: "d" });
    pusher.trigger(find_channel.channel_id + "", "deleteMessage", message_id);
    // fetch the latest messages and update the channel
    const latest_message = await Messages.findOne({ channel_id: find_channel.channel_id }).sort({ createdAt: -1 }).limit(1)
    // update the channel with the latest message
    await Channels.findOneAndUpdate({ _id: find_channel.channel_id }, { last_message: mongoose.Types.ObjectId(latest_message._id) })
    res.status(200).json({
      status: true,
      data: "message deleted succussfully",
      message: "MESSAGES_DELETED_SUCCUSSFULLY",
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: "fail to delete message",
      message: "FAIL_TO_DELETE_MESSAGES",
    });
  }
};

const checkMessageMedias = (key) => {
  console.log(key);
  var params = {
    Bucket: "digit-u-media-resources",
    GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers",
    Key: `public/${key}`,
  };
  s3.putObjectAcl(params, function (err, data) {
    if (err) console.log(err, err.stack);
    // an error occurred
    else console.log(data);
  });
};

const replaysAgg = [
  {
    $lookup: {
      from: "messages",
      localField: "parent_id",
      foreignField: "_id",
      as: "parent_id",
    },
  },
  {
    $unwind: {
      path: "$parent_id",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "parent_id.from",
      foreignField: "_id",
      as: "parent_id.from",
    },
  },
  { $unwind: { path: "$parent_id.from", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "posts",
      localField: "parent_id.postId",
      foreignField: "_id",
      as: "parent_id.postId",
    },
  },
  {
    $unwind: {
      path: "$parent_id.postId",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "parent_id.postId.owner",
      foreignField: "_id",
      as: "parent_id.postId.owner",
    },
  },
  {
    $unwind: {
      path: "$parent_id.postId.owner",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "posts",
      localField: "parent_id.postId.post_parent_id",
      foreignField: "_id",
      as: "parent_id.postId.post_parent_id",
    },
  },
  {
    $unwind: {
      path: "$parent_id.postId.post_parent_id",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "postId.post_parent_id.owner",
      foreignField: "_id",
      as: "postId.post_parent_id.owner",
    },
  },
  {
    $unwind: {
      path: "$parent_id.postId.post_parent_id.owner",
      preserveNullAndEmptyArrays: true,
    },
  },
  // {
  //   $lookup: {
  //     from: "users",
  //     localField: "parent_id.postId.post_parent_id.owner",
  //     foreignField: "_id",
  //     as: "parent_id.postId.post_parent_id.owner",
  //   },
  // },
  // {
  //   $unwind: {
  //     path: "$parent_id.postId.post_parent_id.owner",
  //     preserveNullAndEmptyArrays: true,
  //   },
  // },
  {
    $lookup: {
      from: "messagereaders",
      localField: "_id",
      foreignField: "parent_id.message_id",
      as: "parent_id.readers",
    },
  },
  {
    $lookup: {
      from: "emojimessages",
      localField: "_id",
      foreignField: "parent_id.messageId",
      as: "parent_id.emojis",
    },
  },
];

const Channels = require("../models/Channels");
const messageReader = require("../models/MessagesReader");
const users = require("../models/Users");
const config = require("../config/config.json");
const axios = require("axios");

const api = require("../helpers/Configaxios");
const mongoose = require("mongoose");
const { findOptionsWhere } = require("../helpers/advancedSearch");
const BlockedChannels = require("../models/BlockedChannels");
const MutedChannels = require("../models/MutedChannels");
const DeletedChannels = require("../models/DeletedChannels");
const deletedConversation = require("../models/deletedConversation");
const { pusher } = require("../helpers/PusherServer");

// const contactList = await axios.post(
//   `${config.auth_service_url}api/friendRequest/fetchUserContacts`,
//   {
//     limit: args.limit,
//     offset: args.offset,
//     user_id: context.decoded.obj.user_id
//   }
// );

const Schema = mongoose.Schema;
const searchFields = ["email", "fullName", "phone_number"];

exports.verify_channel_or_create = async (req, res, next) => {
  try {
    const { channel_id, to, to_pg_id, from , channelId } = req.body;
    const user = req.user;
    let from_user = { _id: user._id };
    let to_user = { _id: to };
    if (to_pg_id) to_user = await users.findOne({ user_id: to_pg_id });
    if (from) from_user = { _id: from };
    console.log("CREATE CHANNEL REQ BODY : ", req.body, to_user);
    console.log("CURRENT USER", user, req.headers.authorization);
    //const existChannel = await Channels.findById(channel_id);
    let Options = [];
    if (channel_id) {
      Options.push({ _id: channel_id });
    }
    if (channelId) {
      Options.push({ _id: channelId });
    }
    if (to_user && to_user._id) {
      Options.push({
        members: {
          $all: [from_user._id, to_user._id],
        },
      });
    }
    console.log(Options);
    const existChannel = await Channels.findOne({
      $or: Options,
    }).catch((e) => {
      console.log("existChannel", e);
      throw "there is some thing wrong in channel_id or from or to";
    });
    console.log("VERIFY :: ", existChannel);
    if (!existChannel) {
      console.log("CHANNEL NOT EXIST");
      const token = req.headers.authorization.split(" ")[1];
      api.setAccessToken(token);
      const user_to = await users.findOne({ _id: to_user._id });
      if (user_to) {
        console.log("USER TO :: ", user_to, to);
        const { data } = await api
          .post("friendRequest/fetchUserProfil", {
            to_user_id: user_to.user_id,
          })
          .catch((e) => {
            return { data: { data: { relation: true } } };
            //throw "checking relation betwenn users fail";
          });

        //console.log("RELATIONS :: ", data);
        const newChannel = await Channels.create({
          members: [from_user._id, to_user._id],
          creator: from_user._id,
          friends:
            data?.data?.reverse?.following_status ||
              data?.data?.relation?.following_status
              ? true
              : false,
        }).catch((e) => {
          throw "fail while creating the channel";
        });
        req.channel = newChannel;
      } else throw "some things wrong please check inputs";
    } else {
      console.log("CHANNEL EXIST");
      req.channel = existChannel;
    }
    next();
  } catch (e) {
    console.log("create channel fail :", e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_CHANNEL",
    });
  }
};
exports.verify_channel_or_create_multiple = async (req, res, next) => {
  try {
    let { channel_id, to, to_pg_id, from } = req.body;
    let to_array = JSON.parse(JSON.stringify(to))
    /* Begin fetch mongo id */

    let promise_users = []
    for (let i = 0; i < to_array.length; i++)
      promise_users.push(users.findOne({ user_id: to_array[i] }));
    const result_promise = await Promise.all(promise_users);
    to_array = []
    for (let i = 0; i < result_promise.length; i++)
      to_array.push(result_promise[i]._id);

    /* End fetch mongo id */
    req.channel = [];
    const user = req.user;
    let from_user = { _id: user._id };
    for (let i = 0; i < to_array.length; i++) {
      to = to_array[i]

      let to_user = { _id: to };
      if (to_pg_id) to_user = await users.findOne({ user_id: to_pg_id });
      if (from) from_user = { _id: from };
      console.log("CREATE CHANNEL REQ BODY : ", req.body, to_user);
      console.log("CURRENT USER", user, req.headers.authorization);
      //const existChannel = await Channels.findById(channel_id);
      let Options = [];
      if (channel_id) {
        Options.push({ _id: channel_id });
      }
      if (to_user && to_user._id) {
        Options.push({
          members: {
            $all: [from_user._id, to_user._id],
          },
        });
      }
      const existChannel = await Channels.findOne({
        $or: Options,
      }).catch((e) => {
        console.log("existChannel", e);
        throw "there is some thing wrong in channel_id or from or to";
      });
      console.log("VERIFY :: ", existChannel);
      if (!existChannel) {
        console.log("CHANNEL NOT EXIST");
        const token = req.headers.authorization.split(" ")[1];
        api.setAccessToken(token);
        const user_to = await users.findOne({ _id: to_user._id });
        if (user_to) {
          console.log("USER TO :: ", user_to, to);
          const { data } = await api
            .post("friendRequest/fetchUserProfil", {
              to_user_id: user_to.user_id,
            })
            .catch((e) => {
              return { data: { data: { relation: true } } };
              //throw "checking relation betwenn users fail";
            });

          //console.log("RELATIONS :: ", data);
          const newChannel = await Channels.create({
            members: [from_user._id, to_user._id],
            creator: from_user._id,
            friends:
              data?.data?.reverse?.following_status ||
                data?.data?.relation?.following_status
                ? true
                : false,
          }).catch((e) => {
            throw "fail while creating the channel";
          });
          req.channel.push(newChannel);
        } else throw "some things wrong please check inputs";
      } else {
        console.log("CHANNEL EXIST");
        req.channel.push(existChannel);
      }
    }
    next();
  } catch (e) {
    console.log("create channel fail :", e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_CHANNEL",
    });
  }
};

exports.getChannelsByUser = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    let current_user = { _id: req.user._id };
    if (req.query.club_user) current_user = { _id: req.query.club_user };
    const { isStranger, isRead } = req.query;
    console.log("IM CLUB USER", req.query.club_user);
    let strangers = await Channels.aggregate([
      {
        $match: {
          members: mongoose.Types.ObjectId(current_user._id),
          friends: false,
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "members",
        },
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
        $unwind: {
          path: "$last_message",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "messagereaders",
          localField: "_id",
          foreignField: "channel_id",
          as: "messagesReader",
        },
      },
      { $match: { last_message: { $exists: true } } },
      {
        $lookup: {
          from: "deletedchannels",
          localField: "_id",
          foreignField: "channel_id",
          as: "deletedchannels",
        }
      },
      {
        $match: {
          "deletedchannels.user_id": {
            $ne: mongoose.Types.ObjectId(current_user._id),
          },
        }
      },
      {
        $project: {
          _id: 1,
          members: 1,
          created_by_id: 1,
          createdAt: 1,
          updatedAt: 1,
          friends: 1,
          creator: 1,
          last_message: 1,
          unread_messages_count: {
            $size: {
              $filter: {
                input: "$messagesReader",
                as: "sum_message",
                cond: {
                  $and: [
                    { $eq: ["$$sum_message.status", false] },
                    {
                      $eq: [
                        "$$sum_message.user_id",
                        mongoose.Types.ObjectId(current_user._id),
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      { $limit: 2 },
    ]);

    let aggPipline = [];
    if (isStranger && typeof Boolean(isStranger) === "boolean") {
      console.log("IS BOOLEAN ", req.query);
      aggPipline.push({
        $match: {
          members: mongoose.Types.ObjectId(current_user._id),
          friends: isStranger === "true" ? false : true,
        },
      });
    } else {
      aggPipline.push({
        $match: {
          members: mongoose.Types.ObjectId(current_user._id),
          // status: "A",
        },
      });
    }
    /*----------------------------------*/
    aggPipline.push({
      $lookup: {
        from: "deletedchannels",
        localField: "_id",
        foreignField: "channel_id",
        as: "deletedchannels",
      },
    });
    aggPipline.push({
      $match: {
        "deletedchannels.user_id": {
          $ne: mongoose.Types.ObjectId(current_user._id),
        },
      },
    });
    // aggPipline.push({
    //   $match: {
    //     $or: [
    //       {
    //         $and: [
    //           {
    //             "deletedchannels.user_id": {
    //               $eq: mongoose.Types.ObjectId(current_user._id),
    //             },
    //           },
    //           { "deletedchannels.status": { $ne: "D" } },
    //         ],
    //       },
    //       {
    //         $and: [
    //           {
    //             "deletedchannels.user_id": {
    //               $ne: mongoose.Types.ObjectId(current_user._id),
    //             },
    //           },
    //           // { "deletedchannels.status": { $ne: "D" } },
    //         ],
    //       },
    //       { deletedchannels: { $exists: true, $type: "array", $ne: [] } },
    //     ],
    //   },
    // });
    /*------------------------------*/
    aggPipline.push({ $sort: { updatedAt: -1 } });
    aggPipline.push({
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    });
    aggPipline.push({
      $lookup: {
        from: "mutedchannels",
        localField: "_id",
        foreignField: "channel_id",
        as: "mutedchannels",
      },
    });
    aggPipline.push({
      $lookup: {
        from: "blockedchannels",
        localField: "_id",
        foreignField: "channel_id",
        as: "blockedchannels",
      },
    });

    aggPipline.push({
      $lookup: {
        from: "messages",
        localField: "last_message",
        foreignField: "_id",
        as: "last_message",
      },
    });
    aggPipline.push({
      $unwind: {
        path: "$last_message",
        preserveNullAndEmptyArrays: true,
      },
    });
    aggPipline.push({ $match: { last_message: { $exists: true } } });

    aggPipline.push({
      $lookup: {
        from: "messagereaders",
        localField: "_id",
        foreignField: "channel_id",
        as: "messagesReader",
      },
    });

    aggPipline.push({
      $project: {
        _id: 1,
        members: 1,
        created_by_id: 1,
        createdAt: 1,
        updatedAt: 1,
        friends: 1,
        status: 1,
        last_message: 1,
        mutedchannels: 1,
        blockedchannels: 1,
        deletedchannels: 1,

        unread_messages_count: {
          $size: {
            $filter: {
              input: "$messagesReader",
              as: "sum_message",
              cond: {
                $and: [
                  { $eq: ["$$sum_message.status", false] },
                  {
                    $eq: [
                      "$$sum_message.user_id",
                      mongoose.Types.ObjectId(current_user._id),
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    });

    if (isRead && typeof Boolean(isRead) === "boolean") {
      if (isRead === "false")
        aggPipline.push({ $match: { unread_messages_count: { $gt: 0 } } });
      else aggPipline.push({ $match: { unread_messages_count: { $eq: 0 } } });
    }
    aggPipline.push({
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
        mychannels: [{ $skip: offset }, { $limit: limit }],
      },
    });

    const unreadedMessage = await messageReader.countDocuments({
      user_id: current_user._id,
      status: false,
    });
    console.log("REQ QUERY ");
    let mychannels = await Channels.aggregate(aggPipline);
    mychannels[0].current_user = current_user._id;
    mychannels[0].metadata =
      mychannels[0].metadata?.length === 1
        ? mychannels[0].metadata[0]
        : { totalItems: 0, where: req.query, offset: offset, limit: limit };

    mychannels[0].mychannels = mychannels[0].mychannels?.map((x) => {
      const otherSide = x?.members.find(
        (m) => m._id.toString() !== current_user._id.toString()
      );
      x.muting = false;
      x.muted = false;
      x.blocking = false;
      x.blocked = false;
      console.log("OTHER SIDE :: ", otherSide);
      if (x.status === "M") {
        if (x.mutedchannels?.length > 0) {
          x.mutedchannels.map((mc) => {
            if (mc.user_id.toString() === current_user._id.toString())
              x.muting = true;

            if (mc.user_id.toString() === otherSide._id.toString())
              x.muted = true;
          });
        }
      }
      if (x.status === "B") {
        if (x.blockedchannels?.length > 0) {
          x.blockedchannels.map((bc) => {
            if (bc.user_id.toString() === current_user._id.toString())
              x.blocking = true;

            if (bc.user_id.toString() === otherSide._id.toString())
              x.blocked = true;
          });
        }
      }

      // if (
      //   x.deletedchannels.find(
      //     (x) => x.user_id.toString() === current_user._id.toString()
      //   )
      // ) {
      //   console.log("user deleted", x);
      // }
      //delete x.blockedchannels;
      delete x.mutedchannels;
      return x;
    });
    let response = {
      ...mychannels[0],
      total_unread_messages_count: unreadedMessage,
    };
    //if (Boolean(isStranger) === false)
    response.strangers = strangers;
    res.status(200).json({
      status: true,
      data: response,
      message: "CHANNELS_FETCHED_SUCCESSFULLY_BY_USER",
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_FETCH_CHANNELS",
    });
  }
};
exports.filterChannel = async (req, res, next) => {
  try {
    const current_user = req.user;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const Filter = findOptionsWhere(req, [], searchFields);

    const clubs = await users.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(current_user._id) } },

      {
        $lookup: {
          from: "clubmembers",
          as: "members",
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$user", mongoose.Types.ObjectId(current_user._id)],
                    },
                    { $in: ["$status", ["owner"]] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "clubs",
          localField: "members.clubId",
          foreignField: "_id",
          as: "clubs",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clubs.user_club",
          foreignField: "_id",
          as: "myclubs",
        },
      },
    ]);
    console.log("MY CLUBS ::", clubs[0].myclubs);
    //clubs[0].myclubs.map((x) => mongoose.Types.ObjectId(x._id))

    if (Object.keys(Filter).length === 0) {
      console.log("00000000000000000000000000");
      // if there is no search tag fetch the following followers
      const contactList = await axios.post(
        `${config.auth_service_url}api/friendRequest/fetchUserContacts`,
        {
          user_id: current_user.user_id
        }
      );

      let contacts = contactList.data.data;
      let contactsArray = [];
      for await (let contact of contacts) {
        contactsArray.push(contact.user_id)
      }

      const channels = await users.aggregate([
        {
          $match: { _id: { $ne: mongoose.Types.ObjectId(current_user._id) } },
        },
        {
          $match: { 'user_id': { '$in': contactsArray } },
        },
        {
          $match: {
            _id: {
              $nin: clubs[0].myclubs.map((x) => mongoose.Types.ObjectId(x._id)),
            },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "blockedchannels",
            localField: "user_id",
            foreignField: "_id",
            as: "blockedchannels",
          },
        },
        //{ $match: {blockedchannels:} },
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
      ]);
      channels[0].metadata =
        channels[0].metadata?.length === 1
          ? channels[0].metadata[0]
          : { totalItems: 0, where: req.query, offset: offset, limit: limit };
      res.status(200).json({
        status: true,
        data: channels[0],
        message: "USERS_SUCCESSFULLY_FILTRED",
      });

    } else {
      const channels = await users.aggregate([
        {
          $match: { _id: { $ne: mongoose.Types.ObjectId(current_user._id) } },
        },
        {
          $match: Filter,
        },
        {
          $match: {
            _id: {
              $nin: clubs[0].myclubs.map((x) => mongoose.Types.ObjectId(x._id)),
            },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "blockedchannels",
            localField: "user_id",
            foreignField: "_id",
            as: "blockedchannels",
          },
        },
        //{ $match: {blockedchannels:} },
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
      ]);
      channels[0].metadata =
        channels[0].metadata?.length === 1
          ? channels[0].metadata[0]
          : { totalItems: 0, where: req.query, offset: offset, limit: limit };
      res.status(200).json({
        status: true,
        data: channels[0],
        message: "USERS_SUCCESSFULLY_FILTRED",
      });
    }



  } catch (e) {
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_FILTER_CHANNELS",
    });
  }
};
exports.verify_channels_relations = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    console.log("REQ BODY RELATIONS : ", req.body);
    const sender = await users.findOne({ user_id: from });
    const reciver = await users.findOne({ user_id: to });

    const updatedChannel = await Channels.findOneAndUpdate(
      {
        members: {
          $all: [sender._id, reciver._id],
        },
      },
      { friends: true }
    ).catch((e) => {
      throw "there is some thing wrong in from or to";
    });
    res.status(200).json({
      status: true,
      data: updatedChannel,
      message: "CHANNEL_RELATIONS_SUCCESSFULLY_UPDATED",
    });
  } catch (e) {
    res.status(400).json({
      status: false,
      data: e.message,
      message: "FAIL_TO_UPDATED_CHANNEL_RELATIONS",
    });
  }
};

exports.countUnreadMessage = async (req, res, next) => {
  try {
    const { current_user_id } = req.body
    const unreadedMessage = await messageReader.countDocuments({
      user_id: current_user_id,
      status: false,
    });
    return res.status(200).json({
      status: true,
      data: unreadedMessage,
      message: "COUNT_UNREAD_MESSAGES",
    });
  } catch (e) {
    console.log("ERRORRR : ", e);
    res.status(400).json({
      status: false,
      data: e.message,
      message: "FAIL_UNREAD_MESSAGE",
    });
  }
}

exports.blockOrDeleteChannel = async (req, res, next) => {
  try {
    let current_user = { _id: req.user._id };
    if (req.body.from) {
      current_user = { _id: req.body.from };
    }
    const { tag, channel_id } = req.body;
    const current_channel = await Channels.findOne({
      _id: channel_id,
      members: current_user._id,
    });
    if (current_channel) {
      switch (tag) {
        case "A": {
          const updatedchannel = await Channels.findOneAndUpdate(
            { _id: channel_id },
            { status: "A" }
          );
          await BlockedChannels.findOneAndDelete({
            user_id: current_user._id,
            channel_id: channel_id,
          });
          res.status(200).json({
            status: true,
            data: "CHANNEL_ACTIVED_SUCCESSFULLY",
            message: "CHANNEL_ACTIVED_SUCCESSFULLY",
          });
          break;
        }
        case "D": {
          //await Channels.findOneAndDelete({ _id: channel_id });
          // const mydeletedchannel = await DeletedChannels.findOne({
          //   user_id: current_user._id,
          //   channel_id: channel_id,
          // });
          // if (mydeletedchannel) {
          //   mydeletedchannel.overwrite({
          //     user_id: current_user._id,
          //     channel_id: channel_id,
          //     status: "D",
          //   });
          //   await mydeletedchannel.save();
          // } else {
          //   await DeletedChannels.create({
          //     user_id: current_user._id,
          //     channel_id: channel_id,
          //     status: "D",
          //   });
          // }
          await DeletedChannels.findOneAndUpdate(
            {
              user_id: current_user._id,
              channel_id: channel_id,
            },
            {
              user_id: current_user._id,
              channel_id: channel_id,
            },
            { upsert: true }
          );

          // this collection is used to determine the conversation deleted time
          await deletedConversation.findOneAndUpdate(
            {
              user_id: current_user._id,
              channel_id: channel_id,
            },
            {
              user_id: current_user._id,
              channel_id: channel_id,
            },
            { upsert: true }
          );

          res.status(200).json({
            status: true,
            data: "CHANNEL_DELETED_SUCCESSFULLY",
            message: "CHANNEL_DELETED_SUCCESSFULLY",
          });
          break;
        }
        case "B": {
          const updatedChannel = await Channels.findOneAndUpdate(
            { _id: channel_id },
            { status: "B" }
          );
          const members = updatedChannel.members.filter(
            (x) => x.toString() !== current_user._id.toString()
          );
          const blockedChannel = await BlockedChannels.findOneAndUpdate(
            {
              user_id: current_user._id,
              channel_id: channel_id,
              to_user: members[0],
            },
            {
              user_id: current_user._id,
              channel_id: channel_id,
              to_user: members[0],
            },
            { upsert: true }
          );

          pusher.trigger(channel_id + "", "blockChannel", current_user._id);

          res.status(200).json({
            status: true,
            data: "CHANNEL_BLOCKED_SUCCESSFULLY",
            message: "CHANNEL_BLOCKED_SUCCESSFULLY",
          });
          break;
        }
        case "M": {
          const updatedChannel = await Channels.findOneAndUpdate(
            { _id: channel_id },
            { status: "M" }
          );
          const members = updatedChannel.members.filter(
            (x) => x.toString() !== current_user._id.toString()
          );
          await MutedChannels.findOneAndUpdate(
            {
              user_id: current_user._id,
              channel_id: channel_id,
              to_user: members[0],
            },
            {
              user_id: current_user._id,
              channel_id: channel_id,
              to_user: members[0],
            },
            { upsert: true }
          );
          res.status(200).json({
            status: true,
            data: "CHANNEL_MUTED_SUCCESSFULLY",
            message: "CHANNEL_MUTED_SUCCESSFULLY",
          });
          break;
        }
        default: {
          res.status(400).json({
            status: false,
            data: "MISSING_CHANNELID_OR_TAG",
            message: "MISSING_CHANNELID_OR_TAG",
          });
          break;
        }
      }
    } else {
      res.status(400).json({
        status: false,
        data: "CHANNEL_DOES_NOT_EXIST",
        message: "CHANNEL_DOES_NOT_EXIST",
      });
      console.log("IM CURRENT CHANNEL FAIL ");
    }
  } catch (e) {
    console.log("ERRORRR : ", e);
    res.status(400).json({
      status: false,
      data: e.message,
      message: "FAIL_TO_UPDATE_CHANNEL_STATUS",
    });
  }
};

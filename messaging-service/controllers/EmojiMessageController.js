const EmojiMessage = require("../models/EmojiMessage");
const mongoose = require("mongoose");
const { pusher } = require("../helpers/PusherServer");
const axios = require("axios");
const config = require('../config/config.json')
const Messages = require("../models/Messages");
const users = require("../models/Users");


exports.addEmojiMessage = async (req, res, next) => {
  try {
    const current_user = req.user;
    let { emoji, messageId, channelId } = req.body;
    if (!channelId)
      channelId = req.channel._id;
    console.log("req.channel "+req.channel)
    const newEmoji = await EmojiMessage.findOneAndUpdate(
      {
        messageId: messageId,
        user_id: current_user._id,
        user_auth: current_user.user_id,
      },
      { emoji: emoji },
      { upsert: true, new: true }
    );
    pusher.trigger(channelId + "", "newEmoji", newEmoji);

    const message = await Messages.findOne({
      _id: messageId
    })

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


    if (mongoose.Types.ObjectId(message.from) != mongoose.Types.ObjectId(current_user._id)) {
      await axios.post(
        `${config.notification_service_url}api/notifications/sendToUser`,
        {
          origin: "message",
          from_user: current_user._id,
          to_user: message.from,
          tag: "MESSAGE_REACTION",
          payload: { user: userFormatted, channel_id: message.channel_id, },
        }
      );
    }
    res.status(200).json({
      status: true,
      data: newEmoji,
      message: "EMOJI_ADDED_SUCCESSFULLY",
    });
  } catch (e) {
    console.log(e)
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_ADD_EMOJI",
    });
  }
};

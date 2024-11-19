const MessagesReader = require("../models/MessagesReader");
const { pusher } = require("../helpers/PusherServer");

exports.createNewMessageReader = async (req, res, next) => {
  try {
    console.log(req.user, "IM USER ");
    let current_user = { _id: req.user._id };
    if (req.body.from) {
      current_user = { _id: req.body.from };
    }
    let newMessageReader = {};
    const channel = req.channel;
    const members = channel.members.filter(
      (x) => x.toString() !== current_user._id.toString()
    );
    Promise.all(
      members.map((x) => {
        MessagesReader.create({
          user_id: x,
          channel_id: channel.id,
          message_id: req.message._id,
          status: false,
        });
      })
    );
    req.members = members;
    next();
  } catch (e) {
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_MESSAGE_READER",
    });
  }
};

exports.createNewMessageReaderMultiple = async (req, res, next) => {
  try {
    console.log(req.user, "IM USER ");
    let current_user = { _id: req.user._id };
    req.members = [];
    for (let i = 0; i < req.channel.length; i++) {


      if (req.body.from) {
        current_user = { _id: req.body.from };
      }
      let newMessageReader = {};
      const channel = req.channel[i];
      const members = channel.members.filter(
        (x) => x.toString() !== current_user._id.toString()
      );
      Promise.all(
        members.map((x) => {
          MessagesReader.create({
            user_id: x,
            channel_id: channel.id,
            message_id: req.message[i]._id,
            status: false,
          });
        })
      );
      req.members.push(members);
    }
    next();
  } catch (e) {
    res.status(400).json({
      status: false,
      data: e,
      message: "FAIL_TO_CREATE_MESSAGE_READER",
    });
  }
};

exports.UpdateMessageReader = async (req, res, next) => {
  try {
    console.log("PARAMS", req.params);
    let current_user = { _id: req.user._id };
    if (req.body.from) {
      current_user = { _id: req.body.from };
    }
    const { channelId } = req.params;

    const messages = await MessagesReader.updateMany(
      {
        user_id: current_user._id,
        channel_id: channelId,
        status: false,
      },
      { status: true }
    );
    pusher.trigger(channelId + "", "readers", current_user._id.toString());
    console.log("Hello world :: ");
    res.status(200).json({
      status: true,
      data: messages,
      message: "MESSAGES_READERS_UPDATED_SUCCUSSFULLY",
    });
  } catch (e) {
    res.status(400).json({
      status: false,
      data: e.message,
      message: "FAIL_TO_UPDATE_MESSAGEREADERS",
    });
  }
};

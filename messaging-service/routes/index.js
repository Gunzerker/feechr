const express = require("express");
const router = express.Router();
const authenticateJWT = require("../helpers/authenticateJWT");
const messageController = require("../controllers/MessageController");
const channelController = require("../controllers/ChannelController");
const messageReaderController = require("../controllers/MessageReaderController");
const messageEmojiController = require("../controllers/EmojiMessageController");
const clubsController = require("../controllers/ClubsController");
router.post(
  "/create_new_message",
  authenticateJWT,
  channelController.verify_channel_or_create,
  messageController.createNewMessage,
  messageReaderController.createNewMessageReader,
  messageController.NotifUsers
);

router.post(
  "/create_new_message_multiple",
  authenticateJWT,
  channelController.verify_channel_or_create_multiple,
  messageController.createNewMessageMultiple,
  messageReaderController.createNewMessageReaderMultiple,
  messageController.NotifUsersMultiple
);

router.post(
  "/forward_message",
  authenticateJWT,
  channelController.verify_channel_or_create,
  messageController.forwardMessage,
  messageReaderController.createNewMessageReader,
  messageController.NotifUsers
);
router.post(
  "/update_channels_relation",
  authenticateJWT,
  channelController.verify_channels_relations
);
router.post(
  "/get_messages_by_channel",
  authenticateJWT,
  channelController.verify_channel_or_create,
  messageController.getAllMessageByChannel
);
router.post(
  "/deleted_message",
  authenticateJWT,
  messageController.deleteMessage
);
router.get(
  "/get_channels_by_user",
  authenticateJWT,
  channelController.getChannelsByUser
);
router.get(
  "/filtersChannels",
  authenticateJWT,
  channelController.filterChannel
);

router.put(
  "/update_message_readers/:channelId",
  authenticateJWT,
  messageReaderController.UpdateMessageReader
);
router.put(
  "/add_message_emoji",
  authenticateJWT,
  channelController.verify_channel_or_create,
  messageEmojiController.addEmojiMessage
);
router.post(
  "/block_mute_delete_channel",
  authenticateJWT,
  channelController.blockOrDeleteChannel
);
router.get("/get_my_clubs", authenticateJWT, clubsController.getMyClubs);

router.post(
  "/count_unread_message",
  channelController.countUnreadMessage
);


module.exports = router;

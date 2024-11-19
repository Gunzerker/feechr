const admin = require("firebase-admin");
const serviceAccount = require("../config/feechr-firebase.json");
const User = require("../models/Users")
const Notification = require("../models/Notification")
const subToTopic = require("../models/subToPost")
const Clubs = require("../models/Clubs")
const Users = require("../models/Users")
const Event = require("../models/event")
const Post = require("../models/Posts")
const sendFirebase = require("../functions/sendNotification.js")
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const config = require("../config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-media-resources", Key: "", Body: "" };
const sharp = require("sharp")
const axios = require("axios");
class interestController {

  async uploadMedia(file, key) {
  return new Promise(async (resolve, reject) => {
    try {
      // Configure the file stream and obtain the upload parameters

      uploadParams.Body = file;
      uploadParams.Key = key;
      console.log(uploadParams.Key);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = "image/jpeg"; // => 'text/plain'

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve(upload.Location);
    } catch (err) {
      return reject(err);
    }
  });
}

  async compressImage(file) {
  return new Promise((resolve, reject) => {
    sharp(file)
      .resize(250 , 250)
      .jpeg({ quality: 60, force: true, mozjpeg: true })
      .toBuffer()
      .then((data) => {
        return resolve(data);
      })
      .catch((err) => { });
  });
}
  async updatePayload(from_user,payload,to_user){
    let result;
    if (payload.post) {
      // fetch the post
      const post = await Post.findOne({ _id: payload.post });
      // check if it has an image else return video thumbnail
      if (post.medias.images.length != 0) {
        payload.imagePreview = post.medias.images[0].file_name;
      }
      if (post.medias.videos.length != 0) {
        payload.imagePreview = post.medias.videos[0].thumbnail;
      }
      // fetch the image buffer with axios
      const imageResponse = await axios({
        url: `${config.bucket_url}${payload.imagePreview}`,
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(imageResponse.data, "binary");
      const compressed_buffer = await this.compressImage(buffer);
      await this.uploadMedia(compressed_buffer, `push-${payload.imagePreview}`);
      payload.imagePreview = `push-${payload.imagePreview}`;
    }
    result = await Users.findOne({ _id: from_user });
    payload.from_name = result.fullName;
    payload.user_id = result.user_id;
    if (payload.club) {
      result = await Clubs.findOne({ _id: payload.club });
      payload.club_name = result.clubName;
    }
    if (payload.event) {
      result = await Event.findOne({ _id: payload.event });
      if (result) payload.event_name = result.eventName;
    }
    console.log(payload)
    return payload;
  }
  async fetchUserFirebaseToken(to_user) {
    const user = await User.findOne({ _id: to_user });
    return user.firebasetoken;
  }
  async generateNotification(from_user, to_user, tag, origin, payload) {
    /* get the user firebasetoken */
    const to_user_token = await this.fetchUserFirebaseToken(to_user);
    await Users.findOneAndUpdate({ _id: to_user }, { newNotification :true});
    if (
      tag == "LIKE_POST" ||
      tag == "REFEECHR" ||
      tag == "LIKE_COMMENT" ||
      tag == "ACCEPT_FOLLOW"
    ) {
      // find if the notification exists
      const notification = await Notification.findOne({
        to_user,
        tag,
        origin,
        "payload.post": payload.post,
      });
      if (notification) {
        /* check if the same user else update the total count and owner */
        if (notification.from_user != from_user)
          await Notification.findOneAndUpdate(
            { _id: notification._id },
            { from_user, $inc: { users_count: 1 } }
          );
      } else {
        await Notification.create({ from_user, to_user, tag, origin, payload });
        await Notification.deleteOne({
          from_user: to_user,
          to_user: from_user,
          tag: "PRIVATE_FOLLOW_REQUEST",
        });
      }
      if (to_user_token) {
        payload = await this.updatePayload(from_user, payload, to_user);
        // from_name , club_name , event_name
        let unread_sum = 0;
        /* fetch the count of unread messages */
        const fetch_unread_messages = await axios.post(
          `${config.messaging_service_url}/api/messaging/count_unread_message`,
          { current_user_id: to_user }
        );
        unread_sum += fetch_unread_messages.data.data;

        const count = await Notification.countDocuments({
          to_user: to_user,
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

        unread_sum += count;
        console.log("unread_sum " + unread_sum);
        await sendFirebase({
          usersFireBaseTokens: [to_user_token],
          data: { tag, payload },
          unread_sum
        });
      }
      return;
    }
    if (to_user_token){
      payload = await this.updatePayload(from_user, payload);

      // from_name , club_name , event_name
      let unread_sum = 0;
      /* fetch the count of unread messages */
      const fetch_unread_messages = await axios.post(
        `${config.messaging_service_url}/api/messaging/count_unread_message`,
        { current_user_id: to_user }
      );
      unread_sum += fetch_unread_messages.data.data;

      const count = await Notification.countDocuments({
        to_user: to_user,
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

      unread_sum += count;
              console.log("unread_sum " + unread_sum);

      await sendFirebase({
        usersFireBaseTokens: [to_user_token],
        data: { tag, payload },
        unread_sum
      });
    }
    await Notification.findOneAndUpdate(
      { from_user, to_user, tag, origin, payload },
      { read_status: false, payload },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return;
  }

  async sendToUser(req, res) {
    const { from_user, to_user, tag, origin, payload } = req.body;
    // fetch the user firebase token
    const tokens = await this.fetchUserFirebaseToken(to_user);
    // generate the notification
    const generate_notification = await this.generateNotification(
      from_user,
      to_user,
      tag,
      origin,
      payload
    );
    return res.status(200).json({ success: true });
  }
  async deleteNotification(req, res) {
    const { from_user, to_user, payload, tag, origin } = req.body;
    console.log(payload);
    if (tag == "POST_CLUB_PENDING") {
      await Notification.deleteMany({
        tag,
        "payload.club": payload.club,
        "payload.post": payload.post,
      });
      return res.status(200).json({ success: true });
    }
    if (origin == "club" && tag == "CLUB_DELETED")
      await Notification.deleteMany({ "payload.club": payload.club });
    if (tag == "PRIVATE_FOLLOW_REQUEST") {
      await Notification.deleteMany({
        tag,
        from_user,
        to_user,
        origin,
      });
      return res.status(200).json({ success: true });
    } else await Notification.deleteMany({ from_user, to_user, payload });
    return res.status(200).json({ success: true });
  }

  async fetchStatus(req, res) {
    const { user_id, to_user } = req.body;
    const result = await subToTopic.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "users",
          localField: "user_profile",
          foreignField: "_id",
          as: "to_user",
        },
      },
      { $unwind: "$to_user" },
      { $match: { "user.user_id": user_id, "to_user.user_id": to_user } },
    ]);
    return res.json({ response: result });
  }
}

module.exports = interestController;

const User = require("../models/Users");
const DisableNotification = require("../models/DisableNotification")

module.exports = {
  checkIdFromPostgres: async function (req, res, next) {
    const { from_db, from_user, to_user } = req.body;
    if (from_db == "pg") {
      // find user
      let from_userToMongo = await User.findOne({
        user_id: from_user
      })
      req.body.from_user = from_userToMongo._id;

      let to_userToMongo = await User.findOne({
        user_id: to_user
      })
      req.body.to_user = to_userToMongo._id;

    }
    delete req.body.from_db
    console.log("req.body",req.body);
    return next()
  },
  checkOptions: async function (req, res, next) {
    console.log("inside middleware checkOptions")
    // check the origin
    const { from_user, to_user, origin } = req.body;
    // if self action decline it
    if (from_user == to_user) {
      return res.status(200).json({ success: true });
    }
    // fetch the user settings
    const user_settings = await User.findOne({ _id: to_user });
    if (user_settings.post_notifications != true && origin == "post")
      return res.status(200).json({ success: true });
    if (user_settings.feechrup_notifications != true && origin == "feechrup")
      return res.status(200).json({ success: true });
    if (user_settings.event_notifications != true && origin == "event")
      return res.status(200).json({ success: true });
    if (user_settings.user_notifications != true && origin == "user")
      return res.status(200).json({ success: true });
    if (user_settings.user_notifications != true && origin == "message")
      return res.status(200).json({ success: true });
    return next();
  },
  checkBlock: async function (req, res, next) {
    console.log("inside checkBlock middleware");
    // check if the user blocked notification for the post
    const { to_user, origin, payload } = req.body
    console.log()
    if (origin == "post") {
      // check database
      const check_user_block = await DisableNotification.findOne({ user: to_user, post: payload.post })
      if (check_user_block) {
        return res.status(200).json({ success: true });
      }
    }
    return next();
  }
};
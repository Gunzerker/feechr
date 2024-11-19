const Pusher = require("pusher");

exports.pusher = new Pusher({
  appId: "1282642",
  key: "584b608a1e60f0d9de08",
  secret: "420c3bc35212d48fe030",
  cluster: "eu",
  useTLS: true,
});

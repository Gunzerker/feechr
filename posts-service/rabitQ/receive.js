var amqp = require("amqplib/callback_api");
const frame = require("../video-traitement/generateFrameFromVideo")
const config = require("../config/config.json")
const axios = require("axios")
const Posts = require("../models/Posts")
const mongoose = require("mongoose");
const updatePost = require("./functions/updatePost")
const firebase_notification = require("../functions/firebase_notification")
const Pusher = require("pusher");

amqp.connect("amqp://localhost", function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(async function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = "videos";

    channel.assertQueue(queue, {
      durable: false,
    },() => {
      console.log(
        " [*] Waiting for messages in %s. To exit press CTRL+C",
        queue
      );
      channel.prefetch(10);

      channel.consume(queue, async function (msg) {
        const result = msg.content.toString();
        const returned_result = JSON.parse(result);
        let parsed_result
        let array_promise = []
        // cycle through the videos
        for (let i=0 ;i<returned_result.videos_urls.length ; i++){
          parsed_result = {
            key: returned_result.keys[i],
            url: returned_result.videos_urls[i],
            filter: returned_result.filters_urls[i],
          };
          array_promise.push(await frame(parsed_result));
        }
        try {
          const promises_result = await Promise.all(array_promise)
          for(let i=0 ;i<promises_result.length;i++){
            await updatePost(promises_result[i], returned_result , i);
          }

          pusher.trigger("my-channel", "my-event", {
            message: "postUpdated",
          });

            const user_data = await axios.get(
              `${config.auth_service_url}api/user/fetchFirebaseToken/${Number(
                returned_result.userId
              )}`
            );
            if (user_data.data) {
              console.log(user_data.data.data.firebase_token);
              // add firebase to notify the client postId, userId,
              firebase_notification(
                { postId: returned_result.postId, status: "completed" },
                user_data.data.data.firebase_token
              );
            }
          channel.ack(msg);
        } catch (err) {
          console.log(err);
        }
      });

      },
      {
        noAck: true,
      }
    );
  });
});

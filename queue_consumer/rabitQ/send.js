var amqp = require("amqplib/callback_api");

/* payload exemple : = {
    postId: "1230",
    url: "https://digit-u-media-resources.s3.eu-central-1.amazonaws.com/6cc38e74-fcc9-44c2-8150-85ca4aaac54e.mp4",
    key: "6cc38e74-fcc9-44c2-8150-85ca4aaac54e.mp4",
    userId:"",
    last : true
  } */
module.exports = function sender(payload ) {
  return new Promise ((resolve,reject)=> {
      amqp.connect("amqp://157.230.121.179", function (error0, connection) {
        if (error0) {
          throw error0;
        }
        connection.createChannel(function (error1, channel) {
          if (error1) {
            throw error1;
          }
          var queue = "videos";
          const msg = JSON.stringify(payload);
          channel.assertQueue(queue, {
            durable: false,
          });

          channel.sendToQueue(queue, Buffer.from(msg));
          console.log(" [x] Sent %s", msg);
          return resolve("done")
        });
      });
  })

};



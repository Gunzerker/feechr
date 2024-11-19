
// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
AWS.config.loadFromPath("./config/sqs_config.json");
// Set the region we will be using
// Create SQS service client
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
// Replace with your account id and the queue name you setup
// Setup the sendMessage parameter object
/* payload exemple : = {
    postId: "1230",
    url: "https://digit-u-media-resources.s3.eu-central-1.amazonaws.com/6cc38e74-fcc9-44c2-8150-85ca4aaac54e.mp4",
    key: "6cc38e74-fcc9-44c2-8150-85ca4aaac54e.mp4",
    userId:"",
    last : true
  } */
module.exports = function sender(payload ) {
  return new Promise ((resolve,reject)=> {
    const params = {
      MessageBody: JSON.stringify(payload),
      QueueUrl: `https://sqs.eu-central-1.amazonaws.com/508405899259/feechr-videos`,
    };
    sqs.sendMessage(params, (err, data) => {
      if (err) {
        console.log("Error", err);
        return reject(err)
      } else {
        console.log("Successfully added message", data.MessageId);
        return resolve("done")
      }
    });
  })

};




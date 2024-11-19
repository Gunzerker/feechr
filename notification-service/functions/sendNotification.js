const admin = require("firebase-admin");
const serviceAccount = require("../config/devfeechr-1629207731982-firebase-adminsdk-7k6gx-204dfda282.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendNotification = async ({ usersFireBaseTokens, data, unread_sum }) => {
  console.log("sending notification ...");
  console.log("badge_count " + unread_sum);
  data.payload = JSON.stringify(data.payload);
  try {
    const message = {
      data,
      notification: { title: "feechr", body: "feechr" },
      apns: {
        payload: {
          headers: {
            "apns-priority": "5",
            "apns-expiration": "1604750400",
          },
          aps: {
            "mutable-content": 1,
            badge: unread_sum,
          },
        },
      },
      token: usersFireBaseTokens[0],
    };
    const options = {
      priority: "high",
      timeToLive: 60 * 60 * 24,
      //content_available: true
    };
    admin
      .messaging()
      .send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log(response);
        console.log("Successfully sent message: ", response);
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendNotification;

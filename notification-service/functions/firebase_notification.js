var admin = require("firebase-admin");
const serviceAccount = require("../config/devfeechr-1629207731982-firebase-adminsdk-7k6gx-204dfda282.json");
const axios = require("axios")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
async function send_notification(title, body, data) {
  try {
    let message = {
      data,
    };
    const options = {
      priority: "high",
      timeToLive: 60 * 60 * 24,
    };
    let registrationToken =
      "f6fsA9x8aE4VuvtSzZ7N-G:APA91bGUCG1cfS60laWPo58yBkWx3cHXR4ZF_x6DKEzHfkBHWZ1OUWd3aTT3ATpqzgMjm-fcCQoFLzOZ_a1pDvEiCO6AmT6rTvzUDvzSACXGGLHL42LXWZKGiQk_jR9957WaMBZUbF92";
    message.notification = { title, body };

    //fetch the user token

    const send = {
      notification: { title: "feechr", body: "feechr" },
      apns: {
        payload: {
          aps: {
            "mutable-content": 1,
          },
        },
      },
      token: registrationToken,
    };
    admin
      .messaging()
      .send(send)
      .then((response) => {
        // Response is a message ID string.
        console.log(response.results);
        console.log("Successfully sent message: ", response);
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  } catch (e) {
    console.log(e);
  }
}

send_notification("test","test",{test:"test"})
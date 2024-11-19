var admin = require("firebase-admin");
var serviceAccount = require("../config/feechr-ebc42-firebase-adminsdk-9ncvy-da314cc0fe.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
 module.exports = async function send_notification(data,token) {
    try{
        let message = {
                data
        };
        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };
        let registrationToken;
        registrationToken = token
        // Send a message to the device corresponding to the provided
        // registration token.
                    admin
                    .messaging()
                    .sendToDevice(registrationToken, message, options)
                    .then((response) => {
                        // Response is a message ID string.
                        console.log(message)
                        console.log("Successfully sent message: ", response);
                    })
                    .catch((error) => {
                        console.log("Error sending message:", error);
                    });
                }catch(e){
                    console.log(e);
                }
}

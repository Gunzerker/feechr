
var admin = require("firebase-admin");
var serviceAccount = require("../config/feechr-ebc42-firebase-adminsdk-9ncvy-da314cc0fe.json");
const models = require("../models/db_init");
const firebaseModel = models["firebase"];

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
 module.exports = async function send_notification(title,body,data,user_id) {
    try{
        let message = {
                data
        };
        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };
        let registrationToken;
    message.notification={title,body};
        //fetch the user token
        const user_token = await firebaseModel.findOne({where:{user_id},raw:true})
        if(user_token)
        registrationToken = user_token.firebase_token;

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

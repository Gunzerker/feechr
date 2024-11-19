const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const sendNotification = async ({ usersFireBaseTokens, data }) => {
    try {
        const message = {
            data,
        };
        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };
        await app.messaging().sendToDevice(usersFireBaseTokens, message, options);
    } catch (error) {
        throw new InternalServerErrorException(error);
    }
};

module.exports = sendNotification;

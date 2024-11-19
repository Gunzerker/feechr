const getNotification = require("./get-notification");
const getNotifications = require("./get-notifications");
const createNotification = require("./create-notification");
const deleteNotification = require("./delete-notification");
const updateNotification = require("./update-notification");
module.exports = {
    paths: {
        "/api/notification": {
            ...createNotification,
        },
        "/api/notification/{id}": {
            ...getNotification,
            ...deleteNotification,
            ...updateNotification,
        },
        "/api/notification/all/{id}": {
            ...getNotifications,
        },
    },
};

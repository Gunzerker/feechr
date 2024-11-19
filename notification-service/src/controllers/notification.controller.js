const Notification = require("../models/notification");
const sendNotification = require("../functions/sendNotification");

const notificationType = [
    "INVITATION_CLUB",
    "RFEECHER_POST_CLUB",
    "MODERATOR_INVITATION_CLUB",
    "ACCEPT_JOIN_CLUB",
    "POST_CREATION_CLUB",
    "LEFT_CLUB",
    "MEMBER_REACHED",
    "INVITATION_EVENT",
    "CANCELED_EVENT",
    "EVENT_CREATION",
    "ATTENDING_EVENT",
    "REACHED_VIWES",
    "FEECHERED",
    "ACCEPT_CHALLENGE",
    "LIKE_POST",
    "LIKE_COMMENT",
    "COMMENT_POST",
    "REPLAY_COMMENT",
    "TAG_POST",
    "SAVE_POST",
    "CONGRATULATION",
    "OTHER_NOTIFICATION",
    "SUGGESTION",
    "HAREDFROM",
    "REFEECHR",
    "PUBLIC_FOLLOW_REQUEST",
    "PRIVATE_FOLLOW_REQUEST",
    "ACCEPT_FOLLOW",
];

const notificationController = {
    create: async (req, res) => {
        try {
            const notifications = [];
            const { usersIds, type, contentId, usersFireBaseTokens, content } = req.body;

            if (
                !(
                    usersIds &&
                    type &&
                    contentId &&
                    usersFireBaseTokens &&
                    content &&
                    notificationType.includes(type)
                )
            )
                return res.status(406).end();

            for (const userId of usersIds) {
                const notification = new Notification({
                    userId,
                    contentId,
                    content,
                    type,
                });
                notifications.push(notification);
            }

            const newNotifications = await Notification.insertMany(notifications);
            // await sendNotification(usersFireBaseTokens, content);

            return res.status(201).send(newNotifications);
        } catch (error) {
            console.log("error", error);
            return res.status(500).send(error);
        }
    },
    deleteOne: async (req, res) => {
        try {
            await Notification.findByIdAndDelete(req.params.id);
            return res.status(200).end();
        } catch (error) {
            return res.status(500).send(error);
        }
    },
    get: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id);
            return res.status(200).send(notification);
        } catch (error) {
            return res.status(500).send(error);
        }
    },
    getAll: async (req, res) => {
        const userId = req.params.id;
        const { offset, limit, type } = req.query;
        const where = type ? { userId, type } : { userId };

        try {
            const newNotifications = await Notification.find(where)
                .sort({ createdAt: "desc" })
                .limit(limit)
                .skip(offset);
            return res.status(200).send(newNotifications);
        } catch (error) {
            return res.status(500).send(error);
        }
    },
    update: async (req, res) => {
        try {
            await Notification.findByIdAndUpdate(req.params.id, { readStatus: true });
            return res.status(200).end();
        } catch (error) {
            return res.status(500).send(error);
        }
    },
};

module.exports = notificationController;

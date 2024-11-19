module.exports = {
    components: {
        schemas: {
            id: {
                type: "string",
                description: "An id of a notification",
                example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
            },
            notificationType: {
                type: "enum",
                description: "An type of a notification",
                enum: [
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
                ],
            },
            Notification: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        description: "notification's identification number",
                        example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
                    },
                    user: {
                        type: "string",
                        description: "notification's user",
                        example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
                    },
                    type: {
                        type: "enum",
                        description: "notification's type",
                        schema: {
                            $ref: "#/components/schemas/notificationType",
                        },
                        example: "REPLAY_COMMENT",
                    },
                    contentId: {
                        type: "string",
                        description: "notification's content",
                        example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
                    },
                    readStatus: {
                        type: "boolean",
                        description: "notification's status",
                        example: false,
                    },
                },
            },
            NotificationInput: {
                type: "object",
                properties: {
                    usersIds: {
                        type: "array",
                        escription: "notification's usersIds",
                        items: {
                            type: "string",
                            receive: {
                                type: "string",
                                description: "notification's user Id",
                                example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
                            },
                        },
                    },
                    usersFireBaseTokens: {
                        type: "array",
                        escription: "notification's usersFireBaseTokens",
                        items: {
                            type: "string",
                            receive: {
                                type: "string",
                                description: "notification's user FireBaseToken",
                                example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
                            },
                        },
                    },
                    type: {
                        type: "enum",
                        description: "notification's type",
                        schema: {
                            $ref: "#/components/schemas/notificationType",
                        },
                        example: "REPLAY_COMMENT",
                    },
                    content: {
                        type: "string",
                        description: "notification's content",
                        example: "REPLAY_COMMENT content",
                    },
                    contentId: {
                        type: "string",
                        description: "notification's contentId",
                        example: "1d956995-bfeb-4381-b8a7-e6fc5ed45fc2",
                    },
                },
            },
            Error: {
                type: "object",
                properties: {
                    internal_code: {
                        type: "number",
                    },
                },
            },
        },
    },
};

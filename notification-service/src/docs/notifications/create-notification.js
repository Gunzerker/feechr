module.exports = {
    post: {
        tags: ["Feecher Notifications"],
        description: "Create Notification",
        operationId: "createNotification",
        parameters: [],
        requestBody: {
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/NotificationInput",
                    },
                },
            },
        },
        responses: {
            201: {},
            500: {},
        },
    },
};

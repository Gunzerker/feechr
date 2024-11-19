module.exports = {
    delete: {
        tags: ["Feecher Notifications"],
        description: "Deleting a Notification",
        operationId: "deleteNotification",
        parameters: [
            {
                name: "id",
                in: "path",
                schema: {
                    $ref: "#/components/schemas/id",
                },
                required: true,
                description: "Deleting a done Notification",
            },
        ],
        responses: {
            200: {},
            404: {},
            500: {},
        },
    },
};

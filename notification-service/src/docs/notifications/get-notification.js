module.exports = {
    get: {
        tags: ["Feecher Notifications"],
        description: "Get a Notification",
        operationId: "getNotification",
        parameters: [
            {
                name: "id",
                in: "path",
                schema: {
                    $ref: "#/components/schemas/id",
                },
                required: true,
                description: "A single notification id",
            },
        ],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/Notification",
                        },
                    },
                },
            },
            404: {},
        },
    },
};

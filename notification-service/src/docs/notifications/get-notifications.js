module.exports = {
    get: {
        tags: ["Feecher Notifications"],
        description: "Get Notifications",
        operationId: "getNotifications",
        parameters: [
            {
                name: "id",
                in: "path",
                schema: {
                    $ref: "#/components/schemas/id",
                },
                required: true,
                description: "User Id",
            },
            {
                name: "offset",
                in: "query",
                type: "integer",
                required: false,
                description:
                    "The number of items to skip before starting to collect the result set",
            },
            {
                name: "limit",
                in: "query",
                type: "integer",
                required: false,
                description: "The numbers of items to return",
            },
            {
                name: "type",
                in: "query",
                schema: {
                    $ref: "#/components/schemas/notificationType",
                },
                required: false,
                description: "The type of notification to return",
            },
        ],

        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: {
                            items: { $ref: "#/components/schemas/Notification" },
                        },
                    },
                },
            },
            404: {},
            500: {},
        },
    },
};

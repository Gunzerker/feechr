module.exports = {
    put: {
        tags: ["Feecher Notifications"],
        description: "Update todo",
        operationId: "updateTodo",
        parameters: [
            {
                name: "id",
                in: "path",
                schema: {
                    $ref: "#/components/schemas/id",
                },
                required: true,
                description: "Id of todo to be updated",
            },
        ],
        responses: {
            200: {},
            404: {},
            500: {},
        },
    },
};

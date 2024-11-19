const { ApolloError } = require("apollo-server-errors");

const banCheck = (user) => {
    if (user !== "Y")
        throw new ApolloError("user banned", 400, {
            code: 400,
            message: "user banned",
        });

};

module.exports = banCheck;
const banCheck = (user) => {
    if (user !== "Y"){
        return "API.USER.BANNED"
        if (user !== "Y"){
            return res.status(400).send({
                status: false,
                message: "API.USER.BANNED",
                data: null,
              });
        }
    }
};

module.exports = banCheck;
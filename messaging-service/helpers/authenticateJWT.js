const jwt = require("jsonwebtoken");
const Users = require("../models/Users");
const { secret_jwt } = require("../config/config.json");
const authenticateJWT = (req, res, next) => {
  console.log("REQ BODY :: ", req.body);

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    console.log(secret_jwt, token);
    jwt.verify(token, secret_jwt, async (err, user) => {
      if (err) {
        console.log(err, "Error");
        return res.sendStatus(403);
      }
      const userMongo = await Users.findOne({
        user_id: user.obj.user_id,
      });
      console.log("USER MONGO ", userMongo);
      req.user = userMongo;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};
module.exports = authenticateJWT;

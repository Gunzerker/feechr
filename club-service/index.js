const { createServer } = require("http");
const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { graphqlUploadExpress } = require("graphql-upload");
const mongoose = require("mongoose");
const config = require("./config/config.json");
const jwt = require("jsonwebtoken");
const { ApolloError } = require("apollo-server-errors");
const User = require("./models/Users");
const Clubs = require("./models/Clubs");
const ClubMembers = require("./models/ClubMembers");

//schema
const schema = require("./graphql/schema/schema.js");

//resolver
const resolver = require("./graphql/resolvers/resolvers.js");

const PORT = process.env.PORT || 6002;

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
//app.use( graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }))
app.get("/club/:id", async (req, res) => {
  const token = req.headers.authorization || "";
  if (token == "")
    //throw new APIError({code:401,message:'Unauthaurized'})
    throw new Error("Unauthorized", 401, {
      code: 401,
      message: "Unauthorized",
    });
  const decoded = jwt.verify(token, config.secret_jwt);
  if (decoded) {
    const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
    if (mongo_user) decoded.obj._id = mongo_user._id;
  }
  /* fetch the clubs that i am member of */
  let find_club = await Clubs.findOne({
    _id: req.params.id,
  }).lean();
  /* check if the user is a member of the club */
  if (find_club) {
    find_club.user_role = null;
    const check_member = await ClubMembers.findOne({
      user: decoded.obj._id,
      clubId: req.params.id,
    });
    if (check_member) find_club.user_role = check_member.status;
  }
  console.log(find_club);
  return res.status(200).json({
    success: true,
    message: "API.POST-FETCHED",
    data: find_club,
  });
});

const apollo = new ApolloServer({
  typeDefs: schema,
  resolvers: resolver,
  subscriptions: {
    onConnect: (connectionParams, webSocket, connectionContext) => {},
  },
  formatError: (err) => ({
    code: err.extensions.code,
    message: err.extensions.message,
    details: err.message,
  }),
  context: async ({ req, connection }) => {
    if (connection) {
      return { user: "loged in" };
    }
    // Note: This example uses the `req` argument to access headers,
    // but the arguments received by `context` vary by integration.
    // This means they vary for Express, Koa, Lambda, etc.
    //
    // To find out the correct arguments for a specific integration,
    // see https://www.apollographql.com/docs/apollo-server/api/apollo-server/#middleware-specific-context-fields

    // Get the user token from the headers.
    const token = req.headers.authorization || "";
    if (token == "")
      //throw new APIError({code:401,message:'Unauthaurized'})
      throw new ApolloError("Unauthorized", 401, {
        code: 401,
        message: "Unauthorized",
      });
    const decoded = jwt.verify(token, config.secret_jwt);
    if (decoded) {
      if (decoded.role) return { decoded };
      //console.log(decoded.obj)
      const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
      if (mongo_user) decoded.obj._id = mongo_user._id;
      decoded.obj.id = decoded.obj.user_id;
      //decoded.obj._id = mongoose.Types.ObjectId("61cc75f1a27b308e34feb260");
      return { decoded };
    }
    throw new ApolloError("Unauthorized", 401, {});
  },
});

apollo.applyMiddleware({ app });

const httpServer = createServer(app);

apollo.installSubscriptionHandlers(httpServer);
httpServer.headersTimeout = 7200000;
httpServer.listen({ port: PORT }, () => {
  mongoose
    .connect("mongodb://157.230.121.179:27017/feechr", {
      auth: { authSource: "admin" },
      user: "digitu",
      pass: "Flatdev22*",
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })
    .then(async () => {
      console.log("mongodb connected");
    });

  console.log(`server ready at http://localhost:${PORT}${apollo.graphqlPath}`);
  console.log(
    `Subscriptions ready at ws://localhost:${PORT}${apollo.subscriptionsPath}`
  );
});

const { createServer } = require("http");
const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { graphqlUploadExpress } = require("graphql-upload");
const mongoose = require("mongoose");
const config = require("./config/config.json");
const jwt = require("jsonwebtoken");
const { ApolloError } = require("apollo-server-errors");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const fs = require("fs");
const schema = require("./graphql/schema/schema.js");
const resolver = require("./graphql/resolvers/resolvers.js");
const notificationRoutes = require("./routes/notification");
const bodyParser = require("body-parser");
const User = require("./models/Users");

const PORT = process.env.PORT || 6006;

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use("/api/notifications", notificationRoutes);

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
      const mongo_user = await User.findOne({ user_id: decoded.obj.user_id });
      if (mongo_user) decoded.obj._id = mongo_user._id;
      else throw new ApolloError("Unauthorized", 401, {});
      decoded.obj.id = decoded.obj.user_id;
      return { decoded };
    }
    throw new ApolloError("Unauthorized", 401, {});
  },
});

apollo.applyMiddleware({ app });

const httpServer = createServer(app);

apollo.installSubscriptionHandlers(httpServer);

httpServer.listen({ port: PORT }, () => {
  mongoose
    .connect("mongodb://157.230.121.179:27017/feecher", {
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

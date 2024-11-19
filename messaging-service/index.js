const { createServer } = require("http");
const express = require("express");
const indexRouter = require("./routes/index");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const config = require("./config/config.json");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const fs = require("fs");

const PORT = process.env.PORT || 6004;

const app = express();
app.use(express.static("public"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use("/api/messaging", indexRouter);

const httpServer = createServer(app);

httpServer.listen({ port: PORT }, () => {
  mongoose
    .connect("mongodb://157.230.121.179:27017/feecher", {
      auth: { authSource: "admin" },
      user: "digitu",
      pass: "Flatdev22*",
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: false,
    })
    .then(async () => {
      console.log("mongodb connected");
    });
  console.log(`server ready at http://localhost:${PORT}`);
});
module.exports = app;

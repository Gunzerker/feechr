require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/database");
const swaggerUI = require("swagger-ui-express");
const docs = require("./docs");
const app = express();

app.use(express.json());
app.use(cors());
connectDB();

app.use(require("./routes/index"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(docs));

const port = process.env.port;
app.listen(port, () => console.log(`server started on port ${port}`));

module.exports = app;

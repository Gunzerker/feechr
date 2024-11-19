const mongoose = require("mongoose");

require("dotenv").config();

const connectDB = () => {
    mongoose.connect(process.env.MONGODB_URI, (err) => {
        if (err) throw (err, console.log("MongoDB not Connected", err));
    });
    console.log("MongoDB  Connected");
};
module.exports = connectDB;

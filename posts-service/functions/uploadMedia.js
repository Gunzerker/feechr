const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-media-resources", Key: "", Body: "" };
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");
const fs = require ("fs")
const path = require("path");
const mongoose = require ("mongoose")

module.exports = function uploadMedia(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const { createReadStream, filename, mimetype, enconding , type } = await file;
      // Configure the file stream and obtain the upload parameters
    const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
    const uploadParams = {
      Bucket: "digit-u-media-resources",
      Key: "",
      Body: "",
    };
    var fs = require("fs");
    var fileStream = fs.createReadStream(file.path);
    fileStream.on("error", function (err) {
      console.log("File Error", err);
    });

    uploadParams.Body = fileStream;
    uploadParams.Key = path.basename(
      uuidv4() + "." + path.basename(file.name).split(".")[1]
    );
    uploadParams.ACL = "public-read";
    uploadParams.ContentType = file.type;

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve({
        _id: mongoose.Types.ObjectId(),
        file_name: uploadParams.Key,
        mimetype:file.type,
        url: upload.Location,
      });
    } catch (err) {
      return reject(err);
    }
  });
}

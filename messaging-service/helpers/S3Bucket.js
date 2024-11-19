"use strict";
const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");
const mime = require("mime");

exports.s3 = new AWS.S3({
  apiVersion: "2010-12-01",
  accessKeyId: "AKIAXMX22L756ZSFDO6P",
  secretAccessKey: "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",
});

// exports.uploadS3 = multer({
//   storage: multerS3({
//     s3: s3,
//     acl: "public-read",
//     bucket: "digit-u-media-resources",
//     contentType: multerS3.AUTO_CONTENT_TYPE,

//     metadata: (req, file, cb) => {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: (req, file, cb) => {
//       cb(null, Date.now().toString() + "-" + mime.getExtension(file.mimetype));
//     },
//   }),
//   // fileFilter: function (req, file, cb) {
//   //   const supportedfiletypes = ["mp3", "mpga"];
//   //   console.log(file.mimetype, mime.getExtension(file.mimetype));
//   //   if (supportedfiletypes.includes(mime.getExtension(file.mimetype))) {
//   //     return cb(null, true);
//   //   } else {
//   //     cb(new Error("Only Audio file are allowed"));
//   //   }
//   // },
// });

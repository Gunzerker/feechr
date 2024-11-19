const ffmpeg = require("fluent-ffmpeg");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("/app/config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-media-resources", Key: "", Body: "" };
const mime = require("mime");
const fs = require("fs")
const axios = require("axios")
const config = require ("/app/config/config.json");
const { reject } = require("bluebird");

function uploadMedia(path , key) {
  return new Promise(async (resolve, reject) => {
    try {
      // Configure the file stream and obtain the upload parameters
      var fileStream = fs.readFileSync(path);

      uploadParams.Body = fileStream;
      uploadParams.Key = key;
      console.log(uploadParams.Key);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = mime.getType(path); // => 'text/plain'

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve(upload.Location);
    } catch (err) {
      return reject(err);
    }
  });
}

async function applyFilterVideo (url , key , filter) {
  return new Promise((resolve,reject)=> {
     ffmpeg()
      .input(url)
      .inputOptions("-threads 3")
      .videoFilters(
        `curves=psfile=/app/video-traitement/filters/${filter}.acv`
      )
      .output("/app/video-traitement/asset/filtred-" + key)
            .outputOptions("-threads 3")
      .on("start", function (commandLine) {
      })
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        return reject(err);
      })
      .on("progress", function (progress) {
      })
      .on("end", async function () {
        console.log("done filter apply")
        let path = "/app/video-traitement/asset/filtred-" + key;
        let s3_key = "filtred-" + key;
        let returned_url = await uploadMedia(path, s3_key);
        return resolve({url:returned_url,key:s3_key , path})
      }).run()
  })
}

async function resizeVideo (url , key) {
  // resize the outputed video
  return new Promise ((resolve,reject)=> {
      ffmpeg(url)
      .inputOptions("-threads 3")
        .autopad(true)
        .size("?x1280")
        .output("/app/video-traitement/asset/resized-" + key)
              .outputOptions("-threads 3")
        .on("error", function (err) {
          console.log("An error occurred: " + err.message);
          return reject(err);

        })
        .on("progress", function (progress) {
        })
        .on("end", async function () {
          console.log("Finished processing");
          //upload to s3
          console.log("resized-key",key)
          let path = "/app/video-traitement/asset/resized-" + key;
          let s3_key = "resized-" + key;
          let returned_url = await uploadMedia(path, s3_key);
          return resolve({ url: returned_url, key: s3_key ,path });
          // get the thumbnail from the end video
        })
        .run();
  })
}

async function thumbnailVideo (path , key) {
  return new Promise ((resolve,reject)=>{
     ffmpeg(path)
              .on("filenames", function (filenames) {
                console.log("Will generate " + "thumbnail-");
              })
              .on("error", function (err) {
                console.log("An error occurred: " + err.message);
                return reject(err);
              })
              .on("end", async function () {
                console.log("Screenshots taken");
                let path =
                  "/app/video-traitement/asset/thumbnail-" + key.replace(".mp4", ".jpeg");
                let s3_key = "thumbnail-" + key.replace(".mp4", ".jpeg");
                let returned_url = await uploadMedia(path, s3_key);
                //await fs.unlinkSync(path);
                return resolve({ url: returned_url, key: s3_key, path });
              })
              .screenshots({
                timestamps: ["00:00.01"],
                filename: "thumbnail-" + key.replace(".mp4", ".jpeg"),
                folder: "/app/video-traitement/asset",
                //size:"1280x720"
              });
  })
}

module.exports = async function frame(payload) {
  return new Promise (async (resolve,reject) => {
    const { url, key, filter } = payload;
    console.log(payload)
    let result_filtred_video;
    let result_resized_video;
    let result_thumbnail_video;
    try{
      if (filter === "original") {
        result_resized_video = await resizeVideo(url, key);
        result_thumbnail_video = await thumbnailVideo(
          result_resized_video.path,
          key
        );
        fs.unlinkSync(result_resized_video.path);
        fs.unlinkSync(result_thumbnail_video.path);
      } else {
        result_resized_video = await resizeVideo(
          url,
          key
        );
        result_filtred_video = await applyFilterVideo(
          result_resized_video.path,
          key,
          filter
        );
        result_thumbnail_video = await thumbnailVideo(
          result_resized_video.path,
          key
        );

        fs.unlinkSync(result_filtred_video.path);
        fs.unlinkSync(result_resized_video.path);
        fs.unlinkSync(result_thumbnail_video.path);
      }
      return resolve({
        result_resized_video,
        result_thumbnail_video,
      });
    }catch(err){
      reject (err)
    }

})
}

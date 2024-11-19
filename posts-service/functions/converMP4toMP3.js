const ffmpeg = require("fluent-ffmpeg");
module.exports = async function generateMP3(video_url, key) {
  return new Promise(async (resolve, reject) => {
    ffmpeg()
      .input(video_url)
      .output(`/tmp/mp3-${key}.mp3`)
      .on("end", async function () {
        console.log("success");
        return resolve(`/tmp/mp3-${key}.mp3`);
      })
      .on("start", function (commandLine) {
        console.log("Spawned Ffmpeg with command: " + commandLine);
      })
      .on("error", function (er) {
        console.log("error occured: " + er.message);
      })
      .on("progress", function (progress) {
        console.log("Processing: " + progress.percent + "% done");
      })
      .run();
  });
};
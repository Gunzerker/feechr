const models = require("../models/db_init");
const EfileModel = models["efile"];
const mime = require("mime");
const fs = require("fs");
const path = require("path");
const appDir = path.dirname(require.main.filename);
const sharp = require("sharp");

exports.upload = (req, res, file) => {
  if (!req.files) {
    return ("file not exists")
  } else {
    if (req.files.length == 1)
      req.body.file_names = [req.body.file_names]

    req.files.forEach((element, i) => {
      EfileModel.create({
        origin_name: element.originalname,
        file_name: element.originalname,
        mimetype_file: element.mimetype,
        is_photo: "Y",
        is_video: "Y",
        is_attachement: "Y",
        active: "Y",
        uri:
          element.destination +
          element.filename +
          "." +
          mime.getExtension(element.mimetype),
        created_at: Date.now(),
        updated_at: Date.now(),
        file_extension: mime.getExtension(element.mimetype),
        // user_id : req.body.user_id

      }).then(row => {
        const myExtension = mime.getExtension(element.mimetype)
        if (row.efile_id) {

          const new_file_name = element.originalname;
          const fileNameVersionning = new_file_name.split('.');

          if (fileNameVersionning[1]) {

            // fichier avec extension
            const file_uri = "/public/upload/" + new_file_name;
            EfileModel.update(
              {
                file_name: new_file_name, uri: file_uri
              },
              {
                where: {
                  file_name: element.filename
                }
              }
            ).then();
            fs.rename(
              element.path,
              appDir + "/resources/efiles" + file_uri,
              function (err) { if (err) throw err; }
            )

          }
          else {
            const file_uri = "/public/upload/" + element.originalname + "." + mime.getExtension(element.mimetype);
            EfileModel.update(
              {
                file_name: element.originalname + "." + mime.getExtension(element.mimetype), uri: file_uri
              },
              {
                where: {
                  file_name: element.filename
                }
              }
            ).then();

            fs.rename(
              element.path,
              appDir + "/resources/efiles" + file_uri,
              function (err) {
                if (err) throw err;
              }
            )
          }
        }
      }).catch((error) => {
        res.status(500).json({
          status: false,
          message: "API.INTERNEL-SERVER-ERROR",
          data: error
        })
      });
    })
    var appDir = path.dirname(require.main.filename);
    res.json({
      status: true,
      messages: "File uploaded with success",
      data: null
    })
  }
};

exports.getImageByStyle = (req, res, next) => {
  EfileModel.findOne({
    where: {
      efile_id: Number(req.params.file_id)
    }
  }).then(efile => {
    if (!efile || !efile.dataValues || !efile.dataValues.uri) {
      res.status(404).send({
        status: false,
        message: "404 not found"
      });
    } else {
      const file_path = appDir + "/resources/efiles" + efile.dataValues.uri;

      if (req.params.style && false) {
        const thumb_file_path =
          appDir +
          "/resources/efiles/cache/" +
          req.params.style +
          "-" +
          efile.dataValues.file_name;

        sharp(file_path)
          .resize(null, 200)
          .toFile(thumb_file_path, (err, info) => {
            if (err) {
              return res.status(500).send({
                status: false,
                message: "Error to generate thumb"
              });
            }
          });
      } else {
        if (fs.existsSync(!path)) {
          res.status(404).send({
            status: false,
            message: "404 not found"
          });
        } else {
          res.sendFile(file_path);
        }
      }
    }
  });
};

function return_default_image(res) {
  const default_file_path =
    appDir + "/resources/efiles/public/upload/default.png";
  res.sendFile(default_file_path);
}

exports.getVideoByStyle = (req, res, next) => {
  Efile.findById(req.params.file_id).then(efile => {
    const path = appDir + "/resources/efiles/" + efile.uri;
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(path, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4"
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4"
      };
      res.writeHead(200, head);
      fs.createReadStream(path).pipe(res);
    }
  });
};

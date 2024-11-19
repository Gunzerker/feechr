const express = require("express");
const router = express.Router();
const multer = require("multer");
const EfileController = require("../controllers/efile");
const path = require("path");
global.__basedir = __dirname;
const appDir = path.dirname(require.main.filename);

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, appDir + "/resources/efiles/public/upload/");
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  }
});

const max_upload_size = 50 * 1024 * 1024;
const upload = multer({
  storage: storage,
  limits: {
    fileSize: max_upload_size
  }
});



// router.post('/uploadFile', passport.authenticate('jwt', {session: false}), upload.single('file'), EfileController.upload);

router.post("/uploadFile", upload.array("file",12), EfileController.upload);
router.get("/thumb/full/:file_id(\\d+)/", EfileController.getImageByStyle);
router.get("/thumb/:style/:file_id(\\d+)/", EfileController.getImageByStyle);
/// /api/efile/file/thum/full/1

module.exports = router;

const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const multer  = require('multer')
const mime = require('mime')
const UserController = require("../controllers/user");
const UserControllerInst = new UserController();

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads");
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now()+"."+mime.getExtension(file.mimetype));
  }
});

const max_upload_size = 50 * 1024 * 1024;
const upload = multer({
  storage: storage,
  limits: {
    fileSize: max_upload_size
  }
});

router.get("/find", (req, res) => {
  UserControllerInst.find(req, res);
});


// delete
router.delete("/delete/:id", async (req, res) => {
  UserControllerInst.delete(req, res);
});

// deleteUser
router.delete("/deleteUser", async (req, res) => {
  UserControllerInst.deleteUser(req, res);
});

// signup mail
router.post("/signUpWithMail", /* auth.optional, */(req, res) => {
  UserControllerInst.signUpWithMail(req, res);
});


// signup AppleId
router.post("/checkAccountAppleId", /* auth.optional, */(req, res) => {
  UserControllerInst.checkAccountAppleId(req, res);
});

// signup phone
router.post("/signUpWithPhone", /* auth.optional, */(req, res) => {
  UserControllerInst.signUpWithPhone(req, res);
});

// upload photo
router.post("/uploadPhotoAws", auth.required, (req, res) => {
  UserControllerInst.uploadPhotoAws(req, res);
});

//post mailDigitCheck
router.post("/resendCode", async (req, res) => {
  UserControllerInst.resendCode(req, res);
});

//post mailDigitCheck
router.post("/mailDigitCheck", async (req, res) => {
  UserControllerInst.mailDigitCheck(req, res);
});

//post phoneDigitCheck
router.post("/phoneDigitCheck", async (req, res) => {
  UserControllerInst.phoneDigitCheck(req, res);
});

//loginWithMail
router.post("/loginWithMail", auth.optional, (req, res, next) => {
  UserControllerInst.loginWithMail(req, res, next);
});

//loginWithPhone
router.post("/loginWithPhone", (req, res) => {
  UserControllerInst.loginWithPhone(req, res);
});


//loginWithAppleId
router.post("/loginWithAppleId", (req, res) => {
  UserControllerInst.loginWithAppleId(req, res);
});

//external share
router.post("/externalShareUser" , (req,res) => {
  UserControllerInst.externalShareUser(req, res);
});


//create password for mail auth
// router.post("/createPasswordForMailAuth", /* auth.optional , */(req, res, next) => {
//   UserControllerInst.createPasswordForMailAuth(req, res, next);
// });

// //create password for phone auth
// router.post("/createPasswordForPhoneAuth", /* auth.optional , */(req, res, next) => {
//   UserControllerInst.createPasswordForPhoneAuth(req, res, next);
// });

//delete
// router.delete("/delete/:id", auth.required, async (req, res) => {
//   UserControllerInst.delete(req, res);
// });

// update
// router.put("/update/:id", (req, res , next ) => {
//   //TODO pusher server here
//   UserControllerInst.update(req, res);
// });

// update
router.put("/updateUser", auth.required, upload.array('file', 12), (req, res ) => {
  //TODO pusher server here
  console.log("here")
  UserControllerInst.updateUser(req, res);
});

//post password for mail
router.post("/forgetPasswordMail", async (req, res) => {
  UserControllerInst.forgetPasswordMail(req, res);
});

//post password for phone
router.post("/forgetPasswordPhone", async (req, res) => {
  UserControllerInst.forgetPasswordPhone(req, res);
});

//post password 
router.post("/changePassword", auth.required, async (req, res) => {
  UserControllerInst.changePassword(req, res);
});

// reset password
router.post("/verifResetPasswordMail", async (req, res) => {
  UserControllerInst.verifResetPasswordMail(req, res);
});

// reset password
router.post("/verifResetPasswordPhone", async (req, res) => {
  UserControllerInst.verifResetPasswordPhone(req, res);
});

// reset password
router.post("/resetPassword", async (req, res) => {
  UserControllerInst.resetPassword(req, res);
});

// update email or phone
router.post("/updateEmailOrPhoneStep1", auth.required, async (req, res) => {
  UserControllerInst.updateEmailOrPhoneStep1(req, res);
});

// update email or phone
router.post("/updateEmailOrPhoneStep2", auth.required, async (req, res) => {
  UserControllerInst.updateEmailOrPhoneStep2(req, res);
});

// profilCountServices
router.post("/profilCountServices", async (req, res) => {
  UserControllerInst.profilCountServices(req, res);
});

// current user
router.get("/currentProfil", auth.required, async (req, res) => {
  UserControllerInst.currentProfil(req, res);
});

// complete signup
router.post("/completeAccountWithMail",upload.array('file', 12), async (req, res) => {
  //TODO pusher server here
  UserControllerInst.completeAccountWithMail(req, res);
});

// complete signup
router.post("/completeAccountWithPhone",upload.array('file', 12), async (req, res) => {
  //TODO pusher server here
  UserControllerInst.completeAccountWithPhone(req, res);
});

// fetch user categories
router.post("/findUserCategories", (req, res) => {
  UserControllerInst.customFind(req, res);
});

//insert / update firebase token
router.post('/firebaseToken',(req,res)=>{
  UserControllerInst.createUpdateToken(req,res);
})

// fetch user firebaseToken
router.get("/fetchFirebaseToken/:user_id", (req, res) => {
  UserControllerInst.fetchFirebaseToken(req, res);
});

module.exports = router;

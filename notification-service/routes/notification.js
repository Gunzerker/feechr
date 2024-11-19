const express = require("express");
const router = express.Router();
const { checkOptions, checkBlock, checkIdFromPostgres } = require("../middlewares/checkNotifSettings");
const notificationController = require("../controllers/Notifications");
const notificationControllerInst = new notificationController();

// find
router.post("/sendToUser", checkIdFromPostgres, checkOptions, checkBlock, (req, res) => {
  notificationControllerInst.sendToUser(req, res);
});
router.post(
  "/deleteNotification", checkIdFromPostgres,
  (req, res) => {
    notificationControllerInst.deleteNotification(req, res);
  }
);
//fetch sub status
router.post("/fetchSubStatus", (req, res) => {
  notificationControllerInst.fetchStatus(req, res);
});
/*
router.post("/broadcastTopic",(req,res) => {
  console.log(req.body)
  notificationControllerInst.broadCastToTopic(req, res);

})

// subscibe to user
router.post("/subscribeToUser",(req,res)=> {
  notificationControllerInst.subscribeToUser(req,res)
})

// unsubscribe from topic
router.post("/unSubscribeFromUser", (req, res) => {
  notificationControllerInst.unSubscribeFromUser(req, res);
});
*/
module.exports = router;

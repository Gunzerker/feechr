const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const FriendRequestController = require("../controllers/friendRequest");
const FriendRequestControllerInst = new FriendRequestController();

// find
router.get("/find", (req, res) => {
    FriendRequestControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    FriendRequestControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    FriendRequestControllerInst.update(req, res);
});

// post
router.post("/create", async (req, res) => {
    FriendRequestControllerInst.create(req, res);
});

// post add friend
router.post("/addFriend", auth.required, async (req, res) => {
    FriendRequestControllerInst.addFriend(req, res);
});

// post accept request
router.post("/acceptFriendRequest", auth.required, async (req, res) => {
    FriendRequestControllerInst.acceptFriendRequest(req, res);
});

// post delete request
router.post("/deleteFriendRequest",auth.required, async (req, res) => {
    FriendRequestControllerInst.deleteFriendRequest(req, res);
});

// post delete request
router.post("/cancelFriendRequest",auth.required, async (req, res) => {
    FriendRequestControllerInst.cancelFriendRequest(req, res);
});

// post unfollowe Friend
router.post("/unfollowFriend",auth.required, async (req, res) => {
    FriendRequestControllerInst.unfollowFriend(req, res);
});

// post unfollowe Friend
router.post("/deleteFollower",auth.required, async (req, res) => {
    FriendRequestControllerInst.deleteFollower(req, res);
});

// post blockUser request
router.post("/blockUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.blockUser(req, res);
});

// post blockUser request
router.get("/listBlocked",auth.required, async (req, res) => {
    FriendRequestControllerInst.listBlocked(req, res);
});

// post blockUser request
router.get("/listHid",auth.required, async (req, res) => {
    FriendRequestControllerInst.listHid(req, res);
});

// post hideUser request
router.post("/hideUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.hideUser(req, res);
});

// post unblockuser
router.post("/unblockUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.unblockUser(req, res);
});

// post unhideUser
router.post("/unhideUser",auth.required, async (req, res) => {
    FriendRequestControllerInst.unhideUser(req, res);
});

// post fetchRelation
router.post("/fetchUserProfil",auth.required, async (req, res) => {
    FriendRequestControllerInst.fetchUserProfil(req, res);
});

// post fetchRelation micro_service
router.post("/fetchUserProfil_service", async (req, res) => {
    FriendRequestControllerInst.fetchUserProfilService(req, res);
});

// post fetchRelation micro_service
router.post("/getUserProfile", async (req, res) => {
    FriendRequestControllerInst.getUserProfileBackOffice(req, res);
});

// post fetchRelation micro_service
router.post("/fetchHiddenAndBlocked", async (req, res) => {
    FriendRequestControllerInst.fetchHiddenAndBlocked(req, res);
});

// post fetchUserContacts micro_service
router.post("/fetchUserContacts", async (req, res) => {
    FriendRequestControllerInst.fetchUserContacts(req, res);
});


module.exports = router;
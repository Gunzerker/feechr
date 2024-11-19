const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const categoryController = require("../controllers/category");
const categoryControllerInst = new categoryController();

// find
router.get("/find", (req, res) => {
    console.log("here !!!");
    categoryControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    categoryControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    categoryControllerInst.update(req, res);
});

// post
router.post("/createCategory", async (req, res) => {
    categoryControllerInst.createCategory(req, res);
});

// upload photo
router.post("/uploadImageCategory", (req, res) => {
    categoryControllerInst.uploadImageCategory(req, res);
});

// upload photo
router.post("/uploadIconeCategory", (req, res) => {
    categoryControllerInst.uploadIconeCategory(req, res);
});



module.exports = router;

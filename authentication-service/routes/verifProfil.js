const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');


const verifProfilController = require("../controllers/verifProfil");
const verifProfilControllerInst = new verifProfilController();

// find
router.get("/find", (req, res) => {
    verifProfilControllerInst.find(req, res);
});

// delete
router.delete("/delete/:id", async (req, res) => {
    verifProfilControllerInst.delete(req, res);
});

// update
router.put("/update/:id", (req, res) => {
    verifProfilControllerInst.update(req, res);
});

// put
router.post("/createVerifiedProfil", auth.required, async (req, res) => {
    verifProfilControllerInst.createVerifiedProfil(req, res);
});

// post
router.put("/agreeVerificationAccount", async (req, res) => {
    verifProfilControllerInst.agreeVerificationAccount(req, res);
});




module.exports = router;

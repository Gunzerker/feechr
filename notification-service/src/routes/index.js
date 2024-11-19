const express = require("express");
const router = express.Router();

const notificationRoutes = require("./notification.route");

router.use("/api/notification/", notificationRoutes);

router.get("/api", (req, res) => {
    res.send({
        success: true,
    });
});

module.exports = router;

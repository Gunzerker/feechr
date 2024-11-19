const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');

const eventController = require("../controllers/event");
const eventControllerInst = new eventController();

// find
router.get("/fetchEventById", auth.required, (req, res) => {
    eventControllerInst.fetchEventById(req, res);
});

router.use("/apple-app-site-association", (req, res) => {
    res.send({
        "applinks": {
          "apps": [],
          "details": [
            {
              "appID": "RWJ493C52F.com.feechr.feechr",
              "paths": ["/api/events/invite/*"]
            },
          ]
        }
      });
});

module.exports = router;

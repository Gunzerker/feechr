const router = require("express").Router();
const {
    create,
    get,
    deleteOne,
    getAll,
    update,
} = require("../controllers/notification.controller");

router.post("/", create);
router.get("/all/:id", getAll);
router.get("/:id", get);
router.delete("/:id", deleteOne);
router.put("/:id", update);

module.exports = router;

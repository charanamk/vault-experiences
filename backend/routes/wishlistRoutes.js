const express = require("express");
const {
    getWishlist,
    addWishlistItem,
    removeWishlistItem,
    checkWishlist
} = require("../controllers/wishlistController");

const router = express.Router();

router.get("/status", checkWishlist);
router.get("/", getWishlist);
router.post("/", addWishlistItem);
router.delete("/:eventId", removeWishlistItem);

module.exports = router;

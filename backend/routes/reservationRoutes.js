const express = require("express");

const router = express.Router();

const {
    createReservation,
    getMyReservations
} = require("../controllers/reservationController");

router.post("/", createReservation);

router.get("/mine", getMyReservations);

module.exports = router;
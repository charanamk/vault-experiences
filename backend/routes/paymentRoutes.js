const express = require("express");
const controller = require("../controllers/paymentController");

const router = express.Router();

router.post("/mpesa/callback", controller.handleMpesaCallback);
router.post("/initiate", controller.initiatePayment);
router.get("/customer", controller.getCustomerPayments);
router.get("/customer/history", controller.getCustomerPaymentHistory);
router.get("/reference/:reference", controller.getPaymentByReference);
router.get("/reservation/:reservationId", controller.getPaymentByReservation);
router.get("/:id", controller.getPayment);
router.patch("/:id/status", controller.updatePaymentStatus);

module.exports = router;

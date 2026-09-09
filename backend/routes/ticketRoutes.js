const express = require("express");

const router = express.Router();

const {
    getTicketsByEvent,
    getTicketByReference,
    verifyTicket,
    addTicketCategory,
    updateTicketCategory,
    deleteTicketCategory
} = require("../controllers/ticketController");


/*
 * Get all ticket categories for an event
 */
router.get(
    "/event/:eventId",
    getTicketsByEvent
);


/*
 * Create a new ticket category
 */
router.post(
    "/",
    addTicketCategory
);


/*
 * Update an existing ticket category
 */
router.put(
    "/:id",
    updateTicketCategory
);


/*
 * Delete an existing ticket category
 */
router.delete(
    "/:id",
    deleteTicketCategory
);


/*
 * Get an issued ticket by its reference
 *
 * Keep this AFTER /event/:eventId so
 * "event" is not interpreted as a ticket reference.
 */
router.post(
    "/:reference/verify",
    verifyTicket
);

router.get(
    "/:reference",
    getTicketByReference
);


module.exports = router;


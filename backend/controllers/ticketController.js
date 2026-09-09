const ticketModel = require("../models/ticketModel");

async function getTicketsByEvent(req, res) {
    try {
        const { eventId } = req.params;

        if (!eventId || !eventId.trim()) {
            return res.status(400).json({
                message: "Invalid eventId"
            });
        }

        const tickets = await ticketModel.getTicketsByEvent(eventId);

        return res.json({
            eventId,
            tickets
        });

    } catch (error) {
        console.error("GET TICKETS BY EVENT:", error);

        return res.status(500).json({
            message: "Failed to load tickets"
        });
    }
}


async function getTicketByReference(req, res) {
    try {
        const { reference } = req.params;

        if (!reference || !reference.trim()) {
            return res.status(400).json({
                message: "Invalid ticket reference"
            });
        }

        const ticket = await ticketModel.getTicketByReference(reference);

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        return res.json(ticket);

    } catch (error) {
        console.error("GET TICKET:", error);

        return res.status(500).json({
            message: "Failed to load ticket"
        });
    }
}


async function addTicketCategory(req, res) {
    try {
        const {
            eventId,
            name,
            price,
            capacity,
            description
        } = req.body || {};

        if (!eventId || typeof eventId !== "string" || !eventId.trim()) {
            return res.status(400).json({
                message: "Invalid eventId"
            });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Invalid ticket name"
            });
        }

        const ticketPrice = Number(price) || 0;
        const ticketCapacity = Number(capacity);

        if (ticketPrice < 0) {
            return res.status(400).json({
                message: "Ticket price cannot be negative"
            });
        }

        if (!Number.isInteger(ticketCapacity) || ticketCapacity < 1) {
            return res.status(400).json({
                message: "Invalid ticket capacity"
            });
        }

        const ticket = await ticketModel.createTicket({
            event_id: eventId.trim(),
            name: name.trim(),
            price: ticketPrice,
            capacity: ticketCapacity,
            description: description
                ? String(description).trim()
                : null
        });

        return res.status(201).json(ticket);

    } catch (error) {
        console.error("ADD TICKET CATEGORY:", error);

        return res.status(500).json({
            message: "Failed to add ticket"
        });
    }
}


async function updateTicketCategory(req, res) {
    try {
        const { id } = req.params;

        const {
            name,
            price,
            capacity,
            description
        } = req.body || {};

        if (!id) {
            return res.status(400).json({
                message: "Invalid ticket id"
            });
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Invalid ticket name"
            });
        }

        const ticketPrice = Number(price) || 0;
        const ticketCapacity = Number(capacity);

        if (ticketPrice < 0) {
            return res.status(400).json({
                message: "Ticket price cannot be negative"
            });
        }

        if (!Number.isInteger(ticketCapacity) || ticketCapacity < 1) {
            return res.status(400).json({
                message: "Invalid ticket capacity"
            });
        }

        const ticket = await ticketModel.updateTicket(
            id,
            {
                name: name.trim(),
                price: ticketPrice,
                capacity: ticketCapacity,
                description: description
                    ? String(description).trim()
                    : null
            }
        );

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        return res.json(ticket);

    } catch (error) {
        console.error("UPDATE TICKET CATEGORY:", error);

        if (error.code === "CAPACITY_BELOW_SOLD") {
            return res.status(409).json({
                message: "Capacity cannot be lower than tickets already sold.",
                sold: error.sold
            });
        }

        return res.status(500).json({
            message: "Failed to update ticket"
        });
    }
}


async function deleteTicketCategory(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: "Invalid ticket id"
            });
        }

        const ticket = await ticketModel.deleteTicket(id);

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        return res.json({
            message: "Ticket deleted",
            ticket
        });

    } catch (error) {
        console.error("DELETE TICKET CATEGORY:", error);

        return res.status(500).json({
            message: "Failed to delete ticket"
        });
    }
}


async function verifyTicket(req, res) {
    try {
        const { reference } = req.params;

        if (!reference || !reference.trim()) {
            return res.status(400).json({
                message: "Invalid ticket reference"
            });
        }

        const ticket =
            await ticketModel.verifyTicketByReference(
                reference.trim().toUpperCase()
            );

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found",
                verification_status: "invalid"
            });
        }

        if (
            ticket.verification_status ===
            "already_used"
        ) {
            return res.status(409).json({
                message: "Ticket already used",
                verification_status: "already_used",
                ticket
            });
        }

        return res.json({
            message: "Ticket verified",
            verification_status: "verified",
            ticket
        });

    } catch (error) {
        console.error(
            "VERIFY TICKET:",
            error
        );

        return res.status(500).json({
            message: "Failed to verify ticket"
        });
    }
}
module.exports = {
    getTicketsByEvent,
    getTicketByReference,
    addTicketCategory,
    updateTicketCategory,
    deleteTicketCategory,
    verifyTicket
};

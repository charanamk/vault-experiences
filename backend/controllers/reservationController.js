const reservationModel = require("../models/reservationModel");
const eventModel = require("../models/eventModel");
const customerModel = require("../models/customerModel");
const paymentModel = require("../models/paymentModel");
const paymentService = require("../services/paymentService");
const pool = require("../config/db");

function createReference() {
    const time = Date.now().toString(36).toUpperCase();

    const random = Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase();

    return `VLT-${time}-${random}`;
}

function normalizePhoneNumber(rawPhone) {
    if (!rawPhone) {
        return null;
    }

    const digits = String(rawPhone).replace(/\D+/g, "");
    if (!digits) {
        return null;
    }

    if (digits.startsWith("254") && digits.length === 12) {
        return digits;
    }

    if (digits.startsWith("0") && digits.length === 10) {
        return `254${digits.slice(1)}`;
    }

    if (digits.length === 9) {
        return `254${digits}`;
    }

    return digits.length >= 10 ? digits : null;
}

async function createReservation(req, res) {
    try {
        const { eventId, attendee, guests, ticketId, ticketCategory } = req.body || {};

        const sessionId = req.cookies?.vault_session;

        if (!sessionId) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        const session = await customerModel.findSessionById(
            req.app.get("dbPool"),
            sessionId
        );

        if (!session) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        const customerId = session.customer_id;

        if (
            !eventId ||
            typeof eventId !== "string" ||
            !eventId.trim()
        ) {
            return res.status(400).json({
                message: "Invalid eventId"
            });
        }

        if (
            !attendee ||
            typeof attendee !== "object"
        ) {
            return res.status(400).json({
                message: "Invalid attendee"
            });
        }

        const name = String(
            attendee.name || ""
        ).trim();

        const email = String(
            attendee.email || ""
        ).trim();

        if (!name) {
            return res.status(400).json({
                message: "Invalid attendee name"
            });
        }

        if (
            !email ||
            !/^\S+@\S+\.\S+$/.test(email)
        ) {
            return res.status(400).json({
                message: "Invalid attendee email"
            });
        }

        const guestsCount =
            Number.isFinite(Number(guests))
                ? Number(guests)
                : null;

        if (
            !Number.isInteger(guestsCount) ||
            guestsCount < 1
        ) {
            return res.status(400).json({
                message: "Invalid guests"
            });
        }

        const event =
            await eventModel.getEventById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (!Array.isArray(event.tickets) || event.tickets.length === 0) {
            return res.status(409).json({
                message: "Ticket pricing information is unavailable for this event."
            });
        }

        const resolvedTicket = Array.isArray(event.tickets)
            ? event.tickets.find((ticket) => {
                const candidateId = String(ticket.id ?? ticket.ticket_id ?? "");
                return candidateId && String(ticketId || "") === candidateId;
            }) || null
            : null;

        const selectedTicket = resolvedTicket || (Array.isArray(event.tickets) && event.tickets.length === 1 ? event.tickets[0] : null);
        const ticketPrice = Number(selectedTicket?.price ?? selectedTicket?.amount ?? 0);

        if (!selectedTicket || !Number.isFinite(ticketPrice)) {
            return res.status(409).json({
                message: "Ticket pricing information is unavailable for this event."
            });
        }

        const paymentRequired = ticketPrice > 0;

        if (selectedTicket && selectedTicket.id && ticketCategory && ticketCategory !== selectedTicket.name && ticketCategory !== selectedTicket.title) {
            // allow the chosen category to be echoed back without trusting browser pricing.
        }

        const reference =
            createReference();

        const reservation =
            await reservationModel.createReservation({
                reference,
                event_id: eventId,
                customer_id: customerId,
                attendee_name: name,
                attendee_email: email,
                guests: guestsCount,
                ticket_id: selectedTicket?.id || null,
                ticket_name: selectedTicket?.name || ticketCategory || null,
                paymentRequired,
                skipTicketIssue: paymentRequired,
                paymentStatus: paymentRequired ? "pending" : "not_required",
                paymentAmount: paymentRequired ? ticketPrice * guestsCount : 0,
                paymentCurrency: "KES"
            });

        if (paymentRequired) {
            const payment = await paymentModel.createPayment(pool, {
                reference: `VLT-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                reservationId: reservation.id,
                customerId,
                eventId,
                amount: ticketPrice * guestsCount,
                currency: "KES",
                status: "pending",
                providerName: "vault_internal",
                metadata: {
                    created_by: "reservation_api",
                    booking_reference: reservation.reference,
                    guest_count: guestsCount,
                    ticket_id: selectedTicket?.id || null,
                    ticket_name: selectedTicket?.name || ticketCategory || null,
                    source: "booking_system"
                }
            });

            await paymentModel.syncReservationPaymentState(pool, reservation.id, payment);

            return res.status(201).json({
                id: reservation.id,
                reference: reservation.reference,
                attendee: {
                    name: reservation.attendee_name,
                    email: reservation.attendee_email
                },
                guests: reservation.guests,
                event,
                ticket: {
                    ...(selectedTicket || {}),
                    price: ticketPrice,
                    requiresPayment: true,
                    id: selectedTicket?.id || null,
                    name: selectedTicket?.name || ticketCategory || null
                },
                ticketCategory: selectedTicket?.name || ticketCategory || null,
                payment: {
                    id: payment.id,
                    reference: payment.reference,
                    status: payment.status,
                    amount: payment.amount,
                    currency: payment.currency,
                    requiresPayment: true
                },
                paymentRequired: true,
                phoneRequired: true
            });
        }

        return res.status(201).json({
            id: reservation.id,
            reference: reservation.reference,

            attendee: {
                name: reservation.attendee_name,
                email: reservation.attendee_email
            },

            guests: reservation.guests,

            event,

            ticket: reservation.ticket,

            ticketCategory:
                reservation.ticket_category,
            paymentRequired: false,
            phoneRequired: false
        });

    } catch (error) {
        console.error(
            "CREATE RESERVATION:",
            error
        );

        if (error.code === "SOLD_OUT") {
            return res.status(409).json({
                message:
                    "Not enough tickets available.",
                capacity: error.capacity,
                sold: error.sold,
                remaining: error.remaining
            });
        }

        if (error.code === "NO_TICKET") {
            return res.status(409).json({
                message:
                    "No ticket category exists for this event."
            });
        }

        return res.status(500).json({
            message:
                "Failed to create reservation"
        });
    }
}

async function getMyReservations(req, res) {
    try {
        const sessionId =
            req.cookies?.vault_session;

        if (!sessionId) {
            return res.status(401).json({
                message:
                    "Authentication required."
            });
        }

        const session =
            await customerModel.findSessionById(
                req.app.get("dbPool"),
                sessionId
            );

        if (!session) {
            return res.status(401).json({
                message:
                    "Authentication required."
            });
        }

        const reservations =
            await reservationModel
                .getReservationsByCustomerId(
                    session.customer_id
                );

        return res.json({
            reservations
        });

    } catch (error) {
        console.error(
            "GET MY RESERVATIONS:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to load reservations"
        });
    }
}

module.exports = {
    createReservation,
    getMyReservations
};
const QRCode = require("qrcode");
const pool = require("../config/db");

async function ensureTable(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS issued_tickets (
            id SERIAL PRIMARY KEY,
            reservation_id INTEGER UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
            customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            event_id TEXT NOT NULL,
            ticket_name VARCHAR(255),
            ticket_category VARCHAR(255),
            reference VARCHAR(255) UNIQUE NOT NULL,
            booking_reference VARCHAR(255),
            payment_reference VARCHAR(255),
            payment_id INTEGER NULL REFERENCES payments(id) ON DELETE SET NULL,
            attendee_name VARCHAR(255),
            attendee_email VARCHAR(255),
            guests INTEGER NOT NULL DEFAULT 1,
            event_date DATE,
            event_time TIME,
            venue VARCHAR(255),
            status VARCHAR(30) NOT NULL DEFAULT 'valid',
            qr_code TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            verified_at TIMESTAMPTZ NULL
        );
    `);

    const columns = [
        ["customer_id", "TEXT"],
        ["payment_reference", "VARCHAR(255)"],
        ["payment_id", "INTEGER REFERENCES payments(id) ON DELETE SET NULL"],
        ["ticket_name", "VARCHAR(255)"],
        ["ticket_category", "VARCHAR(255)"],
        ["booking_reference", "VARCHAR(255)"],
        ["attendee_name", "VARCHAR(255)"],
        ["attendee_email", "VARCHAR(255)"],
        ["guests", "INTEGER NOT NULL DEFAULT 1"],
        ["event_date", "DATE"],
        ["event_time", "TIME"],
        ["venue", "VARCHAR(255)"],
        ["status", "VARCHAR(30) NOT NULL DEFAULT 'valid'"],
        ["qr_code", "TEXT"],
        ["verified_at", "TIMESTAMPTZ NULL"]
    ];

    for (const [columnName, definition] of columns) {
        await pool.query(`
            ALTER TABLE issued_tickets
            ADD COLUMN IF NOT EXISTS ${columnName} ${definition}
        `);
    }

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_issued_tickets_reservation_unique
        ON issued_tickets(reservation_id)
        WHERE reservation_id IS NOT NULL
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_issued_tickets_reference_unique
        ON issued_tickets(reference)
    `);
}

async function getTicketByReservationId(reservationId) {
    const result = await pool.query(
        `
        SELECT *
        FROM issued_tickets
        WHERE reservation_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [reservationId]
    );

    return result.rows[0] || null;
}

async function getTicketsByEvent(eventId) {
    const result = await pool.query(
        `
        SELECT
            id,
            event_id,
            name,
            price,
            quantity,
            description,
            capacity,
            sold,
            available,
            created_at,
            updated_at
        FROM tickets
        WHERE event_id = $1
        ORDER BY id ASC
        `,
        [eventId]
    );

    return result.rows;
}


async function getTicketByReference(reference) {
    const result = await pool.query(
        `
        SELECT
            id,
            reservation_id,
            event_id,
            reference,
            attendee_name,
            attendee_email,
            guests,
            status,
            created_at
        FROM issued_tickets
        WHERE reference = $1
        `,
        [reference]
    );

    return result.rows[0] || null;
}

async function createIssuedTicketIfNeeded(payload = {}) {
    const {
        reservationId,
        customerId,
        eventId,
        bookingReference,
        paymentReference,
        paymentId,
        ticketName,
        ticketCategory,
        attendeeName,
        attendeeEmail,
        guests,
        eventDate,
        eventTime,
        venue
    } = payload;

    if (!reservationId || !customerId || !eventId) {
        return null;
    }

    const safeReference = String(
        paymentReference || bookingReference || `VLT-TICKET-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    ).trim();

    const ticketReference = safeReference.startsWith("VLT") ? safeReference : `VLT-${safeReference}`;

    const qrCode = await QRCode.toDataURL(ticketReference);

    const result = await pool.query(
        `
        INSERT INTO issued_tickets (
            reservation_id,
            customer_id,
            event_id,
            ticket_name,
            ticket_category,
            reference,
            booking_reference,
            payment_reference,
            payment_id,
            attendee_name,
            attendee_email,
            guests,
            event_date,
            event_time,
            venue,
            status,
            qr_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (reservation_id) DO NOTHING
        RETURNING *
        `,
        [
            reservationId,
            customerId,
            eventId,
            ticketName || null,
            ticketCategory || null,
            ticketReference,
            bookingReference || null,
            paymentReference || null,
            paymentId || null,
            attendeeName || null,
            attendeeEmail || null,
            Number(guests || 1),
            eventDate || null,
            eventTime || null,
            venue || null,
            "valid",
            qrCode
        ]
    );

    if (result.rows[0]) {
        return result.rows[0];
    }

    return getTicketByReservationId(reservationId);
}


async function createTicket(data) {
    const capacity = Number(data.capacity) || 0;
    const sold = Number(data.sold) || 0;

    const result = await pool.query(
        `
        INSERT INTO tickets
            (
                event_id,
                name,
                price,
                quantity,
                description,
                capacity,
                sold,
                available
            )
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id,
            event_id,
            name,
            price,
            quantity,
            description,
            capacity,
            sold,
            available,
            created_at,
            updated_at
        `,
        [
            data.event_id,
            data.name,
            Number(data.price) || 0,
            capacity,
            data.description || null,
            capacity,
            sold,
            data.available !== undefined
                ? Boolean(data.available)
                : capacity > sold
        ]
    );

    return result.rows[0];
}


async function updateTicket(id, data) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        /*
         * Lock the ticket while editing it.
         * This prevents two simultaneous updates
         * from producing inconsistent availability.
         */
        const currentResult = await client.query(
            `
            SELECT
                id,
                event_id,
                sold
            FROM tickets
            WHERE id = $1
            FOR UPDATE
            `,
            [id]
        );

        if (currentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const currentTicket = currentResult.rows[0];
        const sold = Number(currentTicket.sold) || 0;
        const capacity = Number(data.capacity) || 0;

        /*
         * Never allow capacity to go below
         * tickets already sold.
         */
        if (capacity < sold) {
            const error = new Error(
                "Capacity cannot be lower than tickets already sold."
            );

            error.code = "CAPACITY_BELOW_SOLD";
            error.sold = sold;

            throw error;
        }

        const available =
            data.available !== undefined
                ? Boolean(data.available)
                : capacity > sold;

        const result = await client.query(
            `
            UPDATE tickets
            SET
                name = $1,
                price = $2,
                quantity = $3,
                description = $4,
                capacity = $5,
                available = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING
                id,
                event_id,
                name,
                price,
                quantity,
                description,
                capacity,
                sold,
                available,
                created_at,
                updated_at
            `,
            [
                data.name,
                Number(data.price) || 0,
                capacity,
                data.description || null,
                capacity,
                available,
                id
            ]
        );

        await client.query("COMMIT");

        return result.rows[0] || null;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}


async function deleteTicket(id) {
    const result = await pool.query(
        `
        DELETE FROM tickets
        WHERE id = $1
        RETURNING
            id,
            event_id,
            name,
            price,
            quantity,
            description,
            capacity,
            sold,
            available,
            created_at,
            updated_at
        `,
        [id]
    );

    return result.rows[0] || null;
}



async function verifyTicketByReference(reference) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            "SELECT id, reservation_id, event_id, reference, attendee_name, attendee_email, guests, status, created_at, verified_at FROM issued_tickets WHERE reference = $1 FOR UPDATE",
            [reference]
        );

        const ticket = result.rows[0];

        if (!ticket) {
            await client.query("COMMIT");
            return null;
        }

        if (ticket.status !== "valid" || ticket.verified_at !== null) {
            await client.query("COMMIT");

            return {
                ...ticket,
                verification_status: "already_used"
            };
        }

        const updateResult = await client.query(
            "UPDATE issued_tickets SET status = 'used', verified_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, reservation_id, event_id, reference, attendee_name, attendee_email, guests, status, created_at, verified_at",
            [ticket.id]
        );

        await client.query("COMMIT");

        return {
            ...updateResult.rows[0],
            verification_status: "verified"
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
module.exports = {
    ensureTable,
    getTicketByReservationId,
    createIssuedTicketIfNeeded,
    getTicketsByEvent,
    getTicketByReference,
    createTicket,
    updateTicket,
    verifyTicketByReference
};

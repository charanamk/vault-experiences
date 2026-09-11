const pool = require("../config/db");
const QRCode = require("qrcode");


/*==================================================
CREATE RESERVATION
==================================================*/

async function createReservation(data) {

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );


        /*==================================
          FIND AND LOCK TICKET CATEGORY
        ==================================*/

        const ticketResult =
            await client.query(
                `
                SELECT
                    id,
                    event_id,
                    name,
                    price,
                    capacity,
                    sold,
                    available
                FROM tickets
                WHERE event_id = $1
                  AND (
                      $2::integer IS NULL
                      OR tickets.id = $2::integer
                  )
                ORDER BY id ASC
                LIMIT 1
                FOR UPDATE
                `,
                [
                    data.event_id,
                    data.ticket_id || null
                ]
            );


        /*==================================
          NO TICKET CATEGORY FOUND
        ==================================*/

        if (
            ticketResult.rows.length === 0
        ) {

            const reservationResult =
                await client.query(
                    `
                    INSERT INTO reservations
                    (
                        reference,
                        event_id,
                        customer_id,
                        attendee_name,
                        attendee_email,
                        guests
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6
                    )
                    RETURNING
                        id,
                        reference,
                        event_id,
                        attendee_name,
                        attendee_email,
                        guests,
                        created_at
                    `,
                    [
                        data.reference,
                        data.event_id,
                        data.customer_id,
                        data.attendee_name,
                        data.attendee_email,
                        Number(data.guests) || 1
                    ]
                );


            const reservation =
                reservationResult.rows[0];


            /*==================================
              ISSUE FREE TICKET
            ==================================*/

            if (!data.skipTicketIssue) {

                const qrCode =
                    await QRCode.toDataURL(
                        reservation.reference
                    );


                const issuedTicketResult =
                    await client.query(
                        `
                        INSERT INTO issued_tickets
                        (
                            reservation_id,
                            event_id,
                            reference,
                            attendee_name,
                            attendee_email,
                            guests,
                            qr_code,
                            customer_id,
                            booking_reference,
                            ticket_name,
                            ticket_category
                        )
                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7,
                            $8,
                            $9,
                            $10,
                            $11
                        )
                        ON CONFLICT (reservation_id) DO NOTHING
                        RETURNING
                            id,
                            reservation_id,
                            event_id,
                            reference,
                            attendee_name,
                            attendee_email,
                            guests,
                            status,
                            created_at,
                            qr_code
                        `,
                        [
                            reservation.id,
                            reservation.event_id,
                            reservation.reference,
                            reservation.attendee_name,
                            reservation.attendee_email,
                            reservation.guests,
                            qrCode,
                            reservation.customer_id,
                            reservation.reference,
                            "Admission",
                            "Admission"
                        ]
                    );


                const issuedTicket =
                    issuedTicketResult.rows[0];


                if (issuedTicket) {

                    await client.query(
                        `
                        UPDATE reservations
                        SET
                            ticket_id = $1
                        WHERE id = $2
                        `,
                        [
                            issuedTicket.id,
                            reservation.id
                        ]
                    );

                }

            }


            await client.query(
                "COMMIT"
            );


            return {
                ...reservation,

                ticket_id: null,

                ticket: null,

                ticket_category: null,

                free_entry:
                    !Boolean(
                        data.skipTicketIssue
                    )
            };

        }


        const ticket =
            ticketResult.rows[0];


        /*==================================
          TICKET CAPACITY
        ==================================*/

        const capacity =
            Number(ticket.capacity) || 0;


        const sold =
            Number(ticket.sold) || 0;


        const quantity =
            Number(data.guests);


        const remaining =
            capacity - sold;


        if (
            quantity > remaining
        ) {

            const error =
                new Error(
                    "Not enough tickets available."
                );


            error.code =
                "SOLD_OUT";


            error.capacity =
                capacity;


            error.sold =
                sold;


            error.remaining =
                Math.max(
                    remaining,
                    0
                );


            throw error;

        }


        const newSold =
            sold + quantity;


        const newAvailable =
            newSold < capacity;


        /*==================================
          UPDATE TICKET INVENTORY
        ==================================*/

        await client.query(
            `
            UPDATE tickets
            SET
                sold = $1,
                available = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            `,
            [
                newSold,
                newAvailable,
                ticket.id
            ]
        );


        /*==================================
          CREATE RESERVATION
        ==================================*/

        const reservationResult =
            await client.query(
                `
                INSERT INTO reservations
                (
                    reference,
                    event_id,
                    customer_id,
                    attendee_name,
                    attendee_email,
                    guests,
                    null
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7
                )
                RETURNING
                    id,
                    reference,
                    event_id,
                    attendee_name,
                    attendee_email,
                    guests,
                    ticket_id,
                    created_at
                `,
                [
                    data.reference,
                    data.event_id,
                    data.customer_id,
                    data.attendee_name,
                    data.attendee_email,
                    quantity,
                    ticket.id
                ]
            );


        const reservation =
            reservationResult.rows[0];


        /*==================================
          GENERATE QR CODE
        ==================================*/

        const qrCode =
            await QRCode.toDataURL(
                reservation.reference
            );


        /*==================================
          ISSUE VAULT TICKET
        ==================================*/

        let issuedTicket = null;


        if (!data.skipTicketIssue) {

            const issuedTicketResult =
                await client.query(
                    `
                    INSERT INTO issued_tickets
                    (
                        reservation_id,
                        event_id,
                        reference,
                        attendee_name,
                        attendee_email,
                        guests,
                        qr_code,
                        customer_id,
                        booking_reference,
                        ticket_name,
                        ticket_category
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11
                    )
                    ON CONFLICT (reservation_id) DO NOTHING
                    RETURNING
                        id,
                        reservation_id,
                        event_id,
                        reference,
                        attendee_name,
                        attendee_email,
                        guests,
                        status,
                        created_at,
                        qr_code
                    `,
                    [
                        reservation.id,
                        reservation.event_id,
                        reservation.reference,
                        reservation.attendee_name,
                        reservation.attendee_email,
                        reservation.guests,
                        qrCode,
                        reservation.customer_id,
                        reservation.reference,
                        "Admission",
                        "Admission"
                    ]
                );


            issuedTicket =
                issuedTicketResult.rows[0] || null;


            if (issuedTicket) {

                await client.query(
                    `
                    UPDATE reservations
                    SET
                        ticket_id = $1
                    WHERE id = $2
                    `,
                    [
                        issuedTicket.id,
                        reservation.id
                    ]
                );

            }

        }


        /*==================================
          COMMIT
        ==================================*/

        await client.query(
            "COMMIT"
        );


        /*==================================
          RETURN RESERVATION
        ==================================*/

        return {

            ...reservation,

            ticket_id:
                reservation.ticket_id ??
                ticket.id,

            ticket:
                issuedTicket,

            ticket_category:
                data.skipTicketIssue
                    ? null
                    : {

                        id:
                            ticket.id,

                        name:
                            ticket.name,

                        capacity,

                        sold:
                            newSold,

                        remaining:
                            capacity - newSold,

                        available:
                            newAvailable

                    }

        };


    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        throw error;

    } finally {

        client.release();

    }

}


/*==================================================
GET MY RESERVATIONS
==================================================*/

async function getReservationsByCustomerId(
    customerId
) {

    const result =
        await pool.query(
            `
            SELECT

                r.id,
                r.reference,
                r.event_id,
                r.attendee_name,
                r.attendee_email,
                r.guests,
                r.created_at,
                r.payment_status,
                r.payment_amount,
                r.requires_payment,

                e.id AS event_id,
                e.title,
                e.theme,
                e.description,
                e.image,
                e.event_date,
                e.event_time,
                e.location,

                it.id AS ticket_id,
                it.status AS ticket_status,
                it.reference AS ticket_reference,
                it.qr_code AS qr_code,
                it.ticket_name AS ticket_name,
                it.ticket_category AS ticket_category_name

            FROM reservations r

            INNER JOIN events e
                ON e.id = r.event_id

            LEFT JOIN issued_tickets it
    ON it.reservation_id = r.id
            
            WHERE r.customer_id = $1

            ORDER BY
                r.created_at DESC
            `,
            [
                customerId
            ]
        );


    return result.rows;

}


/*==================================================
EXPORTS
==================================================*/

module.exports = {

    createReservation,

    getReservationsByCustomerId

};
const pool = require("../config/db");

async function getAllEvents(status) {
    let query = `
        SELECT
            e.id,
            e.title,
            e.theme,
            e.short_description AS "shortDescription",
            e.description,
            e.image,
            e.event_date AS date,
            e.event_time AS time,
            e.location,
            e.location_note AS "locationNote",
            e.capacity,
            e.age_restriction AS "ageRestriction",
            e.dress_code AS "dressCode",
            e.booking_deadline AS "bookingDeadline",
            e.status,
            e.featured,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', t.id,
                        'name', t.name,
                        'description', t.description,
                        'price', t.price,
                        'capacity', t.capacity,
                        'sold', t.sold,
                        'available', t.available
                    )
                ) FILTER (WHERE t.id IS NOT NULL),
                '[]'::json
            ) AS tickets
        FROM events e
        LEFT JOIN tickets t ON t.event_id = e.id
    `;

    const values = [];

    if (status) {
        query += ` WHERE e.status = $1`;
        values.push(status);
    }

    query += `
        GROUP BY
            e.id,
            e.title,
            e.theme,
            e.short_description,
            e.description,
            e.image,
            e.event_date,
            e.event_time,
            e.location,
            e.location_note,
            e.capacity,
            e.age_restriction,
            e.dress_code,
            e.booking_deadline,
            e.status,
            e.featured
        ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST
    `;

    const result = await pool.query(query, values);

    return result.rows.map((event) => ({
        ...event,
        tickets: Array.isArray(event.tickets) ? event.tickets : []
    }));
}


async function getEventById(id) {
    const result = await pool.query(
        `
        SELECT
            id,
            title,
            theme,
            short_description AS "shortDescription",
            description,
            image,
            event_date AS date,
            event_time AS time,
            location,
            location_note AS "locationNote",
            capacity,
            age_restriction AS "ageRestriction",
            dress_code AS "dressCode",
            booking_deadline AS "bookingDeadline",
            status,
            featured
        FROM events
        WHERE id = $1
        `,
        [id]
    );

    const event = result.rows[0];

    if (!event) {
        return null;
    }

    // Keep existing ticket retrieval untouched.
    try {
        const ticketsRes = await pool.query(
            `
            SELECT
                id,
                name,
                description,
                price,
                capacity,
                sold,
                available
            FROM tickets
            WHERE event_id = $1
            ORDER BY id ASC
            `,
            [id]
        );

        event.tickets = ticketsRes.rows.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            price: Number(t.price) || 0,
            capacity: Number(t.capacity) || 0,
            sold: Number(t.sold) || 0,
            available: Boolean(t.available)
        }));
    } catch (err) {
        console.error(
            "Failed to load tickets for event",
            id,
            err.message || err
        );

        event.tickets = [];
    }

    return event;
}


async function createEvent(event) {
    const result = await pool.query(
        `
        INSERT INTO events (
            id,
            title,
            theme,
            short_description,
            description,
            image,
            event_date,
            event_time,
            location,
            location_note,
            capacity,
            age_restriction,
            dress_code,
            booking_deadline,
            status,
            featured
        )
        VALUES (
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
            $11,
            $12,
            $13,
            $14,
            $15,
            $16
        )
        RETURNING
            id,
            title,
            theme,
            short_description AS "shortDescription",
            description,
            image,
            event_date AS date,
            event_time AS time,
            location,
            location_note AS "locationNote",
            capacity,
            age_restriction AS "ageRestriction",
            dress_code AS "dressCode",
            booking_deadline AS "bookingDeadline",
            status,
            featured
        `,
        [
            event.id,
            event.title,
            event.theme || null,
            event.shortDescription || null,
            event.description || null,
            event.image || null,
            event.date,
            event.time || null,
            event.location || null,
            event.locationNote || null,
            event.capacity || null,
            event.ageRestriction || null,
            event.dressCode || null,
            event.bookingDeadline || null,
            event.status || "upcoming",
            event.featured === true
        ]
    );

    const created = result.rows[0];

    // Existing ticket behavior stays intact.
    if (Array.isArray(event.tickets) && event.tickets.length) {
        try {
            const insertPromises = [];

            for (const t of event.tickets) {
                insertPromises.push(
                    pool.query(
                        `
                        INSERT INTO tickets (
                            event_id,
                            name,
                            description,
                            price,
                            capacity,
                            sold,
                            available
                        )
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                        RETURNING
                            id,
                            name,
                            description,
                            price,
                            capacity,
                            sold,
                            available
                        `,
                        [
                            created.id,
                            t.name || "",
                            t.description || null,
                            t.price || 0,
                            t.capacity || t.quantity || 0,
                            t.sold || 0,
                            t.available !== undefined
                                ? t.available
                                : true
                        ]
                    )
                );
            }

            const inserted = await Promise.all(insertPromises);

            created.tickets = inserted.map((r) => r.rows[0]);
        } catch (err) {
            console.error(
                "Failed to insert tickets for event",
                created.id,
                err.message || err
            );

            created.tickets = [];
        }
    } else {
        created.tickets = [];
    }

    return created;
}


async function updateEvent(id, event) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            UPDATE events
            SET
                title = $1,
                theme = $2,
                short_description = $3,
                description = $4,
                image = $5,
                event_date = $6,
                event_time = $7,
                location = $8,
                location_note = $9,
                capacity = $10,
                age_restriction = $11,
                dress_code = $12,
                booking_deadline = $13,
                status = $14,
                featured = $15,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $16
            RETURNING
                id,
                title,
                theme,
                short_description AS "shortDescription",
                description,
                image,
                event_date AS date,
                event_time AS time,
                location,
                location_note AS "locationNote",
                capacity,
                age_restriction AS "ageRestriction",
                dress_code AS "dressCode",
                booking_deadline AS "bookingDeadline",
                status,
                featured
            `,
            [
                event.title,
                event.theme || null,
                event.shortDescription || null,
                event.description || null,
                event.image || null,
                event.date,
                event.time || null,
                event.location || null,
                event.locationNote || null,
                event.capacity || null,
                event.ageRestriction || null,
                event.dressCode || null,
                event.bookingDeadline || null,
                event.status || "upcoming",
                event.featured === true,
                id
            ]
        );

        if (!result.rows.length) {
            await client.query("ROLLBACK");
            return null;
        }

        // Existing ticket management remains untouched.
        if (Array.isArray(event.tickets)) {
            const providedIds = [];

            for (const t of event.tickets) {
                if (t.id) {
                    await client.query(
                        `
                        UPDATE tickets
                        SET
                            name = $1,
                            description = $2,
                            price = $3,
                            capacity = $4,
                            sold = $5,
                            available = $6,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $7
                        AND event_id = $8
                        `,
                        [
                            t.name || "",
                            t.description || null,
                            t.price || 0,
                            t.capacity || t.quantity || 0,
                            t.sold || 0,
                            t.available !== undefined
                                ? t.available
                                : true,
                            t.id,
                            id
                        ]
                    );

                    providedIds.push(t.id);
                } else {
                    const ins = await client.query(
                        `
                        INSERT INTO tickets (
                            event_id,
                            name,
                            description,
                            price,
                            capacity,
                            sold,
                            available
                        )
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                        RETURNING id
                        `,
                        [
                            id,
                            t.name || "",
                            t.description || null,
                            t.price || 0,
                            t.capacity || t.quantity || 0,
                            t.sold || 0,
                            t.available !== undefined
                                ? t.available
                                : true
                        ]
                    );

                    providedIds.push(ins.rows[0].id);
                }
            }

            if (providedIds.length) {
                const placeholders = providedIds
                    .map((_, i) => `$${i + 2}`)
                    .join(",");

                await client.query(
                    `
                    DELETE FROM tickets
                    WHERE event_id = $1
                    AND id NOT IN (${placeholders})
                    `,
                    [id, ...providedIds]
                );
            } else {
                await client.query(
                    `DELETE FROM tickets WHERE event_id = $1`,
                    [id]
                );
            }
        }

        await client.query("COMMIT");

        return await getEventById(id);

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


async function deleteEvent(id) {
    const result = await pool.query(
        `
        DELETE FROM events
        WHERE id = $1
        RETURNING id
        `,
        [id]
    );

    return result.rows[0];
}


module.exports = {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
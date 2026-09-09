const pool = require("../config/db");

async function getWishlistByCustomer(customerId) {
    const result = await pool.query(
        `
        SELECT
            w.id AS wishlist_id,
            w.customer_id,
            w.event_id,
            w.created_at,
            e.id,
            e.title,
            e.theme,
            e.description,
            e.image,
            e.event_date AS date,
            e.event_time AS time,
            e.location,
            e.status
        FROM wishlist w
        JOIN events e ON e.id = w.event_id
        WHERE w.customer_id = $1
        ORDER BY w.created_at DESC
        `,
        [customerId]
    );

    return result.rows;
}

async function getWishlistItem(customerId, eventId) {
    const result = await pool.query(
        `
        SELECT
            w.id AS wishlist_id,
            w.customer_id,
            w.event_id,
            w.created_at,
            e.title,
            e.theme,
            e.description,
            e.image,
            e.event_date AS date,
            e.event_time AS time,
            e.location,
            e.status
        FROM wishlist w
        JOIN events e ON e.id = w.event_id
        WHERE w.customer_id = $1 AND w.event_id = $2
        `,
        [customerId, eventId]
    );

    return result.rows[0] || null;
}

async function addWishlistItem(customerId, eventId) {
    const result = await pool.query(
        `
        INSERT INTO wishlist (customer_id, event_id)
        VALUES ($1, $2)
        ON CONFLICT (customer_id, event_id) DO NOTHING
        RETURNING *
        `,
        [customerId, eventId]
    );

    if (!result.rows[0]) {
        return await getWishlistItem(customerId, eventId);
    }

    return result.rows[0];
}

async function removeWishlistItem(customerId, eventId) {
    const result = await pool.query(
        `
        DELETE FROM wishlist
        WHERE customer_id = $1 AND event_id = $2
        RETURNING *
        `,
        [customerId, eventId]
    );

    return result.rows[0] || null;
}

async function hasWishlistItem(customerId, eventId) {
    const result = await pool.query(
        `
        SELECT 1
        FROM wishlist
        WHERE customer_id = $1 AND event_id = $2
        LIMIT 1
        `,
        [customerId, eventId]
    );

    return result.rowCount > 0;
}

module.exports = {
    getWishlistByCustomer,
    getWishlistItem,
    addWishlistItem,
    removeWishlistItem,
    hasWishlistItem
};

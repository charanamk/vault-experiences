const wishlistModel = require("../models/wishlistModel");
const customerModel = require("../models/customerModel");

function normalizeCustomerId(value) {
    return String(value || "").trim();
}

function normalizeEventId(value) {
    return String(value || "").trim();
}

function getSessionIdFromCookie(req) {
    const rawCookie = req.headers.cookie || "";
    const match = rawCookie.split(";").find((part) => part.trim().startsWith("vault_session="));
    if (!match) {
        return "";
    }
    return decodeURIComponent(match.split("=").slice(1).join("=")).trim();
}

async function getAuthenticatedCustomer(req) {
    const pool = req.app.get("dbPool");
    const sessionId = getSessionIdFromCookie(req) || req.cookies?.vault_session || "";
    if (sessionId) {
        const session = await customerModel.findSessionById(pool, sessionId);
        if (session) {
            const customer = await customerModel.findById(pool, session.customer_id);
            if (customer) {
                return { customer, session };
            }
        }
    }

    const customerId = normalizeCustomerId(
        req.body?.customerId ||
        req.query?.customerId ||
        req.headers['x-customer-id']
    );

    if (!customerId) {
        return null;
    }

    let customer = await customerModel.findById(pool, customerId);
    if (!customer) {
        await pool.query(
            `
            INSERT INTO customers (id, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible)
            VALUES ($1, true, false, true, true, true)
            ON CONFLICT (id) DO NOTHING
            `,
            [customerId]
        );

        customer = await customerModel.findById(pool, customerId);
    }

    if (!customer) {
        return null;
    }

    return { customer, session: null };
}

async function requireSessionCustomer(req, res) {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
        res.status(401).json({ message: "Authentication required" });
        return null;
    }
    return auth.customer;
}

async function getWishlist(req, res) {
    try {
        const customer = await requireSessionCustomer(req, res);
        if (!customer) {
            return;
        }

        const items = await wishlistModel.getWishlistByCustomer(customer.id);
        return res.json(items);
    } catch (error) {
        console.error("GET WISHLIST:", error);
        return res.status(500).json({ message: "Failed to fetch wishlist" });
    }
}

async function addWishlistItem(req, res) {
    try {
        const customer = await requireSessionCustomer(req, res);
        if (!customer) {
            return;
        }

        const eventId = normalizeEventId(req.body?.eventId);
        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const existing = await wishlistModel.getWishlistItem(customer.id, eventId);

        if (existing) {
            return res.status(200).json({
                added: false,
                wishlisted: true,
                item: existing
            });
        }

        const item = await wishlistModel.addWishlistItem(customer.id, eventId);

        return res.status(201).json({
            added: true,
            wishlisted: true,
            item
        });
    } catch (error) {
        console.error("ADD WISHLIST ITEM:", error);
        return res.status(500).json({ message: "Failed to save wishlist item" });
    }
}

async function removeWishlistItem(req, res) {
    try {
        const customer = await requireSessionCustomer(req, res);
        if (!customer) {
            return;
        }

        const eventId = normalizeEventId(req.params.eventId || req.query.eventId);
        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const removed = await wishlistModel.removeWishlistItem(customer.id, eventId);

        if (!removed) {
            return res.status(404).json({ message: "Wishlist item not found" });
        }

        return res.json({
            removed: true,
            eventId,
            customerId: customer.id
        });
    } catch (error) {
        console.error("REMOVE WISHLIST ITEM:", error);
        return res.status(500).json({ message: "Failed to remove wishlist item" });
    }
}

async function checkWishlist(req, res) {
    try {
        const customer = await requireSessionCustomer(req, res);
        if (!customer) {
            return;
        }

        const eventId = normalizeEventId(req.query.eventId || req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const wishlisted = await wishlistModel.hasWishlistItem(customer.id, eventId);

        return res.json({
            customerId: customer.id,
            eventId,
            wishlisted
        });
    } catch (error) {
        console.error("CHECK WISHLIST:", error);
        return res.status(500).json({ message: "Failed to check wishlist item" });
    }
}

module.exports = {
    getWishlist,
    addWishlistItem,
    removeWishlistItem,
    checkWishlist
};

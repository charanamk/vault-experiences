require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});
const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("./config/db");
const eventRoutes = require("./routes/eventRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const customerRoutes = require("./routes/customerRoutes");
const customerModel = require("./models/customerModel");
const adminModel = require("./models/adminModel");
const paymentModel = require("./models/paymentModel");
const ticketModel = require("./models/ticketModel");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const paymentService = require("./services/paymentService");
const { requireAdmin } = require("./middleware/adminAuth");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

function parseCookies(header = "") {
    const cookies = {};
    if (!header) return cookies;
    header.split(";").forEach((segment) => {
        const trimmed = segment.trim();
        if (!trimmed || trimmed.indexOf("=") === -1) return;
        const [name, ...rest] = trimmed.split("=");
        cookies[name] = decodeURIComponent(rest.join("="));
    });
    return cookies;
}

app.use(express.json());
app.use((req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie || "");
    next();
});

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

app.set('dbPool', pool);

app.use("/uploads", express.static(uploadsDir));
app.use("/api/admin", adminRoutes);
app.use(express.static(path.join(__dirname, "..")));
const adminFrontend = path.join("C:", "Download", "Vault-Admin");

/*==================================
ADMIN STATIC ASSETS
==================================*/

app.use("/admin/css", express.static(path.join(adminFrontend, "css")));
app.use("/admin/js", express.static(path.join(adminFrontend, "js")));
app.use("/admin/modules-js", express.static(path.join(adminFrontend, "modules-js")));
app.use("/admin/assets", express.static(path.join(adminFrontend, "assets")));

/*==================================
PROTECTED ADMIN PAGES
==================================*/

app.get("/admin", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "admin.html"));
});

app.get("/admin/events", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "events.html"));
});

app.get("/admin/tickets", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "tickets.html"));
});

app.get("/admin/bookings", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "tickets.html"));
});

app.get("/admin/customers", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "customers.html"));
});

app.get("/admin/equipment", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "equipment.html"));
});

app.get("/admin/analytics", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "analytics.html"));
});

app.get("/admin/settings", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "settings.html"));
});

app.get("/admin/verification", requireAdmin, (req, res) => {
    res.sendFile(path.join(adminFrontend, "ticket-verification.html"));
});

app.use("/api/events", eventRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/tickets", ticketRoutes);

app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "VAULT backend is running ??",
            database: "connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

(async () => {
    try {
        await customerModel.ensureTable(pool);
        await adminModel.ensureTable(pool);
        await paymentModel.ensureTable(pool);
        await ticketModel.ensureTable(pool);
        await paymentService.expireStalePendingPayments();

        app.listen(PORT, () => {
            console.log(`VAULT server running on http://localhost:${PORT}`);
        });

        setInterval(() => {
            paymentService.expireStalePendingPayments().catch((error) => {
                console.error("STALE PAYMENT CLEANUP ERROR:", error);
            });
        }, 60 * 1000);
    } catch (err) {
        console.error('Failed to initialize database or start server', err);
        process.exit(1);
    }
})();














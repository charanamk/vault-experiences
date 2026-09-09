const { randomUUID, randomBytes } = require('crypto');

/* =========================================
   VAULT — ADMIN MODEL
   Admin identity + admin sessions
========================================= */

function makeToken(bytes = 32) {
    return randomBytes(bytes).toString('hex');
}


/* =========================================
   DATABASE INITIALIZATION
========================================= */

async function ensureTable(pool) {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'admin',
            is_active BOOLEAN NOT NULL DEFAULT true,
            last_login_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
            session_id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at TIMESTAMPTZ NULL
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id
        ON admin_sessions(admin_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
        ON admin_sessions(expires_at);
    `);
}


/* =========================================
   ADMIN LOOKUPS
========================================= */

async function findByEmail(pool, email) {

    const result = await pool.query(
        `
        SELECT *
        FROM admins
        WHERE email = $1
        `,
        [email]
    );

    return result.rows[0] || null;
}


async function findById(pool, id) {

    const result = await pool.query(
        `
        SELECT *
        FROM admins
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}


/* =========================================
   CREATE ADMIN
========================================= */

async function createAdmin(
    pool,
    email,
    passwordHash,
    fullName,
    role = 'admin'
) {

    const id = randomUUID();

    const result = await pool.query(
        `
        INSERT INTO admins (
            id,
            email,
            password_hash,
            full_name,
            role,
            is_active
        )
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
        `,
        [
            id,
            email,
            passwordHash,
            fullName,
            role
        ]
    );

    return result.rows[0];
}


/* =========================================
   UPDATE ADMIN
========================================= */

async function updateAdmin(
    pool,
    id,
    { fullName, email, role }
) {

    const result = await pool.query(
        `
        UPDATE admins
        SET
            full_name = COALESCE($2, full_name),
            email = COALESCE($3, email),
            role = COALESCE($4, role),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [
            id,
            fullName,
            email,
            role
        ]
    );

    return result.rows[0] || null;
}


/* =========================================
   ACTIVATE / DEACTIVATE ADMIN
========================================= */

async function setAdminActive(pool, id, isActive) {

    const result = await pool.query(
        `
        UPDATE admins
        SET
            is_active = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id, isActive]
    );

    return result.rows[0] || null;
}


/* =========================================
   PASSWORD
========================================= */

async function updatePassword(pool, id, passwordHash) {

    const result = await pool.query(
        `
        UPDATE admins
        SET
            password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id, passwordHash]
    );

    return result.rows[0] || null;
}


/* =========================================
   LOGIN TRACKING
========================================= */

async function updateLastLogin(pool, id) {

    await pool.query(
        `
        UPDATE admins
        SET
            last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        `,
        [id]
    );
}


/* =========================================
   ADMIN SESSIONS
========================================= */

async function createSession(
    pool,
    adminId,
    ttlMs = 1000 * 60 * 60 * 24 * 7
) {

    const sessionId = makeToken(32);

    const expiresAt = new Date(
        Date.now() + ttlMs
    ).toISOString();

    await pool.query(
        `
        INSERT INTO admin_sessions (
            session_id,
            admin_id,
            expires_at
        )
        VALUES ($1, $2, $3)
        `,
        [
            sessionId,
            adminId,
            expiresAt
        ]
    );

    return {
        sessionId,
        expiresAt
    };
}


async function findSessionById(pool, sessionId) {

    const result = await pool.query(
        `
        SELECT *
        FROM admin_sessions
        WHERE
            session_id = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [sessionId]
    );

    return result.rows[0] || null;
}


async function touchSession(pool, sessionId) {

    await pool.query(
        `
        UPDATE admin_sessions
        SET last_seen_at = NOW()
        WHERE session_id = $1
        `,
        [sessionId]
    );
}


async function revokeSession(pool, sessionId) {

    await pool.query(
        `
        UPDATE admin_sessions
        SET revoked_at = NOW()
        WHERE session_id = $1
        `,
        [sessionId]
    );
}


/* =========================================
   ADMIN LIST
========================================= */

async function getAllAdmins(pool) {

    const result = await pool.query(
        `
        SELECT
            id,
            email,
            full_name,
            role,
            is_active,
            last_login_at,
            created_at,
            updated_at
        FROM admins
        ORDER BY created_at DESC
        `
    );

    return result.rows;
}


/* =========================================
   EXPORTS
========================================= */

module.exports = {
    ensureTable,

    findByEmail,
    findById,

    createAdmin,
    updateAdmin,
    setAdminActive,
    updatePassword,
    updateLastLogin,

    createSession,
    findSessionById,
    touchSession,
    revokeSession,

    getAllAdmins,

    makeToken
};

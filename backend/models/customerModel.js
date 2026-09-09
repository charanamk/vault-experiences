const { randomUUID, randomBytes } = require('crypto');

function makeToken(bytes = 32) {
    return randomBytes(bytes).toString('hex');
}

async function ensureTable(pool) {
    const base = `
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        provider VARCHAR(50),
        provider_user_id VARCHAR(255),
        display_name VARCHAR(255),
        full_name VARCHAR(255),
        phone_number VARCHAR(50),
        is_guest BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        password_hash TEXT,
        notifications_enabled BOOLEAN DEFAULT true,
        event_reminders_enabled BOOLEAN DEFAULT true,
        privacy_profile_visible BOOLEAN DEFAULT true,
        privacy_marketing_opt_in BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    `;
    await pool.query(base);

    const columns = [
        ['full_name', 'VARCHAR(255)'],
        ['phone_number', 'VARCHAR(50)'],
        ['email_verified', 'BOOLEAN DEFAULT false'],
        ['notifications_enabled', 'BOOLEAN DEFAULT true'],
        ['event_reminders_enabled', 'BOOLEAN DEFAULT true'],
        ['privacy_profile_visible', 'BOOLEAN DEFAULT true'],
        ['privacy_marketing_opt_in', 'BOOLEAN DEFAULT false']
    ];

    for (const [columnName, definition] of columns) {
        await pool.query(`
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS ${columnName} ${definition}
        `);
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_sessions (
            session_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            is_guest BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL,
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            revoked_at TIMESTAMPTZ NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_verification_tokens (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            purpose TEXT NOT NULL DEFAULT 'email_verification',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ NULL,
            email TEXT NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_password_reset_tokens (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ NULL
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires_at ON customer_sessions(expires_at);
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_verification_tokens_customer_id ON customer_verification_tokens(customer_id);
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_password_reset_tokens_customer_id ON customer_password_reset_tokens(customer_id);
    `);
}

async function createGuest(pool) {
    const id = randomUUID();
    const sql = `INSERT INTO customers (id, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible) VALUES ($1, $2, false, true, true, true) RETURNING *`;
    const res = await pool.query(sql, [id, true]);
    return res.rows[0];
}

async function findByEmail(pool, email) {
    const res = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    return res.rows[0] || null;
}

async function findById(pool, id) {
    const res = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    return res.rows[0] || null;
}

async function createEmailCustomer(pool, email, passwordHash, displayName = null) {
    const id = randomUUID();
    const sql = `INSERT INTO customers (id, email, password_hash, display_name, full_name, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible) VALUES ($1, $2, $3, $4, $4, false, false, true, true, true) RETURNING *`;
    const res = await pool.query(sql, [id, email, passwordHash, displayName]);
    return res.rows[0];
}

async function updateCustomerProfile(pool, id, { fullName, email, phoneNumber }) {
    const sql = `
        UPDATE customers
        SET full_name = $2,
            email = $3,
            phone_number = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;
    const res = await pool.query(sql, [id, fullName, email, phoneNumber]);
    return res.rows[0] || null;
}

async function updatePassword(pool, id, passwordHash) {
    const sql = `
        UPDATE customers
        SET password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;
    const res = await pool.query(sql, [id, passwordHash]);
    return res.rows[0] || null;
}

async function getPreferences(pool, id) {
    const res = await pool.query(
        'SELECT notifications_enabled, event_reminders_enabled, privacy_profile_visible, privacy_marketing_opt_in FROM customers WHERE id = $1',
        [id]
    );
    return res.rows[0] || null;
}

async function updatePreferences(pool, id, prefs) {
    const sql = `
        UPDATE customers
        SET notifications_enabled = COALESCE($2, notifications_enabled),
            event_reminders_enabled = COALESCE($3, event_reminders_enabled),
            privacy_profile_visible = COALESCE($4, privacy_profile_visible),
            privacy_marketing_opt_in = COALESCE($5, privacy_marketing_opt_in),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;
    const res = await pool.query(sql, [id, prefs.notificationsEnabled, prefs.eventRemindersEnabled, prefs.privacyProfileVisible, prefs.privacyMarketingOptIn]);
    return res.rows[0] || null;
}

async function createSession(pool, customerId, isGuest = false, ttlMs = 1000 * 60 * 60 * 24 * 7) {
    const sessionId = makeToken(32);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    await pool.query(
        `INSERT INTO customer_sessions (session_id, customer_id, is_guest, expires_at) VALUES ($1, $2, $3, $4)`,
        [sessionId, customerId, isGuest, expiresAt]
    );
    return { sessionId, expiresAt };
}

async function findSessionById(pool, sessionId) {
    const res = await pool.query(
        `SELECT * FROM customer_sessions WHERE session_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
        [sessionId]
    );
    return res.rows[0] || null;
}

async function touchSession(pool, sessionId) {
    await pool.query(
        `UPDATE customer_sessions SET last_seen_at = NOW() WHERE session_id = $1`,
        [sessionId]
    );
}

async function revokeSession(pool, sessionId) {
    await pool.query(
        `UPDATE customer_sessions SET revoked_at = NOW() WHERE session_id = $1`,
        [sessionId]
    );
}

async function createVerificationToken(pool, customerId, email, purpose = 'email_verification', ttlMs = 1000 * 60 * 60 * 24 * 2) {
    const token = makeToken(32);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const id = randomUUID();
    await pool.query(
        `INSERT INTO customer_verification_tokens (id, customer_id, token, purpose, expires_at, email) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, customerId, token, purpose, expiresAt, email]
    );
    return { token, expiresAt };
}

async function findValidVerificationToken(pool, token) {
    const res = await pool.query(
        `SELECT * FROM customer_verification_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [token]
    );
    return res.rows[0] || null;
}

async function markVerificationTokenUsed(pool, token) {
    await pool.query(
        `UPDATE customer_verification_tokens SET used_at = NOW() WHERE token = $1`,
        [token]
    );
}

async function markCustomerVerified(pool, customerId) {
    await pool.query(
        `UPDATE customers SET email_verified = true, updated_at = NOW() WHERE id = $1`,
        [customerId]
    );
}

async function createPasswordResetToken(pool, customerId, ttlMs = 1000 * 60 * 60 * 2) {
    const token = makeToken(32);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const id = randomUUID();
    await pool.query(
        `INSERT INTO customer_password_reset_tokens (id, customer_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
        [id, customerId, token, expiresAt]
    );
    return { token, expiresAt };
}

async function findValidPasswordResetToken(pool, token) {
    const res = await pool.query(
        `SELECT * FROM customer_password_reset_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [token]
    );
    return res.rows[0] || null;
}

async function markPasswordResetUsed(pool, token) {
    await pool.query(
        `UPDATE customer_password_reset_tokens SET used_at = NOW() WHERE token = $1`,
        [token]
    );
}

module.exports = {
    ensureTable,
    createGuest,
    findByEmail,
    createEmailCustomer,
    findById,
    updateCustomerProfile,
    updatePassword,
    getPreferences,
    updatePreferences,
    createSession,
    findSessionById,
    touchSession,
    revokeSession,
    createVerificationToken,
    findValidVerificationToken,
    markVerificationTokenUsed,
    markCustomerVerified,
    createPasswordResetToken,
    findValidPasswordResetToken,
    markPasswordResetUsed,
    makeToken
};

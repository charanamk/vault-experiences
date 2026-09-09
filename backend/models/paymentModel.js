async function cleanupDuplicatePaymentState(pool) {
    await pool.query(`
        WITH ranked AS (
            SELECT id, provider_payment_id,
                   ROW_NUMBER() OVER (PARTITION BY provider_payment_id ORDER BY created_at ASC, id ASC) AS rn
            FROM payments
            WHERE provider_payment_id IS NOT NULL
        )
        UPDATE payments p
        SET provider_payment_id = NULL
        FROM ranked r
        WHERE p.id = r.id
          AND r.rn > 1;
    `);

    await pool.query(`
        WITH ranked AS (
            SELECT id, provider_checkout_id,
                   ROW_NUMBER() OVER (PARTITION BY provider_checkout_id ORDER BY created_at ASC, id ASC) AS rn
            FROM payments
            WHERE provider_checkout_id IS NOT NULL
        )
        UPDATE payments p
        SET provider_checkout_id = NULL
        FROM ranked r
        WHERE p.id = r.id
          AND r.rn > 1;
    `);

    await pool.query(`
        WITH ranked AS (
            SELECT id, provider_transaction_id,
                   ROW_NUMBER() OVER (PARTITION BY provider_transaction_id ORDER BY created_at ASC, id ASC) AS rn
            FROM payments
            WHERE provider_transaction_id IS NOT NULL
        )
        UPDATE payments p
        SET provider_transaction_id = NULL
        FROM ranked r
        WHERE p.id = r.id
          AND r.rn > 1;
    `);

    await pool.query(`
        WITH ranked AS (
            SELECT id, reservation_id,
                   ROW_NUMBER() OVER (PARTITION BY reservation_id ORDER BY is_current DESC, created_at DESC, id DESC) AS rn
            FROM payments
            WHERE reservation_id IS NOT NULL
              AND is_current = true
        )
        UPDATE payments p
        SET is_current = false
        FROM ranked r
        WHERE p.id = r.id
          AND r.rn > 1;
    `);
}

async function ensureTable(pool) {
    const reservationColumns = [
        ["payment_status", "VARCHAR(30) NOT NULL DEFAULT 'not_required'"],
        ["payment_amount", "NUMERIC(12,2) NOT NULL DEFAULT 0"],
        ["payment_currency", "VARCHAR(10) NOT NULL DEFAULT 'KES'"],
        ["requires_payment", "BOOLEAN NOT NULL DEFAULT false"],
        ["paid_at", "TIMESTAMPTZ NULL"],
        ["payment_reference", "VARCHAR(255) NULL"],
        ["ticket_id", "INTEGER NULL"],
        ["ticket_status", "VARCHAR(30) NOT NULL DEFAULT 'not_issued'"]
    ];

    for (const [columnName, definition] of reservationColumns) {
        await pool.query(
            `
            ALTER TABLE reservations
            ADD COLUMN IF NOT EXISTS ${columnName} ${definition}
            `
        );
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
            reference VARCHAR(255),
            customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            amount NUMERIC(12,2) NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'KES',
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            provider_name VARCHAR(50) NOT NULL DEFAULT 'not_set',
            provider_payment_id VARCHAR(255),
            provider_intent_id VARCHAR(255),
            provider_checkout_id VARCHAR(255),
            provider_transaction_id VARCHAR(255),
            payment_method VARCHAR(50) NOT NULL DEFAULT 'not_set',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            paid_at TIMESTAMPTZ NULL,
            expires_at TIMESTAMPTZ NULL,
            callback_received_at TIMESTAMPTZ NULL,
            is_current BOOLEAN NOT NULL DEFAULT false,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        );
    `);

    await pool.query(`
        ALTER TABLE payments
        DROP CONSTRAINT IF EXISTS payments_reservation_id_key;
    `);

    await pool.query(`
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
    `);

    await pool.query(`
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;
    `);

    await pool.query(`
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(255);
    `);

    await pool.query(`
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS callback_received_at TIMESTAMPTZ;
    `);

    await pool.query(`
        UPDATE payments
        SET reference = CONCAT('VLT-PAY-', id)
        WHERE reference IS NULL;
    `);

    await pool.query(`
        ALTER TABLE payments
        ALTER COLUMN reference SET NOT NULL;
    `);

    await cleanupDuplicatePaymentState(pool);

    await pool.query(`
        WITH ranked AS (
            SELECT id, reservation_id,
                   ROW_NUMBER() OVER (PARTITION BY reservation_id ORDER BY is_current DESC, created_at DESC, id DESC) AS rn
            FROM payments
            WHERE reservation_id IS NOT NULL
        )
        UPDATE payments p
        SET is_current = (p.id = (
            SELECT id FROM ranked r
            WHERE r.reservation_id = p.reservation_id
            ORDER BY r.rn ASC
            LIMIT 1
        ))
        WHERE p.reservation_id IS NOT NULL;
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_unique
        ON payments(reference);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_customer_id
        ON payments(customer_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_reservation_id
        ON payments(reservation_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_is_current
        ON payments(is_current, reservation_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_status
        ON payments(status);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id
        ON payments(provider_payment_id);
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id_unique
        ON payments(provider_payment_id)
        WHERE provider_payment_id IS NOT NULL;
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_checkout_id_unique
        ON payments(provider_checkout_id)
        WHERE provider_checkout_id IS NOT NULL;
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_transaction_id_unique
        ON payments(provider_transaction_id)
        WHERE provider_transaction_id IS NOT NULL;
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_current_unique
        ON payments(reservation_id)
        WHERE is_current = true;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_audit_logs (
            id SERIAL PRIMARY KEY,
            payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
            reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
            customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
            event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
            action VARCHAR(80) NOT NULL,
            status VARCHAR(30),
            provider_name VARCHAR(50),
            provider_reference VARCHAR(255),
            provider_transaction_id VARCHAR(255),
            callback_received_at TIMESTAMPTZ,
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payment_id
        ON payment_audit_logs(payment_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_reservation_id
        ON payment_audit_logs(reservation_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reservations_payment_status
        ON reservations(payment_status);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reservations_requires_payment
        ON reservations(requires_payment);
    `);
}

async function createPayment(pool, payload = {}) {
    await ensureTable(pool);

    const {
        reference,
        reservationId,
        customerId,
        eventId,
        amount = 0,
        currency = "KES",
        status = "pending",
        providerName = "not_set",
        providerPaymentId = null,
        providerIntentId = null,
        providerCheckoutId = null,
        providerTransactionId = null,
        paymentMethod = "not_set",
        expiresAt = null,
        callbackReceivedAt = null,
        metadata = {}
    } = payload;

    const internalReference = reference || `VLT-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        if (reservationId) {
            await client.query(
                `
                UPDATE payments
                SET is_current = false
                WHERE reservation_id = $1
                `,
                [reservationId]
            );
        }

        if (providerPaymentId) {
            const existing = await client.query(
                `SELECT id FROM payments WHERE provider_payment_id = $1 LIMIT 1`,
                [providerPaymentId]
            );

            if (existing.rows[0]) {
                const error = new Error("Provider payment identifier is already attached to another payment attempt.");
                error.code = "DUPLICATE_PROVIDER_PAYMENT_ID";
                throw error;
            }
        }

        if (providerCheckoutId) {
            const existing = await client.query(
                `SELECT id FROM payments WHERE provider_checkout_id = $1 LIMIT 1`,
                [providerCheckoutId]
            );

            if (existing.rows[0]) {
                const error = new Error("Provider checkout identifier is already attached to another payment attempt.");
                error.code = "DUPLICATE_PROVIDER_CHECKOUT_ID";
                throw error;
            }
        }

        if (providerTransactionId) {
            const existing = await client.query(
                `SELECT id FROM payments WHERE provider_transaction_id = $1 LIMIT 1`,
                [providerTransactionId]
            );

            if (existing.rows[0]) {
                const error = new Error("Provider transaction identifier is already attached to another payment attempt.");
                error.code = "DUPLICATE_PROVIDER_TRANSACTION_ID";
                throw error;
            }
        }

        const result = await client.query(
            `
            INSERT INTO payments (
                reference,
                reservation_id,
                customer_id,
                event_id,
                amount,
                currency,
                status,
                provider_name,
                provider_payment_id,
                provider_intent_id,
                provider_checkout_id,
                provider_transaction_id,
                payment_method,
                expires_at,
                callback_received_at,
                is_current,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16)
            RETURNING *
            `,
            [
                internalReference,
                reservationId,
                customerId,
                eventId,
                amount,
                currency,
                status,
                providerName,
                providerPaymentId,
                providerIntentId,
                providerCheckoutId,
                providerTransactionId,
                paymentMethod,
                expiresAt,
                callbackReceivedAt,
                JSON.stringify(metadata || {})
            ]
        );

        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

async function findPaymentsByReservationId(pool, reservationId) {
    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE reservation_id = $1
        ORDER BY created_at ASC, id ASC
        `,
        [reservationId]
    );

    return result.rows;
}

async function findCurrentPaymentByReservationId(pool, reservationId) {
    await ensureTable(pool);
    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE reservation_id = $1
        ORDER BY is_current DESC, created_at DESC, id DESC
        LIMIT 1
        `,
        [reservationId]
    );

    const payment = result.rows[0] || null;
    if (payment) {
        return payment;
    }

    const fallback = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE reservation_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `,
        [reservationId]
    );

    return fallback.rows[0] || null;
}

async function setCurrentPaymentForReservation(pool, reservationId, paymentId) {
    if (!reservationId || !paymentId) {
        return null;
    }

    await pool.query(
        `
        UPDATE payments
        SET is_current = false
        WHERE reservation_id = $1
          AND id != $2
        `,
        [reservationId, paymentId]
    );

    const result = await pool.query(
        `
        UPDATE payments
        SET is_current = true
        WHERE reservation_id = $1
          AND id = $2
        RETURNING *
        `,
        [reservationId, paymentId]
    );

    return result.rows[0] || null;
}

async function findPaymentByReservationId(pool, reservationId) {
    return findCurrentPaymentByReservationId(pool, reservationId);
}

async function updatePaymentStatus(pool, reservationId, status, extra = {}) {
    const currentPayment = await findCurrentPaymentByReservationId(pool, reservationId);
    if (!currentPayment) {
        return null;
    }

    return updatePaymentStatusById(pool, currentPayment.id, status, extra);
}

async function updatePaymentStatusById(pool, paymentId, status, extra = {}) {
    const existingPayment = await findPaymentById(pool, paymentId);
    if (!existingPayment) {
        return null;
    }

    const {
        amount,
        providerPaymentId,
        providerIntentId,
        providerCheckoutId,
        providerTransactionId,
        paymentMethod,
        paidAt,
        expiresAt,
        callbackReceivedAt,
        metadata
    } = extra;

    const guardedIdentifiers = [
        ["provider_payment_id", providerPaymentId, existingPayment.provider_payment_id],
        ["provider_checkout_id", providerCheckoutId, existingPayment.provider_checkout_id],
        ["provider_transaction_id", providerTransactionId, existingPayment.provider_transaction_id]
    ];

    for (const [fieldName, nextValue, currentValue] of guardedIdentifiers) {
        if (nextValue === undefined) {
            continue;
        }

        if (currentValue && currentValue !== nextValue) {
            const error = new Error(`Payment attempt ${paymentId} cannot mutate its canonical ${fieldName} identifier.`);
            error.code = "PAYMENT_IDENTIFIER_MUTATION_BLOCKED";
            throw error;
        }
    }

    const updateFields = [
        "status = $2",
        "updated_at = NOW()"
    ];

    const values = [paymentId, status];
    let index = 3;

    if (amount !== undefined) {
        updateFields.push(`amount = $${index}`);
        values.push(amount);
        index += 1;
    }

    if (providerPaymentId !== undefined) {
        updateFields.push(`provider_payment_id = $${index}`);
        values.push(providerPaymentId);
        index += 1;
    }

    if (providerIntentId !== undefined) {
        updateFields.push(`provider_intent_id = $${index}`);
        values.push(providerIntentId);
        index += 1;
    }

    if (providerCheckoutId !== undefined) {
        updateFields.push(`provider_checkout_id = $${index}`);
        values.push(providerCheckoutId);
        index += 1;
    }

    if (providerTransactionId !== undefined) {
        updateFields.push(`provider_transaction_id = $${index}`);
        values.push(providerTransactionId);
        index += 1;
    }

    if (callbackReceivedAt !== undefined) {
        updateFields.push(`callback_received_at = $${index}`);
        values.push(callbackReceivedAt);
        index += 1;
    }

    if (paymentMethod !== undefined) {
        updateFields.push(`payment_method = $${index}`);
        values.push(paymentMethod);
        index += 1;
    }

    if (paidAt !== undefined) {
        updateFields.push(`paid_at = $${index}`);
        values.push(paidAt);
        index += 1;
    }

    if (expiresAt !== undefined) {
        updateFields.push(`expires_at = $${index}`);
        values.push(expiresAt || null);
        index += 1;
    }

    if (metadata !== undefined) {
        updateFields.push(`metadata = $${index}`);
        values.push(JSON.stringify(metadata || {}));
        index += 1;
    }

    const result = await pool.query(
        `
        UPDATE payments
        SET ${updateFields.join(", ")}
        WHERE id = $1
        RETURNING *
        `,
        values
    );

    const updated = result.rows[0] || null;
    if (!updated) {
        return null;
    }

    const currentPayment = await findCurrentPaymentByReservationId(pool, updated.reservation_id);
    if (currentPayment && currentPayment.id === updated.id) {
        await setCurrentPaymentForReservation(pool, updated.reservation_id, updated.id);
    }

    return updated;
}

async function findPaymentById(pool, id) {
    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findPaymentByReference(pool, reference) {
    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE reference = $1
        `,
        [reference]
    );

    return result.rows[0] || null;
}

async function findPaymentByProviderId(pool, providerPaymentId) {
    await ensureTable(pool);
    if (!providerPaymentId) {
        return null;
    }

    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE provider_payment_id = $1
           OR provider_checkout_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [providerPaymentId]
    );

    return result.rows[0] || null;
}

async function findPaymentByProviderCheckoutId(pool, providerCheckoutId) {
    await ensureTable(pool);
    if (!providerCheckoutId) {
        return null;
    }

    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE provider_checkout_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [providerCheckoutId]
    );

    return result.rows[0] || null;
}

async function findPaymentByProviderTransactionId(pool, providerTransactionId) {
    await ensureTable(pool);
    if (!providerTransactionId) {
        return null;
    }

    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE provider_transaction_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [providerTransactionId]
    );

    return result.rows[0] || null;
}

async function findPaymentsByCustomerId(pool, customerId) {
    const result = await pool.query(
        `
        SELECT p.*
        FROM payments p
        WHERE p.customer_id = $1
        ORDER BY p.created_at DESC, p.id DESC
        `,
        [customerId]
    );

    return result.rows;
}

async function findCustomerPaymentHistory(pool, customerId) {
    const result = await pool.query(
        `
        SELECT
            p.id,
            p.reference,
            p.reservation_id,
            r.reference AS booking_reference,
            e.title AS event_title,
            COALESCE(it.ticket_name, e.title, 'Admission') AS ticket_category,
            p.amount,
            p.currency,
            p.status,
            p.provider_name,
            COALESCE(p.provider_payment_id, p.provider_checkout_id) AS provider_reference,
            p.created_at,
            p.updated_at,
            p.paid_at,
            p.expires_at,
            p.is_current
        FROM payments p
        INNER JOIN reservations r ON r.id = p.reservation_id
        LEFT JOIN events e ON e.id = p.event_id
        LEFT JOIN issued_tickets it ON it.reservation_id = p.reservation_id
        WHERE p.customer_id = $1
        ORDER BY p.created_at DESC, p.id DESC
        `,
        [customerId]
    );

    return result.rows;
}

async function findStalePendingPayments(pool, now = new Date()) {
    const result = await pool.query(
        `
        SELECT *
        FROM payments
        WHERE status IN ('pending', 'processing')
          AND expires_at IS NOT NULL
          AND expires_at <= $1
        ORDER BY created_at ASC
        `,
        [now.toISOString()]
    );

    return result.rows;
}

async function syncReservationPaymentState(pool, reservationId, payment) {
    if (!reservationId || !payment) {
        return null;
    }

    const nextStatus = payment.status || "pending";
    const requiresPayment = Number(payment.amount || 0) > 0;
    const statusValue = requiresPayment ? nextStatus : "not_required";

    const result = await pool.query(
        `
        UPDATE reservations
        SET
            payment_status = $2,
            payment_amount = $3,
            payment_currency = $4,
            requires_payment = $5,
            payment_reference = $6,
            paid_at = $7
        WHERE id = $1
        RETURNING *
        `,
        [
            reservationId,
            statusValue,
            Number(payment.amount || 0),
            payment.currency || "KES",
            requiresPayment,
            payment.reference || null,
            nextStatus === "paid" ? new Date().toISOString() : null
        ]
    );

    return result.rows[0] || null;
}

async function insertPaymentAuditLog(pool, payload = {}) {
    const {
        paymentId,
        reservationId,
        customerId,
        eventId,
        action,
        status,
        providerName,
        providerReference,
        providerTransactionId,
        callbackReceivedAt,
        details = {}
    } = payload;

    if (!action) {
        return null;
    }

    const result = await pool.query(
        `
        INSERT INTO payment_audit_logs (
            payment_id,
            reservation_id,
            customer_id,
            event_id,
            action,
            status,
            provider_name,
            provider_reference,
            provider_transaction_id,
            callback_received_at,
            details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `,
        [
            paymentId || null,
            reservationId || null,
            customerId || null,
            eventId || null,
            action,
            status || null,
            providerName || null,
            providerReference || null,
            providerTransactionId || null,
            callbackReceivedAt || null,
            JSON.stringify(details || {})
        ]
    );

    return result.rows[0] || null;
}

async function getPaymentAuditLogs(pool, paymentId = null, reservationId = null) {
    const clauses = [];
    const values = [];
    let index = 1;

    if (paymentId) {
        clauses.push(`payment_id = $${index}`);
        values.push(paymentId);
        index += 1;
    }

    if (reservationId) {
        clauses.push(`reservation_id = $${index}`);
        values.push(reservationId);
        index += 1;
    }

    if (!clauses.length) {
        return [];
    }

    const result = await pool.query(
        `
        SELECT *
        FROM payment_audit_logs
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at ASC, id ASC
        `,
        values
    );

    return result.rows;
}

async function detectPaymentInconsistencies(pool) {
    const [paidWithoutConfirmedBooking, bookingPaidWithoutSuccessfulPayment, paidPaymentWithoutTicket, duplicateCurrentPayments, duplicateProviderTransactions, stalePendingPayments, incompleteFinalization] = await Promise.all([
        pool.query(`
            SELECT p.id AS payment_id, p.reservation_id, p.reference, p.customer_id, p.status
            FROM payments p
            INNER JOIN reservations r ON r.id = p.reservation_id
            WHERE p.status = 'paid'
              AND r.payment_status != 'paid'
            ORDER BY p.created_at ASC
        `),
        pool.query(`
            SELECT r.id AS reservation_id, r.reference, r.payment_status
            FROM reservations r
            WHERE r.payment_status = 'paid'
              AND NOT EXISTS (
                SELECT 1 FROM payments p
                WHERE p.reservation_id = r.id
                  AND p.status = 'paid'
              )
            ORDER BY r.id ASC
        `),
        pool.query(`
            SELECT p.id AS payment_id, p.reservation_id, p.reference
            FROM payments p
            WHERE p.status = 'paid'
              AND NOT EXISTS (
                SELECT 1 FROM issued_tickets it
                WHERE it.reservation_id = p.reservation_id
              )
            ORDER BY p.created_at ASC
        `),
        pool.query(`
            SELECT reservation_id, COUNT(*) AS current_count
            FROM payments
            WHERE is_current = true
            GROUP BY reservation_id
            HAVING COUNT(*) > 1
            ORDER BY reservation_id ASC
        `),
        pool.query(`
            SELECT provider_transaction_id, COUNT(*) AS duplicate_count
            FROM payments
            WHERE provider_transaction_id IS NOT NULL
            GROUP BY provider_transaction_id
            HAVING COUNT(*) > 1
            ORDER BY provider_transaction_id ASC
        `),
        pool.query(`
            SELECT id AS payment_id, reservation_id, reference, status, expires_at
            FROM payments
            WHERE status IN ('pending', 'processing')
              AND expires_at IS NOT NULL
              AND expires_at <= NOW()
            ORDER BY expires_at ASC
        `),
        pool.query(`
            SELECT p.id AS payment_id, p.reservation_id, p.reference, p.status
            FROM payments p
            LEFT JOIN issued_tickets it ON it.reservation_id = p.reservation_id
            WHERE p.status = 'paid'
              AND (
                p.reservation_id IS NULL
                OR it.id IS NULL
              )
            ORDER BY p.created_at ASC
        `)
    ]);

    return {
        paidWithoutConfirmedBooking: paidWithoutConfirmedBooking.rows,
        bookingPaidWithoutSuccessfulPayment: bookingPaidWithoutSuccessfulPayment.rows,
        paidPaymentWithoutTicket: paidPaymentWithoutTicket.rows,
        duplicateCurrentPayments: duplicateCurrentPayments.rows,
        duplicateProviderTransactions: duplicateProviderTransactions.rows,
        stalePendingPayments: stalePendingPayments.rows,
        incompleteFinalization: incompleteFinalization.rows
    };
}

module.exports = {
    ensureTable,
    createPayment,
    findPaymentsByReservationId,
    findCurrentPaymentByReservationId,
    findPaymentByReservationId,
    setCurrentPaymentForReservation,
    findPaymentById,
    findPaymentByReference,
    findPaymentByProviderId,
    findPaymentByProviderCheckoutId,
    findPaymentByProviderTransactionId,
    findPaymentsByCustomerId,
    findCustomerPaymentHistory,
    findStalePendingPayments,
    insertPaymentAuditLog,
    getPaymentAuditLogs,
    detectPaymentInconsistencies,
    updatePaymentStatus,
    updatePaymentStatusById,
    syncReservationPaymentState
};

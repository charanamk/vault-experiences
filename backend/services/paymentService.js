const crypto = require("crypto");
const pool = require("../config/db");
const paymentModel = require("../models/paymentModel");
const ticketModel = require("../models/ticketModel");
const { PaymentProviderAdapter } = require("./paymentProviderAdapter");
const MpesaProviderAdapter = require("./mpesaProviderAdapter");

const PAYMENT_STATUSES = new Set([
    "pending",
    "processing",
    "paid",
    "failed",
    "cancelled",
    "expired"
]);

const ALLOWED_STATUS_TRANSITIONS = {
    pending: new Set(["processing", "paid", "failed", "cancelled", "expired"]),
    processing: new Set(["paid", "failed", "cancelled"]),
    failed: new Set(["pending"]),
    cancelled: new Set(),
    expired: new Set(),
    paid: new Set()
};

function generateInternalReference() {
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `VLT-PAY-${timePart}-${randomPart}`;
}

function normalizeStatus(status) {
    return String(status || "").trim().toLowerCase();
}

function coerceMoney(amount) {
    const numeric = Number(amount || 0);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    return Number(numeric.toFixed(2));
}

async function resolveReservationByIdOrReference({ reservationId, reservationReference }) {
    const query = `
        SELECT *
        FROM reservations
        WHERE (${reservationId ? "id = $1" : "false"})
           OR (${reservationReference ? "reference = $2" : "false"})
        ORDER BY created_at DESC
        LIMIT 1
    `;

    const values = [];
    if (reservationId) values.push(reservationId);
    if (reservationReference) values.push(reservationReference);

    if (!values.length) {
        const error = new Error("A reservation identifier is required.");
        error.code = "INVALID_RESERVATION";
        throw error;
    }

    const result = await pool.query(query, values);
    const reservation = result.rows[0] || null;

    if (!reservation) {
        const error = new Error("Reservation not found.");
        error.code = "RESERVATION_NOT_FOUND";
        throw error;
    }

    return reservation;
}

async function determinePayableAmountFromBooking(reservation) {
    const guestCount = Number(reservation.guests || 1);

    const ticketQuery = `
        SELECT *
        FROM tickets
        WHERE id = $1
        LIMIT 1
    `;

    const ticketResult = await pool.query(
        ticketQuery,
        [reservation.ticket_id]
    );

    const ticket = ticketResult.rows[0] || null;
    const unitPrice = coerceMoney(ticket ? ticket.price : 0);

    const amount = Number(
        (unitPrice * Math.max(guestCount, 1)).toFixed(2)
    );

    return {
        amount,
        currency:
            String(
                reservation.payment_currency || "KES"
            ).toUpperCase() || "KES",
        unitPrice,
        ticket
    };
}

async function getPaymentById(paymentId) {
    const payment = await paymentModel.findPaymentById(pool, paymentId);
    return payment || null;
}

async function getPaymentByReference(reference) {
    const payment = await paymentModel.findPaymentByReference(pool, reference);
    return payment || null;
}

async function getPaymentByReservationId(reservationId) {
    const payment = await paymentModel.findPaymentByReservationId(pool, reservationId);
    return payment || null;
}

async function getPaymentByProviderId(providerPaymentId) {
    const payment = await paymentModel.findPaymentByProviderId(pool, providerPaymentId);
    return payment || null;
}

async function getPaymentByProviderCheckoutId(providerCheckoutId) {
    const payment = await paymentModel.findPaymentByProviderCheckoutId(pool, providerCheckoutId);
    return payment || null;
}

async function getPaymentsByCustomerId(customerId) {
    if (!customerId) {
        return [];
    }

    return paymentModel.findCustomerPaymentHistory(pool, customerId);
}

async function getCurrentPaymentByReservationId(reservationId) {
    if (!reservationId) {
        return null;
    }

    return paymentModel.findCurrentPaymentByReservationId(pool, reservationId);
}

async function detectPaymentInconsistencies() {
    return paymentModel.detectPaymentInconsistencies(pool);
}

async function reconcilePaymentIntegrity() {
    const inconsistencies = await detectPaymentInconsistencies();
    const repairs = [];

    for (const payment of inconsistencies.paidWithoutConfirmedBooking || []) {
        const paymentRow = await getPaymentById(payment.payment_id);
        if (!paymentRow) {
            continue;
        }

        const reservation = await pool.query(`SELECT * FROM reservations WHERE id = $1 FOR UPDATE`, [paymentRow.reservation_id]);
        const record = reservation.rows[0];
        if (!record) {
            continue;
        }

        const ticket = await ticketModel.getTicketByReservationId(paymentRow.reservation_id);
        if (paymentRow.status === "paid" && !ticket) {
            await finalizePaidReservationForPayment(paymentRow);
            repairs.push({ type: "paid_payment_missing_ticket", payment_id: paymentRow.id, reservation_id: paymentRow.reservation_id });
        }
    }

    for (const current of inconsistencies.duplicateCurrentPayments || []) {
        const rows = await pool.query(
            `
            SELECT *
            FROM payments
            WHERE reservation_id = $1
              AND is_current = true
            ORDER BY created_at DESC, id DESC
            `,
            [current.reservation_id]
        );

        if (rows.rows.length > 1) {
            const keep = rows.rows[0];
            for (const row of rows.rows.slice(1)) {
                await pool.query(`UPDATE payments SET is_current = false WHERE id = $1`, [row.id]);
                repairs.push({ type: "duplicate_current_payment_removed", payment_id: row.id, reservation_id: current.reservation_id, kept_payment_id: keep.id });
            }
        }
    }

    return {
        inconsistencies,
        repairs
    };
}

async function createPaymentForBooking({ reservationId, reservationReference, customerId, providerName = "vault_internal", phoneNumber, metadata = {} }) {
    const reservation = await resolveReservationByIdOrReference({ reservationId, reservationReference });

    const resolvedCustomerId = reservation.customer_id || customerId;

    if (!resolvedCustomerId) {
        const error = new Error("A valid customer context is required to create a payment.");
        error.code = "INVALID_CUSTOMER";
        throw error;
    }

    if (customerId && reservation.customer_id && reservation.customer_id !== customerId) {
        const error = new Error("Reservation does not belong to this customer.");
        error.code = "FORBIDDEN";
        throw error;
    }

    const pendingPayment = await paymentModel.findPaymentByReservationId(pool, reservation.id);
    const normalizedExistingStatus = pendingPayment ? normalizeStatus(pendingPayment.status) : null;
    const hasProviderIdentifiers = Boolean(
        pendingPayment &&
        (pendingPayment.provider_payment_id || pendingPayment.provider_checkout_id)
    );

    if (pendingPayment && ["processing", "paid"].includes(normalizedExistingStatus)) {


        return {
            ...pendingPayment,
            isExisting: true,
            idempotent: true
        };
    }

    if (pendingPayment && normalizedExistingStatus === "pending" && hasProviderIdentifiers) {
        return {
            ...pendingPayment,
            isExisting: true,
            idempotent: true
        };
    }

    if (pendingPayment && ["failed", "cancelled", "expired"].includes(normalizedExistingStatus)) {
        const { amount, currency } = await determinePayableAmountFromBooking(reservation);
        const retryPayment = await paymentModel.createPayment(pool, {
            reference: generateInternalReference(),
            reservationId: reservation.id,
            customerId: resolvedCustomerId,
            eventId: reservation.event_id,
            amount,
            currency,
            status: "pending",
            providerName,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            metadata: {
                ...(pendingPayment.metadata || {}),
                retry_count: Number((pendingPayment.metadata && pendingPayment.metadata.retry_count) || 0) + 1,
                last_retry_at: new Date().toISOString(),
                current_provider: providerName,
                source: "booking_system",
                previous_payment_id: pendingPayment.id
            }
        });

        if (retryPayment) {
            await paymentModel.syncReservationPaymentState(pool, reservation.id, retryPayment);
            return {
                ...retryPayment,
                amount,
                currency,
                isExisting: false,
                idempotent: false,
                retried: true,
                previousPaymentId: pendingPayment.id
            };
        }
    }

    const { amount, currency } = await determinePayableAmountFromBooking(reservation);

    let payment = null;
    let isExisting = false;

    if (pendingPayment && normalizedExistingStatus === "pending" && !hasProviderIdentifiers) {


        payment = pendingPayment;


        isExisting = true;
    } else {
        const internalReference = generateInternalReference();
        payment = await paymentModel.createPayment(pool, {
            reference: internalReference,
            reservationId: reservation.id,
            customerId: resolvedCustomerId,
            eventId: reservation.event_id,
            amount,
            currency,
            status: "pending",
            providerName,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            metadata: {
                created_by: "vault_backend",
                booking_reference: reservation.reference,
                guest_count: Number(reservation.guests || 1),
                source: "booking_system",
                ...metadata
            }
        });

        await paymentModel.syncReservationPaymentState(pool, reservation.id, payment);
    }

    const normalizedProviderName = String(providerName || process.env.PAYMENT_PROVIDER || "mpesa").toLowerCase();
    if (normalizedProviderName === "mpesa") {
        const isMpesaEnabled = String(process.env.MPESA_ENABLE_STK || "false").toLowerCase() === "true";
        const hasMpesaConfig = Boolean(
            process.env.MPESA_CONSUMER_KEY &&
            process.env.MPESA_CONSUMER_SECRET &&
            process.env.MPESA_SHORTCODE &&
            process.env.MPESA_PASSKEY
        );

        if (!isMpesaEnabled || !hasMpesaConfig) {
            const missing = [];
            if (!process.env.MPESA_CONSUMER_KEY) missing.push("MPESA_CONSUMER_KEY");
            if (!process.env.MPESA_CONSUMER_SECRET) missing.push("MPESA_CONSUMER_SECRET");
            if (!process.env.MPESA_SHORTCODE) missing.push("MPESA_SHORTCODE");
            if (!process.env.MPESA_PASSKEY) missing.push("MPESA_PASSKEY");

            const reason = !isMpesaEnabled
                ? "M-Pesa STK push is disabled (MPESA_ENABLE_STK is not set to true)."
                : `M-Pesa STK push cannot be dispatched: missing configuration (${missing.join(", ")}). Shortcode and Passkey are currently unavailable.`;

            return {
                ...payment,
                amount,
                currency,
                provider: {
                    providerName: "mpesa",
                    status: "not_configured",
                    message: reason
                },
                isExisting,
                idempotent: false
            };
        }

        const mpesaAdapter = new MpesaProviderAdapter();
        const providerContext = {
            amount,
            currency,
            reference: payment.reference,
            phoneNumber,
            reservationId: reservation.id,
            customerId: resolvedCustomerId,
            description: `VAULT reservation ${reservation.reference}`,
            metadata: {
                booking_reference: reservation.reference,
                event_id: reservation.event_id,
                customer_id: resolvedCustomerId
            }
        };
const providerResult = await mpesaAdapter.createPayment(providerContext);

const providerStatus = String(providerResult?.status || "").toLowerCase();
const providerResponseCode = providerResult?.responseCode;

const paymentStatus =
    providerStatus === "failed" ||
    (providerResponseCode !== null &&
     providerResponseCode !== undefined &&
     String(providerResponseCode) !== "0")
        ? "failed"
        : "processing";

const updatedPayment = await updatePaymentStatus(payment.id, paymentStatus, {
    providerPaymentId: providerResult?.providerPaymentId || providerResult?.merchantRequestId || null,
    providerCheckoutId: providerResult?.checkoutRequestId || providerResult?.merchantRequestId || null,
    paymentMethod: "mpesa",
    metadata: {
        ...(payment.metadata || {}),
        provider: {
            name: "mpesa",
            status: providerStatus,
            responseCode: providerResult?.responseCode,
            responseDescription: providerResult?.responseDescription,
            checkoutRequestId: providerResult?.checkoutRequestId,
            merchantRequestId: providerResult?.merchantRequestId,
            raw: providerResult?.raw || null
        }
    }
});

return {
    ...updatedPayment,
    amount,
    currency,
    provider: providerResult,
    isExisting,
    idempotent: false
};

    }

    return {
        ...payment,
        amount,
        currency,
        isExisting,
        idempotent: false
    };
}

function buildTicketReference(baseRef = "", prefix = "VLT") {
    const rawBase = String(baseRef || `TIX-${Date.now()}`)
        .replace(/[^A-Z0-9-]/gi, "")
        .toUpperCase();
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const compactBase = rawBase.slice(0, Math.max(0, 48 - prefix.length - suffix.length - 2));
    const candidate = `${prefix}-${compactBase}-${suffix}`.replace(/-+/g, "-").replace(/-$/, "");
    return candidate.length > 50 ? candidate.slice(0, 50) : candidate;
}

async function finalizePaidReservationForPayment(payment) {
    if (!payment || !payment.reservation_id) {
        return null;
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const reservationResult = await client.query(
            `
            SELECT *
            FROM reservations
            WHERE id = $1
            FOR UPDATE
            `,
            [payment.reservation_id]
        );

        const reservation = reservationResult.rows[0];
        if (!reservation) {
            await client.query("ROLLBACK");
            return null;
        }

        const existingTicketResult = await client.query(
            `
            SELECT *
            FROM issued_tickets
            WHERE reservation_id = $1
            FOR UPDATE
            `,
            [reservation.id]
        );

        let ticket = existingTicketResult.rows[0] || null;

        if (!ticket) {
            const ticketReference = buildTicketReference(payment.reference || reservation.reference || `TIX-${Date.now()}`);
            const qrCode = await require("qrcode").toDataURL(ticketReference);

            const insertResult = await client.query(
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
                    reservation.id,
                    reservation.customer_id || payment.customer_id,
                    reservation.event_id,
                    reservation.ticket_name || reservation.ticket_category || "Admission",
                    reservation.ticket_category || reservation.ticket_name || "Admission",
                    ticketReference,
                    reservation.reference,
                    payment.reference,
                    payment.id,
                    reservation.attendee_name,
                    reservation.attendee_email,
                    Number(reservation.guests || 1),
                    reservation.event_date || null,
                    reservation.event_time || null,
                    reservation.location || null,
                    "valid",
                    qrCode
                ]
            );

            ticket = insertResult.rows[0] || null;

            if (ticket) {
                await client.query(
                    `
                    UPDATE reservations
                    SET ticket_id = $1,
                        payment_status = 'paid',
                        paid_at = COALESCE(paid_at, NOW()),
                        requires_payment = false
                    WHERE id = $2
                    `,
                    [ticket.id, reservation.id]
                );
            }
        }

        if (!ticket) {
            await client.query(
                `
                UPDATE reservations
                SET payment_status = 'paid',
                    paid_at = COALESCE(paid_at, NOW()),
                    requires_payment = false
                WHERE id = $1
                `,
                [reservation.id]
            );
        }

        await client.query("COMMIT");
        return ticket;

    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

async function updatePaymentStatus(paymentId, nextStatus, extra = {}) {
    const normalizedStatus = normalizeStatus(nextStatus);

    if (!PAYMENT_STATUSES.has(normalizedStatus)) {
        const error = new Error(`Unsupported payment status: ${nextStatus}`);
        error.code = "INVALID_PAYMENT_STATUS";
        throw error;
    }

    const payment = await getPaymentById(paymentId);
    if (!payment) {
        const error = new Error("Payment not found.");
        error.code = "PAYMENT_NOT_FOUND";
        throw error;
    }

    const currentStatus = normalizeStatus(payment.status);

    if (currentStatus === normalizedStatus) {
        if (normalizedStatus === "paid") {
            await finalizePaidReservationForPayment(payment);
        }
        return payment;
    }

    if (currentStatus === "paid" && normalizedStatus !== "paid") {
        const error = new Error("A paid payment cannot be reverted to another status.");
        error.code = "PAYMENT_REVERSION_BLOCKED";
        throw error;
    }

    if (currentStatus === "paid" && normalizedStatus === "paid") {
        return payment;

    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || new Set();
    if (!allowedTransitions.has(normalizedStatus)) {
        const error = new Error(`Invalid transition from ${currentStatus} to ${normalizedStatus}.`);
        error.code = "INVALID_STATUS_TRANSITION";
        throw error;
    }

    const updatedPayment = await paymentModel.updatePaymentStatus(pool, payment.reservation_id, normalizedStatus, {
        amount: extra.amount,
        providerPaymentId: extra.providerPaymentId,
        providerIntentId: extra.providerIntentId,
        providerCheckoutId: extra.providerCheckoutId,
        paymentMethod: extra.paymentMethod,
        paidAt: normalizedStatus === "paid" ? (extra.paidAt || new Date().toISOString()) : undefined,
        expiresAt: extra.expiresAt,
        metadata: extra.metadata
    });

    if (!updatedPayment) {
        const error = new Error("Failed to update payment status.");
        error.code = "PAYMENT_UPDATE_FAILED";
        throw error;
    }

    await paymentModel.syncReservationPaymentState(pool, payment.reservation_id, updatedPayment);

    if (normalizedStatus === "paid") {
        await finalizePaidReservationForPayment(updatedPayment);
    }

    return updatedPayment;
}

async function updateStatusByReference(reference, nextStatus, extra = {}) {
    const payment = await getPaymentByReference(reference);
    if (!payment) {
        const error = new Error("Payment not found.");
        error.code = "PAYMENT_NOT_FOUND";
        throw error;
    }

    return updatePaymentStatus(payment.id, nextStatus, extra);
}

async function getPaymentProviderAdapter(providerName = process.env.PAYMENT_PROVIDER || "mpesa") {
    const configuredName = String(providerName || process.env.PAYMENT_PROVIDER || "mpesa").toLowerCase();

    if (configuredName === "mpesa") {
        return new MpesaProviderAdapter();
    }

    return new PaymentProviderAdapter(configuredName);
}

async function expireStalePendingPayments() {
    const stalePayments = await paymentModel.findStalePendingPayments(pool);

    const expired = [];
    for (const payment of stalePayments) {
        const next = await updatePaymentStatus(payment.id, "expired", {
            metadata: {
                ...(payment.metadata || {}),
                expired_at: new Date().toISOString(),
                expiry_reason: "stale_pending_payment"
            }
        });
        expired.push(next);
    }

    return expired;
}

async function handleMpesaCallback(callbackPayload = {}) {
    const callback = callbackPayload?.Body?.stkCallback || callbackPayload?.stkCallback || callbackPayload || {};
    const merchantRequestId = callback.MerchantRequestID || callback.merchantRequestId || null;
    const checkoutRequestId = callback.CheckoutRequestID || callback.checkoutRequestId || null;
    const resultCode = callback.ResultCode ?? callback.resultCode ?? null;
    const resultDescription = callback.ResultDesc || callback.resultDescription || "M-Pesa callback received.";
    const metadataItems = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];

    const itemMap = {};
    metadataItems.forEach((item) => {
        if (!item || !item.Name) return;
        itemMap[item.Name] = item.Value;
    });

    const amount = itemMap.Amount ?? callback.Amount ?? null;
    const mpesaReceiptNumber = itemMap.MpesaReceiptNumber ?? callback.MpesaReceiptNumber ?? null;
    const transactionDate = itemMap.TransactionDate ?? callback.TransactionDate ?? null;
    const phoneNumber = itemMap.PhoneNumber ?? callback.PhoneNumber ?? null;

    const payment = await paymentModel.findPaymentByProviderId(pool, merchantRequestId)
        || await paymentModel.findPaymentByProviderCheckoutId(pool, checkoutRequestId);

    if (!payment) {
        const error = new Error("No payment record matched the M-Pesa callback.");
        error.code = "MPESA_CALLBACK_PAYMENT_NOT_FOUND";
        throw error;
    }

    if (payment.status === "paid") {
        const finalized = await finalizePaidReservationForPayment(payment);
        return {
            ...payment,
            ticket: finalized || null,
            idempotent: true,
            status: "paid"
        };
    }

    const normalizedResultCode = Number(resultCode ?? -1);
    const nextStatus = normalizedResultCode === 0 ? "paid" : "failed";
    const providerTransactionId = mpesaReceiptNumber || null;

    if (providerTransactionId) {
        const existingPaymentByTransaction = await paymentModel.findPaymentByProviderTransactionId(pool, providerTransactionId);
        if (existingPaymentByTransaction && existingPaymentByTransaction.id !== payment.id) {
            const error = new Error("Provider transaction reference is already attached to a different payment.");
            error.code = "DUPLICATE_PROVIDER_TRANSACTION";
            throw error;
        }
    }

    const extra = {
        providerPaymentId: merchantRequestId,
        providerCheckoutId: checkoutRequestId,
        providerTransactionId,
        paymentMethod: "mpesa",
        amount: amount !== null && amount !== undefined ? Number(amount) : payment.amount,
        callbackReceivedAt: new Date().toISOString(),
paidAt: normalizedResultCode === 0
    ? (
        transactionDate
            ? (() => {
                const transactionDateString = String(transactionDate);

                if (!/^\d{14}$/.test(transactionDateString)) {
                    return new Date().toISOString();
                }

                const parsedDate = new Date(
                    `${transactionDateString.slice(0, 4)}-${transactionDateString.slice(4, 6)}-${transactionDateString.slice(6, 8)}T${transactionDateString.slice(8, 10)}:${transactionDateString.slice(10, 12)}:${transactionDateString.slice(12, 14)}Z`
                );

                return Number.isNaN(parsedDate.getTime())
                    ? new Date().toISOString()
                    : parsedDate.toISOString();
            })()
            : new Date().toISOString()
    )
    : undefined,
       
        metadata: {
            ...(payment.metadata || {}),
            provider: {
                name: "mpesa",
                resultCode: normalizedResultCode,
                resultDescription,
                merchantRequestId,
                checkoutRequestId,
                mpesaReceiptNumber,
                transactionDate,
                phoneNumber,
                raw: callbackPayload
            }
        }
    };

    const updated = await updatePaymentStatus(payment.id, nextStatus, extra);

    await paymentModel.insertPaymentAuditLog(pool, {
        paymentId: payment.id,
        reservationId: payment.reservation_id,
        customerId: payment.customer_id,
        eventId: payment.event_id,
        action: "PAYMENT_CALLBACK_RECEIVED",
        status: updated.status,
        providerName: "mpesa",
        providerReference: checkoutRequestId || merchantRequestId,
        providerTransactionId,
        callbackReceivedAt: new Date().toISOString(),
        details: {
            resultCode: normalizedResultCode,
            resultDescription,
            duplicate: false,
            created: false
        }
    });

    return {
        ...updated,
        status: updated.status,
        idempotent: false,
        provider_payment_id: merchantRequestId,
        provider_checkout_id: checkoutRequestId,
        provider_transaction_id: providerTransactionId
    };
}

module.exports = {
    PAYMENT_STATUSES,
    ALLOWED_STATUS_TRANSITIONS,
    generateInternalReference,
    createPaymentForBooking,
    getPaymentById,
    getPaymentByReference,
    getPaymentByReservationId,
    getPaymentByProviderId,
    getPaymentByProviderCheckoutId,
    getPaymentsByCustomerId,
    getCurrentPaymentByReservationId,
    detectPaymentInconsistencies,
    reconcilePaymentIntegrity,
    updatePaymentStatus,
    updateStatusByReference,
    getPaymentProviderAdapter,
    expireStalePendingPayments,
    handleMpesaCallback,
    determinePayableAmountFromBooking,
    resolveReservationByIdOrReference
};
const paymentService = require("../services/paymentService");
const customerModel = require("../models/customerModel");
const pool = require("../config/db");

async function requireAuthenticatedCustomer(req) {
    const sessionId = req.cookies?.vault_session;
    if (!sessionId) {
        const error = new Error("Authentication required.");
        error.statusCode = 401;
        throw error;
    }

    const session = await customerModel.findSessionById(pool, sessionId);
    if (!session) {
        const error = new Error("Authentication required.");
        error.statusCode = 401;
        throw error;
    }

    return session;
}

function normalizePhoneNumber(rawPhone) {
    if (!rawPhone) {
        return null;
    }

    const digits = String(rawPhone).replace(/\D+/g, "");
    if (!digits) {
        return null;
    }

    if (digits.startsWith("254") && digits.length === 12) {
        return digits;
    }

    if (digits.startsWith("0") && digits.length === 10) {
        return `254${digits.slice(1)}`;
    }

    if (digits.length === 9) {
        return `254${digits}`;
    }

    if (digits.length >= 10) {
        return digits;
    }

    return null;
}

async function initiatePayment(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const { reservationId, reservationReference, providerName, phoneNumber } = req.body || {};

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        if ((providerName || process.env.PAYMENT_PROVIDER || "mpesa").toLowerCase() === "mpesa" && !normalizedPhone) {
            const error = new Error("A valid M-Pesa phone number is required.");
            error.statusCode = 400;
            error.code = "INVALID_PHONE_NUMBER";
            throw error;
        }

        const payment = await paymentService.createPaymentForBooking({
            reservationId,
            reservationReference,
            customerId: session.customer_id,
            providerName: providerName || "mpesa",
            phoneNumber: normalizedPhone
        });

        return res.status(201).json({
            success: true,
            payment
        });
    } catch (error) {
        console.error("INITIATE PAYMENT:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to create payment record.",
            code: error.code || "PAYMENT_INITIATION_FAILED"
        });
    }
}

async function getPayment(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const payment = await paymentService.getPaymentById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }

        if (payment.customer_id && payment.customer_id !== session.customer_id) {
            return res.status(403).json({ message: "Payment does not belong to this customer." });
        }

        return res.json({ payment });
    } catch (error) {
        console.error("GET PAYMENT:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to load payment.",
            code: error.code || "PAYMENT_FETCH_FAILED"
        });
    }
}

async function getPaymentByReference(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const payment = await paymentService.getPaymentByReference(req.params.reference);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }

        if (payment.customer_id && payment.customer_id !== session.customer_id) {
            return res.status(403).json({ message: "Payment does not belong to this customer." });
        }

        return res.json({ payment });
    } catch (error) {
        console.error("GET PAYMENT BY REFERENCE:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to load payment.",
            code: error.code || "PAYMENT_FETCH_FAILED"
        });
    }
}

async function getPaymentByReservation(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const payment = await paymentService.getPaymentByReservationId(req.params.reservationId);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found for this reservation." });
        }

        if (payment.customer_id && payment.customer_id !== session.customer_id) {
            return res.status(403).json({ message: "Payment does not belong to this customer." });
        }

        return res.json({ payment });
    } catch (error) {
        console.error("GET PAYMENT BY RESERVATION:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to load payment.",
            code: error.code || "PAYMENT_FETCH_FAILED"
        });
    }
}

async function getCustomerPayments(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const payments = await paymentService.getPaymentsByCustomerId(session.customer_id);

        return res.json({
            success: true,
            payments,
            count: Array.isArray(payments) ? payments.length : 0
        });
    } catch (error) {
        console.error("GET CUSTOMER PAYMENTS:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to load customer payments.",
            code: error.code || "CUSTOMER_PAYMENTS_FETCH_FAILED"
        });
    }
}

async function getCustomerPaymentHistory(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const payments = await paymentService.getPaymentsByCustomerId(session.customer_id);

        return res.json({
            success: true,
            history: payments,
            count: Array.isArray(payments) ? payments.length : 0
        });
    } catch (error) {
        console.error("GET CUSTOMER PAYMENT HISTORY:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to load payment history.",
            code: error.code || "CUSTOMER_PAYMENT_HISTORY_FETCH_FAILED"
        });
    }
}

async function updatePaymentStatus(req, res) {
    try {
        const session = await requireAuthenticatedCustomer(req);
        const payment = await paymentService.getPaymentById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }

        if (payment.customer_id && payment.customer_id !== session.customer_id) {
            return res.status(403).json({ message: "Payment does not belong to this customer." });
        }

        const updated = await paymentService.updatePaymentStatus(payment.id, req.body?.status, {
            providerPaymentId: req.body?.providerPaymentId,
            providerIntentId: req.body?.providerIntentId,
            providerCheckoutId: req.body?.providerCheckoutId,
            paymentMethod: req.body?.paymentMethod,
            paidAt: req.body?.paidAt,
            metadata: req.body?.metadata,
            amount: req.body?.amount
        });

        return res.json({
            success: true,
            payment: updated
        });
    } catch (error) {
        console.error("UPDATE PAYMENT STATUS:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.message || "Failed to update payment status.",
            code: error.code || "PAYMENT_STATUS_UPDATE_FAILED"
        });
    }
}

async function handleMpesaCallback(req, res) {
    try {
        const callbackResult = await paymentService.handleMpesaCallback(req.body || {});
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Accepted",
            payment: callbackResult
        });
    } catch (error) {
        console.error("MPESA CALLBACK ERROR:", error);
        return res.status(200).json({
            ResultCode: 1,
            ResultDesc: error.message || "Callback rejected"
        });
    }
}

module.exports = {
    initiatePayment,
    getPayment,
    getPaymentByReference,
    getPaymentByReservation,
    getCustomerPayments,
    getCustomerPaymentHistory,
    updatePaymentStatus,
    handleMpesaCallback
};

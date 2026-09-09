const https = require("https");
const { PaymentProviderAdapter } = require("./paymentProviderAdapter");

function formatTimestamp(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const pad = (num) => String(num).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

class MpesaProviderAdapter extends PaymentProviderAdapter {
    constructor() {
        super("mpesa");
        this.baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.shortCode = process.env.MPESA_SHORTCODE;
        this.passkey = process.env.MPESA_PASSKEY;
        this.callbackUrl = process.env.MPESA_CALLBACK_URL || "http://localhost:3000/api/payments/mpesa/callback";
        this.securityCredential = process.env.MPESA_SECURITY_CREDENTIAL || "";
    }

    formatTimestamp(date = new Date()) {
        return formatTimestamp(date);
    }

    async getAccessToken() {
        if (!this.consumerKey || !this.consumerSecret) {
            const missing = [];
            if (!this.consumerKey) missing.push("MPESA_CONSUMER_KEY");
            if (!this.consumerSecret) missing.push("MPESA_CONSUMER_SECRET");
            const error = new Error(`M-Pesa credentials missing: ${missing.join(", ")}.`);
            error.code = "MPESA_CONFIG_MISSING";
            throw error;
        }

        const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64");
        const endpoint = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

        const payload = await this.request(endpoint, {
            method: "GET",
            headers: {
                Authorization: `Basic ${auth}`
            }
        });

        if (!payload || !payload.access_token) {
            const error = new Error("Failed to fetch M-Pesa access token.");
            error.code = "MPESA_AUTH_FAILED";
            throw error;
        }

        return payload.access_token;
    }

    buildPassword(timestamp) {
        if (!this.shortCode || !this.passkey) {
            const missing = [];
            if (!this.shortCode) missing.push("MPESA_SHORTCODE");
            if (!this.passkey) missing.push("MPESA_PASSKEY");
            const error = new Error(`M-Pesa STK password cannot be generated: ${missing.join(", ")} missing.`);
            error.code = "MPESA_CONFIG_MISSING";
            throw error;
        }

        const shortCode = String(this.shortCode).trim();
        const passkey = String(this.passkey).trim();
        const raw = `${shortCode}${passkey}${timestamp}`;
        return Buffer.from(raw).toString("base64");
    }

    async createPayment(context = {}) {
        if (!this.shortCode || !this.passkey) {
            const missing = [];
            if (!this.shortCode) missing.push("MPESA_SHORTCODE");
            if (!this.passkey) missing.push("MPESA_PASSKEY");
            const error = new Error(`M-Pesa STK push cannot be dispatched: ${missing.join(", ")} missing.`);
            error.code = "MPESA_CONFIG_MISSING";
            throw error;
        }

        const amount = Number(context.amount || 0);
        if (!amount || amount <= 0) {
            const error = new Error("Payment amount must be greater than zero.");
            error.code = "INVALID_AMOUNT";
            throw error;
        }

        let phoneNumber = String(context.phoneNumber || "")
    .replace(/\s+/g, "")
    .replace(/^\+/, "");

if (phoneNumber.startsWith("0")) {
    phoneNumber = `254${phoneNumber.slice(1)}`;
} else if (phoneNumber.startsWith("7") || phoneNumber.startsWith("1")) {
    phoneNumber = `254${phoneNumber}`;
}

if (!/^254[71]\d{8}$/.test(phoneNumber)) {
    const error = new Error("A valid Kenyan M-Pesa phone number is required.");
    error.code = "INVALID_PHONE_NUMBER";
    throw error;
}

        const timestamp = this.formatTimestamp();
        const password = this.buildPassword(timestamp);
        const accessToken = await this.getAccessToken();

        const requestBody = {
            BusinessShortCode: this.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.round(amount),
            PartyA: phoneNumber,
            PartyB: this.shortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: this.callbackUrl,
            AccountReference: String(context.reference || "VAULT"),
            TransactionDesc: String(context.description || "VAULT booking payment")
        };

        const endpoint = `${this.baseUrl}/mpesa/stkpush/v1/processrequest`;
        const payload = await this.request(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        return {
            providerName: "mpesa",
            providerPaymentId: payload?.MerchantRequestID || null,
            providerCheckoutId: payload?.CheckoutRequestID || null,
            responseCode: payload?.ResponseCode || null,
            responseDescription: payload?.ResponseDescription || null,
            raw: payload || null,
            checkoutRequestId: payload?.CheckoutRequestID || null,
            merchantRequestId: payload?.MerchantRequestID || null,
            phoneNumber,
            amount,
            expectedCallbackUrl: this.callbackUrl,
            status: payload?.ResponseCode === "0" ? "processing" : "failed"
        };
    }

    async lookupPayment(reference) {
        if (!this.shortCode || !this.passkey) {
            const missing = [];
            if (!this.shortCode) missing.push("MPESA_SHORTCODE");
            if (!this.passkey) missing.push("MPESA_PASSKEY");
            const error = new Error(`M-Pesa STK query cannot be executed: ${missing.join(", ")} missing.`);
            error.code = "MPESA_CONFIG_MISSING";
            throw error;
        }

        const accessToken = await this.getAccessToken();
        const timestamp = this.formatTimestamp();
        const password = this.buildPassword(timestamp);
        const endpoint = `${this.baseUrl}/mpesa/stkpushquery/v1/query`;
        const payload = await this.request(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                BusinessShortCode: this.shortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: reference,
                RequestID: reference
            })
        });

        return payload || null;
    }

    async updateStatus(reference, status, details = {}) {
        return {
            providerName: "mpesa",
            reference,
            status,
            details
        };
    }

    request(endpoint, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint);
            const requestBody = options.body || null;

            const req = https.request(
                url,
                {
                    method: options.method || "GET",
                    headers: options.headers || {}
                },
                (res) => {
                    let raw = "";
                    res.on("data", (chunk) => {
                        raw += chunk;
                    });
                    res.on("end", () => {
                        if (!raw) {
                            resolve(null);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(raw);
                            resolve(parsed);
                        } catch (error) {
                            resolve(raw);
                        }
                    });
                }
            );

            req.on("error", reject);
            if (requestBody) {
                req.write(requestBody);
            }
            req.end();
        });
    }
}

module.exports = MpesaProviderAdapter;

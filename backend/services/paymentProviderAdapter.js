class PaymentProviderAdapter {
    constructor(providerName = "not_configured") {
        this.providerName = providerName;
    }

    async createPayment(_context) {
        throw new Error("Payment provider adapter not configured.");
    }

    async lookupPayment(_reference) {
        throw new Error("Payment provider adapter not configured.");
    }

    async updateStatus(_reference, _status, _details = {}) {
        throw new Error("Payment provider adapter not configured.");
    }
}

module.exports = {
    PaymentProviderAdapter
};

const assert = require('assert');
const pool = require('../config/db');
const paymentModel = require('../models/paymentModel');
const paymentService = require('../services/paymentService');
const reservationModel = require('../models/reservationModel');

(async () => {
  const customerId = `cust-step7-${Date.now()}`;
  const eventId = `evt-step7-${Date.now()}`;

  await pool.query(
    `INSERT INTO customers (id, email, display_name, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [customerId, `step7-${Date.now()}@vault.test`, 'Step 7 Tester', false, true, true, true, true]
  );

  await pool.query(
    `INSERT INTO events (id, title, theme, short_description, description, image, event_date, event_time, location, status, capacity, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO NOTHING`,
    [eventId, 'Step 7 Event', 'Night', 'History verification', 'Verification for payment history', '/images/test.jpg', '2099-09-09', '20:00:00', 'Nairobi', 'upcoming', 50, true]
  );

  await pool.query(
    `INSERT INTO tickets (event_id, name, description, price, capacity, sold, available)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [eventId, 'Standard', 'Paid ticket', 420.00, 50, 0, true]
  );

  const reservation = await reservationModel.createReservation({
    reference: `RES-STEP7-${Date.now()}`,
    event_id: eventId,
    customer_id: customerId,
    attendee_name: 'Step 7 Tester',
    attendee_email: 'step7@test.com',
    guests: 1,
    paymentRequired: true,
    skipTicketIssue: true,
    paymentStatus: 'pending',
    paymentAmount: 420,
    paymentCurrency: 'KES'
  });

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const firstAttempt = await paymentModel.createPayment(pool, {
    reference: `VLT-PAY-STEP7-ONE-${uniqueSuffix}`,
    reservationId: reservation.id,
    customerId,
    eventId,
    amount: 420,
    currency: 'KES',
    status: 'failed',
    providerName: 'mpesa',
    providerPaymentId: `merchant-step7-one-${uniqueSuffix}`,
    providerCheckoutId: `checkout-step7-one-${uniqueSuffix}`,
    metadata: { provider: { name: 'mpesa', mpesaReceiptNumber: `RCP-STEP7-FAIL-${uniqueSuffix}` } }
  });

  const secondAttempt = await paymentModel.createPayment(pool, {
    reference: `VLT-PAY-STEP7-TWO-${uniqueSuffix}`,
    reservationId: reservation.id,
    customerId,
    eventId,
    amount: 420,
    currency: 'KES',
    status: 'cancelled',
    providerName: 'mpesa',
    providerPaymentId: `merchant-step7-two-${uniqueSuffix}`,
    providerCheckoutId: `checkout-step7-two-${uniqueSuffix}`,
    metadata: { provider: { name: 'mpesa', mpesaReceiptNumber: `RCP-STEP7-CANCEL-${uniqueSuffix}` } }
  });

  const thirdAttempt = await paymentModel.createPayment(pool, {
    reference: `VLT-PAY-STEP7-THREE-${uniqueSuffix}`,
    reservationId: reservation.id,
    customerId,
    eventId,
    amount: 420,
    currency: 'KES',
    status: 'paid',
    providerName: 'mpesa',
    providerPaymentId: `merchant-step7-three-${uniqueSuffix}`,
    providerCheckoutId: `checkout-step7-three-${uniqueSuffix}`,
    metadata: { provider: { name: 'mpesa', mpesaReceiptNumber: `RCP-STEP7-SUCCESS-${uniqueSuffix}` } }
  });

  const attempts = await paymentModel.findPaymentsByReservationId(pool, reservation.id);
  assert.strictEqual(attempts.length, 3, 'Multiple payment attempts should remain separate for one booking.');

  const currentPayment = await paymentModel.findCurrentPaymentByReservationId(pool, reservation.id);
  assert.ok(currentPayment, 'A current payment should exist for the reservation.');
  assert.strictEqual(currentPayment.status, 'paid', 'The successful retry should become the current payment for the booking.');

  const customerHistory = await paymentModel.findPaymentsByCustomerId(pool, customerId);
  const thisBookingHistory = customerHistory.filter((item) => item.reservation_id === reservation.id);
  assert.strictEqual(thisBookingHistory.length, 3, 'Customer payment history should preserve all attempts for the booking.');

  const paid = thisBookingHistory.find((item) => item.status === 'paid');
  assert.ok(paid, 'Successful payment should remain in the booking history.');
  assert.strictEqual(paid.provider_payment_id, `merchant-step7-three-${uniqueSuffix}`, 'Provider reference should be stored correctly.');

  const freeReservation = await reservationModel.createReservation({
    reference: `RES-STEP7-FREE-${Date.now()}`,
    event_id: eventId,
    customer_id: customerId,
    attendee_name: 'Free Tester',
    attendee_email: 'free-step7@test.com',
    guests: 1,
    paymentRequired: false,
    skipTicketIssue: false,
    paymentStatus: 'not_required',
    paymentAmount: 0,
    paymentCurrency: 'KES'
  });

  const freeHistory = await paymentModel.findPaymentsByCustomerId(pool, customerId);
  assert.ok(!freeHistory.some((item) => item.reservation_id === freeReservation.id), 'Free bookings should not create fake payment records.');

  const sameHistoryTwice = await paymentService.getPaymentsByCustomerId(customerId);
  const sameHistoryAgain = await paymentService.getPaymentsByCustomerId(customerId);
  assert.deepStrictEqual(sameHistoryTwice, sameHistoryAgain, 'Repeated history requests should return consistent data.');

  const duplicateCallback = await paymentService.handleMpesaCallback({
    Body: {
      stkCallback: {
        MerchantRequestID: `merchant-step7-three-${uniqueSuffix}`,
        CheckoutRequestID: `checkout-step7-three-${uniqueSuffix}`,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 420 },
            { Name: 'MpesaReceiptNumber', Value: 'RCP-STEP7-SUCCESS' },
            { Name: 'TransactionDate', Value: '20240201090000' },
            { Name: 'PhoneNumber', Value: 254712345678 }
          ]
        }
      }
    }
  });

  assert.strictEqual(duplicateCallback.idempotent, true, 'Duplicate callbacks should not create new records.');

  const finalAttemptCount = await pool.query('SELECT COUNT(*)::int AS count FROM payments WHERE reservation_id = $1', [reservation.id]);
  assert.strictEqual(finalAttemptCount.rows[0].count, 3, 'History should preserve separate authoritative payment attempts.');

  console.log('STEP7_HISTORY_TESTS_OK');
  await pool.end();
})().catch((error) => {
  console.error('STEP7_HISTORY_TESTS_FAILED');
  console.error(error);
  process.exit(1);
});

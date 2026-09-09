const assert = require('assert');
const crypto = require('crypto');
const pool = require('../config/db');
const reservationModel = require('../models/reservationModel');
const paymentService = require('../services/paymentService');
const paymentModel = require('../models/paymentModel');
const ticketModel = require('../models/ticketModel');

(async () => {
  const customerId = `cust-step6-${Date.now()}`;
  const eventId = `evt-step6-${Date.now()}`;

  await pool.query(
    `INSERT INTO customers (id, email, display_name, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [customerId, `step6-${Date.now()}@vault.test`, 'Step 6 Tester', false, true, true, true, true]
  );

  await pool.query(
    `INSERT INTO events (id, title, theme, short_description, description, image, event_date, event_time, location, status, capacity, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO NOTHING`,
    [eventId, 'Step 6 Event', 'Night', 'Step 6 verification', 'Verification for ticket finalization', '/images/test.jpg', '2099-09-09', '20:00:00', 'Nairobi', 'upcoming', 50, true]
  );

  await pool.query(
    `INSERT INTO tickets (event_id, name, description, price, capacity, sold, available)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [eventId, 'Standard', 'Paid ticket', 350.00, 50, 0, true]
  );

  const reservation = await reservationModel.createReservation({
    reference: `RES-STEP6-${Date.now()}`,
    event_id: eventId,
    customer_id: customerId,
    attendee_name: 'Step 6 Tester',
    attendee_email: 'step6@test.com',
    guests: 1,
    paymentRequired: true,
    skipTicketIssue: true,
    paymentStatus: 'pending',
    paymentAmount: 350,
    paymentCurrency: 'KES'
  });

  assert.ok(reservation, 'Reservation should be created.');
  assert.strictEqual(reservation.ticket_id, null, 'Paid reservation should not issue a ticket before payment confirmation.');

  const existingTicket = await pool.query('SELECT COUNT(*)::int AS count FROM issued_tickets WHERE reservation_id = $1', [reservation.id]);
  assert.strictEqual(existingTicket.rows[0].count, 0, 'No issued ticket should exist before payment.');

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const payment = await paymentModel.createPayment(pool, {
    reference: `VLT-PAY-STEP6-${uniqueSuffix}`,
    reservationId: reservation.id,
    customerId,
    eventId,
    amount: 350,
    currency: 'KES',
    status: 'pending',
    providerName: 'mpesa',
    providerPaymentId: `merchant-step6-${uniqueSuffix}`,
    providerCheckoutId: `checkout-step6-${uniqueSuffix}`,
    metadata: { booking_reference: reservation.reference }
  });

  const callbackPayload = {
    Body: {
      stkCallback: {
        MerchantRequestID: `merchant-step6-${uniqueSuffix}`,
        CheckoutRequestID: `checkout-step6-${uniqueSuffix}`,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 350 },
            { Name: 'MpesaReceiptNumber', Value: 'RCP-STEP6' },
            { Name: 'TransactionDate', Value: '20240101120000' },
            { Name: 'PhoneNumber', Value: 254712345678 }
          ]
        }
      }
    }
  };

  const paymentRow = await paymentModel.updatePaymentStatus(pool, reservation.id, 'pending', {
    paymentMethod: 'mpesa',
    amount: 350,
    metadata: { test: true }
  });

  assert.ok(paymentRow && paymentRow.id === payment.id, 'The payment attempt should remain the canonical transaction during the pending lifecycle.');

  const hook = await paymentService.handleMpesaCallback(callbackPayload);
  assert.strictEqual(hook.status, 'paid');

  const finalizedReservation = await pool.query('SELECT * FROM reservations WHERE id = $1', [reservation.id]);
  assert.strictEqual(finalizedReservation.rows[0].payment_status, 'paid');

  const tickets = await pool.query('SELECT * FROM issued_tickets WHERE reservation_id = $1', [reservation.id]);
  assert.strictEqual(tickets.rows.length, 1, 'Exactly one issued ticket should exist after payment confirmation.');

  const duplicate = await paymentService.handleMpesaCallback(callbackPayload);
  assert.strictEqual(duplicate.idempotent, true, 'Duplicate callback should not issue another ticket.');

  const stillOnlyOne = await pool.query('SELECT COUNT(*)::int AS count FROM issued_tickets WHERE reservation_id = $1', [reservation.id]);
  assert.strictEqual(stillOnlyOne.rows[0].count, 1, 'Duplicate callback should not create a second ticket.');

  const myVault = await pool.query(
    `SELECT r.id, r.payment_status, it.id AS ticket_id, it.reference AS ticket_reference
     FROM reservations r
     LEFT JOIN issued_tickets it ON it.reservation_id = r.id
     WHERE r.customer_id = $1 AND r.id = $2`,
    [customerId, reservation.id]
  );
  assert.ok(myVault.rows[0].ticket_id, 'My Vault should be able to fetch the issued ticket for the customer reservation.');

  console.log('STEP6_FINALIZATION_TESTS_OK');
  await pool.end();
})().catch((error) => {
  console.error('STEP6_FINALIZATION_TESTS_FAILED');
  console.error(error);
  process.exit(1);
});

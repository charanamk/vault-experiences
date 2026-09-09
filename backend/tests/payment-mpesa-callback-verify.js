const assert = require('assert');
const pool = require('../config/db');
const paymentService = require('../services/paymentService');

(async () => {
  let reservation = null;

  const reservationRow = await pool.query(
    `SELECT r.id, r.event_id, r.customer_id, r.reference, r.guests
     FROM reservations r
     LEFT JOIN payments p ON p.reservation_id = r.id
     WHERE r.customer_id IS NOT NULL
       AND p.id IS NULL
     ORDER BY r.id DESC
     LIMIT 1`
  );

  if (reservationRow.rows[0]) {
    reservation = reservationRow.rows[0];
  } else {
    const customer = await pool.query(
      `INSERT INTO customers (id, email, display_name, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [`cust-${Date.now()}`, `callback-${Date.now()}@vault.test`, 'Callback Tester', false, true, true, true, true]
    );

    const event = await pool.query(
      `INSERT INTO events (id, title, theme, short_description, description, image, event_date, event_time, location, status, capacity, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [`evt-${Date.now()}`, 'Callback Test Event', 'Night', 'Callback test', 'Provider callback verification', '/images/test.jpg', '2099-01-01', '19:00:00', 'Nairobi', 'upcoming', 100, true]
    );

    const eventId = event.rows[0]?.id || `evt-${Date.now()}`;

    await pool.query(
      `INSERT INTO tickets (event_id, name, description, price, capacity, sold, available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [eventId, 'Standard', 'Callback verification ticket', 350.00, 100, 0, true]
    );

    const createdReservation = await pool.query(
      `INSERT INTO reservations (reference, event_id, customer_id, attendee_name, attendee_email, guests, payment_status, payment_amount, payment_currency, requires_payment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, event_id, customer_id, reference, guests`,
      [`RES-${Date.now()}`, eventId, customer.rows[0].id, 'Callback Tester', 'callback@test.com', 1, 'pending', 350.00, 'KES', true]
    );

    reservation = createdReservation.rows[0];
  }

  await pool.query(
    `UPDATE tickets
     SET price = 350.00
     WHERE event_id = $1
     RETURNING id, price`,
    [reservation.event_id]
  );

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const merchantRequestId = `merchant-${uniqueSuffix}`;
  const checkoutRequestId = `checkout-${uniqueSuffix}`;

  const paymentRecord = await pool.query(
    `INSERT INTO payments (
        reference,
        reservation_id,
        customer_id,
        event_id,
        amount,
        currency,
        status,
        provider_name,
        provider_payment_id,
        provider_checkout_id,
        payment_method,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
    [
      `VLT-PAY-CB-${uniqueSuffix}`,
      reservation.id,
      reservation.customer_id,
      reservation.event_id,
      350.00,
      'KES',
      'pending',
      'mpesa',
      merchantRequestId,
      checkoutRequestId,
      'mpesa',
      JSON.stringify({ customer_id: reservation.customer_id, booking_reference: reservation.reference })
    ]
  );

  const created = paymentRecord.rows[0];
  assert.ok(created && created.reference, 'Expected a payment record to be created for MPesa callback processing.');
  assert.strictEqual(created.status, 'pending');

  const callbackPayload = {
    Body: {
      stkCallback: {
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: created.provider_checkout_id || checkoutRequestId,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 350 },
            { Name: 'MpesaReceiptNumber', Value: 'RCP123ABC' },
            { Name: 'TransactionDate', Value: '20240101120000' },
            { Name: 'PhoneNumber', Value: 254712345678 }
          ]
        }
      }
    }
  };

  const callbackResult = await paymentService.handleMpesaCallback(callbackPayload);
  assert.strictEqual(callbackResult.status, 'paid');
  assert.strictEqual(callbackResult.provider_payment_id, created.provider_payment_id);

  const duplicateCallback = await paymentService.handleMpesaCallback(callbackPayload);
  assert.strictEqual(duplicateCallback.idempotent, true, 'Duplicate callback should be ignored as idempotent.');

  console.log('MPESA_CALLBACK_TESTS_OK');
  console.log(JSON.stringify({
    reservationId: reservation.id,
    paymentId: callbackResult.id,
    reference: callbackResult.reference,
    finalStatus: callbackResult.status
  }, null, 2));

  await pool.end();
})().catch((error) => {
  console.error('MPESA_CALLBACK_TESTS_FAILED');
  console.error(error);
  process.exit(1);
});

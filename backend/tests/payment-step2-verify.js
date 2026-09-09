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

  if (!reservationRow.rows[0]) {
    const customer = await pool.query(
      `INSERT INTO customers (id, email, display_name, is_guest, email_verified, notifications_enabled, event_reminders_enabled, privacy_profile_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [`cust-${Date.now()}`, `step2-${Date.now()}@vault.test`, 'Step 2 Tester', false, true, true, true, true]
    );

    const event = await pool.query(
      `INSERT INTO events (id, title, theme, short_description, description, image, event_date, event_time, location, status, capacity, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [`evt-step2-${Date.now()}`, 'Step 2 Event', 'Night', 'Step 2 verification', 'Payment service verification', '/images/test.jpg', '2099-01-02', '20:00:00', 'Nairobi', 'upcoming', 100, true]
    );

    const eventId = event.rows[0]?.id || `evt-step2-${Date.now()}`;

    await pool.query(
      `INSERT INTO tickets (event_id, name, description, price, capacity, sold, available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [eventId, 'Standard', 'Step 2 ticket', 350.00, 100, 0, true]
    );

    const createdReservation = await pool.query(
      `INSERT INTO reservations (reference, event_id, customer_id, attendee_name, attendee_email, guests, payment_status, payment_amount, payment_currency, requires_payment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, event_id, customer_id, reference, guests`,
      [`RES-${Date.now()}`, eventId, customer.rows[0].id, 'Step 2 Tester', 'step2@test.com', 1, 'pending', 350.00, 'KES', true]
    );

    reservation = createdReservation.rows[0];
  } else {
    reservation = reservationRow.rows[0];
  }

  assert.ok(reservation, 'No reservation available for payment tests.');

  const ticketUpdate = await pool.query(
    `UPDATE tickets
     SET price = 350.00
     WHERE event_id = $1
     RETURNING id, price`,
    [reservation.event_id]
  );

  assert.ok(ticketUpdate.rows[0], 'No ticket pricing found for the reservation event.');

  const created = await paymentService.createPaymentForBooking({
    reservationId: reservation.id,
    customerId: reservation.customer_id,
    providerName: 'vault_internal'
  });

  assert.ok(created && created.reference, 'Payment should be created for the reservation.');
  assert.strictEqual(created.status, 'pending');
  assert.strictEqual(Number(created.amount), 350.00 * Number(reservation.guests || 1));

  const duplicate = await paymentService.createPaymentForBooking({
    reservationId: reservation.id,
    customerId: reservation.customer_id,
    providerName: 'vault_internal'
  });
  assert.strictEqual(duplicate.idempotent, true, 'Duplicate payment initiation should be idempotent.');

  const byId = await paymentService.getPaymentById(created.id);
  assert.ok(byId && byId.id === created.id);

  const byReference = await paymentService.getPaymentByReference(created.reference);
  assert.ok(byReference && byReference.reference === created.reference);

  const byReservation = await paymentService.getPaymentByReservationId(reservation.id);
  assert.ok(byReservation && byReservation.id === created.id);

  const processing = await paymentService.updatePaymentStatus(created.id, 'processing');
  assert.strictEqual(processing.status, 'processing');

  const invalid = await paymentService.updatePaymentStatus(created.id, 'pending').catch((error) => error);
  assert.strictEqual(invalid.code, 'INVALID_STATUS_TRANSITION');

  const paid = await paymentService.updatePaymentStatus(created.id, 'paid', {
    providerPaymentId: 'prov-123',
    paymentMethod: 'card'
  });
  assert.strictEqual(paid.status, 'paid');

  const revert = await paymentService.updatePaymentStatus(created.id, 'failed').catch((error) => error);
  assert.strictEqual(revert.code, 'PAYMENT_REVERSION_BLOCKED');

  console.log('PAYMENT_SERVICE_TESTS_OK');
  console.log(JSON.stringify({
    reservationId: reservation.id,
    paymentId: created.id,
    reference: created.reference,
    amount: created.amount,
    finalStatus: paid.status
  }, null, 2));

  await pool.end();
})().catch((error) => {
  console.error('PAYMENT_SERVICE_TESTS_FAILED');
  console.error(error);
  process.exit(1);
});

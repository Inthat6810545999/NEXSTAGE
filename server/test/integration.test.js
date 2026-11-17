import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectMongo, pool } from '../src/config.js';
import { Cart, Notification, UserActivityLog } from '../src/models.js';

test('event discovery → cart → booking → cancellation → Admin Activity Log', {
  skip: process.env.RUN_INTEGRATION_TESTS !== '1'
    ? 'Set RUN_INTEGRATION_TESTS=1 and provide local MySQL/MongoDB services'
    : false
}, async (t) => {
  await connectMongo();
  const schema = await readFile(new URL('../sql/001_schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) {
    if (/^(CREATE DATABASE|USE\s)/i.test(statement)) continue;
    await pool.query(statement);
  }

  const suffix = randomUUID();
  const adminEmail = `integration-admin-${suffix}@example.test`;
  const userEmail = `integration-user-${suffix}@example.test`;
  const password = 'Integration-Test-42!';
  const [adminResult] = await pool.query(
    'INSERT INTO users (display_name,email,password_hash,role) VALUES (?,?,?,?)',
    ['Integration Admin', adminEmail, await bcrypt.hash(password, 4), 'admin']
  );
  const adminId = adminResult.insertId;
  const [eventResult] = await pool.query(
    `INSERT INTO events (organizer_id,title,category,venue,city,description,start_at,end_at,status,audience_groups,benefits)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [adminId, `Integration Event ${suffix}`, 'Music', 'Test Hall', 'Bangkok', 'Event for integration test',
      '2027-12-01 18:00:00', '2027-12-01 21:00:00', 'published', JSON.stringify(['everyone']), JSON.stringify([])]
  );
  const eventId = eventResult.insertId;
  const [ticketResult] = await pool.query(
    'INSERT INTO ticket_types (event_id,label,price,capacity,available) VALUES (?,?,?,?,?)',
    [eventId, 'General', 500, 5, 5]
  );
  const ticketTypeId = ticketResult.insertId;
  let userId;
  let bookingId;
  let server;

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) {
      await Promise.all([
        Cart.deleteMany({ userId }),
        Notification.deleteMany({ userId }),
        UserActivityLog.deleteMany({ userId })
      ]);
    }
    if (bookingId) {
      await pool.query('DELETE FROM booking_items WHERE booking_id=?', [bookingId]);
      await pool.query('DELETE FROM bookings WHERE id=?', [bookingId]);
    }
    if (ticketTypeId) await pool.query('DELETE FROM ticket_types WHERE id=?', [ticketTypeId]);
    if (eventId) await pool.query('DELETE FROM events WHERE id=?', [eventId]);
    if (adminId) await pool.query('DELETE FROM users WHERE id=?', [adminId]);
    if (userId) await pool.query('DELETE FROM users WHERE id=?', [userId]);
    await mongoose.disconnect();
    await pool.end();
  });

  server = createApp().listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { method = 'GET', body, cookie } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const payload = await response.json();
    return { response, payload };
  };
  const login = async (email) => {
    const { response, payload } = await request('/api/auth/login', {
      method: 'POST', body: { email, password }
    });
    assert.equal(response.status, 200, JSON.stringify(payload));
    const setCookie = response.headers.get('set-cookie');
    assert.ok(setCookie?.includes('nexstage_session='), 'login should set a session cookie');
    return setCookie.match(/nexstage_session=[^;,]+/)[0];
  };

  const eventsResult = await request('/api/events');
  assert.equal(eventsResult.response.status, 200);
  assert.ok(eventsResult.payload.events.some((event) => event.id === eventId), 'published event is discoverable');

  const registration = await request('/api/auth/register', {
    method: 'POST', body: { display_name: 'Integration User', email: userEmail, password }
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.payload));
  userId = registration.payload.user.id;
  const userCookie = registration.response.headers.get('set-cookie').match(/nexstage_session=[^;,]+/)[0];
  const adminCookie = await login(adminEmail);

  const cartResult = await request('/api/cart', { cookie: userCookie });
  assert.equal(cartResult.response.status, 200);
  const savedCart = await request('/api/cart', {
    method: 'PUT', cookie: userCookie,
    body: { items: [{ ticket_type_id: ticketTypeId, quantity: 2 }] }
  });
  assert.equal(savedCart.response.status, 200, JSON.stringify(savedCart.payload));
  assert.equal(savedCart.payload.cart.items[0].quantity, 2);

  const checkout = await request('/api/checkout', { method: 'POST', cookie: userCookie });
  assert.equal(checkout.response.status, 201, JSON.stringify(checkout.payload));
  bookingId = checkout.payload.booking.id;
  assert.equal(Number(checkout.payload.booking.total_amount), 1000);
  const [[afterCheckout]] = await pool.query('SELECT available FROM ticket_types WHERE id=?', [ticketTypeId]);
  assert.equal(afterCheckout.available, 3, 'checkout decrements ticket stock');
  const clearedCart = await request('/api/cart', { cookie: userCookie });
  assert.deepEqual(clearedCart.payload.cart.items, [], 'successful checkout clears the booked cart item');

  const cancel = await request(`/api/bookings/${bookingId}/cancel`, { method: 'POST', cookie: userCookie });
  assert.equal(cancel.response.status, 200, JSON.stringify(cancel.payload));
  assert.equal(cancel.payload.booking.status, 'cancelled');
  const [[afterCancel]] = await pool.query('SELECT available FROM ticket_types WHERE id=?', [ticketTypeId]);
  assert.equal(afterCancel.available, 5, 'cancellation restores ticket stock');

  const activity = await request('/api/admin/data/user_activity_logs', { cookie: adminCookie });
  assert.equal(activity.response.status, 200, JSON.stringify(activity.payload));
  const bookingLogs = activity.payload.rows.filter((row) => row.metadata?.bookingId === bookingId);
  assert.deepEqual(
    bookingLogs.map((row) => row.action_type).sort(),
    ['booking_cancelled', 'booking_confirmed'],
    'Admin Data Studio shows both booking lifecycle log entries'
  );
});

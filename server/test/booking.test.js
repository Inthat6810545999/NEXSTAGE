import test from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, cancelBooking, syncBooking, retryPending } from '../src/booking.js';
import { Cart, Notification, UserActivityLog } from '../src/models.js';

// ---------------------------------------------------------------------------
// In-memory stand-in for the MySQL pool. It understands only the statements
// booking.js sends and supports transactions (rollback restores a snapshot),
// so these tests need no running MySQL/MongoDB.
// ---------------------------------------------------------------------------
function createFakeDb({ tickets }) {
  const state = {
    tickets: new Map(tickets.map(t => [t.id, { ...t }])),
    bookings: [],
    items: [],
    nextBookingId: 1
  };
  const clone = () => structuredClone({ ...state, tickets: [...state.tickets] });
  const restore = snap => {
    state.tickets = new Map(snap.tickets);
    state.bookings = snap.bookings;
    state.items = snap.items;
    state.nextBookingId = snap.nextBookingId;
  };
  const has = (sql, text) => sql.replace(/\s+/g, ' ').includes(text);

  async function run(sql, p = []) {
    if (has(sql, 'FROM ticket_types t JOIN events e')) {
      const t = state.tickets.get(p[0]);
      return [t ? [{ ...t }] : []];
    }
    if (has(sql, 'INSERT INTO bookings')) {
      const id = state.nextBookingId++;
      state.bookings.push({
        id, user_id: p[0], booking_code: p[1], total_amount: p[2],
        status: 'confirmed', sync_status: p[3], created_at_unix: 1_700_000_000
      });
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (has(sql, 'UPDATE ticket_types SET available=available-?')) {
      const t = state.tickets.get(p[1]);
      if (!t || t.available < p[2]) return [{ affectedRows: 0 }];
      t.available -= p[0];
      return [{ affectedRows: 1 }];
    }
    if (has(sql, 'INSERT INTO booking_items')) {
      state.items.push({ booking_id: p[0], ticket_type_id: p[1], quantity: p[2], unit_price: p[3] });
      return [{ affectedRows: 1 }];
    }
    if (has(sql, 'SELECT * FROM bookings WHERE id=? FOR UPDATE')) {
      const b = state.bookings.find(x => x.id === p[0]);
      return [b ? [{ ...b }] : []];
    }
    if (has(sql, 'SELECT * FROM booking_items WHERE booking_id=?')) {
      return [state.items.filter(i => i.booking_id === p[0]).map(i => ({ ...i }))];
    }
    if (has(sql, 'UPDATE ticket_types SET available=LEAST(capacity, available+?)')) {
      const t = state.tickets.get(p[1]);
      t.available = Math.min(t.capacity, t.available + p[0]);
      return [{ affectedRows: 1 }];
    }
    if (has(sql, "UPDATE bookings SET status='cancelled'")) {
      const b = state.bookings.find(x => x.id === p[0]);
      b.status = 'cancelled'; b.sync_status = 'pending';
      return [{ affectedRows: 1 }];
    }
    if (has(sql, 'UNIX_TIMESTAMP(created_at) AS created_at_unix FROM bookings')) {
      const b = state.bookings.find(x => x.id === p[0]);
      return [b ? [{ ...b }] : []];
    }
    if (has(sql, 'SELECT ticket_type_id FROM booking_items')) {
      return [state.items.filter(i => i.booking_id === p[0]).map(i => ({ ticket_type_id: i.ticket_type_id }))];
    }
    if (has(sql, "UPDATE bookings SET sync_status='done'") || has(sql, "UPDATE bookings SET sync_status='error'")) {
      const b = state.bookings.find(x => x.id === p[0] && x.status === p[1]);
      if (b) b.sync_status = has(sql, "'done'") ? 'done' : 'error';
      return [{ affectedRows: b ? 1 : 0 }];
    }
    if (has(sql, "SELECT id FROM bookings WHERE sync_status IN ('pending','error')")) {
      return [state.bookings.filter(b => b.sync_status !== 'done').map(b => ({ id: b.id }))];
    }
    throw new Error(`Unexpected SQL in booking test: ${sql}`);
  }

  return {
    state,
    query: run,
    async getConnection() {
      let snapshot = null;
      return {
        query: run,
        async beginTransaction() { snapshot = clone(); },
        async commit() { snapshot = null; },
        async rollback() { if (snapshot) restore(snapshot); snapshot = null; },
        release() {}
      };
    }
  };
}

const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const makeTicket = (id, overrides = {}) => ({
  id, event_id: 1, label: `Type ${id}`, price: 500, capacity: 5, available: 5,
  status: 'published', start_at: future, ...overrides
});
const ticketCount = (db, id) => db.state.tickets.get(id).available;

// Replace the three Mongo write operations with recorders for one test.
function stubMongo(t, { failNotification = null } = {}) {
  const calls = { cart: [], logs: [], notifications: [] };
  const original = {
    cart: Cart.updateOne, log: UserActivityLog.updateOne, note: Notification.updateOne
  };
  Cart.updateOne = async (...args) => { calls.cart.push(args); return {}; };
  UserActivityLog.updateOne = async (...args) => { calls.logs.push(args); return {}; };
  Notification.updateOne = async (...args) => {
    if (failNotification) throw failNotification;
    calls.notifications.push(args);
    return {};
  };
  t.after(() => {
    Cart.updateOne = original.cart;
    UserActivityLog.updateOne = original.log;
    Notification.updateOne = original.note;
  });
  return calls;
}

// --------------------------- createBooking ---------------------------------

test('successful booking reduces stock and stores booking items', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1), makeTicket(2, { price: 250 })] });
  const booking = await createBooking(7, [
    { ticket_type_id: 1, quantity: 2 }, { ticketTypeId: 2, quantity: 1 }
  ], db);
  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.sync_status, 'pending');
  assert.equal(booking.total_amount, 1250);
  assert.match(booking.booking_code, /^NX-[0-9A-F]{8}$/);
  assert.equal(ticketCount(db, 1), 3);
  assert.equal(ticketCount(db, 2), 4);
  assert.equal(db.state.items.length, 2);
});

test('booking more than the remaining stock fails and rolls back every write', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1), makeTicket(2, { available: 1 })] });
  await assert.rejects(
    createBooking(7, [{ ticket_type_id: 1, quantity: 2 }, { ticket_type_id: 2, quantity: 3 }], db),
    err => err.status === 409 && /Insufficient tickets/.test(err.message)
  );
  assert.equal(ticketCount(db, 1), 5, 'ticket 1 stock is untouched');
  assert.equal(ticketCount(db, 2), 1, 'ticket 2 stock is untouched');
  assert.equal(db.state.bookings.length, 0, 'no booking row remains');
  assert.equal(db.state.items.length, 0, 'no booking item remains');
});

test('a late failure after some writes rolls the whole transaction back', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1), makeTicket(2)] });
  const realQuery = db.getConnection;
  // Make the second stock update fail after the first one succeeded.
  let stockUpdates = 0;
  db.getConnection = async () => {
    const conn = await realQuery();
    const q = conn.query;
    conn.query = async (sql, params) => {
      if (sql.includes('available=available-?') && ++stockUpdates === 2) {
        throw new Error('simulated database failure');
      }
      return q(sql, params);
    };
    return conn;
  };
  await assert.rejects(
    createBooking(7, [{ ticket_type_id: 1, quantity: 1 }, { ticket_type_id: 2, quantity: 1 }], db),
    /simulated database failure/
  );
  assert.equal(ticketCount(db, 1), 5);
  assert.equal(ticketCount(db, 2), 5);
  assert.equal(db.state.bookings.length, 0);
  assert.equal(db.state.items.length, 0);
});

test('the last tickets can be booked once, the next buyer is rejected', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1, { available: 2 })] });
  await createBooking(1, [{ ticket_type_id: 1, quantity: 2 }], db);
  await assert.rejects(
    createBooking(2, [{ ticket_type_id: 1, quantity: 1 }], db),
    err => err.status === 409
  );
  assert.equal(ticketCount(db, 1), 0);
  assert.equal(db.state.bookings.length, 1);
});

test('rejects unknown, unpublished and already started events', async () => {
  const db = createFakeDb({ tickets: [
    makeTicket(1, { status: 'draft' }),
    makeTicket(2, { start_at: new Date(Date.now() - 1000) })
  ] });
  await assert.rejects(createBooking(1, [{ ticket_type_id: 99, quantity: 1 }], db), err => err.status === 404);
  await assert.rejects(createBooking(1, [{ ticket_type_id: 1, quantity: 1 }], db), err => err.status === 409);
  await assert.rejects(createBooking(1, [{ ticket_type_id: 2, quantity: 1 }], db), err => err.status === 409);
  assert.equal(db.state.bookings.length, 0);
});

test('rejects invalid cart input before touching the database', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  await assert.rejects(createBooking(1, [], db), err => err.status === 400);
  await assert.rejects(createBooking(1, [{ ticket_type_id: 1, quantity: 0 }], db), err => err.status === 400);
  await assert.rejects(createBooking(1, [{ ticket_type_id: 1, quantity: 21 }], db), err => err.status === 400);
  await assert.rejects(
    createBooking(1, [{ ticket_type_id: 1, quantity: 1 }, { ticket_type_id: 1, quantity: 1 }], db),
    err => err.status === 400
  );
  assert.equal(ticketCount(db, 1), 5);
});

// --------------------------- cancelBooking ---------------------------------

test('cancelling a booking restores stock and marks it cancelled', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1), makeTicket(2)] });
  const booking = await createBooking(7, [
    { ticket_type_id: 1, quantity: 2 }, { ticket_type_id: 2, quantity: 3 }
  ], db);
  assert.equal(ticketCount(db, 1), 3);
  assert.equal(ticketCount(db, 2), 2);
  const cancelled = await cancelBooking(booking.id, 7, db);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.sync_status, 'pending');
  assert.equal(ticketCount(db, 1), 5);
  assert.equal(ticketCount(db, 2), 5);
});

test('a booking cannot be cancelled twice and stock is restored only once', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 2 }], db);
  await cancelBooking(booking.id, 7, db);
  await assert.rejects(cancelBooking(booking.id, 7, db), err => err.status === 409);
  assert.equal(ticketCount(db, 1), 5);
});

test('another customer cannot cancel the booking, an admin call (no user id) can', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 2 }], db);
  await assert.rejects(cancelBooking(booking.id, 8, db), err => err.status === 403);
  assert.equal(ticketCount(db, 1), 3, 'stock unchanged after the refused cancel');
  await cancelBooking(booking.id, null, db);
  assert.equal(ticketCount(db, 1), 5);
});

test('cancelling an unknown booking returns 404 and an invalid id returns 400', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  await assert.rejects(cancelBooking(999, 1, db), err => err.status === 404);
  await assert.rejects(cancelBooking('abc', 1, db), err => err.status === 400);
});

test('restored stock never exceeds capacity even if capacity was lowered after the sale', async () => {
  const db = createFakeDb({ tickets: [makeTicket(1, { capacity: 5, available: 5 })] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 4 }], db);
  db.state.tickets.get(1).capacity = 3; // admin shrinks the venue afterwards
  await cancelBooking(booking.id, 7, db);
  assert.equal(ticketCount(db, 1), 3);
});

// ---------------------------- syncBooking ----------------------------------

test('syncing a confirmed booking clears cart items, logs it, notifies and marks done', async (t) => {
  const calls = stubMongo(t);
  const db = createFakeDb({ tickets: [makeTicket(1), makeTicket(2)] });
  const booking = await createBooking(7, [
    { ticket_type_id: 1, quantity: 1 }, { ticket_type_id: 2, quantity: 1 }
  ], db);
  await syncBooking(booking.id, db);

  assert.deepEqual(calls.cart[0][0], { userId: 7 });
  assert.deepEqual(calls.cart[0][1], { $pull: { items: { ticketTypeId: { $in: [1, 2] } } } });
  assert.deepEqual(calls.logs.map(c => c[1].$setOnInsert.action_type), ['booking_confirmed']);
  assert.equal(calls.notifications.length, 1);
  assert.equal(calls.notifications[0][0].dedupeKey, `booking-${booking.id}-confirmed`);
  assert.equal(calls.notifications[0][1].$setOnInsert.title, 'Booking confirmed');
  assert.equal(db.state.bookings[0].sync_status, 'done');
});

test('syncing a cancelled booking logs both events and sends a cancellation notice', async (t) => {
  const calls = stubMongo(t);
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 1 }], db);
  await cancelBooking(booking.id, 7, db);
  await syncBooking(booking.id, db);

  assert.equal(calls.cart.length, 0, 'a cancelled booking does not touch the cart');
  assert.deepEqual(
    calls.logs.map(c => c[1].$setOnInsert.action_type).sort(),
    ['booking_cancelled', 'booking_confirmed']
  );
  assert.equal(calls.notifications[0][0].dedupeKey, `booking-${booking.id}-cancelled`);
  assert.equal(calls.notifications[0][1].$setOnInsert.title, 'Booking cancelled');
  assert.equal(db.state.bookings[0].sync_status, 'done');
});

test('syncing twice reuses the same dedupe keys so nothing is duplicated', async (t) => {
  const calls = stubMongo(t);
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 1 }], db);
  await syncBooking(booking.id, db);
  await syncBooking(booking.id, db);
  const logKeys = calls.logs.map(c => c[0].dedupeKey);
  const noteKeys = calls.notifications.map(c => c[0].dedupeKey);
  assert.equal(new Set(logKeys).size, 1);
  assert.equal(new Set(noteKeys).size, 1);
  assert.ok(calls.logs.every(c => c[2].upsert === true), 'log writes are idempotent upserts');
  assert.ok(calls.notifications.every(c => c[2].upsert === true), 'notification writes are idempotent upserts');
});

test('a MongoDB failure marks the booking as error and retryPending recovers it', async (t) => {
  const failing = stubMongo(t, { failNotification: new Error('mongo is down') });
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 1 }], db);
  await assert.rejects(syncBooking(booking.id, db), /mongo is down/);
  assert.equal(db.state.bookings[0].sync_status, 'error');
  assert.equal(ticketCount(db, 1), 4, 'the SQL booking and stock change are kept');

  // Mongo comes back: restore a working stub and retry.
  Notification.updateOne = async () => ({});
  await retryPending(db);
  assert.equal(db.state.bookings[0].sync_status, 'done');
  assert.equal(failing.notifications.length, 0);
});

test('a duplicate-key race from a parallel sync is not treated as a failure', async (t) => {
  stubMongo(t, { failNotification: Object.assign(new Error('E11000 duplicate key'), { code: 11000 }) });
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  const booking = await createBooking(7, [{ ticket_type_id: 1, quantity: 1 }], db);
  await syncBooking(booking.id, db);
  assert.equal(db.state.bookings[0].sync_status, 'done');
});

test('syncing an unknown booking is a no-op', async (t) => {
  const calls = stubMongo(t);
  const db = createFakeDb({ tickets: [makeTicket(1)] });
  await syncBooking(12345, db);
  assert.equal(calls.logs.length + calls.notifications.length + calls.cart.length, 0);
});

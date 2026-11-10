import { randomUUID } from 'node:crypto';
import { pool } from './config.js';
import { Cart, Notification } from './models.js';
import { HttpError, mustInt, normalizeItems } from './util.js';

export async function createBooking(userId, rawItems) {
  const items = normalizeItems(rawItems);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Sorted locks reduce deadlock risk when two carts share ticket types.
    const sorted = [...items].sort((a,b) => a.ticket_type_id - b.ticket_type_id);
    const details = [];
    for (const i of sorted) {
      const [[ticket]] = await conn.query(
        `SELECT t.*, e.status, e.start_at FROM ticket_types t JOIN events e ON e.id=t.event_id WHERE t.id=? FOR UPDATE`,
        [i.ticket_type_id]);
      if (!ticket) throw new HttpError(404, 'Ticket type not found');
      if (ticket.status !== 'published') throw new HttpError(409, 'Event is not available for booking');
      if (new Date(ticket.start_at).getTime() <= Date.now()) throw new HttpError(409, 'This event already started');
      if (ticket.available < i.quantity) throw new HttpError(409, `Insufficient tickets for ${ticket.label}: only ${ticket.available} left`);
      details.push({ ...i, price: ticket.price });
    }
    const total = Math.round(details.reduce((sum, i) => sum + Math.round(i.price*100)*i.quantity, 0))/100;
    const code = `NX-${randomUUID().slice(0,8).toUpperCase()}`;
    const [created] = await conn.query(
      'INSERT INTO bookings (user_id, booking_code, total_amount, sync_status) VALUES (?,?,?,?)',
      [userId, code, total, 'pending']);
    for (const i of details) {
      const [updated] = await conn.query('UPDATE ticket_types SET available=available-? WHERE id=? AND available>=?', [i.quantity,i.ticket_type_id,i.quantity]);
      if (updated.affectedRows !== 1) throw new HttpError(409,'Insufficient ticket stock');
      await conn.query('INSERT INTO booking_items (booking_id,ticket_type_id,quantity,unit_price) VALUES (?,?,?,?)', [created.insertId,i.ticket_type_id,i.quantity,i.price]);
    }
    await conn.commit();
    return { id: created.insertId, booking_code: code, total_amount: total, status:'confirmed', sync_status:'pending' };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

export async function cancelBooking(bookingId, userId=null) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE',[mustInt(bookingId)]);
    if (!booking) throw new HttpError(404,'Booking not found');
    if (userId !== null && booking.user_id !== userId) throw new HttpError(403,'Not your booking');
    if (booking.status !== 'confirmed') throw new HttpError(409,'Booking is already cancelled');
    const [items] = await conn.query('SELECT * FROM booking_items WHERE booking_id=? ORDER BY ticket_type_id FOR UPDATE',[booking.id]);
    for (const i of items) await conn.query('UPDATE ticket_types SET available=available+? WHERE id=?',[i.quantity,i.ticket_type_id]);
    await conn.query("UPDATE bookings SET status='cancelled', sync_status='pending' WHERE id=?",[booking.id]);
    await conn.commit();
    return { ...booking, status:'cancelled', sync_status:'pending' };
  } catch(e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

// Durable retry source lives in SQL bookings.sync_status. Cross-DB writes are
// idempotent and eventually consistent, not a distributed ACID transaction.
export async function syncBooking(bookingId) {
  const [[b]] = await pool.query('SELECT * FROM bookings WHERE id=?',[mustInt(bookingId)]);
  if (!b) return;
  try {
    const [items] = await pool.query('SELECT ticket_type_id FROM booking_items WHERE booking_id=?',[b.id]);
    if (b.status === 'confirmed') {
      const ids = items.map(i => i.ticket_type_id);
      await Cart.updateOne({userId:b.user_id}, {$pull:{items:{ticketTypeId:{$in:ids}}}});
    }
    const cancelled = b.status === 'cancelled';
    await Notification.updateOne({dedupeKey:`booking-${b.id}-${b.status}`}, {
      $setOnInsert: { userId:b.user_id, type:'booking', isRead:false,
        title:cancelled?'Booking cancelled':'Booking confirmed',
        message:cancelled?`${b.booking_code} was cancelled and stock restored.`:`${b.booking_code} is confirmed. Your tickets are ready.`,
        dedupeKey:`booking-${b.id}-${b.status}` }
    }, {upsert:true});
    await pool.query("UPDATE bookings SET sync_status='done' WHERE id=? AND status=?",[b.id,b.status]);
  } catch (error) {
    await pool.query("UPDATE bookings SET sync_status='error' WHERE id=? AND status=?",[b.id,b.status]);
    throw error;
  }
}

// Explicit demo: writes a new booking row AND decrements stock, then triggers
// an intentional exception. The catch rolls both writes back before reporting.
export async function demonstrateRollback(userId) {
  const conn=await pool.getConnection();
  let example;
  let code;
  try {
    await conn.beginTransaction();
    const [[t]]=await conn.query(`SELECT t.id,t.label,t.available FROM ticket_types t
      JOIN events e ON e.id=t.event_id WHERE t.available>0 AND e.status='published'
      ORDER BY t.id LIMIT 1 FOR UPDATE`);
    if(!t) throw new HttpError(409,'No available tickets to test');
    example={ticket_type_id:t.id,label:t.label,before:t.available};
    code=`NX-TEST-${randomUUID().slice(0,8)}`;
    await conn.query('INSERT INTO bookings (user_id,booking_code,total_amount,sync_status) VALUES (?,?,0,?)',[userId,code,'pending']);
    await conn.query('UPDATE ticket_types SET available=available-1 WHERE id=?',[t.id]);
    throw new Error('SIMULATED_FAILURE_AFTER_TWO_WRITES');
  } catch(err) {
    await conn.rollback();
    if(err.message!=='SIMULATED_FAILURE_AFTER_TWO_WRITES') throw err;
  } finally { conn.release(); }
  const [[t]]=await pool.query('SELECT available FROM ticket_types WHERE id=?',[example.ticket_type_id]);
  const [[b]]=await pool.query('SELECT COUNT(*) AS count FROM bookings WHERE booking_code=?',[code]);
  return {...example,after:t.available,booking_rows_remaining:b.count,rolled_back:t.available===example.before && b.count===0};
}

export async function retryPending() {
  const [pending] = await pool.query("SELECT id FROM bookings WHERE sync_status IN ('pending','error') ORDER BY id LIMIT 30");
  for (const b of pending) {
    try { await syncBooking(b.id); } catch (err) { console.warn('Sync pending', b.id, err.message); }
  }
}

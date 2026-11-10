import bcrypt from 'bcryptjs';
import { pool } from './config.js';
import { collections } from './models.js';
import { cancelBooking, createBooking, syncBooking } from './booking.js';
import { HttpError, mustInt, mustMoney, mustText } from './util.js';
import { normalizeEventTags } from './event-tags.js';

const sqlFields = {
  users: ['display_name','email','role'],
  events: ['organizer_id','title','category','venue','city','description','start_at','end_at','poster_path','status','audience_groups','benefits'],
  ticket_types: ['event_id','label','price','capacity','available']
};
const selects = {
  users:'SELECT id,display_name,email,role,created_at FROM users ORDER BY id DESC LIMIT 100',
  events:'SELECT * FROM events ORDER BY id DESC LIMIT 100',
  ticket_types:'SELECT * FROM ticket_types ORDER BY id DESC LIMIT 100',
  bookings:'SELECT * FROM bookings ORDER BY id DESC LIMIT 100',
  booking_items:'SELECT * FROM booking_items ORDER BY id DESC LIMIT 100'
};
const pick = (body, fields) => Object.fromEntries(fields.filter(k=>Object.prototype.hasOwnProperty.call(body,k)).map(k=>[k,body[k]]));
const enumCheck = (v, set, key) => { if (!set.includes(v)) throw new HttpError(400,`Invalid ${key}`); return v; };
function validateSql(table, p) {
  const o = {...p};
  for (const k of Object.keys(o)) {
    if (['organizer_id','event_id'].includes(k)) o[k]=mustInt(o[k],k);
    else if (['capacity','available'].includes(k)) { const v=Number(o[k]); if(!Number.isSafeInteger(v)||v<0) throw new HttpError(400,`Invalid ${k}`); o[k]=v; }
    else if (k==='price') o[k]=mustMoney(o[k]);
    else if (['start_at','end_at'].includes(k)) { if(!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(String(o[k]))) throw new HttpError(400,`Invalid ${k}`); }
    else if (k==='audience_groups' || k==='benefits') o[k]=JSON.stringify(normalizeEventTags(k,o[k]));
    else if (k==='role') o[k]=enumCheck(o[k],['customer','admin'],k);
    else if (k==='poster_path') {
      o[k]=mustText(o[k],k,255);
      if(!/^\/(posters|uploads)\/[a-zA-Z0-9_.-]+$/.test(o[k])) throw new HttpError(400,'Poster must be a local /posters/ or /uploads/ asset');
    }
    else if (k==='status') o[k]=enumCheck(o[k],['draft','published','cancelled'],k);
    else if (k==='email') { o[k]=mustText(o[k],k,190).toLowerCase(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o[k])) throw new HttpError(400,'Invalid email'); }
    else o[k]=mustText(o[k],k,k==='description'?5000:255);
  }
  if (table==='ticket_types' && o.available !== undefined && o.capacity!==undefined && o.available>o.capacity) throw new HttpError(400,'Available exceeds capacity');
  return o;
}
const sqlTable = t => Object.prototype.hasOwnProperty.call(selects,t);
export async function listAdmin(table) {
  if (sqlTable(table)) { const [rows]=await pool.query(selects[table]); return rows; }
  const Model=collections[table];
  if (!Model) throw new HttpError(404,'Unknown entity');
  return Model.find({}).sort({createdAt:-1}).limit(100).lean();
}
async function sqlCreate(table, body) {
  if (table==='users') {
    const p=validateSql(table,pick(body,sqlFields.users));
    const password=mustText(body.password,'password',72);
    if(password.length<8) throw new HttpError(400,'Password must be at least 8 characters');
    const hash=await bcrypt.hash(password,10);
    const [r]=await pool.query('INSERT INTO users (display_name,email,role,password_hash) VALUES (?,?,?,?)',[p.display_name,p.email,p.role||'customer',hash]);
    return {id:r.insertId};
  }
  if (table==='bookings') {
    const booking=await createBooking(mustInt(body.user_id),body.items);
    try { await syncBooking(booking.id); } catch(err) { console.warn('Booking awaiting sync',err.message); }
    return booking;
  }
  if (table==='booking_items') return modifyItem('create',null,body);
  const p=validateSql(table,pick(body,sqlFields[table]||[]));
  if (!Object.keys(p).length) throw new HttpError(400,'No fields provided');
  if(table==='ticket_types' && p.available===undefined) p.available=p.capacity;
  const fields=Object.keys(p);
  const [r]=await pool.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`,Object.values(p));
  return {id:r.insertId};
}
async function sqlUpdate(table, id, body) {
  if (table==='bookings') {
    if(body.status!=='cancelled') throw new HttpError(400,'Only cancelling a booking is supported; booking creation uses inventory transaction');
    const booking=await cancelBooking(id);
    try { await syncBooking(id); } catch(err) { console.warn('Cancellation awaiting sync',err.message); }
    return booking;
  }
  if (table==='booking_items') return modifyItem('update',id,body);
  const p=validateSql(table,pick(body,sqlFields[table]||[]));
  if(table==='users' && body.password!==undefined) {
    const pwd=mustText(body.password,'password',72);
    if (pwd.length<8) throw new HttpError(400,'Password must be at least 8 characters');
    p.password_hash=await bcrypt.hash(pwd,10);
  }
  const fields=Object.keys(p);
  if(!fields.length) throw new HttpError(400,'No editable fields provided');
  const [r]=await pool.query(`UPDATE ${table} SET ${fields.map(k=>`${k}=?`).join(',')} WHERE id=?`,[...Object.values(p),id]);
  if (!r.affectedRows) throw new HttpError(404,'Record not found');
  return {id};
}
async function sqlDelete(table,id,actingUserId) {
  if (table==='users' && id===actingUserId) throw new HttpError(400,'Cannot delete your own account');
  if (table==='bookings') {
    const [[b]]=await pool.query('SELECT status FROM bookings WHERE id=?',[id]);
    if(!b) throw new HttpError(404,'Not found');
    if(b.status!=='cancelled') throw new HttpError(409,'Cancel booking to return stock before deleting it');
  }
  if (table==='booking_items') return modifyItem('delete',id,{});
  const [r]=await pool.query(`DELETE FROM ${table} WHERE id=?`,[id]);
  if(!r.affectedRows) throw new HttpError(404,'Record not found');
  return {deleted:true};
}
// All booking-item edits use the same inventory accounting discipline as checkout.
async function modifyItem(action,id,body) {
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    let previous, bookingId, ticketId, nextQty;
    if (action==='create') { bookingId=mustInt(body.booking_id); ticketId=mustInt(body.ticket_type_id); nextQty=mustInt(body.quantity); }
    else {
      const [[old]]=await conn.query('SELECT * FROM booking_items WHERE id=?',[mustInt(id)]);
      if(!old) throw new HttpError(404,'Booking item not found');
      previous=old; bookingId=old.booking_id; ticketId=old.ticket_type_id;
      nextQty=action==='delete'?0:mustInt(body.quantity);
    }
    const [[booking]]=await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE',[bookingId]);
    if(!booking) throw new HttpError(404,'Booking not found');
    if(booking.status!=='confirmed') throw new HttpError(409,'Cannot modify items in a cancelled booking');
    const [[ticket]]=await conn.query('SELECT * FROM ticket_types WHERE id=? FOR UPDATE',[ticketId]);
    if(!ticket) throw new HttpError(404,'Ticket not found');
    const currentQty=previous?.quantity||0;
    const delta=nextQty-currentQty;
    if(delta>ticket.available) throw new HttpError(409,'Insufficient ticket stock');
    await conn.query('UPDATE ticket_types SET available=available-? WHERE id=?',[delta,ticketId]);
    if(action==='create') await conn.query('INSERT INTO booking_items (booking_id,ticket_type_id,quantity,unit_price) VALUES (?,?,?,?)',[bookingId,ticketId,nextQty,ticket.price]);
    else if(action==='update') await conn.query('UPDATE booking_items SET quantity=? WHERE id=?',[nextQty,id]);
    else await conn.query('DELETE FROM booking_items WHERE id=?',[id]);
    await conn.query(`UPDATE bookings SET total_amount=(SELECT COALESCE(SUM(quantity*unit_price),0) FROM booking_items WHERE booking_id=?), sync_status='pending' WHERE id=?`,[bookingId,bookingId]);
    await conn.commit();
    return {booking_id:bookingId};
  } catch(err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}
export async function createAdmin(table,body) {
  if (sqlTable(table)) return sqlCreate(table,body);
  const Model=collections[table]; if(!Model) throw new HttpError(404,'Unknown entity');
  const doc=await Model.create(body); return doc.toObject();
}
export async function updateAdmin(table,rawId,body) {
  if (sqlTable(table)) return sqlUpdate(table,mustInt(rawId),body);
  const Model=collections[table]; if(!Model) throw new HttpError(404,'Unknown entity');
  const doc=await Model.findByIdAndUpdate(rawId,{$set:body},{new:true,runValidators:true});
  if(!doc) throw new HttpError(404,'Record not found');
  return doc;
}
export async function deleteAdmin(table,rawId,actingUserId) {
  if (sqlTable(table)) return sqlDelete(table,mustInt(rawId),actingUserId);
  const Model=collections[table]; if(!Model) throw new HttpError(404,'Unknown entity');
  const doc=await Model.findByIdAndDelete(rawId);
  if(!doc) throw new HttpError(404,'Record not found');
  return {deleted:true};
}

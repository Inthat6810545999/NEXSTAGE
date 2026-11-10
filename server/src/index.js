import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { pool, connectMongo } from './config.js';
import { Cart, Review, Wishlist, Notification } from './models.js';
import { handler, HttpError, mustInt, mustText, normalizeItems } from './util.js';
import { parseEventTags, matchesAudience } from './event-tags.js';
import { requireAuth, requireAdmin, writeSession, clearSession } from './auth.js';
import { createBooking, cancelBooking, syncBooking, retryPending, demonstrateRollback } from './booking.js';
import { listAdmin, createAdmin, updateAdmin, deleteAdmin } from './admin.js';

const app=express();
const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/uploads');
fs.mkdirSync(uploadDir,{recursive:true});
const uploadPoster = multer({
  storage:multer.diskStorage({
    destination:(_req,_file,cb)=>cb(null,uploadDir),
    filename:(_req,file,cb)=>cb(null,`${randomUUID()}${({ 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp' })[file.mimetype]||'.bin'}`)
  }),
  fileFilter:(_req,file,cb)=>{
    if(!['image/png','image/jpeg','image/webp'].includes(file.mimetype)) return cb(new Error('Poster must be a PNG, JPEG or WebP image'));
    cb(null,true);
  },
  limits:{fileSize:5*1024*1024}
});
app.use('/uploads',express.static(uploadDir,{fallthrough:false,maxAge:'1h'}));
app.disable('x-powered-by');
app.use(express.json({limit:'100kb'}));
app.use(cookieParser());
app.use((req,res,next)=>{
  // Only one origin in development: Vite proxies /api to this process.
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  next();
});

app.get('/api/health',handler(async (_req,res)=>{
  await pool.query('SELECT 1');
  res.json({ok:true,app:'NEXSTAGE',databases:['MySQL','MongoDB']});
}));

async function userSummary(id) {
  const [[u]]=await pool.query('SELECT id,display_name,email,role FROM users WHERE id=?',[id]);
  return u||null;
}
app.get('/api/me',handler(async (req,res)=>{
  try {
    const token=req.cookies?.nexstage_session;
    if(!token) return res.json({user:null});
    const jwt=(await import('jsonwebtoken')).default;
    const payload=jwt.verify(token,process.env.JWT_SECRET||'DEV_ONLY_CHANGE_ME_NEXSTAGE_SECRET');
    const user=await userSummary(payload.id);
    return res.json({user});
  } catch { res.json({user:null}); }
}));
app.post('/api/auth/register',handler(async (req,res)=>{
  const name=mustText(req.body.display_name,'name',100);
  const email=mustText(req.body.email,'email',190).toLowerCase();
  const password=mustText(req.body.password,'password',72);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400,'Invalid email');
  if(password.length<8) throw new HttpError(400,'Password must have at least 8 characters');
  const hash=await bcrypt.hash(password,10);
  const [r]=await pool.query('INSERT INTO users (display_name,email,password_hash,role) VALUES (?,?,?,?)',[name,email,hash,'customer']);
  const u={id:r.insertId,display_name:name,email,role:'customer'};
  writeSession(res,u); res.status(201).json({user:u});
}));
app.post('/api/auth/login',handler(async(req,res)=>{
  const email=mustText(req.body.email,'email',190).toLowerCase();
  const [rows]=await pool.query('SELECT * FROM users WHERE email=?',[email]);
  const u=rows[0];
  if(!u || !(await bcrypt.compare(req.body.password||'',u.password_hash))) throw new HttpError(401,'Incorrect email or password');
  writeSession(res,u);
  res.json({user:await userSummary(u.id)});
}));
app.post('/api/auth/logout',(_req,res)=>{ clearSession(res); res.json({ok:true}); });

app.get('/api/events',handler(async(req,res)=>{
  const [events]=await pool.query(`SELECT e.*, u.display_name AS organizer_name FROM events e JOIN users u ON u.id=e.organizer_id
    WHERE e.status='published' ORDER BY e.start_at,id LIMIT 80`);
  const [types]=await pool.query('SELECT * FROM ticket_types ORDER BY price,id');
  const tickets=new Map();
  for(const t of types) tickets.set(t.event_id,[...(tickets.get(t.event_id)||[]),t]);
  let arr=events.map(e=>({...e,audience_groups:parseEventTags(e.audience_groups,['everyone']),benefits:parseEventTags(e.benefits,[]),tickets:tickets.get(e.id)||[]}));
  if(req.query.audience && req.query.audience!=='all') arr=arr.filter(e=>matchesAudience(e, req.query.audience));
  if(req.query.category && req.query.category!=='All') arr=arr.filter(e=>e.category===req.query.category);
  if(req.query.search) { const q=String(req.query.search).toLowerCase(); arr=arr.filter(e=>`${e.title} ${e.venue} ${e.category}`.toLowerCase().includes(q)); }
  res.json({events:arr});
}));
app.get('/api/events/:id',handler(async(req,res)=>{
  const [[e]]=await pool.query('SELECT * FROM events WHERE id=?',[mustInt(req.params.id)]);
  if(!e || e.status!=='published') throw new HttpError(404,'Event not found');
  const [tickets]=await pool.query('SELECT * FROM ticket_types WHERE event_id=? ORDER BY price',[e.id]);
  const reviews=await Review.find({eventId:e.id}).sort({createdAt:-1}).limit(20).lean();
  res.json({event:{...e,audience_groups:parseEventTags(e.audience_groups,['everyone']),benefits:parseEventTags(e.benefits,[]),tickets},reviews});
}));
app.get('/api/stats',handler(async(_req,res)=>{
  const [[e]]=await pool.query("SELECT COUNT(*) AS count FROM events WHERE status='published'");
  const [[t]]=await pool.query('SELECT COALESCE(SUM(capacity-available),0) AS sold FROM ticket_types');
  res.json({events:e.count,ticketsSold:t.sold});
}));

app.get('/api/cart',requireAuth,handler(async(req,res)=>{
  const cart=await Cart.findOne({userId:req.user.id}).lean();
  res.json({cart:cart||{userId:req.user.id,items:[]}});
}));
app.put('/api/cart',requireAuth,handler(async(req,res)=>{
  const items=Array.isArray(req.body.items) && req.body.items.length===0?[]:normalizeItems(req.body.items);
  const ids=items.map(i=>i.ticket_type_id);
  if(ids.length) {
    const [found]=await pool.query(`SELECT id FROM ticket_types WHERE id IN (${ids.map(()=>'?').join(',')})`,ids);
    if(found.length!==ids.length) throw new HttpError(404,'Some tickets no longer exist');
  }
  const cart=await Cart.findOneAndUpdate({userId:req.user.id},{$set:{items:items.map(i=>({ticketTypeId:i.ticket_type_id,quantity:i.quantity}))}},{upsert:true,new:true,runValidators:true});
  res.json({cart});
}));
app.post('/api/checkout',requireAuth,handler(async(req,res)=>{
  const cart=await Cart.findOne({userId:req.user.id}).lean();
  if(!cart?.items?.length) throw new HttpError(400,'Your cart is empty');
  const booking=await createBooking(req.user.id,cart.items);
  try { await syncBooking(booking.id); booking.sync_status='done'; }
  catch(err) { console.warn('Committed booking will retry NoSQL sync:',err.message); booking.sync_status='pending'; }
  res.status(201).json({booking});
}));
app.get('/api/bookings',requireAuth,handler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT b.*, GROUP_CONCAT(CONCAT(e.title,' (',t.label,') ×',bi.quantity) SEPARATOR ' · ') AS summary
    FROM bookings b JOIN booking_items bi ON bi.booking_id=b.id
    JOIN ticket_types t ON t.id=bi.ticket_type_id JOIN events e ON e.id=t.event_id
    WHERE b.user_id=? GROUP BY b.id ORDER BY b.created_at DESC`,[req.user.id]);
  res.json({bookings:rows});
}));
app.get('/api/bookings/:id',requireAuth,handler(async(req,res)=>{
  const [[b]]=await pool.query('SELECT * FROM bookings WHERE id=? AND user_id=?',[mustInt(req.params.id),req.user.id]);
  if(!b) throw new HttpError(404,'Booking not found');
  const [items]=await pool.query(`SELECT bi.*,t.label,e.title,e.start_at,e.venue,e.poster_path
    FROM booking_items bi JOIN ticket_types t ON t.id=bi.ticket_type_id JOIN events e ON e.id=t.event_id
    WHERE bi.booking_id=?`,[b.id]);
  res.json({booking:{...b,items}});
}));
app.post('/api/bookings/:id/cancel',requireAuth,handler(async(req,res)=>{
  const booking=await cancelBooking(req.params.id,req.user.id);
  try { await syncBooking(booking.id); } catch(err) { console.warn('Cancellation notification will retry:',err.message); }
  res.json({booking});
}));

app.get('/api/wishlist',requireAuth,handler(async(req,res)=>{
  const wishlist=await Wishlist.findOne({userId:req.user.id}).lean();
  res.json({eventIds:wishlist?.eventIds||[]});
}));
app.post('/api/wishlist/:eventId',requireAuth,handler(async(req,res)=>{
  const eventId=mustInt(req.params.eventId,'event');
  const [[e]]=await pool.query('SELECT id FROM events WHERE id=?',[eventId]);
  if(!e) throw new HttpError(404,'Event not found');
  const current=await Wishlist.findOne({userId:req.user.id}).lean();
  const existing=current?.eventIds||[];
  const eventIds=existing.includes(eventId)?existing.filter(i=>i!==eventId):[...existing,eventId];
  await Wishlist.updateOne({userId:req.user.id},{$set:{eventIds}},{upsert:true});
  res.json({eventIds});
}));
app.get('/api/reviews',handler(async(req,res)=>{
  const eventId=req.query.eventId?mustInt(req.query.eventId,'event'):null;
  const reviews=await Review.find(eventId?{eventId}:{}).sort({createdAt:-1}).limit(100).lean();
  res.json({reviews});
}));
app.post('/api/reviews',requireAuth,handler(async(req,res)=>{
  const eventId=mustInt(req.body.eventId,'event');
  const rating=mustInt(req.body.rating,'rating');
  if(rating>5) throw new HttpError(400,'Rating must be 1–5');
  const text=mustText(req.body.text,'review',1500);
  const [[e]]=await pool.query('SELECT id FROM events WHERE id=?',[eventId]);
  if(!e) throw new HttpError(404,'Event not found');
  const review=await Review.findOneAndUpdate({userId:req.user.id,eventId},{$set:{rating,text}},{new:true,upsert:true,runValidators:true});
  res.json({review});
}));
app.delete('/api/reviews/:id',requireAuth,handler(async(req,res)=>{
  const deleted=await Review.findOneAndDelete({_id:req.params.id,userId:req.user.id});
  if(!deleted) throw new HttpError(404,'Review not found');
  res.json({deleted:true});
}));
app.get('/api/notifications',requireAuth,handler(async(req,res)=>{
  const notifications=await Notification.find({userId:req.user.id}).sort({createdAt:-1}).limit(80).lean();
  res.json({notifications});
}));
app.patch('/api/notifications/:id',requireAuth,handler(async(req,res)=>{
  const notification=await Notification.findOneAndUpdate({_id:req.params.id,userId:req.user.id},{$set:{isRead:!!req.body.isRead}},{new:true});
  if(!notification) throw new HttpError(404,'Notification not found');
  res.json({notification});
}));

app.post('/api/admin/upload',requireAuth,requireAdmin,(req,res,next)=>{
  uploadPoster.single('poster')(req,res,(err)=>{
    if(err)return res.status(400).json({error:err.message});
    if(!req.file)return res.status(400).json({error:'Please choose a poster image'});
    res.status(201).json({poster_path:`/uploads/${req.file.filename}`});
  });
});
app.get('/api/admin/overview',requireAuth,requireAdmin,handler(async(req,res)=>{
  const [[e]]=await pool.query('SELECT COUNT(*) AS total FROM events');
  const [[b]]=await pool.query("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN status='confirmed' THEN total_amount ELSE 0 END),0) AS revenue FROM bookings");
  const [[u]]=await pool.query('SELECT COUNT(*) AS total FROM users');
  const [[t]]=await pool.query('SELECT COALESCE(SUM(capacity-available),0) AS sold FROM ticket_types');
  const [recent]=await pool.query('SELECT booking_code,total_amount,status,created_at FROM bookings ORDER BY id DESC LIMIT 6');
  const [byCategory]=await pool.query("SELECT category, COUNT(*) AS total FROM events WHERE status='published' GROUP BY category ORDER BY total DESC LIMIT 8");
  res.json({events:e.total,bookings:b.total,users:u.total,revenue:b.revenue,ticketsSold:t.sold,recent,byCategory,currentAdminId:req.user.id});
}));
app.get('/api/admin/data/:entity',requireAuth,requireAdmin,handler(async(req,res)=>res.json({rows:await listAdmin(req.params.entity)})));
app.post('/api/admin/data/:entity',requireAuth,requireAdmin,handler(async(req,res)=>res.status(201).json({row:await createAdmin(req.params.entity,req.body)})));
app.patch('/api/admin/data/:entity/:id',requireAuth,requireAdmin,handler(async(req,res)=>res.json({row:await updateAdmin(req.params.entity,req.params.id,req.body)})));
app.delete('/api/admin/data/:entity/:id',requireAuth,requireAdmin,handler(async(req,res)=>res.json(await deleteAdmin(req.params.entity,req.params.id,req.user.id))));
app.post('/api/admin/demo-rollback',requireAuth,requireAdmin,handler(async(req,res)=>res.json(await demonstrateRollback(req.user.id))));
app.post('/api/admin/retry-sync',requireAuth,requireAdmin,handler(async(_req,res)=>{await retryPending();res.json({ok:true});}));

app.use((err,_req,res,_next)=>{
  if(err.code==='ER_DUP_ENTRY'||err.code===11000) return res.status(409).json({error:'A record with this unique value already exists'});
  if(err.code==='ER_ROW_IS_REFERENCED_2') return res.status(409).json({error:'Delete dependent records first'});
  if(err.code==='ER_NO_REFERENCED_ROW_2') return res.status(400).json({error:'Related SQL record does not exist'});
  if(err.name==='ValidationError'||err.name==='CastError') return res.status(400).json({error:err.message});
  if(err.code==='ER_CHECK_CONSTRAINT_VIOLATED') return res.status(400).json({error:'Database check constraint failed'});
  const status=err.status||500;
  if(status===500) console.error(err);
  res.status(status).json({error:status===500?'Internal server error':err.message});
});

const port=Number(process.env.PORT||4000);
try {
  await pool.query('SELECT 1');
  await connectMongo();
  await retryPending();
  setInterval(()=>retryPending().catch(err=>console.error('Sync retry',err.message)),30000).unref();
  app.listen(port,'127.0.0.1',()=>console.log(`NEXSTAGE API running at http://127.0.0.1:${port}`));
} catch(err) {
  console.error('Database startup failed:',err.message);
  console.error('Run docker compose up -d and npm run seed first.');
  process.exitCode=1;
  await pool.end();
}

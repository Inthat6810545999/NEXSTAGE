import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, CreditCard, Database, Heart, MapPin, Menu, Minus, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Ticket, Trash2, UserCircle, Users, X, Bell, LogOut, LayoutDashboard, Zap, SlidersHorizontal, Send, Pencil, AlertCircle, LoaderCircle, RotateCcw, Star, PartyPopper, GraduationCap, BriefcaseBusiness, Flower2, HandHeart, Award, UploadCloud, TrendingUp, Box, Map as MapIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { demoEvents } from './demo';
import VenuePreview from './VenuePreview';
import NexAI from './NexAI';

async function api(path,options={}) {
  const res=await fetch(`/api${path}`,{
    credentials:'same-origin',headers:{'Content-Type':'application/json'},...options,
    body:options.body===undefined?undefined:JSON.stringify(options.body)
  });
  const result=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(result.error||`Request failed (${res.status})`);
  return result;
}
const monthDay=d=>new Date(d).toLocaleDateString('en-US',{day:'2-digit',month:'short'}).toUpperCase();
const readableDate=d=>new Date(d).toLocaleDateString('en-US',{day:'numeric',month:'long',year:'numeric'});
const money=n=>`฿${Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2})}`;
const classes=(...c)=>c.filter(Boolean).join(' ');
const categoryOptions=['Music','Esports','Arts','Workshop','Lifestyle','Conference','Portfolio Camp','Volunteer','Certificate Course','Dharma & Wellness','Education','Community','Other'];
const audienceOptions=[
  {id:'all',name:'All audiences',subtitle:'Everything worth exploring',icon:Sparkles},
  {id:'student',name:'School students',subtitle:'Portfolio • Camps • Volunteering',icon:GraduationCap},
  {id:'university',name:'University',subtitle:'Skills • Networking • Careers',icon:Users},
  {id:'working',name:'Working adults',subtitle:'Concerts • Certificates • Growth',icon:BriefcaseBusiness},
  {id:'senior',name:'Seniors',subtitle:'Wellness • Dharma • Community',icon:Flower2}
];
const benefitOptions=[
  {id:'portfolio',name:'Portfolio'}, {id:'volunteer',name:'Volunteer hours'},
  {id:'certificate',name:'Certificate'}, {id:'entertainment',name:'Entertainment'},
  {id:'wellness',name:'Wellness'}, {id:'networking',name:'Networking'}
];
const audienceName=id=>audienceOptions.find(a=>a.id===id)?.name||(id==='everyone'?'Everyone':id);
const audienceTags=e=>Array.isArray(e.audience_groups)?e.audience_groups:['everyone'];
const benefitTags=e=>Array.isArray(e.benefits)?e.benefits:[];
const toSqlDate=s=>toInputDate(s).replace('T',' ')+':00';
const toInputDate=s=>{if(!s)return '';const d=new Date(s);if(!Number.isNaN(d.getTime()))return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;return String(s).replace(' ','T').slice(0,16);};
const specs={
  users:{description:'SQL · Accounts, roles and credentials',default:{display_name:'New member',email:'member@example.com',password:'SecurePass123!',role:'customer'}},
  events:{description:'SQL · Published events and venues',default:{organizer_id:1,title:'New Event',category:'Music',venue:'Event venue',city:'Bangkok',description:'Tell visitors what makes this event special.',audience_groups:['everyone'],benefits:[],start_at:'2027-02-10 18:00:00',end_at:'2027-02-10 22:00:00',poster_path:'/posters/default.svg',status:'published'}},
  ticket_types:{description:'SQL · Prices, capacity and remaining inventory',default:{event_id:1,label:'Early Bird',price:390,capacity:100,available:100}},
  bookings:{description:'SQL · Booking records (create through stock transaction)',default:{user_id:2,items:[{ticket_type_id:1,quantity:1}]}},
  booking_items:{description:'SQL · Line items (inventory-safe edits)',default:{booking_id:1,ticket_type_id:1,quantity:1}},
  carts:{description:'MongoDB · Flexible ticket carts',default:{userId:2,items:[{ticketTypeId:1,quantity:1}]}},
  reviews:{description:'MongoDB · Ratings and event reviews',default:{userId:2,eventId:1,rating:5,text:'Amazing event!'}},
  wishlists:{description:'MongoDB · Saved event lists',default:{userId:2,eventIds:[1,2]}},
  notifications:{description:'MongoDB · Booking and platform notices',default:{userId:2,title:'Hello!',message:'Your next experience awaits.',type:'system',isRead:false}}
};
const editableJson=(name,row)=>{
  if(name==='bookings') return JSON.stringify({status:'cancelled'},null,2);
  if(name==='booking_items') return JSON.stringify({quantity:row.quantity},null,2);
  const copy={...row};
  for(const k of ['_id','id','password_hash','created_at','createdAt','updatedAt','__v','sync_status','booking_code','total_amount']) delete copy[k];
  if(name==='users') delete copy.password;
  return JSON.stringify(copy,null,2);
};
function Button({children,variant='primary',className='',...props}){return <button className={classes('btn',`btn-${variant}`,className)} {...props}>{children}</button>;}
function Modal({onClose,children,wide=false,label}) {
  useEffect(()=>{ const f=e=>e.key==='Escape'&&onClose(); document.addEventListener('keydown',f); return ()=>document.removeEventListener('keydown',f); },[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section role="dialog" aria-modal="true" aria-label={label} className={classes('modal',wide&&'wide')}><button className="icon-btn close-modal" aria-label="Close" onClick={onClose}><X size={21}/></button>{children}</section></div>;
}
function Pill({children,kind='light'}){return <span className={classes('pill',`pill-${kind}`)}>{children}</span>;}
function EventCard({event,onOpen,favorite,onToggleFavorite,rank}) {
  const first=event.tickets?.length?Math.min(...event.tickets.map(t=>Number(t.price))):0;
  return <article className="event-card" onClick={()=>onOpen(event)} tabIndex={0} onKeyDown={e=>e.key==='Enter'&&onOpen(event)}>
    <div className="event-cover"><img src={event.poster_path} alt={`${event.title} poster`} loading="lazy"/>
      <span className="cover-category">{event.category}</span>
      <button className={classes('favorite',favorite&&'on')} onClick={e=>{e.stopPropagation();onToggleFavorite(event.id);}} aria-label={favorite?'Remove favorite':'Add favorite'}><Heart size={19} fill={favorite?'currentColor':'none'}/></button>
    </div>
    <div className="event-body">
      <div className="event-meta"><CalendarDays size={14}/>{monthDay(event.start_at)} <span className="meta-dot">•</span> {event.city}</div>
      <h3>{event.title}</h3>
      <div className="event-audience">{audienceTags(event).slice(0,2).map(g=><span key={g}>{audienceName(g)}</span>)}{benefitTags(event).includes('certificate')&&<span className="benefit-tag"><Award size={12}/> Certificate</span>}{benefitTags(event).includes('portfolio')&&<span className="benefit-tag"><GraduationCap size={12}/> Portfolio</span>}</div>
      <div className="event-location"><MapPin size={14}/><span>{event.venue}</span></div>
      <div className="event-foot"><div className="price-label">Starting from <strong>{money(first)}</strong></div><span className="event-arrow"><ArrowUpRight size={21}/></span></div>
    </div>
  </article>;
}
function Hero({onExplore}){
  return <section className="hero">
    <div className="hero-text"><div className="hero-pill"><Sparkles size={14}/> YOUR NEXT EXPERIENCE STARTS HERE</div>
      <h1>A new world of <span>experiences awaits.</span></h1>
      <p>From portfolio camps to live concerts and mindful retreats — discover what matters to you.</p>
      <div className="hero-actions"><Button onClick={onExplore}>Explore events <ArrowRight size={18}/></Button><div className="hero-mini"><div className="avatars"><span>✦</span><span>♥</span><span>★</span></div><div><strong>Made for moments</strong><small>Discover something new</small></div></div></div>
      <div className="hero-bottom"><span><CheckCircle2 size={16}/> Curated experiences</span><span><CheckCircle2 size={16}/> Easy ticket booking</span></div>
    </div>
    <div className="hero-art" aria-label="Featured event posters"><div className="hero-circle hero-circle-one"/><div className="hero-circle hero-circle-two"/><div className="poster poster-back"><img src="/posters/pixel.svg" alt="Pixel Arena event"/></div><div className="poster poster-front"><img src="/posters/lunar.svg" alt="Lunar Sound Festival"/></div><div className="hero-float hero-float-top"><span className="float-icon"><Ticket size={20}/></span><div><strong>Discover more</strong><small>Events for every stage</small></div></div><div className="hero-float hero-float-bottom"><div className="float-star">✦</div><div><strong>Good vibes only</strong><small>Make it memorable</small></div></div><span className="hero-spark hero-spark-a">✦</span><span className="hero-spark hero-spark-b">✧</span></div>
  </section>;
}
function AuthModal({onClose,onSuccess,notify}){
  const [mode,setMode]=useState('login');const [email,setEmail]=useState('student@nexstage.local');const [password,setPassword]=useState('Demo12345!');const [name,setName]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);try{const r=await api(`/auth/${mode}`,{method:'POST',body:mode==='register'?{display_name:name,email,password}:{email,password}});onSuccess(r.user);onClose();notify('Welcome to NEXSTAGE!');}catch(err){notify(err.message,'error');}finally{setBusy(false);}}
  return <Modal onClose={onClose}><div className="modal-header"><div className="auth-symbol"><Ticket size={27}/></div><h2>{mode==='login'?'Welcome back!':'Join the experience'}</h2><p>{mode==='login'?'Log in to reserve tickets and manage your events.':'Create your account to start discovering.'}</p></div>
    <div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Log in</button><button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Create account</button></div>
    <form onSubmit={submit} className="form-col">{mode==='register'&&<label>Your name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
      <label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
      <Button disabled={busy} type="submit" className="full">{busy?'Please wait…':mode==='login'?'Log in':'Create account'} <ArrowRight size={17}/></Button>
    </form><div className="demo-login"><strong>Demo account</strong><span>student@nexstage.local / Demo12345!</span><button onClick={()=>{setEmail('admin@nexstage.local');setPassword('Demo12345!');setMode('login');}}>Use admin account instead <ArrowRight size={13}/></button></div>
  </Modal>;
}
function EventModal({event,onClose,onAdd,notify,user,onLogin,onReviewed}) {
  const [choice,setChoice]=useState(event.tickets?.[0]?.id);const [qty,setQty]=useState(1);
  const [rating,setRating]=useState(5);const [review,setReview]=useState('');const [reviews,setReviews]=useState([]);const [busy,setBusy]=useState(false);
  const [venueMode, setVenueMode] = useState(null);
  const venueButtons = useRef({});
  const returnFocus = useRef(null);
  const hasVenuePreview = event.venue?.trim().toLowerCase() === 'impact arena';
  useEffect(() => {
    if (!venueMode && returnFocus.current) venueButtons.current[returnFocus.current]?.focus();
  }, [venueMode]);
  function openVenue(mode) {
    returnFocus.current = mode;
    setVenueMode(mode);
  }
  useEffect(()=>{api(`/reviews?eventId=${event.id}`).then(r=>setReviews(r.reviews)).catch(()=>{});},[event.id]);
  const ticket=event.tickets.find(t=>t.id===Number(choice))||event.tickets[0];
  async function submitReview(e){e.preventDefault();if(!user)return onLogin();setBusy(true);try{await api('/reviews',{method:'POST',body:{eventId:event.id,rating,text:review}});setReview('');onReviewed?.();const r=await api(`/reviews?eventId=${event.id}`);setReviews(r.reviews);notify('Review published');}catch(err){notify(err.message,'error');}finally{setBusy(false);}}
  if (venueMode) return <Modal wide onClose={onClose} label={event.title + ' venue preview'}>
    <VenuePreview event={event} mode={venueMode} onMode={setVenueMode} onBack={()=>setVenueMode(null)} />
  </Modal>;
  return <Modal wide onClose={onClose} label={event.title}><div className="detail-layout"><div className="detail-left"><img className="detail-poster" src={event.poster_path} alt={`${event.title} poster`}/><div className="detail-reviews"><div className="section-row"><h3>Community reviews</h3><Pill>{reviews.length} reviews</Pill></div>{reviews.length?reviews.slice(0,3).map(r=><div className="review-item" key={r._id}><span className="review-stars">{'★'.repeat(r.rating)}</span><p>{r.text}</p></div>):<p className="muted">Be the first to review this event.</p>}
    <form onSubmit={submitReview} className="review-form"><div className="rating-select">{[1,2,3,4,5].map(i=><button type="button" key={i} className={i<=rating?'star-on':'star-off'} onClick={()=>setRating(i)}>★</button>)}</div><input required maxLength={1500} placeholder="Share your thoughts…" value={review} onChange={e=>setReview(e.target.value)}/><button className="mini-submit" disabled={busy} aria-label="Post review"><Send size={17}/></button></form></div></div>
    <div className="detail-right"><Pill kind="purple">{event.category}</Pill><h2>{event.title}</h2>
      <div className="event-detail-tags">{audienceTags(event).map(g=><span key={g}><Users size={12}/>{audienceName(g)}</span>)}{benefitTags(event).map(k=><span key={k}><Award size={12}/>{benefitOptions.find(b=>b.id===k)?.name||k}</span>)}</div><p className="detail-description">{event.description}</p><div className="detail-info"><div><CalendarDays size={18}/><span><b>{readableDate(event.start_at)}</b><small>{new Date(event.start_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</small></span></div><div><MapPin size={18}/><span><b>{event.venue}</b><small>{event.city}, Thailand</small></span></div></div>
      {hasVenuePreview && <div className="venue-entry" aria-label="Explore seating">
        <button type="button" ref={element=>{venueButtons.current['3d']=element;}} onClick={()=>openVenue('3d')}><Box size={16}/> 3D Preview</button>
        <button type="button" ref={element=>{venueButtons.current['2d']=element;}} onClick={()=>openVenue('2d')}><MapIcon size={16}/> 2D Map</button>
      </div>}
      <div className="ticket-picker"><div className="ticket-picker-top"><strong>Choose your ticket</strong><span>Prices in THB</span></div>{event.tickets.map(t=><button key={t.id} onClick={()=>{setChoice(t.id);setQty(1);}} className={classes('ticket-choice',choice===t.id&&'selected')}><span className="radio-dot"/><span className="ticket-choice-title"><strong>{t.label}</strong><small>{t.available} seats left</small></span><b>{money(t.price)}</b></button>)}</div>
      <div className="qty-and-total"><div className="qty-toggle"><button onClick={()=>setQty(Math.max(1,qty-1))} aria-label="Decrease"><Minus size={16}/></button><strong>{qty}</strong><button onClick={()=>setQty(Math.min(20,qty+1))} aria-label="Increase"><Plus size={16}/></button></div><div className="total"><span>Total</span><strong>{money((ticket?.price||0)*qty)}</strong></div></div>
      <Button className="full" disabled={!ticket} onClick={()=>onAdd(ticket,qty)}><ShoppingBag size={18}/> Add to cart <ArrowRight size={17}/></Button><p className="secure-note"><ShieldCheck size={15}/> Secure local demo booking · No real payments</p>
    </div></div></Modal>;
}
function CartPanel({cart,onClose,events,onUpdate,onCheckout,loading}){
  const choices=events.flatMap(e=>(e.tickets||[]).map(t=>({...t,event:e})));
  const enriched=(cart?.items||[]).map(i=>({...i,ticket:choices.find(t=>t.id===i.ticketTypeId)})).filter(i=>i.ticket);
  const total=enriched.reduce((n,i)=>n+i.ticket.price*i.quantity,0);
  return <div className="drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="drawer"><div className="drawer-head"><div><div className="eyebrow">YOUR SELECTION</div><h2>My ticket cart <span>({enriched.length})</span></h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="drawer-list">{enriched.length?enriched.map(i=><div className="cart-item" key={i.ticketTypeId}><img src={i.ticket.event.poster_path} alt=""/><div><strong>{i.ticket.event.title}</strong><span>{i.ticket.label} · {money(i.ticket.price)}</span><div className="cart-qty"><button onClick={()=>onUpdate(i.ticketTypeId,i.quantity-1)}><Minus size={13}/></button><b>{i.quantity}</b><button onClick={()=>onUpdate(i.ticketTypeId,i.quantity+1)}><Plus size={13}/></button><button className="cart-remove" onClick={()=>onUpdate(i.ticketTypeId,0)}><Trash2 size={15}/></button></div></div></div>):<div className="empty-spot"><ShoppingBag size={44}/><h3>Nothing in your cart yet</h3><p>Discover something exciting and add tickets here.</p><Button variant="secondary" onClick={onClose}>Explore events</Button></div>}</div>
    <div className="drawer-bottom"><div className="sum-row"><span>Subtotal</span><strong>{money(total)}</strong></div><p><ShieldCheck size={14}/> Demo checkout · no charge will be made</p><Button className="full" disabled={!enriched.length||loading} onClick={onCheckout}>{loading?'Processing booking…':'Confirm booking'} <ArrowRight size={17}/></Button></div>
  </aside></div>;
}
function TicketQR({booking}){const [url,setUrl]=useState('');useEffect(()=>{QRCode.toDataURL(`NEXSTAGE|${booking.booking_code}|${booking.id}`,{margin:1,width:168,color:{dark:'#4a2389',light:'#FFFFFF'}}).then(setUrl).catch(()=>{});},[booking]);return url?<img className="qr" src={url} alt={`QR code for ${booking.booking_code}`}/>:<div className="qr-placeholder"><Ticket size={44}/></div>;}
function TicketsPage({bookings,onCancel,notify}){
  return <section className="subpage"><div className="subpage-head"><Pill kind="purple"><Ticket size={13}/> YOUR BOOKINGS</Pill><h1>Your experiences, all in one place.</h1><p>All digital tickets are generated locally. No payment gateway is used.</p></div>
    {bookings.length?<div className="ticket-list">{bookings.map(b=><div className="pass" key={b.id}><div className="pass-main"><div className="pass-head"><span><Sparkles size={15}/> NEXSTAGE PASS</span><Pill kind={b.status==='confirmed'?'success':'light'}>{b.status}</Pill></div><h3>{b.summary||'Your booked experience'}</h3><div className="pass-facts"><span>BOOKING REFERENCE <b>{b.booking_code}</b></span><span>TOTAL PAID (DEMO) <b>{money(b.total_amount)}</b></span><span>DATE <b>{readableDate(b.created_at)}</b></span></div>{b.status==='confirmed'&&<button className="text-btn" onClick={()=>onCancel(b.id)}>Cancel booking & restore stock <ArrowRight size={14}/></button>}</div><div className="pass-qr"><TicketQR booking={b}/><small>SCAN CODE</small></div></div>)}</div>:<Empty icon={<Ticket/>} title="No tickets yet" text="Your upcoming experiences will appear here after booking."/>}
  </section>;
}
function Empty({icon,title,text}){return <div className="empty-panel"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>;}
function EventEditor({value,onChange,onUpload,uploading,overview}){
  const set=(key,v)=>onChange(old=>({...old,[key]:v}));
  const groups=Array.isArray(value.audience_groups)?value.audience_groups:['everyone'];
  const benefits=Array.isArray(value.benefits)?value.benefits:[];
  function toggleAudience(id){
    if(id==='everyone'){set('audience_groups',['everyone']);return;}
    const others=groups.filter(g=>g!=='everyone');
    const next=others.includes(id)?others.filter(g=>g!==id):[...others,id];
    set('audience_groups',next.length?next:['everyone']);
  }
  function toggleBenefit(id){set('benefits',benefits.includes(id)?benefits.filter(k=>k!==id):[...benefits,id]);}
  return <div className="friendly-form">
    <div className="form-intro"><Sparkles size={17}/><span>No JSON needed. Create your own event and choose who it's for.</span></div>
    <div className="form-grid"><label className="field field-wide">Event name *<input required maxLength={180} value={value.title||''} onChange={e=>set('title',e.target.value)} placeholder="e.g. My Future Portfolio Camp"/></label>
      <label className="field">Event category *<input required list="event-categories" maxLength={40} value={value.category||''} onChange={e=>set('category',e.target.value)} placeholder="Choose or type your own"/><datalist id="event-categories">{categoryOptions.map(c=><option key={c} value={c}/>)}</datalist></label>
      <label className="field">Organizer (user ID)<input required type="number" min="1" value={value.organizer_id??overview?.currentAdminId??1} onChange={e=>set('organizer_id',Number(e.target.value))}/></label>
      <label className="field">Venue *<input required value={value.venue||''} onChange={e=>set('venue',e.target.value)} placeholder="School, hall, campus, meditation center"/></label>
      <label className="field">City *<input required value={value.city||''} onChange={e=>set('city',e.target.value)}/></label>
      <label className="field">Start date / time *<input required type="datetime-local" value={toInputDate(value.start_at)} onChange={e=>set('start_at',e.target.value)}/></label>
      <label className="field">End date / time *<input required type="datetime-local" value={toInputDate(value.end_at)} onChange={e=>set('end_at',e.target.value)}/></label>
      <label className="field field-wide">Description *<textarea required rows={4} maxLength={5000} value={value.description||''} onChange={e=>set('description',e.target.value)} placeholder="Describe activities, who can join, and the outcomes or benefits…"/></label>
    </div>
    <div className="field-label">Who is this event for? <span>Choose more than one</span></div>
    <div className="choice-grid">{[{id:'everyone',name:'Everyone',subtitle:'Open to all ages',icon:Sparkles},...audienceOptions.filter(g=>g.id!=='all')].map(({id,name,subtitle,icon:Icon})=><button type="button" key={id} className={classes('choice-tile',groups.includes(id)&&'is-selected')} onClick={()=>toggleAudience(id)}><Icon size={18}/><strong>{name}</strong><small>{subtitle}</small>{groups.includes(id)&&<Check className="choice-check" size={15}/>}</button>)}</div>
    <div className="field-label">Event benefits <span>Optional tags for discovery</span></div>
    <div className="benefit-choices">{benefitOptions.map(b=><button type="button" key={b.id} className={classes('benefit-choice',benefits.includes(b.id)&&'is-selected')} onClick={()=>toggleBenefit(b.id)}>{benefits.includes(b.id)&&<Check size={13}/>} {b.name}</button>)}</div>
    <div className="form-grid form-bottom"><label className="field">Publish status<select value={value.status||'published'} onChange={e=>set('status',e.target.value)}><option value="published">Published</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></label>
      <div className="field"><span>Event poster (local file)</span><label className="upload-button"><UploadCloud size={16}/>{uploading?'Uploading…':'Upload PNG / JPG / WebP (max 5MB)'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0])}/></label></div>
      <label className="field field-wide">Local poster path<input value={value.poster_path||'/posters/default.svg'} onChange={e=>set('poster_path',e.target.value)} placeholder="/posters/default.svg"/></label>
      <div className="poster-preview">{value.poster_path&&<img src={value.poster_path} alt="Current event poster preview"/>}<span>Poster preview — saved on your own server</span></div>
    </div>
  </div>;
}
function TicketTypeEditor({value,onChange,eventOptions}){
  const set=(key,v)=>onChange(old=>({...old,[key]:v}));
  return <div className="friendly-form"><div className="form-intro"><Ticket size={17}/> <span>Set up General, VIP, student or free tickets for your custom events.</span></div>
    <div className="form-grid"><label className="field field-wide">Choose an event *<select value={value.event_id||''} onChange={e=>set('event_id',Number(e.target.value))}>
      <option value="">Select an event…</option>{eventOptions.map(e=><option key={e.id} value={e.id}>{e.title} (#{e.id})</option>)}
    </select></label>
    <label className="field field-wide">Ticket name *<input value={value.label||''} onChange={e=>set('label',e.target.value)} placeholder="General / VIP / Student / Free admission"/></label>
    <label className="field">Price (THB) *<input type="number" min="0" step="0.01" value={value.price??0} onChange={e=>set('price',Number(e.target.value))}/></label>
    <label className="field">Maximum capacity *<input type="number" min="1" value={value.capacity??100} onChange={e=>set('capacity',Number(e.target.value))}/></label>
    <label className="field">Currently available *<input type="number" min="0" max={value.capacity??100} value={value.available??100} onChange={e=>set('available',Number(e.target.value))}/></label>
    </div><p className="tiny-help">Availability is protected by SQL stock constraints and booking transactions. For an already booked ticket, avoid arbitrarily resetting stock.</p>
  </div>;
}
function AdminPanel({notify}){
  const [selected,setSelected]=useState('events');const [rows,setRows]=useState([]);const [editor,setEditor]=useState('');const [editing,setEditing]=useState(null);const [loading,setLoading]=useState(false);const [overview,setOverview]=useState(null);const [rollback,setRollback]=useState(null);const [eventForm,setEventForm]=useState({...specs.events.default});const [uploading,setUploading]=useState(false);const [ticketForm,setTicketForm]=useState({...specs.ticket_types.default});const [eventOptions,setEventOptions]=useState([]);
  const names=Object.keys(specs);const kind=t=>['users','events','ticket_types','bookings','booking_items'].includes(t)?'SQL':'NoSQL';
  async function load(){setLoading(true);try{const [r,o]=await Promise.all([api(`/admin/data/${selected}`),api('/admin/overview')]);setRows(r.rows);setOverview(o);if(selected==='ticket_types'){const ev=await api('/admin/data/events');setEventOptions(ev.rows);}}catch(err){notify(err.message,'error');}finally{setLoading(false);}}
  useEffect(()=>{setEditor(JSON.stringify(specs[selected].default,null,2));setEditing(null);if(selected==='events')setEventForm({...specs.events.default,organizer_id:overview?.currentAdminId||1});if(selected==='ticket_types')setTicketForm({...specs.ticket_types.default});load();},[selected]);
  function edit(row){setEditing(row.id??row._id);if(selected==='events')setEventForm({...row, audience_groups:audienceTags(row),benefits:benefitTags(row)});if(selected==='ticket_types')setTicketForm({...row});setEditor(editableJson(selected,row));window.scrollTo({top:370,behavior:'smooth'});}
  function clear(){setEditing(null);if(selected==='events')setEventForm({...specs.events.default,organizer_id:overview?.currentAdminId||1});if(selected==='ticket_types')setTicketForm({...specs.ticket_types.default});setEditor(JSON.stringify(specs[selected].default,null,2));}
  async function save(){try{const payload=selected==='events'?{...eventForm,start_at:toSqlDate(eventForm.start_at),end_at:toSqlDate(eventForm.end_at)}:selected==='ticket_types'?ticketForm:JSON.parse(editor);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new Error('Please provide a JSON object');setLoading(true);const path=`/admin/data/${selected}${editing?`/${editing}`:''}`;await api(path,{method:editing?'PATCH':'POST',body:payload});notify(editing?'Record updated':'Record created');clear();await load();}catch(err){notify(err.message,'error');setLoading(false);}}
  async function uploadPoster(file){
    if(file.size>5*1024*1024){notify('Poster must be under 5MB','error');return;}
    setUploading(true);
    try{
      const body=new FormData();body.append('poster',file);
      const response=await fetch('/api/admin/upload',{method:'POST',body,credentials:'same-origin'});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload failed');
      setEventForm(old=>({...old,poster_path:result.poster_path}));notify('Poster uploaded to local server');
    }catch(err){notify(err.message,'error');}finally{setUploading(false);}
  }
  async function remove(row){if(!window.confirm('Delete this record? Deletion may be restricted by database relationships.'))return;try{setLoading(true);await api(`/admin/data/${selected}/${row.id??row._id}`,{method:'DELETE'});notify('Record deleted');await load();}catch(err){notify(err.message,'error');}finally{setLoading(false);}}
  async function retry(){try{await api('/admin/retry-sync',{method:'POST'});notify('Retry queued booking sync completed');await load();}catch(e){notify(e.message,'error');}}
  async function demoRollback(){try{const r=await api('/admin/demo-rollback',{method:'POST'});setRollback(r);notify(r.rolled_back?'SQL rollback verified':'Rollback verification failed',r.rolled_back?'success':'error');await load();}catch(e){notify(e.message,'error');}}
  return <section className="admin-page"><div className="admin-title"><div><Pill kind="purple"><LayoutDashboard size={13}/> ADMIN PANEL</Pill><h1>Workspace overview</h1><p>Manage events, inventory, and hybrid database records.</p></div><div className="admin-buttons"><Button variant="secondary" onClick={demoRollback}><ShieldCheck size={16}/> Demonstrate SQL rollback</Button><Button variant="secondary" onClick={retry}><RotateCcw size={16}/> Retry database sync</Button></div></div>
    {rollback&&<div className="rollback-panel"><ShieldCheck size={20}/><div><strong>{rollback.rolled_back?"ROLLBACK PASSED":"ROLLBACK NOT VERIFIED"}</strong><p>Ticket #{rollback.ticket_type_id} ({rollback.label}): before {rollback.before} → after {rollback.after} available; temporary booking rows remaining: {rollback.booking_rows_remaining}. A booking insert and stock decrement were intentionally reversed.</p></div><button onClick={()=>setRollback(null)}><X size={16}/></button></div>}{overview?.byCategory?.length>0&&<div className="insight-panel"><div><div className="eyebrow"><TrendingUp size={14}/> CATEGORY INSIGHTS</div><h3>Where the community is going</h3><p>Live event mix from the MySQL database.</p></div><div className="insight-bars">{overview.byCategory.map(c=><div className="insight-item" key={c.category}><span>{c.category}</span><div><i style={{width:`${Math.max(8,100*Number(c.total)/Math.max(...overview.byCategory.map(x=>Number(x.total))))}%`}}/></div><strong>{c.total}</strong></div>)}</div></div>}
    <div className="stat-grid">{[['Total events',overview?.events??'—',<CalendarDays/>],['Bookings',overview?.bookings??'—',<Ticket/>],['Members',overview?.users??'—',<Users/>],['Demo revenue',money(overview?.revenue??0),<CreditCard/>]].map(([title,value,icon])=><div className="stat" key={title}><div className="stat-icon">{icon}</div><span>{title}</span><strong>{value}</strong></div>)}</div>
    <div className="data-console"><aside className="data-sidebar"><div className="data-sidebar-title"><Database size={18}/> Data studio</div><small>RELATIONAL · MYSQL</small>{names.filter(n=>kind(n)==='SQL').map(n=><button className={selected===n?'active':''} key={n} onClick={()=>setSelected(n)}>{n.replaceAll('_',' ')}</button>)}<small>DOCUMENT · MONGODB</small>{names.filter(n=>kind(n)==='NoSQL').map(n=><button className={selected===n?'active':''} key={n} onClick={()=>setSelected(n)}>{n}</button>)}</aside>
      <div className="data-main"><div className="data-top"><div><Pill kind="purple">{kind(selected)} DATABASE</Pill><h2>{selected.replaceAll('_',' ')}</h2><p>{specs[selected].description}</p></div><Pill>{rows.length} records</Pill></div>
        <div className="editor-card"><div className="editor-head"><strong>{selected==='events'?(editing?'Edit event':'Create your own event'):selected==='ticket_types'?(editing?'Edit ticket type':'Create a ticket type'):(editing?`Edit record ${editing}`:'Create new record')}</strong><button onClick={clear}><Plus size={15}/> Reset form</button></div>{selected==='events'?<EventEditor value={eventForm} onChange={setEventForm} onUpload={uploadPoster} uploading={uploading} overview={overview}/>:selected==='ticket_types'?<TicketTypeEditor value={ticketForm} onChange={setTicketForm} eventOptions={eventOptions}/>:<><p>JSON editor for other entities. SQL constraints are checked on the server.</p><textarea spellCheck={false} value={editor} onChange={e=>setEditor(e.target.value)} rows={Math.max(5,Math.min(13,editor.split('\n').length+1))}/></>}<div className="editor-actions"><Button disabled={loading} onClick={save}>{editing?<Pencil size={16}/>:<Plus size={16}/>} {editing?'Save changes':'Create record'}</Button>{editing&&<Button variant="secondary" onClick={clear}>Cancel editing</Button>}</div></div>
        <div className="records-title"><h3>Records</h3><Button variant="secondary" onClick={load}><RotateCcw size={14}/> Refresh</Button></div><div className="records-list">{rows.length?rows.map((r,i)=><div key={r.id??r._id??i} className="record"><div><div className="record-id">{String(r.id??r._id)}</div><strong>{r.title||r.display_name||r.label||r.booking_code||r.email||r.message||`Document ${i+1}`}</strong><p>{Object.entries(r).filter(([k,v])=>!['password_hash','_id','id','__v'].includes(k)&&['string','number'].includes(typeof v)).slice(0,3).map(([k,v])=>`${k}: ${String(v).slice(0,45)}`).join(' · ')}</p></div><div className="record-actions"><button onClick={()=>edit(r)} aria-label="Edit"><Pencil size={17}/></button><button onClick={()=>remove(r)} className="danger" aria-label="Delete"><Trash2 size={17}/></button></div></div>):<div className="no-record">{loading?'Loading…':'No records yet. Create one above.'}</div>}</div>
      </div>
    </div>
  </section>;
}
export default function App(){
  const [events,setEvents]=useState(demoEvents);const [serverOnline,setServerOnline]=useState(true);const [user,setUser]=useState(null);const [page,setPage]=useState('home');const [category,setCategory]=useState('All events');const [audience,setAudience]=useState('all');const [search,setSearch]=useState('');const [favorites,setFavorites]=useState([]);const [cart,setCart]=useState({items:[]});const [notifications,setNotifications]=useState([]);const [bookings,setBookings]=useState([]);
  const [modal,setModal]=useState(null);const [selectedEvent,setSelectedEvent]=useState(null);const [toast,setToast]=useState(null);const [busy,setBusy]=useState(false);const [mobileMenu,setMobileMenu]=useState(false);
  function notify(text,type='success'){setToast({text,type,id:Date.now()});}
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(null),4300);return()=>clearTimeout(id);},[toast]);
  async function refreshBase(){try{const [e,m]=await Promise.all([api('/events'),api('/me')]);setEvents(e.events);setUser(m.user);setServerOnline(true);if(m.user)await refreshUser();}catch(e){setServerOnline(false);setEvents(demoEvents);}}
  async function refreshUser(){const [c,w,n,b]=await Promise.all([api('/cart'),api('/wishlist'),api('/notifications'),api('/bookings')]);setCart(c.cart);setFavorites(w.eventIds);setNotifications(n.notifications);setBookings(b.bookings);}
  useEffect(()=>{refreshBase();},[]);
  const display=useMemo(()=>events.filter(e=>
    (category==='All events'||e.category===category) &&
    (audience==='all'||audienceTags(e).includes(audience)) &&
    `${e.title} ${e.venue} ${e.city} ${e.category} ${benefitTags(e).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  ),[events,category,audience,search]);
  const categories=['All events',...new Set([...categoryOptions,...events.map(e=>e.category)].filter(Boolean))];
  const liked=events.filter(e=>favorites.includes(e.id));
  const count=(cart?.items||[]).reduce((n,i)=>n+i.quantity,0);
  function needAuth(){if(!serverOnline){notify('Preview mode — start MySQL, MongoDB and the API to use live features.','error');return false;}if(!user){setModal('auth');notify('Log in to continue','error');return false;}return true;}
  async function addToCart(ticket,qty){if(!needAuth())return;try{const items=[...(cart.items||[])];const old=items.find(i=>i.ticketTypeId===ticket.id);if(old)old.quantity=Math.min(20,old.quantity+qty);else items.push({ticketTypeId:ticket.id,quantity:qty});const r=await api('/cart',{method:'PUT',body:{items}});setCart(r.cart);setSelectedEvent(null);setModal('cart');notify('Added to your ticket cart');}catch(err){notify(err.message,'error');}}
  async function updateCart(id,quantity){try{const items=cart.items.filter(i=>i.ticketTypeId!==id);if(quantity>0)items.push({ticketTypeId:id,quantity:Math.min(20,quantity)});const r=await api('/cart',{method:'PUT',body:{items}});setCart(r.cart);}catch(err){notify(err.message,'error');}}
  async function checkout(){if(!needAuth())return;setBusy(true);try{const r=await api('/checkout',{method:'POST'});setModal(null);await refreshUser();const updated=await api('/events');setEvents(updated.events);setPage('tickets');notify(`Booking confirmed — ${r.booking.booking_code}`);}catch(err){notify(err.message,'error');}finally{setBusy(false);}}
  async function toggleFavorite(id){if(!needAuth())return;try{const r=await api(`/wishlist/${id}`,{method:'POST'});setFavorites(r.eventIds);notify(r.eventIds.includes(id)?'Added to your favorites':'Removed from favorites');}catch(err){notify(err.message,'error');}}
  async function cancelBooking(id){if(!window.confirm('Cancel this booking and restore ticket inventory?'))return;try{await api(`/bookings/${id}/cancel`,{method:'POST'});await refreshUser();notify('Booking cancelled and ticket stock restored');const r=await api('/events');setEvents(r.events);}catch(err){notify(err.message,'error');}}
  function nav(p){setMobileMenu(false);if(['tickets','favorites','notifications','admin'].includes(p)&&!needAuth())return;if(p==='admin'&&user?.role!=='admin')return;setPage(p);window.scrollTo({top:0,behavior:'smooth'});}
  async function readNotification(id){try{await api(`/notifications/${id}`,{method:'PATCH',body:{isRead:true}});await refreshUser();}catch(err){notify(err.message,'error');}}
  const showEvent=event=>{setSelectedEvent(event);setModal('event');};
  const tags=[...new Set(events.map(e=>e.category))];
  return <div className="app-shell">
    <div className="announcement"><Sparkles size={14}/> Discover your next favorite moment <span>— made for unforgettable experiences.</span> <ArrowRight size={14}/></div>
    <header className="site-header"><div className="header-inner"><button className="brand" onClick={()=>nav('home')} aria-label="NEXSTAGE home"><span className="brand-symbol"><Ticket size={22} strokeWidth={2.8}/></span><span>NEX<span>STAGE</span><i>.</i></span></button>
      <nav className={classes('nav-links',mobileMenu&&'nav-mobile-open')}><button className={page==='home'?'active':''} onClick={()=>nav('home')}>Discover</button><button onClick={()=>{nav('home');setAudience('student');setTimeout(()=>document.getElementById('events')?.scrollIntoView({behavior:'smooth'}),60);}}>For students</button><button onClick={()=>{nav('home');setAudience('working');setTimeout(()=>document.getElementById('events')?.scrollIntoView({behavior:'smooth'}),60);}}>For adults</button><button onClick={()=>{nav('home');setAudience('senior');setTimeout(()=>document.getElementById('events')?.scrollIntoView({behavior:'smooth'}),60);}}>For seniors</button><button onClick={()=>nav('favorites')}>Favorites</button>{user&&<button onClick={()=>nav('tickets')}>My tickets</button>}<button className={page==='assistant'?'active':''} onClick={()=>nav('assistant')}>NexAI</button>{user?.role==='admin'&&<button onClick={()=>nav('admin')}>Dashboard</button>}</nav>
      <div className="header-actions"><button className="icon-btn header-icon" onClick={()=>user?nav('notifications'):setModal('auth')} aria-label="Notifications"><Bell size={20}/>{user&&notifications.some(n=>!n.isRead)&&<span className="notification-dot"/>}</button><button className="icon-btn header-icon cart-header" onClick={()=>needAuth()&&setModal('cart')} aria-label="Shopping cart"><ShoppingBag size={21}/>{count>0&&<em>{count}</em>}</button>{user?<div className="account-wrap"><button className="user-chip" onClick={()=>setModal(modal==='account'?null:'account')}><UserCircle size={20}/><span>{user.display_name.split(' ')[0]}</span><ChevronDown size={14}/></button>{modal==='account'&&<div className="account-menu"><strong>{user.display_name}</strong><small>{user.email}</small><button onClick={()=>{setModal(null);nav('tickets');}}><Ticket size={15}/> My tickets</button>{user.role==='admin'&&<button onClick={()=>{setModal(null);nav('admin');}}><Database size={15}/> Data studio</button>}<button onClick={async()=>{await api('/auth/logout',{method:'POST'});setUser(null);setCart({items:[]});setFavorites([]);setNotifications([]);setBookings([]);setModal(null);nav('home');notify('Signed out');}}><LogOut size={15}/> Log out</button></div>}</div>:<Button variant="secondary" onClick={()=>setModal('auth')} className="login-header">Log in <ArrowRight size={16}/></Button>}<button className="icon-btn mobile-menu-toggle" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={23}/></button></div>
    </div></header>
    {!serverOnline&&<div className="preview-bar"><AlertCircle size={15}/> UI preview mode: start the local databases and backend to use live booking and CRUD features.</div>}
    <main>
      {page==='home'&&<><div className="container"><Hero onExplore={()=>document.getElementById('events')?.scrollIntoView({behavior:'smooth'})}/><div className="trust-row"><div><span className="trust-icon"><ShieldCheck size={20}/></span><div><b>Secure booking demo</b><small>Transactional inventory</small></div></div><div><span className="trust-icon"><Zap size={19}/></span><div><b>Simple & seamless</b><small>Choose. Book. Enjoy.</small></div></div><div><span className="trust-icon"><Heart size={19}/></span><div><b>Made for memories</b><small>Something for everyone</small></div></div></div></div>
        <section className="events-section container" id="events"><div className="section-top"><div><div className="eyebrow"><Sparkles size={15}/> FIND YOUR NEXT MOMENT</div><h2>Explore what’s <span>happening</span></h2><p>Great experiences are just a click away.</p></div><span className="event-count">{display.length} EVENTS FOUND</span></div>
          <div className="audience-feature"><div className="audience-feature-head"><div className="eyebrow"><Users size={14}/> FIND YOUR COMMUNITY</div><h3>Experiences for every chapter of life.</h3><p>Choose a group to discover activities curated for your interests.</p></div><div className="audience-grid">{audienceOptions.map(a=><button key={a.id} className={classes('audience-card',audience===a.id&&'active')} aria-pressed={audience===a.id} onClick={()=>{setAudience(a.id);setCategory('All events');}}><span className="audience-icon"><a.icon size={22}/></span><strong>{a.name}</strong><small>{a.subtitle}</small><ArrowUpRight className="audience-arrow" size={17}/></button>)}</div></div>
          <div className="filter-area"><div className="filters">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?'selected':''}>{c}</button>)}</div><label className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search camps, certificates, concerts, venues…"/></label></div>
          {display.length?<div className="event-grid">{display.map((e,i)=><EventCard key={e.id} event={e} onOpen={showEvent} favorite={favorites.includes(e.id)} onToggleFavorite={toggleFavorite} rank={i}/>)}</div>:<Empty icon={<Search/>} title="No events found" text="Try searching another event or category."/>}
        </section>
        <section className="cta-band container"><div className="cta-text"><span><Sparkles size={15}/> COME FOR THE EVENT, STAY FOR THE MEMORIES</span><h2>Don't just hear about it.<br/><em>Be part of it.</em></h2><p>The best stories start when you show up.</p><Button onClick={()=>document.getElementById('events')?.scrollIntoView({behavior:'smooth'})} variant="white">Find your event <ArrowRight size={17}/></Button></div><div className="cta-decoration"><div className="cta-disc"/><span>✦</span><i>MAKE IT<br/>HAPPEN.</i></div></section>
      </>}
      {page==='assistant'&&<NexAI request={api} onOpen={showEvent} money={money}/>}
      {page==='tickets'&&<div className="container"><TicketsPage bookings={bookings} onCancel={cancelBooking} notify={notify}/></div>}
      {page==='favorites'&&<section className="container subpage"><div className="subpage-head"><Pill kind="purple"><Heart size={13}/> SAVED EXPERIENCES</Pill><h1>Events close to your heart.</h1><p>Keep your favorite experiences in one place.</p></div>{liked.length?<div className="event-grid">{liked.map(e=><EventCard key={e.id} event={e} onOpen={showEvent} favorite onToggleFavorite={toggleFavorite}/>)}</div>:<Empty icon={<Heart/>} title="No favorites yet" text="Tap the heart on any event to save it for later."/>}</section>}
      {page==='notifications'&&<section className="container subpage narrow"><div className="subpage-head"><Pill kind="purple"><Bell size={13}/> YOUR NOTIFICATIONS</Pill><h1>Stay in the loop.</h1><p>Updates about your bookings and NEXSTAGE.</p></div>{notifications.length?notifications.map(n=><button className={classes('notification-card',!n.isRead&&'unread')} key={n._id} onClick={()=>readNotification(n._id)}><div className="notification-icon"><Bell size={20}/></div><div><strong>{n.title}</strong><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></div>{!n.isRead&&<i/>}</button>):<Empty icon={<Bell/>} title="All caught up" text="You don't have any notifications yet."/>}</section>}
      {page==='admin'&&user?.role==='admin'&&<div className="container"><AdminPanel notify={notify}/></div>}
    </main>
    <footer className="site-footer"><div className="container footer-inner"><div><div className="brand footer-brand"><span className="brand-symbol"><Ticket size={21}/></span><span>NEX<span>STAGE</span><i>.</i></span></div><p>Find your people. Discover your moment.<br/>A local hybrid-database project.</p></div><div className="footer-links"><div><strong>Explore</strong><button onClick={()=>nav('home')}>All events</button><button onClick={()=>nav('favorites')}>Favorites</button><button onClick={()=>nav('tickets')}>My tickets</button></div><div><strong>Project</strong><span>React + Express</span><span>MySQL + MongoDB</span><span>100% Local Data</span></div></div></div><div className="footer-bottom container"><span>© 2026 NEXSTAGE · Built for database systems</span><span>Designed with <Heart size={12} fill="currentColor"/> in purple & white</span></div></footer>
    {toast&&<div role="status" className={classes('toast',toast.type==='error'&&'toast-error')}><span>{toast.type==='error'?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}</span>{toast.text}<button onClick={()=>setToast(null)}><X size={15}/></button></div>}
    {modal==='auth'&&<AuthModal onClose={()=>setModal(null)} onSuccess={async u=>{setUser(u);setServerOnline(true);await refreshUser();}} notify={notify}/>}
    {modal==='event'&&selectedEvent&&<EventModal key={selectedEvent.id} event={selectedEvent} onClose={()=>{setModal(null);setSelectedEvent(null);}} onAdd={addToCart} user={user} onLogin={()=>setModal('auth')} notify={notify}/>}
    {modal==='cart'&&<CartPanel cart={cart} events={events} onClose={()=>setModal(null)} onUpdate={updateCart} onCheckout={checkout} loading={busy}/>}
  </div>;
}

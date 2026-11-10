import bcrypt from 'bcryptjs';
import { pool, connectMongo } from './config.js';
import { Cart, Review, Wishlist, Notification } from './models.js';

const events=[
  ['LUNAR SOUND FEST','Music','Impact Arena','Bangkok','An unforgettable night of electronic sounds, light installations, and your favorite rising artists.','lunar.svg',22,17],
  ['PIXEL ARENA 2027','Esports','True Digital Park','Bangkok','The next generation of competitive gaming. Cheer for your team, meet creators, and experience the final.','pixel.svg',33,13],
  ['ART AFTER HOURS','Arts','River City Bangkok','Bangkok','Explore contemporary art, live installations, and experimental creative spaces.','art.svg',45,16],
  ['DREAMSCAPE LIVE','Music','Union Hall','Bangkok','Where dreamy melodies meet surreal lighting. An intimate multi-artist live concert.','dream.svg',57,18],
  ['CREATE & CONNECT','Workshop','Samyan Mitrtown','Bangkok','Hands-on design sessions, creative talks, and a welcoming community for makers.','create.svg',67,11],
  ['MIDNIGHT BLOOM','Lifestyle','Warehouse 30','Bangkok','An immersive flower market with indie pop-up shops, food, and a magical evening atmosphere.','bloom.svg',78,18],
  ['FUTURE FORUM','Conference','Queen Sirikit NCC','Bangkok','Thought-provoking talks about design, entrepreneurship, and a more creative future.','future.svg',89,9],
  ['CINEMA UNDER STARS','Lifestyle','Benjakitti Park','Bangkok','An open-air movie night with cozy blankets, friends, and beautifully curated films.','cinema.svg',101,18],
  ['PORTFOLIO FUTURE CAMP','Portfolio Camp','Kasetsart University','Bangkok','Hands-on camp for students: explore creative projects and build a stronger university portfolio.','create.svg',109,9],
  ['VOLUNTEER IMPACT DAY','Volunteer','Community Learning Center','Bangkok','A community service day for students and adults. Learn by helping, meet your neighbors, and make a difference.','art.svg',113,9],
  ['CAREER CERTIFICATE STUDIO','Certificate Course','Innovation Hub','Bangkok','A weekend practical course for professionals and lifelong learners, with a demo participation certificate.','future.svg',120,10],
  ['MINDFUL RETREAT','Dharma & Wellness','Peaceful Meditation Center','Bangkok','A gentle guided meditation retreat open to older adults and anyone seeking mindfulness and reflection.','bloom.svg',129,8]
];
const dateAt=(days,hour)=>{
 const date=new Date(Date.now()+days*86400000);
 date.setHours(hour,0,0,0);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(hour).padStart(2,'0')}:00:00`;
};
try {
  await pool.query('SELECT 1');
  await connectMongo();
  for (const [name,email,role] of [
    ['NEXSTAGE Admin','admin@nexstage.local','admin'],
    ['Demo Student','student@nexstage.local','customer']
  ]) {
    const [exist]=await pool.query('SELECT id FROM users WHERE email=?',[email]);
    if(!exist.length) await pool.query('INSERT INTO users (display_name,email,password_hash,role) VALUES (?,?,?,?)',
      [name,email,await bcrypt.hash('Demo12345!',10),role]);
  }
  const [[admin]]=await pool.query('SELECT id FROM users WHERE email=?',['admin@nexstage.local']);
  const [[student]]=await pool.query('SELECT id FROM users WHERE email=?',['student@nexstage.local']);
  const metadata={
    'PORTFOLIO FUTURE CAMP':{audiences:['student','university'],benefits:['portfolio','networking']},
    'VOLUNTEER IMPACT DAY':{audiences:['student','university','working','senior'],benefits:['volunteer','networking']},
    'CAREER CERTIFICATE STUDIO':{audiences:['university','working','senior'],benefits:['certificate']},
    'MINDFUL RETREAT':{audiences:['senior','working'],benefits:['wellness']}
  };
  for (const [title,category,venue,city,description,poster,days,hour] of events) {
    const [existing]=await pool.query('SELECT id FROM events WHERE title=?',[title]);
    let eventId=existing[0]?.id;
    if(!eventId) {
      const [r]=await pool.query(`INSERT INTO events (organizer_id,title,category,venue,city,description,start_at,end_at,poster_path,status)
        VALUES (?,?,?,?,?,?,?,?,?,'published')`,[admin.id,title,category,venue,city,description,dateAt(days,hour),dateAt(days,hour+4),`/posters/${poster}`]);
      eventId=r.insertId;
    }
    const audience=metadata[title]||{audiences:['everyone'],benefits:['entertainment']};
    // Update only classification tags; don't change custom event names, prices or schedules.
    await pool.query('UPDATE events SET audience_groups=?, benefits=? WHERE id=?',
      [JSON.stringify(audience.audiences),JSON.stringify(audience.benefits),eventId]);
    const [tickets]=await pool.query('SELECT id FROM ticket_types WHERE event_id=?',[eventId]);
    if(!tickets.length) {
      const base=category==='Workshop'?290:category==='Conference'?490:590;
      await pool.query('INSERT INTO ticket_types (event_id,label,price,capacity,available) VALUES (?,?,?,?,?)',[eventId,'General',base,160,160]);
      await pool.query('INSERT INTO ticket_types (event_id,label,price,capacity,available) VALUES (?,?,?,?,?)',[eventId,'VIP',base+900,40,40]);
    }
  }
  const [tickets]=await pool.query('SELECT id FROM ticket_types ORDER BY id LIMIT 1');
  const [eventIds]=await pool.query('SELECT id FROM events ORDER BY id LIMIT 3');
  if(tickets.length) await Cart.updateOne({userId:student.id},{$setOnInsert:{items:[{ticketTypeId:tickets[0].id,quantity:2}]}},{upsert:true});
  await Wishlist.updateOne({userId:student.id},{$setOnInsert:{eventIds:eventIds.slice(0,2).map(e=>e.id)}},{upsert:true});
  await Notification.updateOne({dedupeKey:'welcome-demo'},{$setOnInsert:{userId:student.id,title:'Welcome to NEXSTAGE!',message:'Explore upcoming events and book your next experience.',type:'system',isRead:false,dedupeKey:'welcome-demo'}},{upsert:true});
  if(eventIds.length) await Review.updateOne({userId:student.id,eventId:eventIds[0].id},{$setOnInsert:{rating:5,text:'The lineup looks amazing! Cannot wait for this event.'}},{upsert:true});
  console.log('Seed complete: 12 demo events (plus existing custom events), ticket types, 2 users and Mongo demo documents.');
  console.log('Admin: admin@nexstage.local / Demo12345!');
  console.log('Student: student@nexstage.local / Demo12345!');
} catch(error) { console.error(error); process.exitCode=1; }
finally { await pool.end(); process.exit(); }

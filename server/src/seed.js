import bcrypt from 'bcryptjs';
import { pool, connectMongo } from './config.js';
import { Cart, Review, Wishlist, Notification } from './models.js';

const concertDay=()=>35+Math.floor(Math.random()*145);
const originalPosters=new Map([
  ['LUNAR SOUND FEST','lunar.svg'],['PIXEL ARENA 2027','pixel.svg'],
  ['ART AFTER HOURS','art.svg'],['DREAMSCAPE LIVE','dream.svg'],
  ['CREATE & CONNECT','create.svg'],['MIDNIGHT BLOOM','bloom.svg'],
  ['FUTURE FORUM','future.svg'],['CINEMA UNDER STARS','cinema.svg'],
  ['PORTFOLIO FUTURE CAMP','create.svg'],['VOLUNTEER IMPACT DAY','art.svg'],
  ['CAREER CERTIFICATE STUDIO','future.svg'],['MINDFUL RETREAT','bloom.svg']
]);

const events=[
  ['LUNAR SOUND FEST','Music','Impact Arena','Bangkok','An unforgettable night of electronic sounds, light installations, and your favorite rising artists.','lunar-photo.jpg',22,17],
  ['PIXEL ARENA 2027','Esports','True Digital Park','Bangkok','The next generation of competitive gaming. Cheer for your team, meet creators, and experience the final.','pixel-photo.jpg',33,13],
  ['ART AFTER HOURS','Arts','River City Bangkok','Bangkok','Explore contemporary art, live installations, and experimental creative spaces.','art-photo.jpg',45,16],
  ['DREAMSCAPE LIVE','Music','Union Hall','Bangkok','Where dreamy melodies meet surreal lighting. An intimate multi-artist live concert.','dream-photo.jpg',57,18],
  ['CREATE & CONNECT','Workshop','Samyan Mitrtown','Bangkok','Hands-on design sessions, creative talks, and a welcoming community for makers.','create-photo.jpg',67,11],
  ['MIDNIGHT BLOOM','Lifestyle','Warehouse 30','Bangkok','An immersive flower market with indie pop-up shops, food, and a magical evening atmosphere.','bloom-photo.jpg',78,18],
  ['FUTURE FORUM','Conference','Queen Sirikit NCC','Bangkok','Thought-provoking talks about design, entrepreneurship, and a more creative future.','future-photo.jpg',89,9],
  ['CINEMA UNDER STARS','Lifestyle','Benjakitti Park','Bangkok','An open-air movie night with cozy blankets, friends, and beautifully curated films.','cinema-photo.jpg',101,18],
  ['PORTFOLIO FUTURE CAMP','Portfolio Camp','Kasetsart University','Bangkok','Hands-on camp for students: explore creative projects and build a stronger university portfolio.','portfolio-photo.jpg',109,9],
  ['VOLUNTEER IMPACT DAY','Volunteer','Community Learning Center','Bangkok','A community service day for students and adults. Learn by helping, meet your neighbors, and make a difference.','volunteer-photo.jpg',113,9],
  ['CAREER CERTIFICATE STUDIO','Certificate Course','Innovation Hub','Bangkok','A weekend practical course for professionals and lifelong learners, with a demo participation certificate.','career-photo.jpg',120,10],
  ['MINDFUL RETREAT','Dharma & Wellness','Peaceful Meditation Center','Bangkok','A gentle guided meditation retreat open to older adults and anyone seeking mindfulness and reflection.','mindful-photo.jpg',129,8],
  ['QUEEN: A NIGHT AT THE OPERA','Music','Union Hall','Bangkok','A fictional Queen-inspired concert demo featuring an album-style cover.','queen-ii.jpg',concertDay(),19],
  ['MOONLIGHT SESSIONS WITH XXXTENTACION','Music','True Digital Park','Bangkok','A fictional XXXTentacion-inspired concert demo featuring a portrait.','xxxtentacion.jpg',concertDay(),19],
  ['SEK LOSO ROCK LEGEND','Music','Impact Arena','Bangkok','A fictional SEK LOSO-inspired concert demo featuring a performance image.','sek-loso.jpg',concertDay(),19],
  ['DANIEL CAESAR: FREUDIAN EVENING','Music','Impact Arena','Bangkok','A fictional Daniel Caesar-inspired concert demo. The poster displays June 9, so this event uses that date.','daniel-caesar.jpg',concertDay(),19,'2027-06-09 19:00:00'],
  ['1989 CITY LIGHTS: TAYLOR SWIFT','Music','Union Hall','Bangkok','A fictional Taylor Swift-inspired concert demo featuring a 1989-style cover.','taylor-swift.jpg',concertDay(),19],
  ['YOUNGOHM: BANGKOK AFTER DARK','Music','Warehouse 30','Bangkok','A fictional YOUNGOHM-inspired concert demo featuring an album-style cover.','pink-suit.jpg',concertDay(),19],
  ['OLIVIA RODRIGO: SOUR TO GUTS','Music','Union Hall','Bangkok','A fictional Olivia Rodrigo-inspired concert demo featuring an album-style cover.','swing.jpg',concertDay(),19],
  ['BTS PURPLE UNIVERSE','Music','Impact Arena','Bangkok','A fictional BTS-inspired concert demo featuring a group portrait.','bts.png',concertDay(),19],
  ['THRILLER NIGHT WITH MICHAEL JACKSON','Music','Impact Arena','Bangkok','A fictional Michael Jackson-inspired concert demo featuring a Thriller-style cover.','michael-jackson.png',concertDay(),19],
  ['KANYE WEST: GRADUATION NIGHTS','Music','Union Hall','Bangkok','A fictional Kanye West-inspired concert demo featuring a portrait.','kanye-west.png',concertDay(),19],
  ['HAPPIER THAN EVER WITH BILLIE EILISH','Music','Union Hall','Bangkok','A fictional Billie Eilish-inspired concert demo featuring a Happier Than Ever-style cover.','billie-eilish.jpg',concertDay(),19],
  ['OASIS LIVE 67: BACK TO THE STAGE','Music','Impact Arena','Bangkok','A fictional Oasis-inspired concert demo featuring a black-and-white live cover.','oasis.jpg',concertDay(),19],
  ['LET IT BE SESSIONS: THE BEATLES','Music','Union Hall','Bangkok','A fictional Beatles-inspired concert demo featuring a Let It Be-style cover.','the-beatles.jpg',concertDay(),19],
  ['24K MAGIC PARTY WITH BRUNO MARS','Music','Impact Arena','Bangkok','A fictional Bruno Mars-inspired concert demo featuring a 24K Magic-style cover.','bruno-mars.jpg',concertDay(),19]
];
const previousConcertTitles=new Map([
  ['QUEEN: A NIGHT AT THE OPERA',['QUEEN II NIGHT','QUEEN II PARODY NIGHT']],
  ['MOONLIGHT SESSIONS WITH XXXTENTACION',['XXXTENTACION LIVE','XXXTENTACION PARODY LIVE']],
  ['SEK LOSO ROCK LEGEND',['SEK LOSO LIVE','FREDDIE MERCURY SHOW','FREDDIE MERCURY PARODY SHOW']],
  ['DANIEL CAESAR: FREUDIAN EVENING',['DANIEL CAESAR LIVE','DANIEL CAESAR PARODY LIVE']],
  ['1989 CITY LIGHTS: TAYLOR SWIFT',['TAYLOR SWIFT 1989 NIGHT','TAYLOR SWIFT 1989 PARODY NIGHT']],
  ['YOUNGOHM: BANGKOK AFTER DARK',['YOUNGOHM LIVE','YOUNGOHM PARODY LIVE']],
  ['OLIVIA RODRIGO: SOUR TO GUTS',['OLIVIA RODRIGO LIVE','OLIVIA RODRIGO PARODY LIVE']],
  ['BTS PURPLE UNIVERSE',['BTS NIGHT','BTS PARODY NIGHT']],
  ['THRILLER NIGHT WITH MICHAEL JACKSON',['MICHAEL JACKSON THRILLER','MICHAEL JACKSON THRILLER PARODY']],
  ['KANYE WEST: GRADUATION NIGHTS',['KANYE WEST LIVE','KANYE WEST PARODY LIVE']],
  ['HAPPIER THAN EVER WITH BILLIE EILISH','BILLIE EILISH HAPPIER THAN EVER'],
  ['OASIS LIVE 67: BACK TO THE STAGE','OASIS LIVE 67'],
  ['LET IT BE SESSIONS: THE BEATLES','THE BEATLES LET IT BE'],
  ['24K MAGIC PARTY WITH BRUNO MARS','BRUNO MARS 24K MAGIC']
]);
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
  for (const [title,category,venue,city,description,poster,days,hour,fixedStart] of events) {
    const oldTitles=previousConcertTitles.get(title);
    const previousTitles=Array.isArray(oldTitles)?oldTitles:oldTitles?[oldTitles]:[];
    const titles=[title,...previousTitles];
    const [existing]=await pool.query(`SELECT id,title,poster_path FROM events WHERE title IN (${titles.map(()=>'?').join(',')}) ORDER BY title=? DESC LIMIT 1`,[...titles,title]);
    let eventId=existing[0]?.id;
    if(eventId && previousTitles.includes(existing[0].title)) {
      await pool.query('UPDATE events SET title=?,description=?,poster_path=? WHERE id=?',
        [title,description,`/posters/${poster}`,eventId]);
    }
    if(eventId && originalPosters.has(title) && existing[0].poster_path===`/posters/${originalPosters.get(title)}`) {
      await pool.query('UPDATE events SET poster_path=? WHERE id=?',[`/posters/${poster}`,eventId]);
    }
    if(!eventId) {
      const startAt=fixedStart||dateAt(days,hour);
      const endAt=fixedStart?'2027-06-09 23:00:00':dateAt(days,hour+4);
      const [r]=await pool.query(`INSERT INTO events (organizer_id,title,category,venue,city,description,start_at,end_at,poster_path,status)
        VALUES (?,?,?,?,?,?,?,?,?,'published')`,[admin.id,title,category,venue,city,description,startAt,endAt,`/posters/${poster}`]);
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
  console.log('Seed complete: 26 demo events (plus existing custom events), ticket types, 2 users and Mongo demo documents.');
  console.log('Admin: admin@nexstage.local / Demo12345!');
  console.log('Student: student@nexstage.local / Demo12345!');
} catch(error) { console.error(error); process.exitCode=1; }
finally { await pool.end(); process.exit(); }

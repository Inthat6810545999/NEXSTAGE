import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
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
const reviewHighlights={
  'LUNAR SOUND FEST':'The music and light theme sounds like a fun way to spend an evening with friends.',
  'PIXEL ARENA 2027':'I like that there is a chance to cheer for teams and meet creators in one place.',
  'ART AFTER HOURS':'The late gallery format sounds relaxed, and the installations look interesting.',
  'DREAMSCAPE LIVE':'A smaller live show with dreamy lighting is exactly my kind of concert.',
  'CREATE & CONNECT':'The mix of hands-on sessions and meeting other makers is appealing.',
  'MIDNIGHT BLOOM':'Flowers, small shops and food in an evening setting sound lovely.',
  'FUTURE FORUM':'The design and entrepreneurship topics make this one worth checking out.',
  'CINEMA UNDER STARS':'An outdoor film night with friends sounds like such a nice plan.',
  'PORTFOLIO FUTURE CAMP':'I like the practical focus on building a portfolio instead of just listening to talks.',
  'VOLUNTEER IMPACT DAY':'A good chance to meet people while doing something useful for the community.',
  'CAREER CERTIFICATE STUDIO':'The weekend schedule and practical activities make this easy to consider.',
  'MINDFUL RETREAT':'The gentle pace sounds welcoming for someone new to meditation.',
  'QUEEN: A NIGHT AT THE OPERA':'The Queen-inspired theme makes the concert feel like a big night out.',
  'MOONLIGHT SESSIONS WITH XXXTENTACION':'The mood of this music night looks distinctive and intimate.',
  'SEK LOSO ROCK LEGEND':'A rock-focused evening at Impact Arena sounds exciting.',
  'DANIEL CAESAR: FREUDIAN EVENING':'The soulful theme would be great for a slower evening of live music.',
  '1989 CITY LIGHTS: TAYLOR SWIFT':'The city-lights concept and 1989-inspired music look like a fun combination.',
  'YOUNGOHM: BANGKOK AFTER DARK':'The Bangkok after-dark theme gives this event a lot of personality.',
  'OLIVIA RODRIGO: SOUR TO GUTS':'This looks like the kind of sing-along night to bring friends to.',
  'BTS PURPLE UNIVERSE':'The purple theme makes this feel like a welcoming fan gathering.',
  'THRILLER NIGHT WITH MICHAEL JACKSON':'The Thriller-inspired concept sounds full of energy.',
  'KANYE WEST: GRADUATION NIGHTS':'I like the bold Graduation-inspired look of this music night.',
  'HAPPIER THAN EVER WITH BILLIE EILISH':'The softer mood of this concept really stands out.',
  'OASIS LIVE 67: BACK TO THE STAGE':'A guitar-heavy sing-along night sounds like a good time.',
  'LET IT BE SESSIONS: THE BEATLES':'The classic song theme feels easy to enjoy with a mixed group of friends.',
  '24K MAGIC PARTY WITH BRUNO MARS':'This looks like a lively night for dancing with friends.'
};
const reviewByCategory={
  Music:['The concept caught my eye right away; I would love to hear the set live.','Looks like a good evening plan, especially with friends who love live music.','The visuals and music theme seem to fit together really well.'],
  Esports:['The stage setup looks exciting, and the event sounds easy to enjoy as a spectator.'],
  Arts:['I appreciate that there is more to explore than a single exhibition.'],
  Workshop:['This seems approachable even if you are coming on your own.'],
  Lifestyle:['The atmosphere sounds inviting and a little different from the usual weekend plan.'],
  Conference:['The topics seem relevant without feeling too broad.'],
  'Portfolio Camp':['The hands-on part would be useful for students preparing applications.'],
  Volunteer:['I like that the activity is open to people at different stages of life.'],
  'Certificate Course':['It sounds like a manageable way to learn something practical.'],
  'Dharma & Wellness':['The calm setting and guided format make it feel approachable.']
};
const sampleReviewerNames=['Mali','Niran','Ploy','Tan','Fern','Krit','Mint','Bank','May','Pete'];
const sampleReviewCount=index=>5+(index*7)%6;
const reviewTexts=(event,index)=>{
  const categoryNotes=reviewByCategory[event.category]||reviewByCategory.Lifestyle;
  return [
    reviewHighlights[event.title],
    categoryNotes[index%categoryNotes.length],
    `The idea behind ${event.title} caught my attention. I would like to see how it comes together.`,
    `The poster made me stop and read about ${event.title}. The plan sounds promising.`,
    `I like the choice of ${event.venue} for this kind of event.`,
    `This is one I would consider going to with a friend. The description sounds inviting.`,
    `The details are clear enough to help me decide whether to make time for it.`,
    `I have been looking for something like this in Bangkok. It looks worth checking out.`,
    `The theme feels thoughtfully put together, and the venue is easy to recognize.`,
    `I saved ${event.title} to compare with my other weekend plans.`
  ];
};
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
  const sampleReviewers=[];
  for (const [index,firstName] of sampleReviewerNames.entries()) {
    const name=firstName;
    const email=`sample-reviewer-${index+1}@nexstage.local`;
    const [found]=await pool.query('SELECT id FROM users WHERE email=?',[email]);
    if(found.length) {
      sampleReviewers.push(found[0].id);
      await pool.query('UPDATE users SET display_name=? WHERE id=?',[name,found[0].id]);
    }
    else {
      const [result]=await pool.query('INSERT INTO users (display_name,email,password_hash,role) VALUES (?,?,?,?)',
        [name,email,await bcrypt.hash(randomBytes(24).toString('hex'),10),'customer']);
      sampleReviewers.push(result.insertId);
    }
  }
  const seededEvents=[];
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
    seededEvents.push({id:eventId,title,category,venue});
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
  for (const [index,event] of seededEvents.entries()) {
    const notes=reviewTexts(event,index);
    for (const [reviewerIndex,userId] of sampleReviewers.slice(0,sampleReviewCount(index)).entries()) {
      await Review.updateOne({userId,eventId:event.id},
        {$setOnInsert:{rating:(index+reviewerIndex)%4===0?4:5,text:notes[reviewerIndex],isDemo:true}},
        {upsert:true});
    }
  }
  const [tickets]=await pool.query('SELECT id FROM ticket_types ORDER BY id LIMIT 1');
  const [eventIds]=await pool.query('SELECT id FROM events ORDER BY id LIMIT 3');
  if(tickets.length) await Cart.updateOne({userId:student.id},{$setOnInsert:{items:[{ticketTypeId:tickets[0].id,quantity:2}]}},{upsert:true});
  await Wishlist.updateOne({userId:student.id},{$setOnInsert:{eventIds:eventIds.slice(0,2).map(e=>e.id)}},{upsert:true});
  await Notification.updateOne({dedupeKey:'welcome-demo'},{$setOnInsert:{userId:student.id,title:'Welcome to NEXSTAGE!',message:'Explore upcoming events and book your next experience.',type:'system',isRead:false,dedupeKey:'welcome-demo'}},{upsert:true});
  if(eventIds.length) await Review.updateOne({userId:student.id,eventId:eventIds[0].id},{$setOnInsert:{rating:5,text:'The lineup looks amazing! Cannot wait for this event.'}},{upsert:true});
  console.log('Seed complete: 26 demo events (plus existing custom events), ticket types, 12 users and Mongo sample reviews.');
  console.log('Admin: admin@nexstage.local / Demo12345!');
  console.log('Student: student@nexstage.local / Demo12345!');
} catch(error) { console.error(error); process.exitCode=1; }
finally { await pool.end(); process.exit(); }

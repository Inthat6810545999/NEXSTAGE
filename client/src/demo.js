const ms=24*60*60*1000;
const titles=[
  ['LUNAR SOUND FEST','Music','Impact Arena','lunar-photo.jpg',590],
  ['PIXEL ARENA 2027','Esports','True Digital Park','pixel-photo.jpg',590],
  ['ART AFTER HOURS','Arts','River City Bangkok','art-photo.jpg',490],
  ['DREAMSCAPE LIVE','Music','Union Hall','dream-photo.jpg',590],
  ['CREATE & CONNECT','Workshop','Samyan Mitrtown','create-photo.jpg',290],
  ['MIDNIGHT BLOOM','Lifestyle','Warehouse 30','bloom-photo.jpg',490],
  ['FUTURE FORUM','Conference','Queen Sirikit NCC','future-photo.jpg',490],
  ['CINEMA UNDER STARS','Lifestyle','Benjakitti Park','cinema-photo.jpg',350]
];
export const demoEvents=titles.map(([title,category,venue,poster,price],i)=>({
  id:i+1,title,category,venue,city:'Bangkok',
  description:'Discover a carefully curated experience and create memories with your people. Reserve your spot today.',
  poster_path:`/posters/${poster}`,status:'published',
  audience_groups:category==='Music'||category==='Esports'?['working','university']:category==='Workshop'?['student','university','working']:['everyone'],
  benefits:category==='Workshop'?['portfolio','networking']:category==='Music'?['entertainment']:[],
  start_at:new Date(Date.now()+(i*11+22)*ms).toISOString(),
  end_at:new Date(Date.now()+(i*11+22)*ms+4*60*60*1000).toISOString(),
  tickets:[{id:i*2+1,event_id:i+1,label:'General',price,available:160,capacity:160},
    {id:i*2+2,event_id:i+1,label:'VIP',price:price+900,available:40,capacity:40}]
}));

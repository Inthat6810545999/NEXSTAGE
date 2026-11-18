const normalize = value => String(value ?? '').toLowerCase().normalize('NFKC');
const includesAny = (text, words) => words.some(word => text.includes(word));
const tags = {
  category: [
    ['music', ['คอนเสิร์ต', 'คอนเสิต', 'ดนตรี', 'เพลง', 'concert', 'music']],
    ['workshop', ['เวิร์กช็อป', 'เวิร์คช็อป', 'workshop']],
    ['esports', ['อีสปอร์ต', 'esport', 'gaming']],
    ['arts', ['ศิลปะ', 'นิทรรศการ', 'art']],
  ],
  audience_groups: [
    ['student', ['นักเรียน', 'school student']],
    ['university', ['นักศึกษา', 'มหาวิทยาลัย', 'university', 'college']],
    ['working', ['วัยทำงาน', 'คนทำงาน', 'working adult']],
    ['senior', ['ผู้สูงอายุ', 'วัยเกษียณ', 'senior']],
  ],
  benefits: [
    ['certificate', ['ใบรับรอง', 'ใบประกาศ', 'certificate']],
    ['portfolio', ['พอร์ต', 'portfolio']],
    ['volunteer', ['อาสา', 'volunteer']],
    ['wellness', ['สุขภาพ', 'wellness']],
    ['networking', ['เครือข่าย', 'networking']],
  ],
};
const locations = [
  ['กรุงเทพ', 'กรุงเทพฯ', 'bangkok', 'bkk'],
  ['นนทบุรี', 'nonthaburi'],
  ['เชียงใหม่', 'chiang mai'],
  ['ภูเก็ต', 'phuket'],
];

export function answerEventQuestion(question, events) {
  const query = normalize(question);
  const inThai = /[\u0e00-\u0e7f]/.test(question);
  const budgetMatch = query.match(/(?:ไม่เกิน|ต่ำกว่า|งบ|under|below|less than|budget|up to)\s*(?:฿|บาท|thb)?\s*([\d,]+)|([\d,]+)\s*(?:บาท|thb)\s*(?:หรือน้อยกว่า|ลงมา)/);
  const budget = budgetMatch ? Number((budgetMatch[1] || budgetMatch[2]).replaceAll(',', '')) : null;
  const location = locations.find(words => includesAny(query, words));
  const filters = Object.fromEntries(Object.entries(tags).map(([field, values]) => [field, values.find(([, words]) => includesAny(query, words))?.[0]]));
  const words = query.match(/[a-z][a-z0-9-]{2,}|[\u0e00-\u0e7f]{3,}/g) ?? [];
  const searchWords = words.filter(word => !['event', 'events', 'ticket', 'tickets', 'which', 'what', 'where', 'with', 'offer', 'have', 'find', 'about'].includes(word));
  const hasFilter = location || budget !== null || Object.values(filters).some(Boolean);
  if (!hasFilter && !searchWords.length) {
    return { answer: inThai ? 'อยากไปงานแบบไหนครับ? ลองบอกประเภทกิจกรรม จังหวัด หรืองบประมาณได้เลย' : 'What kind of event are you looking for? Try a category, city, or budget.', events: [] };
  }

  const matches = events.map(event => {
    const available = (event.tickets ?? []).filter(ticket => Number(ticket.available) > 0);
    if (!available.length) return null;
    const lowest = Math.min(...available.map(ticket => Number(ticket.price)));
    if (budget !== null && lowest > budget) return null;
    if (location && !includesAny(normalize(`${event.city} ${event.venue}`), location)) return null;
    if (filters.category && normalize(event.category) !== filters.category) return null;
    for (const field of ['audience_groups', 'benefits']) {
      if (filters[field] && !(event[field] ?? []).includes(filters[field])) return null;
    }
    const searchable = normalize(`${event.title} ${event.venue} ${event.city} ${event.category} ${event.description}`);
    const wordScore = searchWords.filter(word => searchable.includes(word)).length;
    if (!hasFilter && !wordScore) return null;
    return { event, score: wordScore * 3 + Object.values(filters).filter(Boolean).length * 2, lowest };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.lowest - b.lowest).slice(0, 3);

  if (!matches.length) return { answer: inThai ? 'ยังไม่พบกิจกรรมที่ตรงกับเงื่อนไขนี้ ลองเปลี่ยนงบประมาณหรือคำค้นดูครับ' : 'I could not find an available event matching those conditions. Try another budget or search term.', events: [] };
  const names = matches.map(({ event }) => event.title).join(', ');
  return {
    answer: inThai ? `พบกิจกรรมที่น่าจะตรงกับที่ถาม: ${names} เลือกดูรายละเอียดและราคาบัตรด้านล่างได้เลยครับ` : `Here are matching events: ${names}. Check their details and available ticket prices below.`,
    events: matches.map(({ event }) => event),
  };
}

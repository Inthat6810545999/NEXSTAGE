import test from 'node:test';
import assert from 'node:assert/strict';
import { answerEventQuestion } from '../src/assistant.js';

const events = [
  { id: 1, title: 'Lunar Sound Fest', category: 'Music', city: 'Bangkok', venue: 'Impact Arena', audience_groups: ['university'], benefits: ['entertainment'], tickets: [{ price: 590, available: 5 }] },
  { id: 2, title: 'Portfolio Camp', category: 'Workshop', city: 'Bangkok', venue: 'Kasetsart University', audience_groups: ['university'], benefits: ['certificate'], tickets: [{ price: 1500, available: 5 }] },
  { id: 3, title: 'Sold Out Concert', category: 'Music', city: 'Bangkok', venue: 'Hall', audience_groups: ['university'], benefits: [], tickets: [{ price: 300, available: 0 }] },
];

test('NexAI finds available concerts in Bangkok within a Thai budget', () => {
  assert.deepEqual(answerEventQuestion('มีคอนเสิร์ตในกรุงเทพงบไม่เกิน 1,000 บาทไหม?', events).events.map(event => event.id), [1]);
});

test('NexAI finds certificate events without a model API', () => {
  assert.deepEqual(answerEventQuestion('Which events offer a certificate?', events).events.map(event => event.id), [2]);
});

test('NexAI returns no invented events when nothing matches', () => {
  const result = answerEventQuestion('คอนเสิร์ตในกรุงเทพงบไม่เกิน 100 บาท', events);
  assert.deepEqual(result.events, []);
  assert.match(result.answer, /ยังไม่พบ/);
});

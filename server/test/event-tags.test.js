import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEventTags, parseEventTags, matchesAudience } from '../src/event-tags.js';

test('an event can target several audience groups', () => {
  assert.deepEqual(normalizeEventTags('audience_groups',['student','university','working']),['student','university','working']);
});
test('everyone is distinct from audience-specific events', () => {
  assert.throws(() => normalizeEventTags('audience_groups',['everyone','student']),/Everyone OR specific/);
});
test('invalid audience / benefit identifiers are rejected', () => {
  assert.throws(() => normalizeEventTags('audience_groups',['ghost']),/Invalid/);
  assert.throws(() => normalizeEventTags('benefits',['fake-certificate']),/Invalid/);
  assert.throws(() => normalizeEventTags('benefits','not-json'),/Invalid/);
});
test('multiple benefit tags can be stored as a JSON list', () => {
  assert.deepEqual(normalizeEventTags('benefits',['portfolio','volunteer','portfolio']),['portfolio','volunteer']);
});
test('legacy events without audience tags are listed under All audiences', () => {
  assert.equal(matchesAudience({audience_groups:null},'all'),true);
  assert.equal(matchesAudience({audience_groups:null},'senior'),false);
  assert.deepEqual(parseEventTags(null,['everyone']),['everyone']);
});
test('specific audience filters match only explicitly tagged events', () => {
  assert.equal(matchesAudience({audience_groups:['student','university']},'student'),true);
  assert.equal(matchesAudience({audience_groups:['student','university']},'senior'),false);
  assert.equal(matchesAudience({audience_groups:'["everyone"]'},'senior'),false);
});

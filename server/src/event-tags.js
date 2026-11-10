import { HttpError } from './util.js';

export const audienceKeys = Object.freeze(['everyone','student','university','working','senior']);
export const benefitKeys = Object.freeze(['portfolio','volunteer','certificate','entertainment','wellness','networking']);

export function normalizeEventTags(field, value) {
  const valid = field === 'audience_groups' ? audienceKeys : field === 'benefits' ? benefitKeys : null;
  if (!valid) throw new HttpError(400, 'Unknown event tag field');
  let items = value;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); }
    catch { throw new HttpError(400, `Invalid ${field} JSON`); }
  }
  if (!Array.isArray(items) || items.length > valid.length || items.some(t => typeof t !== 'string' || !valid.includes(t))) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  const unique = [...new Set(items)];
  if (field === 'audience_groups' && unique.includes('everyone') && unique.length > 1) {
    throw new HttpError(400, 'Choose Everyone OR specific audiences, not both');
  }
  if (field === 'audience_groups' && !unique.length) throw new HttpError(400, 'Select at least one audience');
  return unique;
}

export function parseEventTags(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const result = JSON.parse(value);
      if (Array.isArray(result)) return result;
    } catch { /* Legacy rows may have missing or malformed tags. */ }
  }
  return fallback;
}

export function matchesAudience(event, audience) {
  if (!audience || audience === 'all') return true;
  const groups = parseEventTags(event.audience_groups, ['everyone']);
  return groups.includes('everyone') || groups.includes(audience);
}

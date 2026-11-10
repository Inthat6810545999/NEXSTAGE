export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const mustInt = (x, label='id') => {
  const n = Number(x);
  if (!Number.isSafeInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${label}`);
  return n;
};
export const mustText = (x, label='field', max=300) => {
  if (typeof x !== 'string' || !x.trim() || x.length > max) throw new HttpError(400, `Invalid ${label}`);
  return x.trim();
};
export const mustMoney = x => {
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0 || Math.round(n*100)/100 !== n) throw new HttpError(400, 'Invalid price');
  return n;
};
export function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) throw new HttpError(400,'Cart must contain 1–20 ticket types');
  const found = new Set();
  return items.map(i => {
    const ticket_type_id = mustInt(i.ticket_type_id ?? i.ticketTypeId, 'ticket type');
    const quantity = mustInt(i.quantity, 'quantity');
    if (quantity > 20) throw new HttpError(400, 'Maximum 20 tickets per type');
    if (found.has(ticket_type_id)) throw new HttpError(400, 'Duplicate ticket type');
    found.add(ticket_type_id);
    return { ticket_type_id, quantity };
  });
}
export const handler = fn => (req, res, next) => Promise.resolve(fn(req,res,next)).catch(next);

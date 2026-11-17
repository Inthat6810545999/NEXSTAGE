import { HttpError } from './util.js';

// bcrypt uses at most 72 UTF-8 bytes. Preserve spaces and reject truncation.
export function validatePassword(value, minLength = 8) {
  if (typeof value !== 'string' || value.length < minLength || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, `Password must have at least ${minLength} characters and at most 72 UTF-8 bytes`);
  }
  return value;
}

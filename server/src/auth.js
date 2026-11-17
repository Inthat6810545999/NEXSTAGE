import jwt from 'jsonwebtoken';
import { HttpError, handler } from './util.js';

const COOKIE = 'nexstage_session';
const DEV_SECRET = 'DEV_ONLY_CHANGE_ME_NEXSTAGE_SECRET';
const SESSION_MS = 12 * 3600 * 1000;

export function createAuth({
  findUser,
  secret = process.env.JWT_SECRET,
  production = process.env.NODE_ENV === 'production'
}) {
  secret = secret?.trim();
  if (production && (!secret || secret === DEV_SECRET || secret === 'CHANGE_TO_A_LONG_RANDOM_SECRET_BEFORE_SHARING')) {
    throw new Error('Set a private JWT_SECRET before starting in production');
  }
  secret ||= DEV_SECRET;
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: production, path: '/' };

  async function sessionUser(req) {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    let payload;
    try {
      payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch { return null; }
    if (!payload || typeof payload !== 'object' || !Number.isSafeInteger(payload.id) || payload.id <= 0) return null;
    // Check current account and role, so deletion/demotion applies immediately.
    return (await findUser(payload.id)) || null;
  }

  const requireAuth = handler(async (req, _res, next) => {
    req.user = await sessionUser(req);
    if (!req.user) throw new HttpError(401, 'Please sign in first');
    next();
  });

  function requireAdmin(req, _res, next) {
    if (req.user?.role !== 'admin') return next(new HttpError(403, 'Admin access required'));
    next();
  }

  function writeSession(res, user) {
    const token = jwt.sign({ id: user.id }, secret, { algorithm: 'HS256', expiresIn: '12h' });
    res.cookie(COOKIE, token, { ...cookieOptions, maxAge: SESSION_MS });
  }

  function clearSession(res) { res.clearCookie(COOKIE, cookieOptions); }

  return { requireAuth, requireAdmin, writeSession, clearSession, sessionUser };
}

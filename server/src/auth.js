import jwt from 'jsonwebtoken';
import { HttpError } from './util.js';

const secret = () => process.env.JWT_SECRET || 'DEV_ONLY_CHANGE_ME_NEXSTAGE_SECRET';
const COOKIE = 'nexstage_session';
export function writeSession(res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, secret(), { expiresIn: '12h' });
  res.cookie(COOKIE, token, { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV === 'production', path:'/', maxAge:12*3600*1000 });
}
export function clearSession(res) { res.clearCookie(COOKIE, { path:'/' }); }
export function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new Error('Missing session');
    req.user = jwt.verify(token, secret());
    next();
  } catch { next(new HttpError(401, 'Please sign in first')); }
}
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Admin access required'));
  next();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/auth.js';
import { validatePassword } from '../src/password.js';

const secret = 'test-only-secret-for-auth-regression-tests';
const summary = ({ id, display_name, email, role }) => ({ id, display_name, email, role });

// Exercise real HTTP routes, cookie parsing, bcrypt, JWT and authorization.
// Only SQL persistence is replaced; no running MySQL/MongoDB is needed.
async function fixture(t, options = {}) {
  const users = [];
  const database = {
    async query(sql, params = []) {
      if (sql.startsWith('INSERT INTO users')) {
        const [display_name, email, password_hash, role] = params;
        if (users.some(user => user.email === email)) {
          throw Object.assign(new Error('Duplicate email'), { code: 'ER_DUP_ENTRY' });
        }
        const id = users.length + 1;
        users.push({ id, display_name, email, password_hash, role });
        return [{ insertId: id }];
      }
      if (sql === 'SELECT * FROM users WHERE email=?') {
        return [users.filter(user => user.email === params[0])];
      }
      if (sql === 'SELECT id,display_name,email,role FROM users WHERE id=?') {
        return [users.filter(user => user.id === params[0]).map(summary)];
      }
      // SQL queries used by the admin overview happy path.
      if (sql.startsWith('SELECT COUNT(*) AS total')) return [[{ total: 0, revenue: 0 }]];
      if (sql.startsWith('SELECT COALESCE(SUM(capacity-available)')) return [[{ sold: 0 }]];
      if (sql.startsWith('SELECT booking_code,') || sql.includes('GROUP BY category')) return [[]];
      throw new Error(`Unexpected SQL in auth test: ${sql}`);
    }
  };
  const app = createApp({ database, sessionOptions: { secret, production: false, ...options } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', body, cookie } = {}) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return {
      status: response.status,
      body: await response.json(),
      setCookie: response.headers.get('set-cookie'),
      cookie: response.headers.get('set-cookie')?.split(';')[0]
    };
  }
  const register = (overrides = {}) => request('/auth/register', {
    method: 'POST', body: { display_name: 'Member', email: 'member@example.com', password: 'Password123!', ...overrides }
  });
  return { users, database, request, register };
}

test('register hashes the password, normalizes email and ignores supplied admin role', async t => {
  const { users, register, request } = await fixture(t);
  const result = await register({ email: ' MEMBER@Example.com ', role: 'admin' });
  assert.equal(result.status, 201);
  assert.deepEqual(result.body.user, { id: 1, display_name: 'Member', email: 'member@example.com', role: 'customer' });
  assert.equal('password_hash' in result.body.user, false);
  assert.notEqual(users[0].password_hash, 'Password123!');
  assert.match(users[0].password_hash, /^\$2[ab]\$10\$/);
  assert.equal(await bcrypt.compare('Password123!', users[0].password_hash), true);
  const me = await request('/me', { cookie: result.cookie });
  assert.deepEqual(me.body, result.body);
  assert.match(result.setCookie, /HttpOnly/i);
  assert.match(result.setCookie, /SameSite=Lax/i);
  assert.match(result.setCookie, /Path=\//i);
  assert.match(result.setCookie, /Max-Age=43200/i);
  assert.doesNotMatch(result.setCookie, /; Secure/i);
  const payload = jwt.verify(result.cookie.split('=')[1], secret);
  assert.equal(payload.exp - payload.iat, 43200);
});

test('duplicate email returns 409 and does not create another account or session', async t => {
  const { users, register } = await fixture(t);
  await register();
  const duplicate = await register({ email: 'MEMBER@example.com' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.setCookie, null);
  assert.equal(users.length, 1);
});

test('registration rejects invalid fields and bcrypt byte overflow', async t => {
  const { users, register, request } = await fixture(t);
  for (const body of [
    { display_name: '' }, { email: 'bad-email' }, { password: 'short' },
    { password: 12345678 }, { password: 'a'.repeat(73) }, { password: 'ก'.repeat(25) }
  ]) {
    const result = await register(body);
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.equal(result.setCookie, null);
  }
  assert.equal((await request('/auth/register', { method: 'POST', body: null })).status, 400);
  assert.equal(users.length, 0);
});

test('login preserves password spaces and accepts case-insensitive email', async t => {
  const { register, request } = await fixture(t);
  const password = ' Password123! ';
  await register({ password });
  const login = await request('/auth/login', { method: 'POST', body: { email: ' MEMBER@EXAMPLE.COM ', password } });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);
  assert.equal('password_hash' in login.body.user, false);
  assert.equal((await request('/me', { cookie: login.cookie })).body.user.id, 1);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'member@example.com', password: password.trim() } })).status, 401);
});

test('wrong password and unknown email return the same 401 without a session', async t => {
  const { register, request } = await fixture(t);
  await register();
  const results = [];
  for (const body of [
    { email: 'member@example.com', password: 'WrongPassword!' },
    { email: 'missing@example.com', password: 'Password123!' }
  ]) {
    const result = await request('/auth/login', { method: 'POST', body });
    assert.equal(result.status, 401);
    assert.equal(result.setCookie, null);
    results.push(result.body);
  }
  assert.deepEqual(results[0], results[1]);
});

test('login rejects missing, non-string and oversized passwords with 400', async t => {
  const { register, request } = await fixture(t);
  await register();
  for (const password of [undefined, null, '', 12345678, {}, [], 'a'.repeat(73), 'ก'.repeat(25)]) {
    const result = await request('/auth/login', { method: 'POST', body: { email: 'member@example.com', password } });
    assert.equal(result.status, 400);
    assert.equal(result.setCookie, null);
  }
});

const adminRoutes = [
  ['POST', '/admin/upload'], ['GET', '/admin/overview'],
  ['GET', '/admin/data/users'], ['POST', '/admin/data/users'],
  ['PATCH', '/admin/data/users/1'], ['DELETE', '/admin/data/users/1'],
  ['GET', '/admin/data/user_activity_logs'], ['POST', '/admin/data/user_activity_logs'],
  ['PATCH', '/admin/data/user_activity_logs/1'], ['DELETE', '/admin/data/user_activity_logs/1'],
  ['POST', '/admin/demo-rollback'], ['POST', '/admin/retry-sync']
];

test('every admin route denies guests with 401 and customers with 403', async t => {
  const { register, request } = await fixture(t);
  const { cookie } = await register();
  for (const [method, path] of adminRoutes) {
    assert.equal((await request(path, { method })).status, 401, `guest ${method} ${path}`);
    assert.equal((await request(path, { method, cookie })).status, 403, `customer ${method} ${path}`);
  }
});

test('current database role grants and revokes admin access for an existing session', async t => {
  const { users, register, request } = await fixture(t);
  const { cookie } = await register();
  users[0].role = 'admin';
  assert.equal((await request('/admin/overview', { cookie })).status, 200);
  users[0].role = 'customer';
  assert.equal((await request('/admin/overview', { cookie })).status, 403);
  // A legacy token containing an old admin role must not override the database.
  const oldCookie = `nexstage_session=${jwt.sign({ id: 1, role: 'admin' }, secret)}`;
  assert.equal((await request('/admin/overview', { cookie: oldCookie })).status, 403);
  users.splice(0);
  assert.equal((await request('/admin/overview', { cookie })).status, 401);
  assert.deepEqual((await request('/me', { cookie })).body, { user: null });
});

test('missing, tampered, expired and invalid session tokens cannot authenticate', async t => {
  const { register, request } = await fixture(t);
  await register();
  const tokens = [
    undefined, 'invalid-token',
    jwt.sign({ id: 1, role: 'admin' }, 'wrong-secret'),
    jwt.sign({ id: 1 }, secret, { expiresIn: -1 }),
    jwt.sign({ id: '1' }, secret), jwt.sign({ id: -1 }, secret),
    jwt.sign({ id: 999 }, secret),
    jwt.sign({ id: 1 }, secret, { algorithm: 'HS384' })
  ];
  for (const token of tokens) {
    const cookie = token ? `nexstage_session=${token}` : undefined;
    assert.equal((await request('/bookings', { cookie })).status, 401);
    assert.deepEqual((await request('/me', { cookie })).body, { user: null });
  }
});

test('logout expires the cookie and subsequent requests without it are anonymous', async t => {
  const { register, request } = await fixture(t);
  const { cookie } = await register();
  const result = await request('/auth/logout', { method: 'POST', cookie });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.match(result.setCookie, /^nexstage_session=;/);
  assert.match(result.setCookie, /Expires=Thu, 01 Jan 1970/i);
  assert.match(result.setCookie, /HttpOnly/i);
  assert.match(result.setCookie, /SameSite=Lax/i);
  assert.equal((await request('/bookings')).status, 401);
  assert.deepEqual((await request('/me')).body, { user: null });
  assert.equal((await request('/auth/logout', { method: 'POST' })).status, 200);
});

test('production requires a configured secret and uses Secure cookies for login/logout', async t => {
  for (const secret of ['', 'DEV_ONLY_CHANGE_ME_NEXSTAGE_SECRET', 'CHANGE_TO_A_LONG_RANDOM_SECRET_BEFORE_SHARING']) {
    assert.throws(() => createAuth({ findUser: async () => null, production: true, secret }), /JWT_SECRET/);
  }
  const { register, request } = await fixture(t, { production: true });
  const registered = await register();
  assert.match(registered.setCookie, /; Secure/i);
  const login = await request('/auth/login', { method: 'POST', body: { email: 'member@example.com', password: 'Password123!' } });
  assert.equal(login.status, 200);
  assert.match(login.setCookie, /; Secure/i);
  const logout = await request('/auth/logout', { method: 'POST', cookie: login.cookie });
  assert.match(logout.setCookie, /; Secure/i);
});

test('password validation preserves spaces and accepts exactly 72 UTF-8 bytes', () => {
  assert.equal(validatePassword(' Password123! '), ' Password123! ');
  assert.equal(validatePassword('ก'.repeat(24)), 'ก'.repeat(24));
  assert.throws(() => validatePassword('ก'.repeat(25)), /72 UTF-8 bytes/);
});


test('database lookup failures return 500 instead of granting access or silently signing out', async t => {
  const { register, request, database } = await fixture(t);
  const { cookie } = await register();
  t.mock.method(console, 'error', () => {});
  database.query = async () => { throw new Error('Database unavailable'); };
  for (const path of ['/me', '/admin/overview']) {
    const response = await request(path, { cookie });
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Internal server error' });
  }
});

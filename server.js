/* H2T-shooting — máy chủ.
   Phục vụ giao diện game (thư mục public/) và API: tài khoản, hồ sơ, nâng cấp, phần thưởng, admin.
   Chỉ dùng thư viện có sẵn của Node.js, cộng thêm "pg" để nói chuyện với PostgreSQL. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = require('./public/rules.js');
const store = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('[H2T] Chưa đặt SESSION_SECRET: mọi người sẽ bị đăng xuất mỗi khi server khởi động lại.');
const ADMINS = (process.env.ADMIN_USERNAMES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const TOKEN_DAYS = 30;
const rng = () => crypto.randomInt(0, 1e9) / 1e9;   // ngẫu nhiên an toàn cho tỉ lệ nâng cấp và phần thưởng

/* ---------- mật khẩu (scrypt) ---------- */
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? no(e) : ok(k))));
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt)).toString('base64')}`;
}
async function checkPassword(pw, stored) {
  const [kind, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

/* ---------- phiên đăng nhập (token ký HMAC) ---------- */
const b64u = (s) => Buffer.from(s).toString('base64url');
const sig = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function signToken(uid) {
  const body = b64u(JSON.stringify({ uid, exp: Date.now() + TOKEN_DAYS * 864e5 }));
  return `${body}.${sig(body)}`;
}
function readToken(tok) {
  const [body, s] = String(tok || '').split('.');
  if (!body || !s) return null;
  const want = Buffer.from(sig(body)), got = Buffer.from(s);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try { const d = JSON.parse(Buffer.from(body, 'base64url').toString()); return d.exp > Date.now() ? d : null; } catch (e) { return null; }
}

/* ---------- giới hạn số lần thử ---------- */
const tries = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(); let t = tries.get(key);
  if (!t || now - t.at > windowMs) { t = { n: 0, at: now }; tries.set(key, t); }
  return ++t.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, t] of tries) if (now - t.at > 600e3) tries.delete(k); }, 60e3).unref();

/* ---------- tiện ích HTTP ---------- */
class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((ok, no) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size <= 32 * 1024) chunks.push(c); });
    req.on('end', () => {
      if (size > 32 * 1024) return no(new HttpError(413, 'Dữ liệu gửi lên quá lớn'));
      if (!chunks.length) return ok({});
try { const j = JSON.parse(Buffer.concat(chunks).toString('utf8')); ok(j && typeof j === 'object' ? j : {}); } catch (e) { no(new HttpError(400, 'Dữ liệu không hợp lệ')); } });
    req.on('error', no);
  });
}
const clientIp = (req) => (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?');
const isAdmin = (u) => u.role === 'admin' || ADMINS.includes(u.username);
const publicUser = (u) => ({ username: u.username, admin: isAdmin(u) });

async function auth(req) {
  const h = req.headers.authorization || '';
  const d = readToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!d) throw new HttpError(401, 'Phiên đăng nhập hết hạn, hãy đăng nhập lại');
  const u = await store.getUserById(d.uid);
  if (!u) throw new HttpError(401, 'Tài khoản không tồn tại');
  return u;
}
async function adminAuth(req) {
  const u = await auth(req);
  if (!isAdmin(u)) throw new HttpError(403, 'Chỉ admin mới làm được việc này');
  return u;
}
async function loadProfile(u) {
  let p = await store.getProfile(u.id);
  if (p && R.needsMigrate(p)) p = (await store.withProfile(u.id, (x) => { R.migrate(x); return { ok: true }; })).profile;
  return p;
}

/* ---------- các API ---------- */
const ACTIONS = new Set(['equip', 'unequip', 'salvage', 'forge', 'buy', 'buyWeapon', 'look', 'battleStart', 'battleEnd']);
const routes = {
  'GET /api/health': async () => ({ ok: true, app: 'h2t', db: store.kind }),

  'POST /api/register': async (req, body) => {
    if (limited('reg:' + clientIp(req), 10, 600e3)) throw new HttpError(429, 'Thử quá nhiều lần, đợi vài phút rồi thử lại');
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new HttpError(400, 'Tên đăng nhập 3–20 ký tự, chỉ gồm chữ không dấu, số và dấu _');
    if (password.length < 6 || password.length > 100) throw new HttpError(400, 'Mật khẩu cần từ 6 đến 100 ký tự');
    // Chưa đặt ADMIN_USERNAMES thì tài khoản đầu tiên được làm admin.
    const role = ADMINS.length === 0 && (await store.countUsers()) === 0 ? 'admin' : 'user';
    let u;
    try { u = await store.createUser(username, await hashPassword(password), role, R.newProfile(username)); }
    catch (e) { if (e.code === '23505') throw new HttpError(409, 'Tên đăng nhập đã có người dùng'); throw e; }
    return { token: signToken(u.id), user: publicUser(u), profile: await store.getProfile(u.id) };
  },

  'POST /api/login': async (req, body) => {
    if (limited('login:' + clientIp(req), 20, 600e3)) throw new HttpError(429, 'Thử quá nhiều lần, đợi vài phút rồi thử lại');
    const username = String(body.username || '').trim().toLowerCase();
    const u = await store.findUser(username);
    if (!u || !(await checkPassword(String(body.password || ''), u.pass_hash))) throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
    return { token: signToken(u.id), user: publicUser(u), profile: await loadProfile(u) };
  },

  'GET /api/me': async (req) => {
    const u = await auth(req);
    return { user: publicUser(u), profile: await loadProfile(u) };
  },

  // Mọi thay đổi hồ sơ đi qua luật chung trong rules.js; server giữ quyền quyết định tỉ lệ và phần thưởng.
  'POST /api/action': async (req, body) => {
    const u = await auth(req);
    if (limited('act:' + u.id, 300, 60e3)) throw new HttpError(429, 'Thao tác quá nhanh, chậm lại một chút');
    const type = String(body.type || '');
    if (!ACTIONS.has(type)) throw new HttpError(400, 'Hành động không hợp lệ');
    const out = await store.withProfile(u.id, (p) => R.apply(p, type, body.payload || {}, { now: Date.now(), rng }));
    if (!out.ok) throw new HttpError(400, out.error, { profile: out.profile });
    const { profile, ...result } = out;
    return { result, profile };
  },

  'GET /api/admin/users': async (req, body, url) => {
    await adminAuth(req);
    const users = await store.listUsers(String(url.searchParams.get('q') || '').toLowerCase().slice(0, 30));
    return { users: users.map((x) => ({ ...x, admin: x.role === 'admin' || ADMINS.includes(x.username) })), total: await store.countUsers() };
  },
  // Admin tạo tài khoản cho người chơi (không đăng nhập vào tài khoản đó)
  'POST /api/admin/create': async (req, body) => {
    const me = await adminAuth(req);
    const username = String(body.newUser || '').trim().toLowerCase();
    const password = String(body.newPass || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new HttpError(400, 'Tên đăng nhập 3–20 ký tự, chỉ gồm chữ không dấu, số và dấu _');
    if (password.length < 6 || password.length > 100) throw new HttpError(400, 'Mật khẩu cần từ 6 đến 100 ký tự');
    const role = body.role === 'admin' ? 'admin' : 'user';
    try { await store.createUser(username, await hashPassword(password), role, R.newProfile(username)); }
    catch (e) { if (e.code === '23505') throw new HttpError(409, 'Tên đăng nhập đã có người dùng'); throw e; }
    console.log(`[H2T admin] ${me.username} tạo tài khoản ${username} (${role})`);
    return { notes: [`Đã tạo tài khoản ${username}${role === 'admin' ? ' (admin)' : ''}`], total: await store.countUsers() };
  },
  'POST /api/admin/grant': async (req, body) => {
    const me = await adminAuth(req);
    const u = await targetUser(me, body);
    const out = await store.withProfile(u.id, (p) => R.adminGrant(p, body));
    console.log(`[H2T admin] ${me.username} -> ${u.username}: ${(out.notes || []).join(', ')}`);
    return { notes: out.notes, username: u.username, profile: u.id === me.id ? out.profile : undefined };
  },
  'POST /api/admin/reset': async (req, body) => {
    const me = await adminAuth(req);
    const u = await targetUser(me, body);
    const out = await store.withProfile(u.id, (p) => { const n = R.newProfile(u.username); for (const k of Object.keys(p)) delete p[k]; Object.assign(p, n); return { ok: true }; });
    console.log(`[H2T admin] ${me.username} đặt lại hồ sơ ${u.username}`);
    return { notes: ['Đã đặt lại hồ sơ của ' + u.username], profile: u.id === me.id ? out.profile : undefined };
  },
  'POST /api/admin/role': async (req, body) => {
    const me = await adminAuth(req);
    const name = String(body.username || '').trim().toLowerCase();
    if (!name || name === me.username) throw new HttpError(400, 'Nhập tên người chơi khác bạn');
    const role = body.role === 'admin' ? 'admin' : 'user';
    if (!(await store.setRole(name, role))) throw new HttpError(404, 'Không tìm thấy người chơi ' + name);
    return { notes: [`${name} giờ là ${role === 'admin' ? 'admin' : 'người chơi thường'}`] };
  },
};
async function targetUser(me, body) {
  const name = String(body.username || '').trim().toLowerCase();
  if (!name) return me;
  const u = await store.findUser(name);
  if (!u) throw new HttpError(404, 'Không tìm thấy người chơi ' + name);
  return u;
}

/* ---------- file tĩnh ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { file = path.join(PUBLIC, 'index.html'); st = fs.statSync(file); }
    const mtime = st.mtime.toUTCString();
    if (req.headers['if-modified-since'] === mtime) { res.writeHead(304); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Last-Modified': mtime, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- máy chủ ---------- */
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url.pathname);
  }
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: 'Không có API này' });
  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    send(res, 200, await handler(req, body, url));
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...(e.extra || {}) });
    console.error('[H2T]', e);
    send(res, 500, { error: 'Máy chủ gặp lỗi, thử lại sau' });
  }
});

store.init().then(() => {
  server.listen(PORT, () => console.log(`[H2T] Đang chạy cổng ${PORT} · lưu trữ: ${store.kind}`));
}).catch((e) => { console.error('[H2T] Không kết nối được cơ sở dữ liệu:', e.message); process.exit(1); });

/* H2T-shooting — lớp lưu trữ.
   Có biến DATABASE_URL -> PostgreSQL (Render Postgres).
   Không có              -> file data/dev-db.json, chỉ để chạy thử trên máy. */
'use strict';
const fs = require('fs');
const path = require('path');

function pgStore(url) {
  const { Pool } = require('pg');
  // URL nội bộ của Render (dpg-xxx-a) và localhost không cần SSL; URL bên ngoài (*.render.com) thì cần.
  const needSSL = /\.render\.com/.test(url) || process.env.PGSSL === 'true';
  const pool = new Pool({ connectionString: url, ssl: needSSL ? { rejectUnauthorized: false } : false, max: 8 });
  pool.on('error', (e) => console.error('[H2T] Lỗi kết nối PostgreSQL:', e.message));
  return {
    kind: 'postgres',
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          pass_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS profiles (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );`);
    },
    async countUsers() {
      const r = await pool.query('SELECT count(*)::int AS n FROM users');
      return r.rows[0].n;
    },
    // Ném lỗi có code '23505' khi trùng tên đăng nhập.
    async createUser(username, hash, role, profile) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const r = await c.query('INSERT INTO users (username, pass_hash, role) VALUES ($1,$2,$3) RETURNING id, username, role', [username, hash, role]);
        await c.query('INSERT INTO profiles (user_id, data) VALUES ($1,$2)', [r.rows[0].id, profile]);
        await c.query('COMMIT');
        return r.rows[0];
      } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    },
    async findUser(username) {
      const r = await pool.query('SELECT id, username, pass_hash, role FROM users WHERE username=$1', [username]);
      return r.rows[0] || null;
    },
    async getUserById(id) {
      const r = await pool.query('SELECT id, username, role FROM users WHERE id=$1', [id]);
      return r.rows[0] || null;
    },
    async getProfile(userId) {
      const r = await pool.query('SELECT data FROM profiles WHERE user_id=$1', [userId]);
      return r.rows[0] ? r.rows[0].data : null;
    },
    // Khóa dòng hồ sơ trong giao dịch, chạy fn, chỉ ghi lại khi fn trả về ok.
    // Hai yêu cầu cùng lúc (ví dụ bấm nâng cấp liên tục) sẽ xếp hàng, không ghi đè nhau.
    async withProfile(userId, fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const r = await c.query('SELECT data FROM profiles WHERE user_id=$1 FOR UPDATE', [userId]);
        if (!r.rows[0]) { await c.query('ROLLBACK'); return { ok: false, error: 'Không tìm thấy hồ sơ' }; }
        const data = r.rows[0].data;
        const out = fn(data);
        if (out && out.ok) await c.query('UPDATE profiles SET data=$2, updated_at=now() WHERE user_id=$1', [userId, data]);
        await c.query('COMMIT');
        return { ...out, profile: data };
      } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    },
    async setRole(username, role) {
      const r = await pool.query('UPDATE users SET role=$2 WHERE username=$1 RETURNING id', [username, role]);
      return r.rowCount > 0;
    },
    async listUsers(q) {
      const r = await pool.query(
        `SELECT u.username, u.role, u.created_at, (p.data->>'gold')::bigint AS gold
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.username LIKE $1 ORDER BY u.created_at DESC LIMIT 50`,
        ['%' + String(q || '').replace(/[%_\\]/g, '\\$&') + '%']);
      return r.rows.map((x) => ({ ...x, gold: x.gold == null ? null : Number(x.gold) }));
    },
  };
}

function fileStore() {
  const file = path.join(__dirname, 'data', 'dev-db.json');
  let db = { users: [], profiles: {}, seq: 1 };
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* tạo mới */ }
  const persist = () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(db));
    fs.renameSync(file + '.tmp', file);
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  return {
    kind: 'file',
    async init() {},
    async countUsers() { return db.users.length; },
    async createUser(username, hash, role, profile) {
      if (db.users.some((u) => u.username === username)) { const e = new Error('duplicate'); e.code = '23505'; throw e; }
      const u = { id: db.seq++, username, pass_hash: hash, role, created_at: new Date().toISOString() };
      db.users.push(u); db.profiles[u.id] = clone(profile); persist();
      return { id: u.id, username, role };
    },
    async findUser(username) { return db.users.find((u) => u.username === username) || null; },
    async getUserById(id) { const u = db.users.find((x) => x.id === id); return u ? { id: u.id, username: u.username, role: u.role } : null; },
    async getProfile(userId) { return db.profiles[userId] ? clone(db.profiles[userId]) : null; },
    async withProfile(userId, fn) {
      const cur = db.profiles[userId]; if (!cur) return { ok: false, error: 'Không tìm thấy hồ sơ' };
      const data = clone(cur); const out = fn(data);
      if (out && out.ok) { db.profiles[userId] = data; persist(); }
      return { ...out, profile: data };
    },
    async setRole(username, role) { const u = db.users.find((x) => x.username === username); if (!u) return false; u.role = role; persist(); return true; },
    async listUsers(q) {
      return db.users.filter((u) => u.username.includes(String(q || ''))).slice(-50).reverse()
        .map((u) => ({ username: u.username, role: u.role, created_at: u.created_at, gold: db.profiles[u.id] ? db.profiles[u.id].gold : null }));
    },
  };
}

module.exports = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore();

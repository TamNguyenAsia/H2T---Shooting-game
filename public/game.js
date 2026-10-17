/* H2T-shooting — client. Chạy online (có server /api) hoặc chơi thử offline (lưu trên trình duyệt). */
(() => {
'use strict';
const R = window.H2T;
const { TIERS, STATS, SLOT_ORDER, SLOTS, SUP, MATS, SHOTS, BOSSES, MAPS, SHOP, fmt } = R;
const $ = (s) => document.querySelector(s);
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in props) { const v = props[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const TC = (i) => TIERS[i ?? 0].c;
const TEAMC = ['#ff6a4d', '#3fc6d6'];
const TEAMN = ['Đội Đỏ', 'Đội Xanh'];
function toast(msg, err) { const t = $('#toast'), d = h('div', { class: err ? 'err' : '' }, msg); t.append(d); while (t.children.length > 3) t.firstChild.remove(); setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 3200); }
function rr(c, x, y, w, hh, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + hh - r); c.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); c.lineTo(x + r, y + hh); c.quadraticCurveTo(x, y + hh, x, y + hh - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }

/* =================== ASSETS (gói hình fantasy) =================== */
// Toàn bộ hình được gộp vào vài trang atlas (assets/*.webp) để repo ít file; assets/atlas.js giữ toạ độ từng hình.
// Mỗi hình vẫn gọi bằng tên cũ (vd 'eq/weapon/bow/3.webp'). Trang atlas tải lười; canvas vẽ khi chưa tải xong sẽ tự vẽ lại.
const ASSET = 'assets/';
const FRAMES = (window.H2T_ATLAS && window.H2T_ATLAS.frames) || {};
const PAGES = new Map(), SPR = new Map();
function atlasPage(name) {
  let im = PAGES.get(name); if (im) return im;
  im = new Image(); im.decoding = 'async'; im.onerror = () => { im._bad = true; }; im.src = ASSET + name + '.webp'; PAGES.set(name, im); return im;
}
function img(path) {
  let sp = SPR.get(path); if (sp) return sp;
  const f = FRAMES[path], im = f ? atlasPage(f[0]) : null;
  sp = { f, im, get _bad() { return !f || !!im._bad; }, addEventListener(ev, fn, o) { if (im) im.addEventListener(ev, fn, o); } };
  SPR.set(path, sp); return sp;
}
const ready = (sp) => !!sp && !!sp.im && sp.im.complete && sp.im.naturalWidth > 0;
// Vẽ 1 hình trong atlas vào khung (dx, dy, dw, dh) tương ứng kích thước gốc của hình
function drawSpr(c, sp, dx, dy, dw, dh) {
  const [, x, y, w, hh, ox, oy, fw, fh] = sp.f, kx = dw / fw, ky = dh / fh;
  c.drawImage(sp.im, x, y, w, hh, dx + ox * kx, dy + oy * ky, w * kx, hh * ky);
}
// Canvas nhỏ hiển thị 1 hình atlas (dùng thay thẻ <img> trong HUD)
function sprCanvas(path, size) {
  const cv = h('canvas', { width: size, height: size }), sp = img(path);
  const paint = () => { if (!ready(sp)) return; const c = cv.getContext('2d'); c.clearRect(0, 0, size, size); drawSpr(c, sp, 0, 0, size, size); };
  if (ready(sp)) paint(); else sp.addEventListener('load', paint, { once: true });
  return cv;
}
function whenLoaded(paths, ms = 4000) {
  const all = Promise.all(paths.map((p) => { const sp = img(p); if (ready(sp) || sp._bad) return 0;
    return new Promise((r) => { sp.addEventListener('load', r, { once: true }); sp.addEventListener('error', r, { once: true }); }); }));
  return Promise.race([all, new Promise((r) => setTimeout(r, ms))]);
}
const DRESS = ['armor', 'ring', 'hat', 'weapon']; // thứ tự chồng layer (sau body), theo manifest
const typeOf = (L, s) => (L.type && L.type[s]) || R.DEFAULT_TYPE[s];
function dressPaths(L) { const a = ['char/body.webp']; for (const s of DRESS) if (L[s] != null) a.push(`eq/${s}/${typeOf(L, s)}/${L[s]}.webp`); return a; }
const fxPaths = (L) => [`tier/aura${L.set || 0}.webp`, `tier/ring${L.set || 0}.webp`];
const lookPaths = (L) => [...fxPaths(L), ...dressPaths(L)];
function iconPath(it) {
  if (it.slot === 'support') return `items/${(SUP[it.kind] || SUP.heal).img}.webp`;
  if (R.TYPES[it.slot]) return `eq/${it.slot}/${it.type || R.DEFAULT_TYPE[it.slot]}/${it.tier}i.webp`;
  return null;
}
// Ghép body + trang bị thành 1 canvas 512×512, lưu cache theo bộ đồ
const comp = new Map();
function composite(L) {
  const paths = dressPaths(L), key = paths.join('|'); let e = comp.get(key);
  if (e && e.done) return e.cv;
  if (!e) { if (comp.size > 80) comp.clear(); e = { cv: document.createElement('canvas'), done: false, n: -1 }; e.cv.width = e.cv.height = 512; comp.set(key, e); }
  const ims = paths.map(img), n = ims.filter(ready).length;
  if (n !== e.n) { e.n = n; const g = e.cv.getContext('2d'); g.clearRect(0, 0, 512, 512); for (const im of ims) if (ready(im)) drawSpr(g, im, 0, 0, 512, 512); }
  e.done = ims.every((im) => ready(im) || im._bad);
  return e.cv;
}
// Gọi lại fn khi mọi hình của bộ đồ đã tải (dùng cho canvas tĩnh ở sảnh)
function redrawWhenReady(paths, cnv, fn) { if (paths.every((p) => ready(img(p)) || img(p)._bad)) return; whenLoaded(paths).then(() => { if (cnv.isConnected) fn(); }); }

/* =================== NET / STORE =================== */
const Net = { online: false, token: null, user: null, admin: false };
let P = null;
const LKEY = 'h2t-profile', TKEY = 'h2t-token';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
const saveLocal = () => { if (!Net.online) lsSet(LKEY, JSON.stringify(P)); };
async function api(path, body) {
  let r;
  try { r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(Net.token ? { Authorization: 'Bearer ' + Net.token } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { throw new Error('Mất kết nối tới máy chủ'); }
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && Net.token && path !== '/api/login') { logout(); throw new Error(j.error || 'Phiên đăng nhập hết hạn'); }
  if (!r.ok) { if (j.profile) P = j.profile; throw new Error(j.error || 'Lỗi máy chủ'); }
  return j;
}
async function act(type, payload) {
  if (Net.online) { const j = await api('/api/action', { type, payload }); P = j.profile; return j.result; }
  const r = R.apply(P, type, payload, { now: Date.now() });
  if (!r.ok) throw new Error(r.error);
  saveLocal(); return r;
}
async function boot() {
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('/api/health', { signal: ctl.signal, cache: 'no-store' }); clearTimeout(tm);
    if (r.ok) { const j = await r.json(); Net.online = !!(j && j.app === 'h2t'); }
  } catch (e) { Net.online = false; }
  $('#boot').hidden = true;
  if (Net.online) {
    Net.token = lsGet(TKEY);
    if (Net.token) { try { onAuthed(await api('/api/me')); return; } catch (e) { Net.token = null; lsDel(TKEY); } }
    showAuth();
  } else {
    let p = null; try { p = JSON.parse(lsGet(LKEY) || 'null'); } catch (e) {}
    P = R.validProfile(p) ? R.migrate(p) : R.newProfile('Xạ thủ');
    Net.admin = true; saveLocal(); showLobby();
  }
}
function onAuthed(j) {
  if (j.token) { Net.token = j.token; lsSet(TKEY, j.token); }
  Net.user = j.user; Net.admin = !!j.user.admin; P = j.profile; showLobby();
}
function logout() { Net.token = null; Net.user = null; lsDel(TKEY); $('#lobby').hidden = true; $('#battle').hidden = true; showAuth(); }

/* ---------- auth screen ---------- */
let authMode = 'login';
function showAuth() {
  $('#auth').hidden = false; $('#lobby').hidden = true;
  document.querySelectorAll('#authMode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === authMode)));
  $('#authBtn').textContent = authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
  $('#authPass').autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
}
document.querySelectorAll('#authMode button').forEach((b) => b.addEventListener('click', () => { authMode = b.dataset.v; $('#authErr').textContent = ''; showAuth(); }));
$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = $('#authBtn'); btn.disabled = true; $('#authErr').textContent = '';
  try { const j = await api(authMode === 'login' ? '/api/login' : '/api/register', { username: $('#authUser').value, password: $('#authPass').value }); $('#auth').hidden = true; onAuthed(j); }
  catch (err) { $('#authErr').textContent = err.message; }
  btn.disabled = false;
});

/* =================== ICONS =================== */
function iconCtx(cnv) { const c = cnv.getContext('2d'); c.setTransform(cnv.width / 64, 0, 0, cnv.height / 64, 0, 0); c.clearRect(0, 0, 64, 64); c.lineJoin = 'round'; c.lineCap = 'round'; return c; }
const OL = 'rgba(20,10,30,.9)';
function drawHatShape(c, t) {
  const col = TC(t); c.fillStyle = col; c.strokeStyle = OL; c.lineWidth = 1.8;
  if (t === 0) { c.beginPath(); c.ellipse(0, 0, 17, 14, 0, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = shade(col, -0.25); rr(c, -18, -3, 36, 6, 3); c.fill(); c.stroke(); c.fillStyle = shade(col, 0.3); c.beginPath(); c.arc(0, -14, 3, 0, 7); c.fill(); }
  else if (t === 1) { c.beginPath(); c.moveTo(-16, 2); c.lineTo(-17, -14); c.lineTo(-9, -7); c.lineTo(-4, -18); c.lineTo(0, -8); c.lineTo(4, -18); c.lineTo(9, -7); c.lineTo(17, -14); c.lineTo(16, 2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e8344a'; c.beginPath(); c.arc(0, -3, 2.6, 0, 7); c.fill(); c.fillStyle = '#4ad0ff'; c.beginPath(); c.arc(-9, -2, 2, 0, 7); c.arc(9, -2, 2, 0, 7); c.fill(); }
  else if (t === 2) { for (const s of [-1, 1]) { c.fillStyle = '#efe2c4'; c.beginPath(); c.moveTo(s * 12, -8); c.quadraticCurveTo(s * 26, -14, s * 22, -30); c.quadraticCurveTo(s * 18, -18, s * 7, -14); c.closePath(); c.fill(); c.stroke(); } c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 17, 16, 0, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = shade(col, -0.3); rr(c, -18, -3, 36, 6, 3); c.fill(); c.stroke(); }
  else if (t === 3) { rr(c, -17, -20, 34, 24, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(0,0,0,.55)'; rr(c, -2, -10, 18, 4, 2); c.fill(); c.fillStyle = shade(col, 0.25); c.fillRect(-2, -20, 4, 24); c.fillStyle = '#d8344a'; c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(-12, -34, -20, -26); c.quadraticCurveTo(-10, -26, -2, -18); c.fill(); }
  else if (t === 4) { for (const s of [-1, 1]) { c.fillStyle = '#f2fbff'; c.beginPath(); c.moveTo(s * 15, -8); c.quadraticCurveTo(s * 32, -14, s * 30, -30); c.quadraticCurveTo(s * 26, -22, s * 22, -24); c.quadraticCurveTo(s * 24, -16, s * 13, -14); c.closePath(); c.fill(); c.stroke(); } c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 17, 16, 0, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -9, 3, 0, 7); c.fill(); }
  else { c.save(); c.shadowColor = col; c.shadowBlur = 12; c.beginPath(); c.moveTo(-16, 2); c.lineTo(-18, -20); c.lineTo(-8, -10); c.lineTo(0, -28); c.lineTo(8, -10); c.lineTo(18, -20); c.lineTo(16, 2); c.closePath(); c.fill(); c.stroke(); c.restore(); c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(0, -6, 3.2, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,224,150,.9)'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(0, -34, 12, 3.6, 0, 0, 7); c.stroke(); }
}
function paintGun(c, t) {
  const col = TC(t), L = 30 + t * 2.2;
  c.strokeStyle = OL; c.lineWidth = 1.5;
  c.fillStyle = shade(col, -0.2); rr(c, -9, -3.5, 11, 8, 3); c.fill(); c.stroke();
  c.fillStyle = '#3a3050'; rr(c, 0, -4.5, L * 0.62, 9, 3); c.fill(); c.stroke();
  c.fillStyle = '#252033'; rr(c, L * 0.56, -2.6, L * 0.5, 5.2, 2); c.fill(); c.stroke();
  c.fillStyle = col; c.fillRect(L * 0.3, -4.5, 3.5, 9); c.fillRect(L * 1.0, -3.4, 3, 6.8);
  c.fillStyle = '#252033'; c.beginPath(); c.moveTo(3, 4); c.lineTo(8, 4); c.lineTo(6, 11); c.lineTo(1.5, 11); c.closePath(); c.fill(); c.stroke();
  if (t >= 2) { c.fillStyle = '#1b1230'; rr(c, L * 0.18, -10, 13, 5, 2); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(L * 0.18 + 12, -7.5, 2, 0, 7); c.fill(); }
  if (t >= 4) { c.save(); c.shadowColor = col; c.shadowBlur = 12; c.fillStyle = col; c.beginPath(); c.arc(L * 1.08, 0, 3.2, 0, 7); c.fill(); c.restore(); }
  if (t >= 5) { c.strokeStyle = shade(col, 0.4); c.lineWidth = 1; c.beginPath(); c.moveTo(6, 0); c.lineTo(L * 0.5, 0); c.stroke(); }
}
function paintSupport(c, kind, col) {
  c.strokeStyle = OL; c.lineWidth = 1.6; c.fillStyle = col;
  if (kind === 'heal') { c.beginPath(); c.arc(0, 4, 7, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.arc(0, -5, 4.5, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#8a5a2a'; c.fillRect(-2, -12, 4, 4); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-2.5, 2, 2, 0, 7); c.fill(); }
  else if (kind === 'shield') { c.beginPath(); c.moveTo(-8, -8); c.lineTo(8, -8); c.lineTo(8, 1); c.quadraticCurveTo(7, 7, 0, 10); c.quadraticCurveTo(-7, 7, -8, 1); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(0, -5); c.lineTo(3, 0); c.lineTo(0, 5); c.lineTo(-3, 0); c.closePath(); c.fill(); }
  else { rr(c, -9, -4, 14, 8, 3); c.fill(); c.stroke(); c.fillStyle = '#d9f3ff'; c.beginPath(); c.arc(6, 0, 4.5, 0, 7); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(6, 0, 2, 0, 7); c.fill(); }
}
function paintItem(c, slot, t, kind) {
  const col = TC(t); c.save(); c.strokeStyle = OL; c.lineWidth = 2.2;
  if (t >= 4) { const g = c.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  if (slot === 'weapon') { c.translate(18, 40); c.rotate(-0.55); c.scale(1.05, 1.05); paintGun(c, t); }
  else if (slot === 'hat') { c.translate(32, 46); c.scale(1.25, 1.25); drawHatShape(c, t); }
  else if (slot === 'armor') {
    c.fillStyle = col; c.beginPath(); c.moveTo(21, 12); c.lineTo(10, 18); c.lineTo(6, 31); c.lineTo(14, 34); c.lineTo(17, 27); c.lineTo(17, 54); c.lineTo(47, 54); c.lineTo(47, 27); c.lineTo(50, 34); c.lineTo(58, 31); c.lineTo(54, 18); c.lineTo(43, 12); c.quadraticCurveTo(32, 22, 21, 12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(17, 41, 30, 5); c.fillStyle = '#e9b94f'; c.fillRect(29, 40, 6, 7);
    if (t >= 2) { c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(15, 20, 6, 4, -0.5, 0, 7); c.ellipse(49, 20, 6, 4, 0.5, 0, 7); c.fill(); }
    if (t >= 3) { c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(32, 22); c.lineTo(32, 40); c.stroke(); }
  }
  else if (slot === 'necklace') { c.strokeStyle = '#e2c98e'; c.lineWidth = 3; c.beginPath(); c.arc(32, 18, 17, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); c.fillStyle = col; c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 33); c.lineTo(40, 42); c.lineTo(32, 54); c.lineTo(24, 42); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(32, 36); c.lineTo(35, 42); c.lineTo(32, 46); c.closePath(); c.fill(); }
  else if (slot === 'ring') { c.strokeStyle = '#e5c26a'; c.lineWidth = 6; c.beginPath(); c.ellipse(32, 40, 14, 12, 0, 0, 7); c.stroke(); c.strokeStyle = OL; c.lineWidth = 1.2; c.beginPath(); c.ellipse(32, 40, 17, 15, 0, 0, 7); c.stroke(); c.fillStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 13); c.lineTo(41, 22); c.lineTo(32, 31); c.lineTo(23, 22); c.closePath(); c.fill(); c.stroke(); }
  else if (slot === 'bracelet') { c.strokeStyle = col; c.lineWidth = 10; c.beginPath(); c.ellipse(32, 34, 18, 13, 0, 0, 7); c.stroke(); c.strokeStyle = OL; c.lineWidth = 1.4; c.beginPath(); c.ellipse(32, 34, 23, 18, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(32, 34, 13, 8, 0, 0, 7); c.stroke(); c.fillStyle = '#fff3c4'; for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175); c.beginPath(); c.arc(32 + Math.cos(a) * 18, 34 + Math.sin(a) * 13, 2, 0, 7); c.fill(); } }
  else if (slot === 'support') { c.translate(32, 32); c.scale(2.4, 2.4); paintSupport(c, kind, col); }
  c.restore();
}
function drawItemIcon(cnv, it) {
  const c = iconCtx(cnv), p = iconPath(it);
  if (!p) { paintItem(c, it.slot, it.tier, it.kind); return; }
  const im = img(p);
  if (ready(im)) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cnv.width, cnv.height); drawSpr(c, im, 0, 0, cnv.width, cnv.height); return; }
  if (!im._bad) { const g = c.createRadialGradient(32, 32, 2, 32, 32, 26); g.addColorStop(0, TC(it.tier) + '66'); g.addColorStop(1, TC(it.tier) + '00'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); im.addEventListener('load', () => drawItemIcon(cnv, it), { once: true }); }
  else paintItem(c, it.slot, it.tier, it.kind);
}
function drawMatIcon(cnv, k) {
  const sp = img(`mats/${k}.webp`), c = iconCtx(cnv);
  if (ready(sp)) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cnv.width, cnv.height); drawSpr(c, sp, 0, 0, cnv.width, cnv.height); return; }
  if (!sp._bad) sp.addEventListener('load', () => drawMatIcon(cnv, k), { once: true });
  c.strokeStyle = OL; c.lineWidth = 2;
  if (k === 'gold') { c.fillStyle = '#f4c542'; c.beginPath(); c.arc(32, 32, 24, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ffe48a'; c.beginPath(); c.arc(32, 32, 17, 0, 7); c.fill(); c.fillStyle = '#c8901e'; c.font = '800 22px "Baloo 2",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('V', 32, 34); }
  else if (k === 'stone') { c.fillStyle = '#7f95b8'; c.beginPath(); c.moveTo(32, 8); c.lineTo(52, 24); c.lineTo(46, 52); c.lineTo(18, 52); c.lineTo(12, 24); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#b8cbe8'; c.beginPath(); c.moveTo(32, 8); c.lineTo(40, 26); c.lineTo(24, 26); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(24, 26); c.lineTo(18, 52); c.moveTo(40, 26); c.lineTo(46, 52); c.stroke(); }
  else if (k[0] === 't') { const col = TC(+k[1]); c.save(); c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col; c.beginPath(); c.moveTo(32, 4); c.lineTo(46, 20); c.lineTo(42, 56); c.lineTo(22, 56); c.lineTo(18, 20); c.closePath(); c.fill(); c.restore(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(32, 4); c.lineTo(36, 20); c.lineTo(32, 56); c.lineTo(28, 20); c.closePath(); c.fill(); }
  else if (k === 'luck') { c.fillStyle = '#f6d36b'; rr(c, 18, 6, 28, 52, 3); c.fill(); c.stroke(); c.strokeStyle = '#c22e2e'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 14); c.lineTo(32, 50); c.moveTo(24, 22); c.lineTo(40, 22); c.moveTo(25, 32); c.lineTo(39, 40); c.moveTo(39, 32); c.lineTo(25, 40); c.stroke(); }
  else { c.fillStyle = '#9f86e8'; c.beginPath(); c.moveTo(14, 12); c.lineTo(50, 12); c.lineTo(50, 32); c.quadraticCurveTo(48, 48, 32, 56); c.quadraticCurveTo(16, 48, 14, 32); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff6c9'; c.beginPath(); c.moveTo(32, 20); c.lineTo(38, 32); c.lineTo(32, 44); c.lineTo(26, 32); c.closePath(); c.fill(); }
}

/* =================== CHARACTER =================== */
// Nhân vật Sylva: sprite 512×512, chân ở (256, SPR_FOOT). Ở tỉ lệ s = 1, cao CHAR_H đơn vị thế giới.
const SPR_FOOT = 474, CHAR_H = 100, HIT_Y = 36;
function drawChar(c, L, o = {}) {
  const f = o.facing || 1, t = o.t || 0, walk = o.walk || 0, k = o.s || 1, sc = (k * CHAR_H) / 512, tier = L.set || 0;
  c.save(); c.translate(o.x || 0, o.y || 0);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 1, 22 * k, 5 * k, 0, 0, 7); c.fill();
  if (o.team != null) { c.strokeStyle = TEAMC[o.team]; c.lineWidth = 2.5 * k; c.beginPath(); c.ellipse(0, 1, 27 * k, 7 * k, 0, 0, 7); c.stroke(); }
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.scale(f * sc, sc); c.translate(-256, -SPR_FOOT);
  const [au, fr] = fxPaths(L).map(img);
  if (ready(au)) { c.save(); c.globalAlpha *= 0.72 + Math.sin(t * 2) * 0.2; drawSpr(c, au, 0, 0, 512, 512); c.restore(); }
  if (ready(fr)) { c.save(); c.translate(256, 462); c.scale(1 + Math.sin(t * 2.4) * 0.03, 1); drawSpr(c, fr, -256, -462, 512, 512); c.restore(); }
  const bob = -Math.abs(Math.sin(walk)) * 10, tilt = Math.sin(walk) * 0.05, br = 1 + Math.sin(t * 2.2) * 0.012;
  c.translate(256, 470 + bob); c.rotate(tilt); c.scale(1, br); c.translate(-256, -470);
  c.drawImage(composite(L), 0, 0);
  c.restore();
  if (o.frozen) { // khối băng khi bị Bom Băng Giá
    c.save(); c.translate(o.x || 0, o.y || 0); c.scale(k, k);
    c.fillStyle = 'rgba(170,225,255,.38)'; c.strokeStyle = 'rgba(230,248,255,.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-30, 0); c.lineTo(-34, -60); c.lineTo(-18, -92); c.lineTo(14, -96); c.lineTo(34, -64); c.lineTo(30, 0); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(-20, -80); c.lineTo(-8, -50); c.moveTo(18, -84); c.lineTo(10, -60); c.stroke(); c.restore();
  }
}
function drawBossShape(c, b, x, y, s, enr, time) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
  const col = b.col, tc = TC(b.t), cy = -64;
  if (enr) { const g = c.createRadialGradient(0, cy, 30, 0, cy, 115); g.addColorStop(0, 'rgba(255,60,60,.3)'); g.addColorStop(1, 'rgba(255,60,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, cy, 115, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 2, 64, 10, 0, 0, 7); c.fill();
  c.fillStyle = shade(col, -0.15); c.strokeStyle = 'rgba(15,8,25,.9)'; c.lineWidth = 3;
  for (const fx of [-30, 26]) { rr(c, fx - 12, -28, 24, 28, 7); c.fill(); c.stroke(); c.fillStyle = '#efe2c4'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(fx - 9 + k * 7, 0); c.lineTo(fx - 6 + k * 7, -6); c.lineTo(fx - 3 + k * 7, 0); c.fill(); } c.fillStyle = shade(col, -0.15); }
  const hn = b.horn;
  if (hn >= 1) { c.fillStyle = '#efe2c4'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 22, cy - 44); c.quadraticCurveTo(sx * (40 + hn * 4), cy - 70 - hn * 4, sx * (30 + hn * 3), cy - 92 - hn * 3); c.quadraticCurveTo(sx * 30, cy - 66, sx * 10, cy - 50); c.closePath(); c.fill(); c.stroke(); } }
  if (hn === 4) { c.fillStyle = '#bfe6ff'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 48, cy - 10); c.quadraticCurveTo(sx * 104, cy - 66 + Math.sin(time * 4) * 6, sx * 98, cy + 10); c.quadraticCurveTo(sx * 80, cy - 6, sx * 52, cy + 16); c.closePath(); c.fill(); c.stroke(); } }
  const bg = c.createRadialGradient(-14, cy - 20, 10, 0, cy, 70); bg.addColorStop(0, shade(col, 0.25)); bg.addColorStop(1, shade(col, -0.25));
  c.fillStyle = bg; c.beginPath(); c.ellipse(0, cy, 64, 58, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(8, cy + 16, 34, 30, 0, 0, 7); c.fill();
  if (hn === 2) { c.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-30 + i * 16, cy - 30 + (i % 2) * 10, 9, 0, 7); c.fill(); } }
  if (hn === 5 || hn === 3) { c.fillStyle = 'rgba(255,220,160,.28)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-50 + i * 18, cy - 40); c.lineTo(-44 + i * 18, cy - 58); c.lineTo(-38 + i * 18, cy - 40); c.fill(); } }
  const ec = enr ? '#ff3b3b' : tc, blink = Math.sin(time * 2.3) > 0.97;
  c.fillStyle = '#fff'; for (const ex of [-34, -8]) { c.beginPath(); c.ellipse(ex, cy - 12, 9, blink ? 1.5 : 8, 0, 0, 7); c.fill(); }
  c.save(); c.fillStyle = ec; c.shadowColor = ec; c.shadowBlur = 12; for (const ex of [-36, -10]) { c.beginPath(); c.arc(ex, cy - 12, blink ? 1 : 4, 0, 7); c.fill(); } c.restore();
  c.strokeStyle = 'rgba(15,8,25,.9)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-46, cy - 25); c.lineTo(-26, cy - 20); c.moveTo(-18, cy - 22); c.lineTo(0, cy - 27); c.stroke();
  c.fillStyle = '#2a0f18'; c.beginPath(); c.ellipse(-26, cy + 16, 20, enr ? 12 : 8, 0, 0, Math.PI); c.fill();
  c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-42 + i * 10, cy + 16); c.lineTo(-37 + i * 10, cy + 23); c.lineTo(-32 + i * 10, cy + 16); c.fill(); }
  if (b.t >= 4) { c.fillStyle = tc; c.lineWidth = 2; c.beginPath(); c.moveTo(-26, cy - 50); c.lineTo(-26, cy - 70); c.lineTo(-12, cy - 58); c.lineTo(0, cy - 76); c.lineTo(12, cy - 58); c.lineTo(26, cy - 70); c.lineTo(26, cy - 50); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}
function drawPortrait(cnv, L) {
  const c = cnv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cnv.width, cnv.height);
  c.drawImage(composite(L), 96, 30, 320, 320, 0, 0, cnv.width, cnv.height);
  redrawWhenReady(dressPaths(L), cnv, () => drawPortrait(cnv, L));
}

/* =================== LOBBY =================== */
const ui = { tab: 'char', wshop: { type: 'staff', tier: 0 }, sel: null, forgeSel: null, filter: 'all', luck: false, guard: true, fres: null, busy: false, shopRes: null,
  pvp: { size: 2, opp: 'bot', tier: 0, diff: 'normal', map: 'forest' }, boss: { size: 3 }, admin: { target: '', users: [], msg: '' }, confirm: null };
try { const u = JSON.parse(lsGet('h2t-ui') || 'null'); if (u) { if (u.pvp) Object.assign(ui.pvp, u.pvp); if (u.boss) Object.assign(ui.boss, u.boss); if (u.tab) ui.tab = u.tab; } } catch (e) {}
const saveUi = () => lsSet('h2t-ui', JSON.stringify({ pvp: ui.pvp, boss: ui.boss, tab: ui.tab }));
const ICON = {
  char: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
  forge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M6 21v-5h12v5M9 16l-3-7 6 3 6-3-3 7"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9l2-5h12l2 5M4 9h16v11H4z"/><path d="M10 14h4"/></svg>',
  fight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l6 0 0 6-9 9-3-3z"/><path d="M5 14l5 5M3 21l3-3"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></svg>',
};
const TABS = [['char', 'Nhân vật'], ['bag', 'Túi đồ'], ['forge', 'Lò rèn'], ['shop', 'Cửa hàng'], ['fight', 'Chiến đấu'], ['admin', 'Admin']];
function showLobby() {
  $('#auth').hidden = true; $('#battle').hidden = true; $('#lobby').hidden = false; $('#result').hidden = true;
  $('#offlineTag').hidden = Net.online; $('#btnLogout').hidden = !Net.online;
  drawMatIcon($('#icoGold'), 'gold'); drawMatIcon($('#icoStone'), 'stone');
  checkRotate(); renderLobby();
}
const myItems = () => R.equippedItems(P);
const myStats = () => R.totalStats(myItems());
function renderLobby() {
  if (!P || $('#lobby').hidden) return;
  $('#meName').textContent = Net.user ? Net.user.username : P.name;
  $('#mePower').textContent = 'Lực chiến ' + fmt(R.powerOf(myStats()));
  $('#resGold').textContent = fmt(P.gold); $('#resStone').textContent = fmt(P.mats.stone || 0);
  drawPortrait($('#meIcon'), R.looksOf(myItems(), P.look), null);
  const nav = $('#nav'); nav.innerHTML = '';
  for (const [id, label] of TABS) {
    if (id === 'admin' && !Net.admin) continue;
    const b = h('button', { type: 'button', role: 'tab', id: 'tab-' + id, 'aria-selected': String(ui.tab === id), onclick: () => { ui.tab = id; ui.confirm = null; saveUi(); renderLobby(); } });
    b.innerHTML = ICON[id]; b.append(label); nav.append(b);
  }
  if (ui.tab === 'admin' && !Net.admin) ui.tab = 'char';
  const pane = $('#pane'); pane.innerHTML = '';
  ({ char: paneChar, bag: paneBag, forge: paneForge, shop: paneShop, fight: paneFight, admin: paneAdmin })[ui.tab](pane);
}
async function run(fn) { if (ui.busy) return; ui.busy = true; try { await fn(); } catch (e) { toast(e.message, true); } ui.busy = false; renderLobby(); }
function seg(opts, cur, onPick, id) { return h('div', { class: 'seg', id }, opts.map(([v, label]) => h('button', { type: 'button', 'aria-pressed': String(cur === v), onclick: () => onPick(v) }, label))); }
function iconCanvas(it, size = 112) { const cv = h('canvas', { width: size, height: size }); drawItemIcon(cv, it); return cv; }
function matCanvas(k, size = 60) { const cv = h('canvas', { width: size, height: size }); drawMatIcon(cv, k); return cv; }
function slotBtn(it, opts = {}) {
  const t = it ? TIERS[it.tier] : null;
  return h('button', { type: 'button', class: 'slot' + (it ? '' : ' empty') + (opts.sel ? ' sel' : ''), style: it ? `--tc:${t.c}` : '', id: opts.id, title: it ? `${R.itemName(it)} · ${t.n}` : opts.label, onclick: opts.onclick },
    it ? iconCanvas(it) : h('span', { class: 'muted', style: 'font-size:.7rem' }, opts.label || ''), it && SLOTS[it.slot].up ? h('span', { class: 'badge' }, '+' + it.lvl) : null, opts.name ? h('span', { class: 'sname' }, opts.name) : null);
}
function statBlock(st) {
  const d = R.derived(st);
  const extra = { atk: 'Sát thương gốc của đạn', def: `Giảm ${Math.round(d.reduce * 100)}% sát thương nhận vào`, hp: 'Máu tối đa trong trận', crit: `${Math.round(d.crit * 100)}% ra đòn chí mạng ×1.6`, agi: `${Math.round(d.dodge * 100)}% né đòn, thể lực ${Math.round(d.move)}` };
  const ic = { atk: 'T', def: 'P', hp: 'S', crit: 'C', agi: 'N' }, col = { atk: '#ff8a5a', def: '#7fb8ff', hp: '#7fdc8c', crit: '#ffd25e', agi: '#c493ff' };
  return h('div', { class: 'stats' }, STATS.map(([k, n]) => h('div', { class: 'stat' }, h('span', { class: 'ico', style: `color:${col[k]}` }, ic[k]), h('div', {}, h('span', {}, n), h('em', {}, extra[k])), h('b', {}, fmt(st[k])))));
}
function itemDetail(it, ctx) {
  const t = TIERS[it.tier], eq = R.isEquipped(P, it), cur = R.itemById(P, P.gear[it.slot]);
  const s1 = R.itemStats(it), s0 = cur && cur !== it ? R.itemStats(cur) : null;
  const lines = STATS.filter(([k]) => s1[k] != null || (s0 && s0[k] != null)).map(([k, n]) => { const v = s1[k] || 0, dv = s0 ? v - (s0[k] || 0) : 0;
    return h('div', {}, h('span', {}, n), h('b', {}, fmt(v), s0 && dv ? h('span', { style: `color:${dv > 0 ? 'var(--heal)' : 'var(--bad)'};margin-left:6px;font-weight:500` }, (dv > 0 ? '+' : '') + fmt(dv)) : null)); });
  const sv = R.salvageValue(it), confirming = ui.confirm === it.uid;
  return h('div', { class: 'card detail' },
    h('div', { class: 'dhead' }, slotBtn(it, {}), h('div', {}, h('span', { class: 'lbl' }, `${SLOTS[it.slot].n}${it.type ? ' · ' + R.typeName(it) : ''} · ${t.n}${SLOTS[it.slot].up ? ` · Lv ${it.lvl}/3` : ''}`), h('h3', { style: `color:${t.c}` }, R.itemName(it)), h('span', { class: 'note' }, `Độ hoàn hảo ${Math.round(it.roll * 100)}%${eq ? ' · đang mặc' : ''}`))),
    h('div', { class: 'dlines' }, lines),
    it.slot === 'support' ? h('div', { class: 'note' }, 'Kỹ năng trong trận: ' + R.supDesc(it) + ' (hồi 3 lượt).') : null,
    !SLOTS[it.slot].up ? h('div', { class: 'note' }, 'Trang sức không nâng cấp được. Đánh boss bậc cao hoặc mở rương để có trang sức tốt hơn.') : null,
    h('div', { class: 'row' },
      eq ? h('button', { class: 'btn', type: 'button', id: 'btnUnequip', onclick: () => run(async () => { await act('unequip', { slot: it.slot }); toast('Đã tháo ' + R.itemName(it)); }) }, 'Tháo ra')
        : h('button', { class: 'btn', type: 'button', id: 'btnEquip', onclick: () => run(async () => { await act('equip', { uid: it.uid }); toast('Đã mặc ' + R.itemName(it)); }) }, 'Trang bị'),
      SLOTS[it.slot].up ? h('button', { class: 'btn', type: 'button', id: 'btnToForge', onclick: () => { ui.forgeSel = it.uid; ui.tab = 'forge'; ui.fres = null; saveUi(); renderLobby(); } }, 'Nâng cấp') : null,
      eq ? null : h('button', { class: 'btn danger', type: 'button', id: 'btnSalvage', onclick: () => {
        if (confirming) run(async () => { ui.confirm = null; await act('salvage', { uid: it.uid }); ui.sel = null; toast(`Phân rã nhận ${sv} đá`); });
        else { ui.confirm = it.uid; renderLobby(); setTimeout(() => { if (ui.confirm === it.uid) { ui.confirm = null; renderLobby(); } }, 3000); } } }, confirming ? `Bấm lần nữa: phân rã (+${sv} đá)` : `Phân rã (+${sv} đá)`)));
}
function paneChar(pane) {
  const items = myItems(), st = R.totalStats(items);
  const hero = h('canvas', { class: 'hero', width: 600, height: 660, 'aria-label': 'Nhân vật đang mặc trang bị' });
  const slot = (s) => { const it = R.itemById(P, P.gear[s]); return slotBtn(it, { name: SLOTS[s].n, label: SLOTS[s].n, id: 'slot-' + s, sel: it && ui.sel === it.uid, onclick: () => { if (it) { ui.sel = it.uid; renderLobby(); } else { ui.filter = s; ui.tab = 'bag'; renderLobby(); } } }); };
  let sel = ui.sel && R.itemById(P, ui.sel); if (sel && !R.isEquipped(P, sel)) sel = null;
  pane.append(h('div', { class: 'pane-head' }, h('div', {}, h('h2', {}, 'Nhân vật'), h('p', {}, 'Mọi người chơi đều là pháp sư Sylva. Trang bị bạn mặc quyết định chỉ số và ngoại hình; bậc trung bình của Vũ khí, Nón, Áo quyết định hào quang. Bấm vào một ô để xem chi tiết.'))));
  pane.append(h('div', { class: 'char-grid' },
    h('div', { class: 'doll' }, h('div', { class: 'slotcol' }, ['hat', 'armor', 'weapon', 'support'].map(slot)), hero, h('div', { class: 'slotcol' }, ['necklace', 'ring', 'bracelet'].map(slot)),
      h('div', { class: 'namebar' }, h('b', {}, Net.user ? Net.user.username : P.name), h('span', { class: 'cp' }, 'Lực chiến ' + fmt(R.powerOf(st))))),
    h('div', { style: 'display:grid;gap:12px;align-content:start' }, statBlock(st),
      h('div', { class: 'rec' }, h('div', {}, h('b', {}, P.rec.wins), h('span', { class: 'lbl' }, 'Thắng đấu đội')), h('div', {}, h('b', {}, P.rec.losses), h('span', { class: 'lbl' }, 'Thua đấu đội')), h('div', {}, h('b', {}, P.rec.boss.reduce((a, b) => a + b, 0)), h('span', { class: 'lbl' }, 'Boss đã hạ'))),
      sel ? itemDetail(sel) : h('div', { class: 'note card' }, 'Chọn một ô trang bị bên trái để xem chỉ số, tháo ra hoặc mang đi nâng cấp.'))));
  const L = R.looksOf(items, P.look);
  const paint = () => { const c = hero.getContext('2d'); c.clearRect(0, 0, 600, 660);
    const g = c.createRadialGradient(300, 560, 10, 300, 560, 260); g.addColorStop(0, 'rgba(233,185,79,.22)'); g.addColorStop(1, 'rgba(233,185,79,0)'); c.fillStyle = g; c.fillRect(0, 0, 600, 660);
    c.fillStyle = '#2b2040'; c.beginPath(); c.ellipse(300, 610, 170, 34, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(233,185,79,.5)'; c.lineWidth = 3; c.stroke();
    drawChar(c, L, { x: 300, y: 606, s: 5.6, facing: 1, t: 0.4 }); };
  paint(); redrawWhenReady(lookPaths(L), hero, paint);
}
function paneBag(pane) {
  const inv = P.items.filter((i) => !R.isEquipped(P, i) && (ui.filter === 'all' || i.slot === ui.filter)).sort((a, b) => b.tier - a.tier || b.lvl - a.lvl || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  const total = P.items.filter((i) => !R.isEquipped(P, i)).length;
  let sel = ui.sel && R.itemById(P, ui.sel);
  pane.append(h('div', { class: 'pane-head' }, h('div', {}, h('h2', {}, 'Túi đồ'), h('p', {}, `${total}/${R.INV_CAP} ô đã dùng. Trang bị mới đến từ boss, rương ở Cửa hàng hoặc admin tạo.`)),
    seg([['all', 'Tất cả'], ...SLOT_ORDER.map((s) => [s, SLOTS[s].n])], ui.filter, (v) => { ui.filter = v; renderLobby(); }, 'bagFilter')));
  pane.append(h('div', { class: 'bag-grid' },
    h('div', { style: 'display:grid;gap:12px;align-content:start' },
      h('div', { class: 'bag' }, inv.length ? inv.map((it) => slotBtn(it, { sel: sel === it, id: 'bag-' + it.uid, onclick: () => { ui.sel = it.uid; renderLobby(); } })) : h('div', { class: 'empty-note' }, 'Không có trang bị nào ở mục này.')),
      h('h3', {}, 'Nguyên liệu'),
      h('div', { class: 'mats' }, [['gold', 'Vàng', P.gold], ...Object.keys(MATS).map((k) => [k, MATS[k], P.mats[k] || 0])].map(([k, n, v]) => h('div', { class: 'mat' }, matCanvas(k), h('span', {}, n), h('b', {}, fmt(v)))))),
    sel ? itemDetail(sel) : h('div', { class: 'card note' }, 'Chọn một món trong túi để xem chỉ số, so sánh với đồ đang mặc, trang bị hoặc phân rã.')));
}
function paneForge(pane) {
  const ups = P.items.filter((i) => SLOTS[i.slot].up).sort((a, b) => R.isEquipped(P, b) - R.isEquipped(P, a) || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || b.tier - a.tier || b.lvl - a.lvl);
  let it = ui.forgeSel && R.itemById(P, ui.forgeSel); if (!it || !SLOTS[it.slot].up) { it = ups[0]; ui.forgeSel = it && it.uid; }
  pane.append(h('div', { class: 'pane-head' }, h('div', {}, h('h2', {}, 'Lò rèn'), h('p', {}, 'Nâng cấp Vũ khí, Nón, Áo và Vật phẩm hỗ trợ. Mỗi bậc cần đủ 3 level rồi mới đột phá. Bậc càng cao tỉ lệ càng thấp.'))));
  if (!it) { pane.append(h('div', { class: 'empty-note' }, 'Bạn chưa có trang bị nào nâng cấp được.')); return; }
  const list = h('div', { class: 'flist' }, ups.map((x) => { const t = TIERS[x.tier]; return h('button', { type: 'button', class: 'fitem' + (x === it ? ' sel' : ''), style: `--tc:${t.c}`, onclick: () => { ui.forgeSel = x.uid; ui.fres = null; renderLobby(); } },
    iconCanvas(x, 84), h('div', {}, h('b', {}, R.itemName(x)), h('span', {}, `${SLOTS[x.slot].n} · ${t.n} · Lv ${x.lvl}/3${R.isEquipped(P, x) ? ' · đang mặc' : ''}`))); }));
  const f = R.forgeInfo(it), t = TIERS[it.tier];
  const main = h('div', { class: 'card fmain' },
    h('div', { class: 'dhead' }, slotBtn(it, {}), h('div', {}, h('span', { class: 'lbl' }, `${SLOTS[it.slot].n} · ${t.n} · Lv ${it.lvl}/3`), h('h3', { style: `color:${t.c};font-size:1.5rem` }, R.itemName(it)))),
    h('div', { class: 'track' }, TIERS.map((tt, ti) => h('div', { class: 'tstep', style: `--tc:${tt.c}` }, h('span', { class: 'lbl', style: ti === it.tier ? `color:${tt.c}` : '' }, tt.n), h('div', { class: 'pips' }, [1, 2, 3].map((l) => h('i', { class: ti < it.tier || (ti === it.tier && l <= it.lvl) ? 'on' : '' })))))));
  if (f.max) main.append(h('div', { class: 'fres ok' }, `Đã đạt ${TIERS[5].n} Lv 3, cấp tối đa.`));
  else {
    const cur = R.itemStats(it), nxt = R.itemStats({ ...it, tier: f.next.tier, lvl: f.next.lvl });
    main.append(h('div', { class: 'cmp' }, Object.keys(cur).map((k) => [h('span', {}, R.STATN[k]), h('span', { class: 'muted' }, `${fmt(cur[k])} →`), h('b', { class: 'up' }, `${fmt(nxt[k])} (+${fmt(nxt[k] - cur[k])})`)]).flat()));
    if (it.slot === 'support') main.append(h('div', { class: 'note' }, `Kỹ năng: ${R.supDesc(it)} → ${R.supDesc({ ...it, tier: f.next.tier, lvl: f.next.lvl })}`));
    const rate = Math.min(100, f.rate + (ui.luck && P.mats.luck > 0 ? R.LUCK_BONUS : 0));
    main.append(h('div', { class: 'ratebig' }, h('b', { style: `color:${rate >= 60 ? 'var(--heal)' : rate >= 30 ? 'var(--brass)' : 'var(--bad)'}` }, rate + '%'), h('span', { class: 'muted' }, f.type === 'break' ? `Đột phá lên ${TIERS[f.next.tier].n}` : `Nâng lên Lv ${f.next.lvl}`)));
    main.append(h('div', { class: 'costs' }, Object.entries(f.cost).map(([k, v]) => { const hv = R.have(P, k); return h('div', { class: hv < v ? 'no' : '' }, h('span', {}, k === 'gold' ? 'Vàng' : MATS[k]), h('b', {}, `${fmt(hv)} / ${fmt(v)}`)); })));
    main.append(h('label', { class: 'chk', for: 'chkLuck' }, h('input', { type: 'checkbox', id: 'chkLuck', checked: ui.luck && P.mats.luck > 0, disabled: P.mats.luck < 1, onchange: (e) => { ui.luck = e.target.checked; renderLobby(); } }), `Dùng Bùa may mắn (+${R.LUCK_BONUS}%), còn ${P.mats.luck}`));
    if (f.risk) { main.append(h('div', { class: 'warnline' }, 'Từ Địa cấp trở lên, thất bại sẽ tụt 1 level.'));
      main.append(h('label', { class: 'chk', for: 'chkGuard' }, h('input', { type: 'checkbox', id: 'chkGuard', checked: ui.guard && P.mats.guard > 0, disabled: P.mats.guard < 1, onchange: (e) => { ui.guard = e.target.checked; renderLobby(); } }), `Dùng Bùa bảo hộ (không tụt level), còn ${P.mats.guard}`)); }
    const okPay = R.canPay(P, f.cost);
    main.append(h('div', { class: 'row' }, h('button', { class: 'primary', type: 'button', id: 'btnForge', disabled: !okPay || ui.busy, onclick: () => run(async () => {
      const r = await act('forge', { uid: it.uid, luck: ui.luck, guard: ui.guard }); ensureAudio(); sfx(r.success ? 'ok' : 'bad');
      ui.fres = r.success ? { ok: true, t: r.kind === 'break' ? `Đột phá thành công! ${TIERS[r.tier].n}` : `Thành công! Lên Lv ${r.lvl}` } : { ok: false, t: r.dropped ? `Thất bại, tụt về Lv ${r.lvl}` : 'Thất bại, mất nguyên liệu' };
    }) }, f.type === 'break' ? `Đột phá lên ${TIERS[f.next.tier].n}` : 'Nâng cấp'), okPay ? null : h('span', { class: 'warnline' }, 'Thiếu nguyên liệu hoặc vàng. Đánh boss để nhận thêm.')));
  }
  main.append(h('div', { class: 'fres' + (ui.fres ? (ui.fres.ok ? ' ok' : ' bad') : ''), id: 'forgeRes' }, ui.fres ? ui.fres.t : ''));
  pane.append(h('div', { class: 'forge' }, list, main));
  const rows = TIERS.map((tt, ti) => h('tr', {}, h('td', { style: `color:${tt.c}` }, tt.n), ...[0, 1, 2].map((l) => { const c = R.lvCost(ti, l); return h('td', {}, `${R.LV_RATE[ti][l]}% · ${c.stone} đá · ${fmt(c.gold)} vàng`); }),
    h('td', {}, ti < 5 ? `${R.BREAK_RATE[ti]}% · ${Object.entries(R.breakCost(ti)).map(([k, v]) => `${fmt(v)} ${k === 'gold' ? 'vàng' : MATS[k]}`).join(', ')}` : '—')));
  pane.append(h('details', { class: 'card', style: 'margin-top:14px' }, h('summary', {}, 'Bảng tỉ lệ và chi phí nâng cấp'),
    h('div', { class: 'tablewrap', style: 'margin-top:8px' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Bậc'), h('th', {}, 'Lv 0 → 1'), h('th', {}, 'Lv 1 → 2'), h('th', {}, 'Lv 2 → 3'), h('th', {}, 'Đột phá'))), h('tbody', {}, rows)))));
}
function drawChest(cnv, tier) {
  const c = cnv.getContext('2d'), col = TC(tier); c.setTransform(cnv.width / 120, 0, 0, cnv.height / 110, 0, 0); c.clearRect(0, 0, 120, 110); c.strokeStyle = OL; c.lineWidth = 3; c.lineJoin = 'round';
  const g = c.createRadialGradient(60, 60, 5, 60, 60, 60); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 120, 110);
  c.fillStyle = '#7a4a26'; rr(c, 18, 50, 84, 48, 6); c.fill(); c.stroke();
  c.fillStyle = '#9a6234'; c.beginPath(); c.moveTo(18, 52); c.quadraticCurveTo(60, 14, 102, 52); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = col; c.fillRect(18, 56, 84, 7); c.fillRect(54, 30, 12, 68); c.strokeRect(54, 30, 12, 68);
  c.fillStyle = '#ffe9a8'; rr(c, 52, 58, 16, 14, 3); c.fill(); c.stroke();
}
function paneShop(pane) {
  pane.append(h('div', { class: 'pane-head' }, h('div', {}, h('h2', {}, 'Cửa hàng'), h('p', {}, 'Dùng vàng mở rương trang bị. Vàng có được khi thắng trận và hạ boss. Nguyên liệu nâng cấp chỉ rơi từ boss.'))));
  pane.append(h('div', { class: 'shop' }, SHOP.map((s) => { const cv = h('canvas', { width: 240, height: 220 }); drawChest(cv, s.tier); const coin = matCanvas('gold', 44);
    return h('div', { class: 'card chest' }, cv, h('h3', { style: `color:${TC(s.tier)}` }, s.n), h('p', { class: 'note', style: 'margin:0' }, s.desc), h('div', { class: 'price' }, coin, fmt(s.price)),
      h('button', { class: 'primary', type: 'button', id: 'buy-' + s.id, disabled: P.gold < s.price || ui.busy, onclick: () => run(async () => { const r = await act('buy', { id: s.id }); ui.shopRes = r; ensureAudio(); sfx('ok'); if (r.note) toast(r.note); }) }, 'Mở rương')); })));
  // Tiệm vũ khí: chọn kiểu và bậc
  const ws = ui.wshop, wOpt = R.WEAPON_SHOP.find((x) => x.tier === ws.tier) || R.WEAPON_SHOP[0];
  const sample = { slot: 'weapon', type: ws.type, tier: wOpt.tier, lvl: 0, roll: 1 };
  pane.append(h('section', { class: 'card wshop', style: 'margin-top:14px', id: 'weaponShop' },
    h('div', {}, h('h3', { style: 'margin:0' }, 'Tiệm vũ khí'), h('p', { class: 'note', style: 'margin:4px 0 0' }, 'Chọn đúng loại vũ khí bạn muốn. Kiểu chỉ đổi ngoại hình, chỉ số theo bậc.')),
    h('div', { class: 'wtypes' }, Object.entries(R.TYPES.weapon).map(([k, v]) => { const cv = h('canvas', { width: 128, height: 128 }); drawItemIcon(cv, { ...sample, type: k });
      return h('button', { type: 'button', class: 'wtype', id: 'wtype-' + k, 'aria-pressed': String(ws.type === k), onclick: () => { ws.type = k; renderLobby(); } }, cv, h('span', {}, v.n)); })),
    h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Bậc'), seg(R.WEAPON_SHOP.map((x) => [x.tier, TIERS[x.tier].n]), ws.tier, (v) => { ws.tier = v; renderLobby(); }, 'wshopTier')),
    h('div', { class: 'row' }, h('div', {}, h('b', { style: `color:${TC(wOpt.tier)}` }, R.itemName(sample)), h('div', { class: 'note' }, R.statLine(R.itemStats(sample)) + ' (độ hoàn hảo 96–110%)')),
      h('div', { class: 'price', style: 'margin-left:auto' }, matCanvas('gold', 44), fmt(wOpt.price)),
      h('button', { class: 'primary', type: 'button', id: 'btnBuyWeapon', disabled: P.gold < wOpt.price || ui.busy, onclick: () => run(async () => { const r = await act('buyWeapon', { type: ws.type, tier: wOpt.tier }); ui.shopRes = r; ensureAudio(); sfx('ok'); if (r.note) toast(r.note); }) }, 'Mua'))));
  if (ui.shopRes && ui.shopRes.item) { const it = ui.shopRes.item;
    pane.append(h('div', { class: 'card reveal', style: 'margin-top:14px' }, slotBtn(it, {}), h('div', {}, h('span', { class: 'lbl' }, 'Vừa nhận được'), h('h3', { style: `color:${TC(it.tier)}` }, R.itemName(it)), h('span', { class: 'note' }, `${SLOTS[it.slot].n} · ${TIERS[it.tier].n} · ${R.statLine(R.itemStats(it))}`)),
      h('button', { class: 'btn', type: 'button', style: 'margin-left:auto', onclick: () => { ui.sel = it.uid; ui.tab = 'bag'; ui.filter = 'all'; ui.shopRes = null; renderLobby(); } }, 'Xem trong túi'))); }
}
function drawMapThumb(cnv, id, boss) {
  const th = THEMES[id], c = cnv.getContext('2d'), w = cnv.width, hh = cnv.height; c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]); c.fillStyle = g; c.fillRect(0, 0, w, hh);
  const r = [1.3, 2.1, 4.2], sx = w / W, sy = hh / H;
  c.fillStyle = th.far; c.beginPath(); c.moveTo(0, hh); for (let x = 0; x <= w; x += 4) c.lineTo(x, hh * 0.55 - Math.abs(Math.sin(x * 0.03 + 1)) * hh * 0.12); c.lineTo(w, hh); c.fill();
  const s = genSurface(id, boss, r); c.fillStyle = th.g[1]; c.beginPath(); c.moveTo(0, hh);
  for (let x = 0; x < W; x += 6) c.lineTo(x * sx, Math.min(s[x], H + 20) * sy); c.lineTo(w, hh); c.fill();
  c.strokeStyle = th.top; c.lineWidth = 3; c.beginPath(); let on = false; for (let x = 0; x < W; x += 6) { if (s[x] < H) { on ? c.lineTo(x * sx, s[x] * sy) : c.moveTo(x * sx, s[x] * sy); on = true; } else on = false; } c.stroke();
}
function paneFight(pane) {
  const c = ui.pvp, set = (v) => { Object.assign(c, v); saveUi(); renderLobby(); };
  const my = R.powerOf(myStats()), opp = R.powerOf(R.refStats(c.tier));
  pane.append(h('div', { class: 'pane-head' }, h('div', {}, h('h2', {}, 'Chiến đấu'), h('p', {}, 'Trận đấu mở toàn màn hình và chơi ở chế độ ngang. Kéo chuột hoặc vuốt để nhìn quanh bản đồ, lăn chuột hoặc chụm hai ngón để phóng to, bấm xuống mặt đất để nhân vật đi tới đó.'))));
  const maps = h('div', { class: 'maps' }, MAPS.map((m) => { const cv = h('canvas', { width: 300, height: 136 }); drawMapThumb(cv, m.id, false);
    return h('button', { type: 'button', class: 'mapc', 'aria-pressed': String(c.map === m.id), id: 'map-' + m.id, onclick: () => set({ map: m.id }) }, cv, h('span', {}, m.n)); }));
  pane.append(h('div', { class: 'modes' },
    h('section', { class: 'card', style: 'display:grid;gap:14px' },
      h('div', { class: 'vsbar' }, h('h3', { style: 'margin-right:auto' }, 'Đấu đội'),
        h('div', { class: 'side' }, h('span', { class: 'lbl' }, 'Đội Đỏ'), h('b', { style: 'color:var(--red)' }, fmt(my))), h('span', { class: 'muted' }, 'đấu'), h('div', { class: 'side' }, h('span', { class: 'lbl' }, 'Đội Xanh'), h('b', { style: 'color:var(--blue)' }, '≈ ' + fmt(opp)))),
      h('div', { class: 'opts' },
        h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Thể thức'), seg([[1, '1 đấu 1'], [2, '2 đấu 2']], c.size, (v) => set({ size: v }), 'pvpSize')),
        h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Đối thủ'), seg([['bot', 'Máy'], ['p2', 'Người chơi 2 cùng máy']], c.opp, (v) => set({ opp: v }), 'pvpOpp')),
        c.opp === 'bot' ? h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Độ chính xác của máy'), seg([['easy', 'Dễ'], ['normal', 'Thường'], ['hard', 'Khó']], c.diff, (v) => set({ diff: v }), 'pvpDiff')) : null),
      h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Trang bị của đội Xanh'), seg(TIERS.map((t, i) => [i, t.n]), c.tier, (v) => set({ tier: v }), 'pvpTier')),
      h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Bản đồ'), maps),
      h('div', { class: 'row' }, h('button', { class: 'primary', type: 'button', id: 'btnPvp', disabled: ui.busy, onclick: () => startFight({ mode: 'pvp', ...c }) }, 'Vào trận'),
        h('span', { class: 'note' }, c.opp === 'bot' ? (() => { const w = R.REWARD.pvpWin(c.tier), l = R.REWARD.pvpLose(c.tier); return `Thắng: +${fmt(w.gold)} vàng, +${w.stone} đá. Thua: +${fmt(l.gold)} vàng, +${l.stone} đá.`; })() : 'Chế độ 2 người cùng máy không có phần thưởng.'))),
    h('section', { class: 'card', style: 'display:grid;gap:14px' },
      h('div', { class: 'vsbar' }, h('h3', { style: 'margin-right:auto' }, 'Đánh boss'), h('div', { class: 'opt' }, h('span', { class: 'lbl' }, 'Số người trong đội'), seg([[2, '2'], [3, '3'], [4, '4']], ui.boss.size, (v) => { ui.boss.size = v; saveUi(); renderLobby(); }, 'bossSize'))),
      h('p', { class: 'note', style: 'margin:0' }, 'Đồng đội mặc trang bị giống bạn. Máu boss tăng theo số người. Hạ boss nhận vàng, Đá cường hóa, Tinh thạch của bậc kế tiếp và có thể rơi trang bị.'),
      h('div', { class: 'bossgrid' }, BOSSES.map((b, i) => { const bs = R.bossStats(b, ui.boss.size), t = TIERS[b.t]; const cv = h('canvas', { width: 440, height: 200 });
        drawMapThumb(cv, b.map, true); drawBossShape(cv.getContext('2d'), b, 330, 182, 0.95, false, 0);
        return h('div', { class: 'card bcard', style: `--tc:${t.c}` }, cv, h('div', {}, h('span', { class: 'lbl' }, t.n), h('h4', {}, b.n)),
          h('div', { class: 'meta' }, h('span', {}, 'Máu ', h('b', {}, fmt(bs.hp))), h('span', {}, 'Lực chiến đề nghị ', h('b', {}, fmt(bs.power))), h('span', {}, 'Rơi ', h('b', {}, `${MATS['t' + Math.min(5, b.t + 1)]}, ${fmt(R.REWARD.bossWin(b.t).gold)} vàng (thua: ${fmt(R.REWARD.bossLose(b.t).gold)})`)), h('span', {}, 'Đã hạ ', h('b', {}, P.rec.boss[b.t] || 0), ' lần')),
          my < bs.power * 0.8 ? h('div', { class: 'warnline' }, 'Lực chiến của bạn thấp hơn mức đề nghị.') : null,
          h('button', { class: 'btn', type: 'button', id: 'btnBoss' + i, disabled: ui.busy, onclick: () => startFight({ mode: 'boss', boss: i, size: ui.boss.size }) }, 'Khiêu chiến')); })))));
}
async function adminCall(path, body) {
  if (Net.online) { const j = await api(path, { username: ui.admin.target, ...body }); if (j.profile) P = j.profile; return j.notes || []; }
  if (path.endsWith('grant')) { const r = R.adminGrant(P, body); saveLocal(); return r.notes; }
  if (path.endsWith('reset')) { P = R.newProfile(P.name); saveLocal(); return ['Đã đặt lại hồ sơ']; }
  return [];
}
function paneAdmin(pane) {
  const A = ui.admin;
  if (Net.online && A.total == null && !A.loadingTotal) { A.loadingTotal = true; api('/api/admin/users?q=').then((j) => { A.total = j.total; if (!A.users.length) A.users = j.users; if (ui.tab === 'admin') renderLobby(); }).catch(() => {}); }
  const say = (notes) => { A.msg = notes.join(' · '); };
  pane.append(h('div', { class: 'pane-head' }, h('div', {}, h('h2', {}, 'Admin'), h('p', {}, Net.online ? 'Tạo vật phẩm, vàng và trang bị cho người chơi. Để trống tên người chơi nghĩa là chính bạn.' : 'Bản chơi thử: các thao tác áp dụng cho hồ sơ trên trình duyệt này.'))));
  const nu = h('input', { id: 'admNewUser', placeholder: 'vd: xathu_moi', autocomplete: 'off' }), np = h('input', { id: 'admNewPass', type: 'text', placeholder: 'ít nhất 6 ký tự', autocomplete: 'off' });
  const nrole = h('select', { id: 'admNewRole' }, h('option', { value: 'user' }, 'Người chơi'), h('option', { value: 'admin' }, 'Admin'));
  const create = Net.online ? h('div', { class: 'card' }, h('h3', {}, 'Tạo tài khoản'),
    A.total != null ? h('p', { class: 'note', style: 'margin:0', id: 'admTotal' }, `Tổng số tài khoản: ${fmt(A.total)}`) : null,
    h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admNewUser' }, 'Tên đăng nhập'), nu),
    h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admNewPass' }, 'Mật khẩu'), np),
    h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admNewRole' }, 'Quyền'), nrole),
    h('button', { class: 'btn', type: 'button', id: 'btnAdmCreate', onclick: () => run(async () => { const j = await api('/api/admin/create', { newUser: nu.value, newPass: np.value, role: nrole.value }); A.total = j.total; A.target = nu.value.trim().toLowerCase(); say(j.notes); }) }, 'Tạo tài khoản')) : null;
  const target = Net.online ? h('div', { class: 'card' }, h('h3', {}, 'Người chơi'),
    h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admTarget' }, 'Tên đăng nhập (để trống là bạn)'), h('input', { id: 'admTarget', value: A.target, placeholder: 'vd: xathu_h2t', oninput: (e) => { A.target = e.target.value.trim().toLowerCase(); } })),
    h('button', { class: 'btn', type: 'button', id: 'btnAdmSearch', onclick: () => run(async () => { const j = await api('/api/admin/users?q=' + encodeURIComponent(A.target)); A.users = j.users; A.total = j.total; }) }, 'Tìm người chơi'),
    A.users.length ? h('div', { class: 'ulist' }, A.users.map((u) => h('button', { type: 'button', onclick: () => { A.target = u.username; renderLobby(); } }, h('span', {}, u.username + (u.role === 'admin' ? ' · admin' : '')), h('span', { class: 'muted' }, fmt(+u.gold || 0) + ' vàng')))) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', id: 'btnAdmRole', onclick: () => run(async () => { say(await adminCall('/api/admin/role', { role: 'admin' })); }) }, 'Cấp quyền admin'),
      h('button', { class: 'btn sm', type: 'button', id: 'btnAdmUnrole', onclick: () => run(async () => { say(await adminCall('/api/admin/role', { role: 'user' })); }) }, 'Bỏ quyền admin'))) : null;
  const gold = h('input', { id: 'admGold', type: 'number', value: 10000, min: -1000000000, max: 1000000000 });
  const matSel = h('select', { id: 'admMat' }, Object.entries(MATS).map(([k, n]) => h('option', { value: k }, n)));
  const qty = h('input', { id: 'admQty', type: 'number', min: 1, max: 99999, value: 10 });
  const slotSel = h('select', { id: 'admSlot' }, SLOT_ORDER.map((s) => h('option', { value: s }, SLOTS[s].n)));
  const tierSel = h('select', { id: 'admTier' }, TIERS.map((t, i) => h('option', { value: i }, t.n)));
  const lvlSel = h('select', { id: 'admLvl' }, [0, 1, 2, 3].map((l) => h('option', { value: l }, 'Lv ' + l)));
  const kindSel = h('select', { id: 'admKind' }, Object.entries(SUP).map(([k, v]) => h('option', { value: k }, v.n)));
  const kindField = h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admKind' }, 'Loại vật phẩm hỗ trợ'), kindSel);
  const typeSel = h('select', { id: 'admType' });
  const typeField = h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admType' }, 'Kiểu'), typeSel);
  const sync = () => { const s = slotSel.value; kindField.hidden = s !== 'support'; lvlSel.disabled = !SLOTS[s].up; if (!SLOTS[s].up) lvlSel.value = '0';
    typeField.hidden = !R.TYPES[s]; typeSel.innerHTML = ''; if (R.TYPES[s]) for (const [k, v] of Object.entries(R.TYPES[s])) typeSel.append(h('option', { value: k }, v.n)); };
  slotSel.addEventListener('change', sync);
  pane.append(h('div', { class: 'admin' }, target, create,
    h('div', { class: 'card' }, h('h3', {}, 'Vàng'), h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admGold' }, 'Số vàng (số âm để trừ)'), gold),
      h('button', { class: 'btn', type: 'button', id: 'btnAdmGold', onclick: () => run(async () => say(await adminCall('/api/admin/grant', { gold: +gold.value }))) }, 'Cộng vàng')),
    h('div', { class: 'card' }, h('h3', {}, 'Nguyên liệu'), h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admMat' }, 'Loại'), matSel), h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admQty' }, 'Số lượng'), qty),
      h('button', { class: 'btn', type: 'button', id: 'btnAdmMat', onclick: () => run(async () => say(await adminCall('/api/admin/grant', { mat: matSel.value, qty: +qty.value }))) }, 'Tạo vào túi')),
    h('div', { class: 'card' }, h('h3', {}, 'Trang bị'), h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admSlot' }, 'Ô'), slotSel), h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admTier' }, 'Bậc'), tierSel),
      h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'admLvl' }, 'Level'), lvlSel), kindField, typeField,
      h('button', { class: 'btn', type: 'button', id: 'btnAdmItem', onclick: () => run(async () => say(await adminCall('/api/admin/grant', { item: { slot: slotSel.value, tier: +tierSel.value, lvl: +lvlSel.value, kind: kindSel.value, type: typeSel.value } }))) }, 'Tạo vào túi')),
    h('div', { class: 'card' }, h('h3', {}, 'Đặt lại hồ sơ'), h('p', { class: 'note', style: 'margin:0' }, 'Xóa toàn bộ trang bị, vàng và nguyên liệu, quay về trạng thái mới tạo.'),
      h('button', { class: 'btn danger', type: 'button', id: 'btnAdmReset', onclick: () => { if (ui.confirm === 'reset') run(async () => { ui.confirm = null; say(await adminCall('/api/admin/reset', {})); ui.sel = null; ui.forgeSel = null; }); else { ui.confirm = 'reset'; renderLobby(); setTimeout(() => { if (ui.confirm === 'reset') { ui.confirm = null; renderLobby(); } }, 3000); } } },
        ui.confirm === 'reset' ? 'Bấm lần nữa để xóa' : 'Đặt lại'))));
  if (A.msg) pane.append(h('p', { class: 'fres ok', id: 'admMsg', style: 'font-size:1rem;margin-top:12px' }, A.msg));
  sync();
}
$('#btnLogout').addEventListener('click', logout);
$('#btnSoundL').addEventListener('click', () => { ensureAudio(); soundOn = !soundOn; updSound(); });

/* =================== MAPS =================== */
const POWER_SPEED = 30; // tốc độ thanh lực (đơn vị %/giây); bản đầu 60, bản trước 42
const W = 2400, H = 1100, G = 420, WIND_A = 10, HR = 22, DT = 1 / 240, SPEED = 1.7, TURN_TIME = 25, VEL = 10;
const THEMES = {
  forest: { sky: ['#24467a', '#6f9fd0', '#f3d9a8'], sun: { x: 0.75, y: 0.22, c: '#fff3c4' }, far: '#4a6a92', near: '#3d6b56', g: ['#6a4a2e', '#4a321f', '#24170e'], top: '#5fa83e', hi: '#a9e06a', abyss: 'water', deco: 'tree', fx: 'leaf',
    gen: (x, r) => H * 0.72 + Math.sin(x * 0.003 + r[0]) * 50 + Math.sin(x * 0.009 + r[1]) * 24 + Math.sin(x * 0.023 + r[2]) * 8 },
  desert: { sky: ['#b8582a', '#f0a24e', '#ffe3a0'], sun: { x: 0.3, y: 0.28, c: '#fff0c0' }, far: '#b26a3a', near: '#cf8a48', g: ['#d8a35a', '#b07a3c', '#6a4320'], top: '#f0c070', hi: '#ffe2a0', abyss: 'pit', deco: 'cactus', fx: 'sand',
    gen: (x, r) => H * 0.74 + Math.sin(x * 0.0022 + r[0]) * 70 + Math.sin(x * 0.006 + r[1]) * 22 },
  snow: { sky: ['#1d3a66', '#5a86c0', '#d8ecff'], sun: { x: 0.2, y: 0.18, c: '#ffffff' }, far: '#8aa6c8', near: '#6f8db3', g: ['#7a8aa6', '#566682', '#2d3650'], top: '#f4f8ff', hi: '#ffffff', abyss: 'pit', deco: 'pine', fx: 'snow',
    gen: (x, r) => H * 0.77 + Math.sin(x * 0.004 + r[0]) * 30 - 320 * Math.exp(-(((x - W / 2) / 260) ** 2)) + Math.sin(x * 0.02 + r[1]) * 8 },
  volcano: { sky: ['#1a0a10', '#5a1a1a', '#d0502a'], sun: null, far: '#3a1a20', near: '#2a1418', g: ['#3e2e2c', '#2a1a1a', '#140a0a'], top: '#5a4a48', hi: '#9a7a6a', abyss: 'lava', deco: 'rock', fx: 'ash',
    gen: (x, r) => { const d = x - W / 2; return H * 0.79 - 300 * Math.exp(-((d / 240) ** 2)) + 90 * Math.exp(-((d / 60) ** 2)) + Math.sin(x * 0.01 + r[0]) * 12; } },
  ruins: { sky: ['#2a2440', '#7a6a90', '#e8c8a0'], sun: { x: 0.6, y: 0.32, c: '#ffe0b0' }, far: '#6a5a78', near: '#5a4a5a', g: ['#8a7a68', '#6a5a48', '#3a3028'], top: '#9a8a6a', hi: '#d8c8a0', abyss: 'pit', deco: 'pillar', fx: null,
    gen: (x, r) => { const base = H * 0.72 + Math.sin(x * 0.0035 + r[0]) * 90; return Math.round(base / 55) * 55 + Math.sin(x * 0.05) * 2; } },
  sky: { sky: ['#3a7ad0', '#8ac0f0', '#e8f6ff'], sun: { x: 0.82, y: 0.16, c: '#ffffff' }, far: '#a8d0f0', near: '#c8e4f8', g: ['#7a6a50', '#5a4a38', '#3a2e22'], top: '#6ac04a', hi: '#b8f080', abyss: 'cloud', deco: 'tree', fx: null, gaps: [[640, 720], [1170, 1250], [1690, 1770]],
    gen: (x, r) => H * 0.66 + Math.sin(x * 0.004 + r[0]) * 40 + Math.sin(x * 0.012 + r[1]) * 14 },
  night: { sky: ['#060a20', '#1a2a5a', '#3a4a7a'], sun: { x: 0.7, y: 0.18, c: '#f4f0d8', moon: true }, far: '#1a2448', near: '#142038', g: ['#d8c08a', '#9a7a50', '#4a3a26'], top: '#e8d8a0', hi: '#fff0c0', abyss: 'water', deco: 'palm', fx: 'firefly', gaps: [[1120, 1280]],
    gen: (x, r) => { const d = Math.abs(x - W / 2); return H * 0.7 + (d < 500 ? (500 - d) * 0.35 : 0) + Math.sin(x * 0.005 + r[0]) * 30; } },
  canyon: { sky: ['#4a2a3a', '#c06a4a', '#f8c890'], sun: { x: 0.5, y: 0.38, c: '#ffd8a0' }, far: '#8a4a3a', near: '#a85a3a', g: ['#b8603a', '#8a4028', '#4a2014'], top: '#d88a50', hi: '#f0b070', abyss: 'pit', deco: 'rock', fx: 'sand', gaps: [[1130, 1270]],
    gen: (x, r) => { const d = Math.abs(x - W / 2); return H * 0.66 - 120 * Math.exp(-(((d - 200) / 150) ** 2)) + Math.sin(x * 0.006 + r[0]) * 30; } },
};
function genSurface(id, boss, r) {
  const th = THEMES[id], s = new Float32Array(W);
  r = r || [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
  for (let x = 0; x < W; x++) s[x] = Math.max(170, Math.min(H - 50, th.gen(x, r)));
  if (boss) { const lvl = H * 0.66; for (let x = 1760; x < W; x++) { const t = Math.min(1, (x - 1760) / 140); s[x] = s[x] * (1 - t) + lvl * t; } }
  for (const [a, b] of th.gaps || []) { if (boss && a > 1500) continue; for (let x = a; x <= b; x++) s[x] = H + 80; }
  return s;
}

/* =================== BATTLE STATE =================== */
let S = null, surf = null;
const cv = $('#cv'), ctx = cv.getContext('2d');
const terCv = document.createElement('canvas'); terCv.width = W; terCv.height = H; const terCtx = terCv.getContext('2d');
const bgCv = document.createElement('canvas'); bgCv.width = W; bgCv.height = H; const bgCtx = bgCv.getContext('2d');
const miniTer = document.createElement('canvas'); miniTer.width = 440; miniTer.height = 200;
let cssW = 800, cssH = 400, dpr = 1;
const cam = { x: 0, y: 0, z: 1, follow: true };
function resizeCanvas() {
  cssW = cv.clientWidth || innerWidth; cssH = cv.clientHeight || innerHeight; dpr = Math.min(1.75, devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); if (S) clampCam();
}
addEventListener('resize', () => { resizeCanvas(); checkRotate(); });
function zLimits() { const a = Math.max(cssW / W, cssH / (H + 250)); return [a, Math.max(a * 1.05, cssH / 380)]; }
function zDefault() { const [a, b] = zLimits(); return Math.min(b, Math.max(a, cssH / 760)); }
function clampCam() { const [a, b] = zLimits(); cam.z = Math.min(b, Math.max(a, cam.z)); const vw = cssW / cam.z, vh = cssH / cam.z; cam.x = Math.min(W - vw, Math.max(0, cam.x)); cam.y = Math.min(H - vh, Math.max(-250, cam.y)); }
function zoomAt(px, py, nz) { const wx = cam.x + px / cam.z, wy = cam.y + py / cam.z; cam.z = nz; clampCam(); cam.x = wx - px / cam.z; cam.y = wy - py / cam.z; clampCam(); }

const dirtPat = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); for (let i = 0; i < 120; i++) { g.fillStyle = Math.random() < 0.55 ? `rgba(0,0,0,${Math.random() * 0.12})` : `rgba(255,230,190,${Math.random() * 0.07})`; g.beginPath(); g.arc(Math.random() * 64, Math.random() * 64, Math.random() * 2.4 + 0.4, 0, 7); g.fill(); } return terCtx.createPattern(c, 'repeat'); })();
function renderBg() {
  const th = S.th, c = bgCtx; c.clearRect(0, 0, W, H);
  const layer = (base, amp, col, f, ph, jag) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, base - Math.abs(Math.sin(x * f + ph)) * amp - Math.sin(x * f * 2.7 + ph) * amp * 0.25 - (jag ? Math.abs(Math.sin(x * 0.05)) * 14 : 0)); c.lineTo(W, H); c.fill(); };
  layer(560, 200, th.far, 0.0022, Math.random() * 6, S.mapId === 'snow' || S.mapId === 'canyon');
  if (S.mapId === 'snow') { c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 0; x < W; x += 8) { const y = 560 - Math.abs(Math.sin(x * 0.0022 + 1)) * 200; if (y < 420) c.fillRect(x, y, 8, 10); } }
  if (S.mapId === 'ruins') { c.fillStyle = th.far; for (let i = 0; i < 9; i++) { const x = 120 + i * 260 + Math.random() * 60, hh = 120 + Math.random() * 180; c.fillRect(x, 560 - hh, 40 + Math.random() * 30, hh); c.fillRect(x - 8, 560 - hh, 56 + Math.random() * 30, 14); } }
  if (S.mapId === 'volcano') { const g = c.createRadialGradient(W / 2, 430, 20, W / 2, 430, 360); g.addColorStop(0, 'rgba(255,120,40,.35)'); g.addColorStop(0.5, 'rgba(255,80,30,.12)'); g.addColorStop(1, 'rgba(255,60,30,0)'); c.fillStyle = g; c.fillRect(W / 2 - 380, 60, 760, 760); }
  layer(660, 120, th.near, 0.0036, Math.random() * 6, false);
  c.globalAlpha = 0.18; c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
}
function paintDeco(c, d, th) {
  c.save(); c.translate(d.x, d.y); c.scale(d.s, d.s); c.strokeStyle = 'rgba(20,10,10,.6)'; c.lineWidth = 2; c.lineJoin = 'round';
  if (d.type === 'tree') { c.fillStyle = '#5a3a22'; c.fillRect(-5, -40, 10, 42); const cols = ['#2f6b34', '#3d8a3e', '#5fae4a']; cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(0, -48 - i * 10, 28 - i * 7, 0, 7); c.fill(); }); }
  else if (d.type === 'pine') { c.fillStyle = '#4a3020'; c.fillRect(-4, -20, 8, 22); for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#2f5a48' : '#3a6a54'; c.beginPath(); c.moveTo(-26 + i * 5, -16 - i * 22); c.lineTo(26 - i * 5, -16 - i * 22); c.lineTo(0, -52 - i * 22); c.closePath(); c.fill(); c.fillStyle = '#f4f8ff'; c.beginPath(); c.moveTo(-8 + i * 2, -44 - i * 22); c.lineTo(8 - i * 2, -44 - i * 22); c.lineTo(0, -52 - i * 22); c.fill(); } }
  else if (d.type === 'cactus') { c.fillStyle = '#4f8a3a'; rr(c, -7, -60, 14, 62, 7); c.fill(); c.stroke(); rr(c, -24, -42, 10, 22, 5); c.fill(); c.stroke(); rr(c, 14, -50, 10, 24, 5); c.fill(); c.stroke(); c.fillRect(-16, -26, 12, 7); c.fillRect(6, -32, 12, 7); }
  else if (d.type === 'rock') { c.fillStyle = shade(th.g[0], -0.1); c.beginPath(); c.moveTo(-26, 2); c.lineTo(-18, -18); c.lineTo(-2, -28); c.lineTo(16, -20); c.lineTo(26, 2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(-18, -18); c.lineTo(-2, -28); c.lineTo(-4, -10); c.closePath(); c.fill(); }
  else if (d.type === 'pillar') { c.fillStyle = '#c8b898'; c.fillRect(-11, -70, 22, 72); c.strokeRect(-11, -70, 22, 72); c.fillStyle = '#a89878'; c.fillRect(-15, -76, 30, 8); c.fillRect(-15, -4, 30, 6); c.strokeStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.moveTo(-4, -66); c.lineTo(-4, -6); c.moveTo(4, -66); c.lineTo(4, -6); c.stroke(); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(11, -70); c.lineTo(4, -52); c.lineTo(11, -44); c.fill(); }
  else if (d.type === 'palm') { c.strokeStyle = '#7a5a32'; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -40, 4, -80); c.stroke(); c.fillStyle = '#2f6a48'; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; c.beginPath(); c.moveTo(4, -80); c.quadraticCurveTo(4 + Math.cos(a) * 30, -80 + Math.sin(a) * 30 - 10, 4 + Math.cos(a) * 52, -80 + Math.sin(a) * 52 + 14); c.quadraticCurveTo(4 + Math.cos(a) * 26, -80 + Math.sin(a) * 20, 4, -80); c.fill(); } }
  c.restore();
}
function renderTerrain() {
  const th = S.th, c = terCtx; c.clearRect(0, 0, W, H);
  c.beginPath(); c.moveTo(0, H + 20); for (let x = 0; x < W; x++) c.lineTo(x, Math.min(surf[x], H + 20)); c.lineTo(W, H + 20); c.closePath();
  const g = c.createLinearGradient(0, 300, 0, H); g.addColorStop(0, th.g[0]); g.addColorStop(0.5, th.g[1]); g.addColorStop(1, th.g[2]); c.fillStyle = g; c.fill();
  c.save(); c.clip(); c.fillStyle = dirtPat; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 3;
  for (let k = 0; k < 9; k++) { c.beginPath(); for (let x = 0; x <= W; x += 10) { const y = 520 + k * 62 + Math.sin(x * 0.008 + k * 1.7) * 14; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.restore();
  c.lineJoin = 'round'; c.lineCap = 'round';
  const edge = (lw, col, off) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); let on = false; for (let x = 0; x < W; x++) { const y = surf[x]; if (y < H - 2) { if (!on) { c.moveTo(x, y + off); on = true; } else c.lineTo(x, y + off); } else on = false; } c.stroke(); };
  edge(16, 'rgba(0,0,0,.28)', 10); edge(10, th.top, 3); edge(3, th.hi, -1);
  S.decos = S.decos.filter((d) => { const xi = Math.round(d.x); return xi >= 0 && xi < W && surf[xi] < H && surf[xi] <= d.y + 4; });
  for (const d of S.decos) paintDeco(c, d, th);
  const m = miniTer.getContext('2d'); m.clearRect(0, 0, 440, 200); m.drawImage(terCv, 0, 0, W, H, 0, 0, 440, 200);
}
function groundAt(x) { const xi = Math.round(x); if (xi < 0 || xi >= W) return Infinity; return surf[xi] < H ? surf[xi] : Infinity; }
function findGround(x) { for (let d = 0; d < 400; d += 4) for (const sg of [1, -1]) { const v = groundAt(x + sg * d); if (v < Infinity) return x + sg * d; } return x; }

function mkHero(items, name, team, human, diff, look) {
  const st = R.totalStats(items), d = R.derived(st), sup = items.find((i) => i.slot === 'support');
  return { name, team, human, bot: !human, diff: diff || 'normal', frozen: 0, L: R.looksOf(items, look || R.randomLook()), st, power: R.powerOf(st), atk: st.atk, def: st.def, maxHp: st.hp, hp: st.hp, crit: d.crit, dodge: d.dodge, move: d.move,
    sup: sup ? { kind: sup.kind, power: R.supPower(sup), name: R.itemName(sup) } : null, shield: 0, energy: 0, cd: 0, supCd: 0, x: 0, y: 0, vy: 0, facing: team ? -1 : 1, angle: 45, dead: false, lastPower: null, walk: 0, hurt: 0,
    stats: { dmg: 0, shots: 0, hits: 0, kills: 0 } };
}
let lastCfg = null;
async function startFight(cfg) {
  if (ui.busy) return; ui.busy = true; ensureAudio();
  try { const r = await act('battleStart', cfg); lastCfg = cfg;
    const looks = [R.looksOf(myItems(), P.look), ...((r.battle.enemies || []).map((set) => R.looksOf(set)))];
    await whenLoaded([...new Set(looks.flatMap(lookPaths))], 3500); enterBattle(r.battle); }
  catch (e) { toast(e.message, true); }
  ui.busy = false;
}
function enterBattle(bt) {
  $('#lobby').hidden = true; $('#result').hidden = true; $('#battle').hidden = false;
  goFull(); resizeCanvas(); checkRotate();
  const mine = myItems(), heroes = [], mapId = bt.map;
  if (bt.mode === 'pvp') {
    const p2 = bt.opp === 'p2';
    heroes.push(mkHero(mine, Net.user ? Net.user.username : 'Bạn', 0, true, null, P.look));
    if (bt.size === 2) heroes.push(mkHero(mine, p2 ? 'Bạn (B)' : 'Đồng đội', 0, p2, 'normal'));
    bt.enemies.forEach((set, i) => heroes.push(mkHero(set, p2 ? (i ? 'Người chơi 2 (B)' : 'Người chơi 2') : `Đối thủ ${i + 1}`, 1, p2, bt.diff)));
  } else {
    heroes.push(mkHero(mine, Net.user ? Net.user.username : 'Bạn', 0, true, null, P.look));
    for (let i = 1; i < bt.size; i++) heroes.push(mkHero(mine, `Đồng đội ${i}`, 0, false, 'normal'));
  }
  surf = genSurface(mapId, bt.mode === 'boss');
  let boss = null;
  if (bt.mode === 'boss') { const b = BOSSES[bt.boss], bs = bt.bossStats; boss = { isBoss: true, team: 1, name: b.n, b, x: W - 300, y: surf[W - 300], r: 90, hp: bs.hp, maxHp: bs.hp, atk: bs.atk, def: bs.def, crit: 0.08, dodge: 0, dead: false, step: 0, enraged: false, hurt: 0, stats: { dmg: 0, shots: 0, hits: 0, kills: 0 } }; }
  S = { bt, mode: bt.mode, mapId, th: THEMES[mapId], heroes, boss, order: [], slot: -1, turn: 0, round: 0, wind: 0, state: 'pause', pauseT: 1.2, projs: [], parts: [], floats: [], decos: [], fx: [],
    clouds: Array.from({ length: 10 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 360, s: 0.7 + Math.random() * 1.3, a: 0.12 + Math.random() * 0.16 })),
    shake: 0, time: 0, acc: 0, bot: {}, stamina: 0, timer: TURN_TIME, weapon: 0, power: 0, pdir: 1, charging: false, cur: null, buff: null, sp: new Set(), nl: 0, spDmg: 0, sd: 1, lastShotBy: null, focus: null, walkTo: null, over: false };
  const place = (hh, x) => { x = findGround(x); hh.x = x; hh.y = groundAt(x); };
  if (bt.mode === 'pvp') { const xs = bt.size === 2 ? [[260, 480], [W - 260, W - 480]] : [[380], [W - 380]]; const n = [0, 0]; for (const hh of heroes) place(hh, xs[hh.team][n[hh.team]++]); }
  else heroes.forEach((hh, i) => place(hh, [200, 360, 520, 680][i]));
  for (let x = 80; x < W - 80; x += 120 + Math.random() * 160) { const xi = Math.round(x); if (surf[xi] >= H) continue; if (heroes.some((hh) => Math.abs(hh.x - x) < 60)) continue; if (boss && x > W - 520) continue; S.decos.push({ x, y: surf[xi], type: S.th.deco === 'tree' && Math.random() < 0.25 ? 'rock' : S.th.deco, s: 0.8 + Math.random() * 0.6 }); }
  const byAgi = (t) => heroes.filter((x) => x.team === t).sort((a, b) => b.st.agi - a.st.agi);
  if (bt.mode === 'pvp') { const a = byAgi(0), b = byAgi(1); for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) S.order.push(a[i]); if (b[i]) S.order.push(b[i]); } }
  else S.order = [...byAgi(0), boss];
  S.fx = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), v: 0.3 + Math.random() * 0.7, p: Math.random() * 6 }));
  renderBg(); renderTerrain();
  cam.z = zDefault(); cam.follow = true; cam.x = heroes[0].x - cssW / cam.z / 2; cam.y = heroes[0].y - cssH / cam.z * 0.6; clampCam();
  Music.play(mapId, bt.mode === 'boss');
  buildTeamsHud(); $('#feed').innerHTML = ''; $('#leaveBox').hidden = true;
  banner(bt.mode === 'boss' ? boss.name : MAPS.find((m) => m.id === mapId).n, bt.mode === 'boss' ? 'Cả đội hợp sức hạ boss' : 'Hạ gục toàn bộ đội đối phương', bt.mode === 'boss' ? '#ff6b7d' : '#e9b94f');
  sfx('turn');
}

/* ---------- turn flow ---------- */
function nextTurn() {
  for (let tries = 0; tries < 12; tries++) {
    S.slot = (S.slot + 1) % S.order.length;
    if (S.slot === 0) { S.round++; if (S.round >= 10 && S.sd === 1) { S.sd = 1.5; feed('Hiệp 10: sát khí bùng lên, mọi sát thương ×1.5', '#ff9a5a'); } }
    const e = S.order[S.slot]; if (e.dead) continue;
    if (e.frozen > 0) { e.frozen--; feed(`${e.name} bị đóng băng, mất lượt`, '#9fdcff'); floatText(e.x, e.y - 110, 'Đóng băng', '#bfe9ff'); continue; }
    if (e.isBoss) beginBossTurn(); else beginTurn(e); return;
  }
}
function beginTurn(hh) {
  S.turn++; S.cur = hh; S.wind = Math.round((Math.random() * 2 - 1) * 10);
  hh.cd = Math.max(0, hh.cd - 1); hh.supCd = Math.max(0, hh.supCd - 1); hh.energy = Math.min(100, hh.energy + 20);
  S.stamina = hh.move; S.timer = TURN_TIME; S.weapon = 0; S.power = 0; S.pdir = 1; S.charging = false; S.buff = null; S.walkTo = null; S.sp = new Set(); S.nl = NL_MAX; S.spDmg = 0;
  S.state = 'aim'; S.bot = { phase: 'wait', at: S.time + 0.9 }; cam.follow = true;
  banner(`Lượt của ${hh.name}`, hh.bot ? 'Máy đang điều khiển' : TEAMN[hh.team], TEAMC[hh.team]);
  drawPortrait($('#whoPic'), hh.L); sfx('turn');
}
function beginBossTurn() {
  const b = S.boss; S.turn++; S.cur = b; S.wind = Math.round((Math.random() * 2 - 1) * 10); cam.follow = true;
  if (!b.enraged && b.hp < b.maxHp * 0.4) { b.enraged = true; feed(`${b.name} nổi giận! Sát thương tăng mạnh`, '#ff6b7d'); }
  const seq = ['cannon', 'rain', 'cannon', 'quake']; b.move = seq[b.step++ % seq.length];
  banner(b.name, { cannon: 'Đại pháo', rain: 'Mưa thiên thạch', quake: 'Địa chấn' }[b.move], '#ff6b7d'); S.state = 'bossPrep'; S.prepT = 1.2;
}
function bossAct() {
  const b = S.boss, enr = b.enraged ? 1.3 : 1, alive = S.heroes.filter((x) => !x.dead); if (!alive.length) { endAim(); return; }
  if (b.move === 'quake') {
    for (const hh of alive) { const v = applyHit(b, hh, 0.45 * enr); burst(hh.x, hh.y, 'dust', 18); if (!hh.dead) hh.vy = -180; floatText(hh.x, hh.y - 110, v.txt, v.col); }
    S.shake = 26; sfx('boom', 120); endAim(); return;
  }
  S.projs = [];
  if (b.move === 'cannon') { const tgt = alive.slice().sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * alive.length)];
    const w = { mul: 1.25 * enr, r: 78, crater: 1.2 }; const s = searchShot(b, w, -1, { type: 'hero', ref: tgt }); S.projs.push(launch(b, s.angle + rnd(-1.5, 1.5), s.power + rnd(-2, 2), w, -1, 0)); }
  else { const w = { mul: 0.6 * enr, r: 44 }, n = alive.length + 1;
    for (let i = 0; i < n; i++) { const tgt = alive[i % alive.length]; const s = searchShot(b, w, -1, { type: 'hero', ref: tgt }, true); S.projs.push(launch(b, s.angle + rnd(-3, 3), s.power + rnd(-4, 4), w, -1, i * 0.25)); } }
  b.stats.shots++; S.state = 'flying'; S.acc = 0; S.lastShotBy = b; sfx('ult');
}
function endAim() { S.state = 'settle'; S.settleT = 0; S.charging = false; S.walkTo = null; }
function finishTurn() {
  const t0 = S.heroes.some((x) => x.team === 0 && !x.dead);
  if (S.mode === 'pvp') { const t1 = S.heroes.some((x) => x.team === 1 && !x.dead); if (!t0 || !t1) { gameOver(t0); return; } }
  else { if (S.boss.dead) { gameOver(true); return; } if (!t0) { gameOver(false); return; } }
  S.state = 'pause'; S.pauseT = 0.6;
}

/* ---------- actions ---------- */
function move(hh, dir, dt) {
  hh.facing = dir; if (S.stamina <= 0) return false;
  const step = Math.min(S.stamina, 85 * dt), nx = hh.x + dir * step; if (nx < 16 || nx > W - 16) return false;
  if (S.boss && nx > S.boss.x - 130) return false;
  const ny = surf[Math.round(nx)]; if (ny >= H) return false; if (ny < hh.y - step * 1.7 - 1) return false;
  hh.x = nx; hh.y = ny; S.stamina -= step; hh.walk += dt * 13; return true;
}
function useSupport(hh, fromBot) {
  if (!S || S.state !== 'aim' || S.cur !== hh || S.charging || !hh.sup || hh.supCd > 0) return; if (hh.bot && !fromBot) return;
  const s = hh.sup, top = hh.y - 110; hh.supCd = R.SUP_CD[s.kind] || 3;
  if (s.kind === 'heal') { for (const a of S.heroes) if (a.team === hh.team && !a.dead) { const v = heal(a, a === hh ? s.power : s.power / 2); floatText(a.x, a.y - 110, `+${fmt(v)}`, '#7fdc8c'); burst(a.x, a.y - HIT_Y, 'heal', 16); } }
  else if (s.kind === 'shield') { hh.shield += s.power; floatText(hh.x, top, `+${fmt(s.power)} giáp`, '#dbe9ff'); burst(hh.x, hh.y - HIT_Y, 'shield', 20); }
  else if (s.kind === 'fire') { S.buff = { kind: 'fire', dmg: s.power, rMul: 1.3, col: '#ff7a32' }; floatText(hh.x, top, `Rune lửa +${s.power}%`, '#ffb070'); burst(hh.x, hh.y - HIT_Y, 'fire', 22); }
  else if (s.kind === 'frost') { S.buff = { kind: 'frost', dmg: s.power, frost: true, col: '#9fe4ff' }; floatText(hh.x, top, 'Đạn băng giá', '#bfe9ff'); burst(hh.x, hh.y - HIT_Y, 'frost', 22); }
  else if (s.kind === 'elixir') { hh.energy = Math.min(100, hh.energy + s.power); S.buff = { kind: 'elixir', dmg: 10 }; floatText(hh.x, top, `+${s.power}% nộ`, '#ffd36b'); burst(hh.x, hh.y - HIT_Y, 'elixir', 22); }
  else { S.buff = { kind: 'wind', dmg: s.power, traj: true, noWind: true, col: '#c8ffe8' }; S.stamina = hh.move; floatText(hh.x, top, `Cưỡi gió +${s.power}%`, '#c8ffe8'); burst(hh.x, hh.y - HIT_Y, 'wind', 22); }
  feed(`${hh.name} dùng ${s.name}`, TEAMC[hh.team]); sfx('heal'); showUse(s.kind, s.name);
}
let useT = null;
function showUse(kind, name) {
  const box = $('#usePop'), sup = SUP[kind]; if (!box || !sup) return; box.innerHTML = '';
  box.append(sprCanvas(`use/${sup.img}.webp`, 240), h('b', {}, name)); box.classList.add('show');
  clearTimeout(useT); useT = setTimeout(() => box.classList.remove('show'), 1600);
}
// Đạn trong lượt sau khi cộng hiệu ứng vật phẩm (Rune lửa nổ rộng, Lông vũ gió bỏ qua gió)
function shotW(w) { const b = S && S.buff; if (!b) return w; return { ...w, r: w.r * (b.rMul || 1), windScale: b.noWind ? 0 : w.windScale }; }
/* ---------- kỹ năng đặc biệt (tốn năng lượng NL mỗi lượt) ---------- */
// +1/+2 viên: thêm đạn nhưng mỗi viên yếu đi (chia sát thương); x2: bắn 2 loạt, mỗi loạt ×0.7. Bay: không gây sát thương, nhân vật bay theo đạn.
const NL_MAX = 100, SPLIT = [1, 0.6, 0.45], X2_MUL = 0.7;
const SPECIALS = [
  { id: 'p10', n: '+10%', cost: 10, dmg: 10, key: '5', d: 'Tăng 10% sát thương' },
  { id: 'p20', n: '+20%', cost: 20, dmg: 20, key: '6', d: 'Tăng 20% sát thương' },
  { id: 'p50', n: '+50%', cost: 40, dmg: 50, key: '7', d: 'Tăng 50% sát thương' },
  { id: 'x2', n: 'x2', cost: 60, key: '8', d: 'Bắn 2 loạt, mỗi loạt 70% sát thương' },
  { id: 'fly', n: 'Bay', cost: 50, key: '9', d: 'Bay theo viên đạn tới chỗ rơi, không gây sát thương' },
  { id: 'b1', n: '+1', cost: 30, key: '0', d: 'Thêm 1 viên, mỗi viên 60% sát thương' },
  { id: 'b2', n: '+2', cost: 50, key: '-', d: 'Thêm 2 viên, mỗi viên 45% sát thương' },
];
const SPX = Object.fromEntries(SPECIALS.map((x) => [x.id, x]));
function toggleSpecial(id, fromBot) {
  if (!S || S.state !== 'aim' || S.charging) return; const hh = S.cur; if (!hh || hh.isBoss || (hh.bot && !fromBot)) return;
  const sp = SPX[id], set = S.sp; if (!sp) return;
  const drop = (k) => { if (set.has(k)) { set.delete(k); S.nl += SPX[k].cost; } };
  if (set.has(id)) { drop(id); return; }
  if (id === 'fly') [...set].forEach(drop); else drop('fly');
  if (id === 'b1') drop('b2'); if (id === 'b2') drop('b1');
  if (sp.cost > S.nl) { if (!fromBot) feed(`Không đủ năng lượng (cần ${sp.cost}, còn ${S.nl})`); return; }
  set.add(id); S.nl -= sp.cost;
}
function botSpecials() {
  const pool = ['p50', 'b1', 'x2', 'p20', 'p10', 'b2'];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const id of pool) if (SPX[id].cost <= S.nl && Math.random() < 0.5) toggleSpecial(id, true);
}
// Bay: đặt nhân vật ở chỗ viên đạn rơi; trạng thái 'settle' sẽ cho rơi xuống đất (hoặc xuống vực nếu không có đất)
function flyLand(p, r) {
  const hh = p.owner; let x = Math.max(16, Math.min(W - 16, r.x));
  if (S.boss && !S.boss.dead && x > S.boss.x - 130) x = S.boss.x - 130;
  hh.x = x; hh.y = Math.min(r.y, H + 70); hh.vy = 0; hh.facing = p.vx >= 0 ? 1 : -1;
  burst(hh.x, Math.min(H - 20, hh.y) - HIT_Y, 'wind', 26); S.focus = { x: hh.x, y: Math.min(H - 100, hh.y) }; sfx('heal');
}
function selectWeapon(i, fromBot) {
  if (!S || S.state !== 'aim' || S.charging) return; const hh = S.cur; if (hh.isBoss || (hh.bot && !fromBot)) return;
  if (i === 3) { useSupport(hh, fromBot); return; }
  if (i === 1 && hh.cd > 0) { if (!fromBot) feed(`Tam liên còn hồi ${hh.cd} lượt`); return; }
  if (i === 2 && hh.energy < 100) { if (!fromBot) feed('Tuyệt kỹ cần 100% nộ'); return; }
  S.weapon = S.weapon === i ? 0 : i;
}
function launch(e, angle, power, w, facing, delay) {
  const rad = (angle * Math.PI) / 180, ca = Math.cos(rad), sa = Math.sin(rad); let ox, oy;
  if (e.isBoss) { ox = e.x + facing * ca * 100; oy = e.y - 130 - sa * 100; } else { ox = e.x + facing * (2 + ca * 36); oy = e.y - HIT_Y - sa * 36; }
  const v = power * VEL; return { x: ox, y: oy, vx: facing * ca * v, vy: -sa * v, w, owner: e, team: e.team, delay, alive: true, trail: [] };
}
function fire() {
  const hh = S.cur, sp = S.sp, fly = sp.has('fly'); if (fly) S.weapon = 0;
  let w = shotW(SHOTS[S.weapon]); S.charging = false; hh.lastPower = Math.round(S.power * 10) / 10; S.walkTo = null;
  if (w.ult) hh.energy = 0; if (w.cd) hh.cd = w.cd;
  const extra = fly ? 0 : sp.has('b2') ? 2 : sp.has('b1') ? 1 : 0, vol = !fly && sp.has('x2') ? 2 : 1;
  w = { ...w, mul: fly ? 0 : w.mul * SPLIT[extra] * (vol === 2 ? X2_MUL : 1), fly };
  S.spDmg = fly ? 0 : [...sp].reduce((a, id) => a + (SPX[id].dmg || 0), 0);
  const n = (w.count || 1) + extra, spread = w.spread || 4; S.projs = [];
  const col = fly ? '#c8ffe8' : (S.buff && S.buff.col) || TC(hh.L.weapon ?? 0), wt = typeOf(hh.L, 'weapon'), tier = hh.L.weapon ?? 0;
  for (let v = 0; v < vol; v++) for (let i = 0; i < n; i++) {
    const a = hh.angle + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
    const pr = launch(hh, a, S.power, w, hh.facing, v * 0.85); pr.col = col; pr.wt = wt; pr.tier = tier; S.projs.push(pr);
  }
  if (sp.size) feed(`${hh.name}: ${[...sp].map((id) => SPX[id].n).join(' ')}`, TEAMC[hh.team]);
  hh.stats.shots++; S.state = 'flying'; S.acc = 0; S.lastShotBy = hh; cam.follow = true; sfx(w.ult ? 'ult' : 'fire');
  burst(hh.x + hh.facing * 36, hh.y - HIT_Y - 10, 'muzzle', 8);
}
function physStep(p, dt) {
  p.vx += WIND_A * S.wind * (p.w.windScale ?? 1) * dt; p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.x < -400 || p.x > W + 400 || p.y > H + 80) return { out: true, x: p.x, y: p.y };
  const xi = p.x | 0; if (xi >= 0 && xi < W && p.y >= surf[xi]) return { x: p.x, y: p.y };
  for (const hh of S.heroes) { if (hh.dead || hh.team === p.team) continue; const dx = p.x - hh.x, dy = p.y - (hh.y - HIT_Y); if (dx * dx + dy * dy < (HR + 4) ** 2) return { x: p.x, y: p.y, hero: hh }; }
  const b = S.boss; if (b && !b.dead && p.team === 0) { const dx = p.x - b.x, dy = p.y - (b.y - 96); if (dx * dx + dy * dy < b.r * b.r) return { x: p.x, y: p.y, boss: true }; }
  return null;
}
function simulate(e, angle, power, w, facing) { const p = launch(e, angle, power, w, facing, 0); for (let i = 0; i < 14 / DT; i++) { const r = physStep(p, DT); if (r) return r; } return { out: true, x: p.x, y: p.y }; }
function carve(cx, cy, r) {
  const x0 = Math.max(0, Math.ceil(cx - r)), x1 = Math.min(W - 1, Math.floor(cx + r));
  for (let x = x0; x <= x1; x++) { if (S.boss && x > S.boss.x - 120 && x < S.boss.x + 130) continue;
    const dy = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)), top = cy - dy, bot = cy + dy; if (surf[x] >= bot) continue;
    if (surf[x] >= top) surf[x] = bot; else surf[x] += bot - top; if (surf[x] > H - 6) surf[x] = H + 80; }
  S.decos = S.decos.filter((d) => Math.hypot(d.x - cx, d.y - cy) > r * 0.9);
}
function heal(hh, v) { const b = hh.hp; hh.hp = Math.min(hh.maxHp, hh.hp + v); return Math.round(hh.hp - b); }
function applyHit(src, tgt, mul) {
  let dmg = src.atk * mul * S.sd * (1 - R.red(tgt.def));
  if (src === S.cur && !src.isBoss) { const k = ((S.buff && S.buff.dmg) || 0) + (S.spDmg || 0); if (k) dmg *= 1 + k / 100; }
  const crit = Math.random() < src.crit; if (crit) dmg *= 1.6;
  const dodge = !tgt.isBoss && Math.random() < tgt.dodge; if (dodge) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg));
  const ab = Math.min(tgt.shield || 0, dmg); if (ab) tgt.shield -= ab; tgt.hp -= dmg - ab; tgt.hurt = 0.5;
  src.stats.dmg += dmg; if (!src.isBoss) src.energy = Math.min(100, src.energy + 5); if (!tgt.isBoss) tgt.energy = Math.min(100, tgt.energy + 8);
  if (tgt.hp <= 0 && !tgt.dead) kill(tgt, src);
  if (src === S.cur && S.buff && S.buff.frost && !tgt.dead) { if (tgt.isBoss) floatText(tgt.x, tgt.y - 250, 'Kháng băng', '#bfe9ff'); else { tgt.frozen = 1; burst(tgt.x, tgt.y - HIT_Y, 'frost', 18); } }
  return { dmg, txt: (crit ? 'Chí mạng ' : '') + (dodge ? 'Né ' : '') + '-' + fmt(dmg), col: crit ? '#ff9a3c' : dodge ? '#cfe7ff' : '#ffd36b' };
}
function kill(tgt, src) {
  tgt.dead = true; tgt.hp = 0; tgt.shield = 0;
  if (tgt.isBoss) { burst(tgt.x, tgt.y - 96, 'death', 90); S.shake = 30; feed(`${tgt.name} đã bị hạ!`, '#e9b94f'); return; }
  tgt.frozen = 0; burst(tgt.x, tgt.y - HIT_Y, 'death', 34);
  if (src && src.team !== tgt.team) { src.stats.kills++; feed(`${src.name} hạ gục ${tgt.name}`, src.isBoss ? '#ff6b7d' : TEAMC[src.team]); } else feed(`${tgt.name} đã gục`);
}
function explode(x, y, w, owner, hit) {
  carve(x, y, w.r * 0.75 * (w.crater || 1)); renderTerrain(); S.focus = { x, y };
  let hitAny = false;
  for (const hh of S.heroes) { if (hh.dead || hh.team === owner.team) continue;
    const d = Math.hypot(hh.x - x, hh.y - HIT_Y - y), reach = w.r + HR; if (d >= reach) continue;
    let f = 1 - (0.55 * Math.max(0, d - HR * 0.3)) / w.r; if (hit.hero === hh) f *= 1.1;
    const v = applyHit(owner, hh, w.mul * f); floatText(hh.x, hh.y - 112, v.txt, v.col); hitAny = true; }
  const b = S.boss;
  if (b && !b.dead && owner.team === 0) { const d = hit.boss ? 0 : Math.max(0, Math.hypot(b.x - x, b.y - 96 - y) - b.r); if (d < w.r) { const f = (1 - (0.5 * d) / w.r) * (hit.boss ? 1.1 : 1); const v = applyHit(owner, b, w.mul * f); floatText(b.x + rnd(-40, 40), b.y - 210, v.txt, v.col); hitAny = true; } }
  if (hitAny) { owner.stats.hits++; if (!owner.isBoss) owner.energy = Math.min(100, owner.energy + 10); }
  burst(x, y, 'boom', w.r); S.shake = Math.max(S.shake, Math.min(22, w.r / 5)); sfx('boom', w.r);
}

/* ---------- AI ---------- */
function missFor(r, c) {
  if (r.out) return 5000;
  if (c.type === 'hero') { if (r.hero === c.ref) return 0; return Math.hypot(r.x - c.ref.x, r.y - (c.ref.y - HIT_Y)); }
  if (r.boss) return 0; const b = S.boss; return Math.max(0, Math.hypot(r.x - b.x, r.y - (b.y - 96)) - b.r);
}
function searchShot(e, w, facing, c, coarse) {
  let best = { miss: 1e9, angle: 45, power: 50 }; const as = coarse ? 6 : 4, ps = coarse ? 4 : 2.5;
  for (let a = 12; a <= 86; a += as) for (let p = 14; p <= 100; p += ps) { const m = missFor(simulate(e, a, p, w, facing), c); if (m < best.miss) best = { miss: m, angle: a, power: p }; }
  const b0 = { ...best };
  for (let a = b0.angle - 3; a <= b0.angle + 3; a++) for (let p = b0.power - 2.5; p <= b0.power + 2.5; p += 0.5) { if (a < 0 || a > 90 || p < 0 || p > 100) continue; const m = missFor(simulate(e, a, p, w, facing), c); if (m < best.miss) best = { miss: m, angle: a, power: p }; }
  return best;
}
const DIFF = { easy: { a: 4, p: 5 }, normal: { a: 1.6, p: 2 }, hard: { a: 0.5, p: 0.7 } };
function botAim(hh) {
  const s = hh.sup;
  if (s && hh.supCd === 0) {
    if (s.kind === 'heal' && (hh.hp / hh.maxHp < 0.55 || S.heroes.some((a) => a.team === hh.team && !a.dead && a.hp / a.maxHp < 0.45))) useSupport(hh, true);
    else if (s.kind === 'shield' && hh.hp / hh.maxHp < 0.75) useSupport(hh, true);
    else if (s.kind === 'elixir' && hh.energy < 100) useSupport(hh, true);
    else if (s.kind === 'fire' || s.kind === 'frost' || s.kind === 'wind') useSupport(hh, true);
  }
  botSpecials();
  let wi = 0; if (hh.energy >= 100) wi = 2; else if (hh.cd === 0 && Math.random() < 0.6) wi = 1; S.weapon = wi; const w = shotW(SHOTS[wi]);
  const cands = S.mode === 'boss' ? [{ type: 'boss', pri: 1, x: S.boss.x }] : S.heroes.filter((e) => e.team !== hh.team && !e.dead).map((e) => ({ type: 'hero', ref: e, x: e.x, pri: 1 + (1 - e.hp / e.maxHp) * 1.5 }));
  let best = null;
  for (const c of cands) { const facing = Math.sign(c.x - hh.x) || 1; const r = searchShot(hh, w, facing, c); const score = c.pri / (1 + r.miss / 25); if (!best || score > best.score) best = { ...r, facing, score }; }
  const n = DIFF[hh.diff] || DIFF.normal, j = () => Math.random() * 2 - 1;
  best.angle = Math.max(0, Math.min(90, best.angle + j() * n.a)); best.power = Math.max(5, Math.min(100, best.power + j() * n.p));
  return best;
}
function botUpdate(dt) {
  const hh = S.cur, b = S.bot;
  if (b.phase === 'wait') { if (S.time < b.at) return; b.mv = Math.random() < 0.35 ? { dir: Math.random() < 0.5 ? -1 : 1, dist: 20 + Math.random() * 60 } : { dir: 0, dist: 0 }; b.sx = hh.x; b.phase = 'move'; }
  if (b.phase === 'move') { if (b.mv.dir && Math.abs(hh.x - b.sx) < b.mv.dist && move(hh, b.mv.dir, dt)) return; b.plan = botAim(hh); hh.facing = b.plan.facing; b.phase = 'turn'; return; }
  if (b.phase === 'turn') { const d = b.plan.angle - hh.angle, st = 55 * dt; if (Math.abs(d) <= st) { hh.angle = b.plan.angle; b.phase = 'charge'; S.charging = true; S.power = 0; S.pdir = 1; } else hh.angle += Math.sign(d) * st; return; }
  if (b.phase === 'charge' && S.power >= b.plan.power) { S.power = b.plan.power; b.phase = 'done'; fire(); }
}

/* =================== INPUT =================== */
const keys = { left: false, right: false, up: false, down: false };
const inBattle = () => S && !$('#battle').hidden && $('#result').hidden && $('#leaveBox').hidden;
const humanCan = () => S && S.state === 'aim' && S.cur && !S.cur.isBoss && !S.cur.bot;
function startCharge() { if (humanCan() && !S.charging) { S.charging = true; S.power = 0; S.pdir = 1; S.walkTo = null; } }
function releaseCharge() { if (humanCan() && S.charging) fire(); }
const KMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
addEventListener('keydown', (e) => {
  if (!inBattle() || e.target.tagName === 'INPUT') return;
  if (e.key in KMAP || e.key === ' ') e.preventDefault();
  if (e.key in KMAP) { keys[KMAP[e.key]] = true; if (humanCan()) S.walkTo = null; }
  if (e.key === ' ' && !e.repeat) startCharge();
  if ('1234'.includes(e.key) && e.key.length === 1) selectWeapon(+e.key - 1);
  const spk = SPECIALS.find((x) => x.key === e.key); if (spk) { ensureAudio(); toggleSpecial(spk.id); }
  if (e.key === 'c' || e.key === 'C') cam.follow = true;
});
addEventListener('keyup', (e) => { if (e.key in KMAP) keys[KMAP[e.key]] = false; if (e.key === ' ') { if (inBattle()) e.preventDefault(); releaseCharge(); } });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll('[data-hold]').forEach((b) => { const k = b.dataset.hold; b.addEventListener('pointerdown', (e) => { keys[k] = true; if (S) S.walkTo = null; try { b.setPointerCapture(e.pointerId); } catch (_) {} }); const off = () => { keys[k] = false; }; ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, off)); });
const fb = $('#fireBtn'); fb.addEventListener('pointerdown', (e) => { ensureAudio(); startCharge(); try { fb.setPointerCapture(e.pointerId); } catch (_) {} }); fb.addEventListener('pointerup', releaseCharge); fb.addEventListener('pointercancel', releaseCharge);
// canvas: kéo để nhìn quanh, lăn/chụm để phóng to, chạm mặt đất để đi tới
const ptrs = new Map(); let pinch = null;
cv.addEventListener('pointerdown', (e) => { ensureAudio(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY, drag: false });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z }; } });
cv.addEventListener('pointermove', (e) => { const p = ptrs.get(e.pointerId); if (!p || !S) return; const dx = e.offsetX - p.x, dy = e.offsetY - p.y; p.x = e.offsetX; p.y = e.offsetY;
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.z * d) / pinch.d); for (const q of ptrs.values()) q.drag = true; return; }
  if (!p.drag && Math.hypot(p.x - p.sx, p.y - p.sy) > 8) { p.drag = true; cam.follow = false; cv.classList.add('dragging'); }
  if (p.drag) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); } });
const ptrEnd = (e) => { const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; cv.classList.remove('dragging');
  if (!p.drag && e.type === 'pointerup' && S && humanCan() && !S.charging) { const wx = cam.x + p.x / cam.z; if (Math.abs(wx - S.cur.x) > 6) { S.walkTo = Math.max(16, Math.min(W - 16, wx)); cam.follow = true; burst(wx, Math.min(groundAt(wx), H - 10), 'tap', 6); } } };
cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
cv.addEventListener('wheel', (e) => { if (!S) return; e.preventDefault(); zoomAt(e.offsetX, e.offsetY, cam.z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
const mini = $('#mini'), miniCtx = mini.getContext('2d');
mini.addEventListener('pointerdown', (e) => { if (!S) return; const wx = (e.offsetX / (mini.clientWidth || 1)) * W, wy = (e.offsetY / (mini.clientHeight || 1)) * H; cam.follow = false; cam.x = wx - cssW / cam.z / 2; cam.y = wy - cssH / cam.z / 2; clampCam(); });
$('#tZoomIn').addEventListener('click', () => zoomAt(cssW / 2, cssH / 2, cam.z * 1.25));
$('#tZoomOut').addEventListener('click', () => zoomAt(cssW / 2, cssH / 2, cam.z / 1.25));
$('#tCenter').addEventListener('click', () => { cam.follow = true; cam.z = zDefault(); });
$('#tFull').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else goFull(); });
$('#tSound').addEventListener('click', () => { ensureAudio(); soundOn = !soundOn; updSound(); });
$('#tLeave').addEventListener('click', () => { if (S && !S.over) $('#leaveBox').hidden = false; });
$('#leaveNo').addEventListener('click', () => { $('#leaveBox').hidden = true; });
$('#leaveYes').addEventListener('click', async () => { $('#leaveBox').hidden = true; if (S) { S.over = true; S.state = 'over'; try { await act('battleEnd', { id: S.bt.id, forfeit: true }); } catch (e) {} } exitBattle(); });
function goFull() { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) { el.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {}); } }
function exitBattle() { Music.stop(); S = null; $('#battle').hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); showLobby(); }
// Điện thoại cầm dọc: xoay khung trận đấu 90° để luôn chơi ở màn hình ngang.
function checkRotate() {
  const b = $('#battle'), rot = !b.hidden && matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth;
  b.classList.toggle('rot', rot);
  b.style.width = rot ? innerHeight + 'px' : ''; b.style.height = rot ? innerWidth + 'px' : '';
  $('#rotate').hidden = true;
  resizeCanvas();
}
addEventListener('orientationchange', () => setTimeout(() => { resizeCanvas(); checkRotate(); }, 200));

/* =================== UPDATE =================== */
function camTarget() {
  if (S.state === 'flying') { const p = S.projs.find((q) => q.alive && q.delay <= 0); if (p) return { x: p.x, y: Math.max(-200, p.y) }; }
  if (S.state === 'settle' && S.focus) return S.focus;
  if (S.state === 'bossPrep' && S.boss) return { x: S.boss.x - 300, y: S.boss.y - 120 };
  if (S.cur && !S.cur.isBoss) return { x: S.cur.x, y: S.cur.y - 110 };
  return S.focus || { x: W / 2, y: H / 2 };
}
function update(dt) {
  S.time += dt;
  for (const c of S.clouds) { c.x += (S.wind * 8 + (S.wind >= 0 ? 5 : -5)) * dt * (0.6 + c.s * 0.4); if (c.x > W + 300) c.x = -300; if (c.x < -300) c.x = W + 300; }
  for (const p of S.parts) { p.life -= dt; if (p.type === 'ring') { p.r += (p.max - p.r) * Math.min(1, dt * 10); continue; } p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; }
  S.parts = S.parts.filter((p) => p.life > 0); for (const f of S.floats) { f.life -= dt; f.y -= 32 * dt; } S.floats = S.floats.filter((f) => f.life > 0);
  for (const hh of S.heroes) { if (hh.hurt > 0) hh.hurt -= dt; } if (S.boss && S.boss.hurt > 0) S.boss.hurt -= dt;
  S.shake = Math.max(0, S.shake - dt * 45);
  switch (S.state) {
    case 'aim': { const hh = S.cur; S.timer -= dt; let moving = false;
      if (hh.bot) botUpdate(dt);
      else {
        if (keys.left && !keys.right) moving = move(hh, -1, dt); else if (keys.right && !keys.left) moving = move(hh, 1, dt);
        else if (S.walkTo != null) { const dx = S.walkTo - hh.x; if (Math.abs(dx) < 3 || !(moving = move(hh, Math.sign(dx), dt))) S.walkTo = null; }
        if (keys.up) hh.angle = Math.min(90, hh.angle + 45 * dt); if (keys.down) hh.angle = Math.max(0, hh.angle - 45 * dt);
      }
      if (!moving && !hh.bot) hh.walk *= 0.85;
      if (S.charging && S.state === 'aim') { S.power += S.pdir * POWER_SPEED * dt; if (S.power >= 100) { S.power = 100; S.pdir = -1; } if (S.power <= 0) { S.power = 0; S.pdir = 1; } }
      if (S.state === 'aim' && S.timer <= 0) { if (S.charging) fire(); else { feed(`${hh.name} hết giờ, mất lượt`); endAim(); } } break; }
    case 'bossPrep': S.prepT -= dt; if (S.prepT <= 0) bossAct(); break;
    case 'flying': { S.acc += dt * SPEED;
      while (S.acc >= DT) { S.acc -= DT; for (const p of S.projs) { if (!p.alive) continue; if (p.delay > 0) { p.delay -= DT; continue; } const r = physStep(p, DT);
        if (r) { p.alive = false; if (p.w.fly) flyLand(p, r); else if (r.out) { floatText(Math.max(60, Math.min(W - 60, r.x)), Math.min(H - 60, Math.max(80, r.y)), 'Trượt', '#cfc3e0'); S.focus = { x: Math.max(0, Math.min(W, r.x)), y: Math.min(H - 100, Math.max(100, r.y)) }; } else explode(r.x, r.y, p.w, p.owner, r); } } }
      for (const p of S.projs) if (p.alive && p.delay <= 0) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 30) p.trail.shift();
        const tr = p.tier || 0; if (!p.owner.isBoss && tr >= 2 && Math.random() < 0.15 + tr * 0.08) S.parts.push({ x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6), vx: rnd(-25, 25), vy: rnd(-25, 25), g: 0, life: 0.45, max: 0.45, c: tr >= 4 && Math.random() < 0.5 ? '#ffffff' : p.col || '#ffd36b', s: 1.5 + tr * 0.4 }); }
      if (S.projs.every((p) => !p.alive)) endAim(); break; }
    case 'settle': { S.settleT += dt; let moving = false;
      for (const hh of S.heroes) { if (hh.dead) continue; const g = groundAt(hh.x);
        if (hh.y < g - 0.5 || hh.vy < 0) { hh.vy += G * 1.4 * dt; hh.y += hh.vy * dt; moving = true; if (hh.y >= g && hh.vy > 0) { hh.y = g; hh.vy = 0; } } else { if (g < Infinity) hh.y = g; hh.vy = 0; }
        if (hh.y > H + 60) { floatText(hh.x, H - 80, 'Rơi xuống vực!', '#ff9a5a'); kill(hh, S.lastShotBy && S.lastShotBy.team !== hh.team ? S.lastShotBy : null); } }
      if (!moving && S.settleT > 0.45) finishTurn(); break; }
    case 'pause': S.pauseT -= dt; if (S.pauseT <= 0) nextTurn(); break;
  }
  if (cam.follow) { const t = camTarget(), k = 1 - Math.exp(-dt * 5); cam.x += (t.x - cssW / cam.z / 2 - cam.x) * k; cam.y += (t.y - (cssH / cam.z) * 0.55 - cam.y) * k; }
  clampCam();
}

/* =================== EFFECTS =================== */
function burst(x, y, kind, r) {
  const P2 = S.parts;
  if (kind === 'boom') { const fire = ['#fff1b8', '#ffc04d', '#ff7a32', '#d8432a']; const n = Math.min(70, 18 + r * 0.4);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (60 + Math.random() * 240) * (r / 50); P2.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 120, life: 0.35 + Math.random() * 0.5, max: 0.85, c: fire[i % 4], s: 2 + Math.random() * 5 }); }
    for (let i = 0; i < n * 0.5; i++) { const a = -Math.PI * Math.random(), s = 80 + Math.random() * 280; P2.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 700, life: 0.6 + Math.random() * 0.7, max: 1.3, c: Math.random() < 0.5 ? S.th.g[0] : S.th.top, s: 2 + Math.random() * 3.5, sq: true }); }
    P2.push({ type: 'ring', x, y, r: 4, max: r * 1.08, life: 0.45, c: '#ffd9a0' }); return; }
  const col = { heal: '#7fdc8c', shield: '#dbe9ff', dust: '#c8a882', muzzle: '#ffe08a', tap: '#ffffff', death: '#ffffff', fire: '#ff8a3c', frost: '#bfe9ff', wind: '#d8fff0', elixir: '#ffd36b' }[kind];
  for (let i = 0; i < r; i++) { const a = Math.random() * 6.283, s = (kind === 'tap' ? 40 : 40 + Math.random() * 130); P2.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'tap' ? 0 : 60), g: kind === 'death' ? 200 : kind === 'dust' ? 320 : kind === 'tap' ? 0 : -20, life: kind === 'tap' || kind === 'muzzle' ? 0.3 : 0.6 + Math.random() * 0.6, max: 1.2, c: kind === 'death' ? (i % 2 ? '#ffffff' : '#ffd36b') : col, s: 2 + Math.random() * 3 }); }
}
function floatText(x, y, text, c) { S.floats.push({ x, y, text, c, life: 1.4 }); }
let bannerT = null;
function banner(t, sub, col) { const b = $('#banner'); b.innerHTML = ''; b.append(t); if (sub) b.append(h('small', {}, sub)); b.style.color = col; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 1500); }
function feed(text, col) { const f = $('#feed'), d = h('div', { style: col ? `--fc:${col}` : '' }, text); f.append(d); while (f.children.length > 4) f.firstChild.remove(); setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, 4200); }

/* =================== DRAW =================== */
function drawSky() {
  const th = S.th, c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, cssH); const t = Math.max(0, Math.min(1, (-cam.y) / 600));
  g.addColorStop(0, th.sky[0]); g.addColorStop(0.55 - t * 0.2, th.sky[1]); g.addColorStop(1, th.sky[2]); c.fillStyle = g; c.fillRect(0, 0, cssW, cssH);
  if (th.sky[0] === '#060a20' || S.mapId === 'volcano' || S.mapId === 'snow') { c.fillStyle = 'rgba(255,248,230,.75)'; for (let i = 0; i < 70; i++) { const x = ((i * 137.5 - cam.x * 0.05) % cssW + cssW) % cssW, y = (i * 71.3) % (cssH * 0.5); c.globalAlpha = 0.3 + ((i * 13) % 7) / 10; c.fillRect(x, y, 1.6, 1.6); } c.globalAlpha = 1; }
  if (th.sun) { const sx = th.sun.x * cssW - cam.x * 0.03, sy = th.sun.y * cssH - cam.y * 0.05; const sg = c.createRadialGradient(sx, sy, 4, sx, sy, cssH * 0.4); sg.addColorStop(0, th.sun.c); sg.addColorStop(0.08, th.sun.c + 'cc'); sg.addColorStop(1, th.sun.c + '00'); c.fillStyle = sg; c.fillRect(0, 0, cssW, cssH);
    if (th.sun.moon) { c.fillStyle = th.sky[0]; c.beginPath(); c.arc(sx + 12, sy - 6, cssH * 0.04, 0, 7); c.fill(); } }
}
function drawAbyss(c) {
  const th = S.th, y0 = H - 46, t = S.time;
  if (th.abyss === 'water') { const g = c.createLinearGradient(0, y0, 0, H + 260); g.addColorStop(0, '#2a6aa8'); g.addColorStop(1, '#0a1a3a'); c.fillStyle = g; c.fillRect(-400, y0, W + 800, 320); c.strokeStyle = 'rgba(200,235,255,.6)'; c.lineWidth = 3; c.beginPath(); for (let x = -400; x <= W + 400; x += 20) c.lineTo(x, y0 + Math.sin(x * 0.02 + t * 2) * 5); c.stroke(); }
  else if (th.abyss === 'lava') { const g = c.createLinearGradient(0, y0, 0, H + 260); g.addColorStop(0, '#ffb03a'); g.addColorStop(0.3, '#e0401a'); g.addColorStop(1, '#3a0a0a'); c.fillStyle = g; c.fillRect(-400, y0, W + 800, 320); c.fillStyle = 'rgba(255,230,120,.7)'; for (let i = 0; i < 18; i++) { const x = (i * 157 + t * 30) % (W + 400) - 200; c.beginPath(); c.arc(x, y0 + 6 + Math.sin(t * 3 + i) * 3, 4 + (i % 3) * 2, 0, 7); c.fill(); } }
  else if (th.abyss === 'cloud') { c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 40; i++) { const x = (i * 83 + t * 12) % (W + 600) - 300; c.beginPath(); c.arc(x, H - 20 + Math.sin(i) * 14, 50 + (i % 5) * 12, 0, 7); c.fill(); } }
  else { const g = c.createLinearGradient(0, y0 - 80, 0, H + 100); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)'); c.fillStyle = g; c.fillRect(-400, y0 - 80, W + 800, 400); }
}
function drawHeroWorld(hh) {
  const c = ctx;
  if (hh.dead) { const g = groundAt(hh.x); if (g === Infinity) return; c.fillStyle = '#6b6280'; c.strokeStyle = OL; c.lineWidth = 2; rr(c, hh.x - 12, g - 32, 24, 32, 10); c.fill(); c.stroke(); c.fillStyle = '#2a2238'; c.fillRect(hh.x - 2, g - 27, 4, 15); c.fillRect(hh.x - 7, g - 23, 14, 4); return; }
  const isCur = S.cur === hh;
  drawChar(c, hh.L, { x: hh.x, y: hh.y, facing: hh.facing, t: S.time + hh.x * 0.01, walk: hh.walk, team: hh.team, frozen: hh.frozen > 0, alpha: hh.hurt > 0 && Math.floor(hh.hurt * 20) % 2 ? 0.55 : null });
  const bw = 60, top = hh.y - 118, pct = Math.max(0, hh.hp / hh.maxHp);
  c.fillStyle = 'rgba(12,8,22,.82)'; rr(c, hh.x - bw / 2 - 2, top - 2, bw + 4, 10, 4); c.fill(); c.fillStyle = TEAMC[hh.team]; rr(c, hh.x - bw / 2, top, Math.max(2, bw * pct), 6, 3); c.fill();
  if (hh.shield > 0) { c.fillStyle = 'rgba(225,238,255,.9)'; c.fillRect(hh.x - bw / 2, top + 6, bw * Math.min(1, hh.shield / hh.maxHp), 2); }
  c.font = '700 14px "Be Vietnam Pro",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineWidth = 3.5; c.strokeStyle = 'rgba(12,8,22,.85)'; c.strokeText(hh.name, hh.x, top - 6); c.fillStyle = isCur ? '#ffe7a8' : TEAMC[hh.team]; c.fillText(hh.name, hh.x, top - 6);
}
function drawBossWorld() {
  const b = S.boss; if (!b) return; const c = ctx;
  c.fillStyle = shade(S.th.g[1], -0.2); c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(b.x - 130, b.y + 8); c.lineTo(b.x + 140, b.y + 8); c.lineTo(b.x + 116, b.y - 8); c.lineTo(b.x - 112, b.y - 8); c.closePath(); c.fill(); c.stroke();
  if (b.dead) c.globalAlpha = 0.35; else if (b.hurt > 0 && Math.floor(b.hurt * 20) % 2) c.globalAlpha = 0.7;
  drawBossShape(c, b.b, b.x, b.y, 1.5, b.enraged && !b.dead, S.time); c.globalAlpha = 1;
  if (!b.dead) { const bw = 200, top = b.y - 300, pct = b.hp / b.maxHp; c.fillStyle = 'rgba(12,8,22,.85)'; rr(c, b.x - bw / 2 - 3, top - 3, bw + 6, 14, 6); c.fill(); c.fillStyle = '#ff6b7d'; rr(c, b.x - bw / 2, top, Math.max(3, bw * pct), 8, 4); c.fill();
    c.font = '800 18px "Baloo 2",sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(12,8,22,.85)'; c.strokeText(b.name, b.x, top - 8); c.fillStyle = TC(b.b.t); c.fillText(b.name, b.x, top - 8); }
}
function drawAim() {
  const hh = S.cur; if (!hh || hh.isBoss || hh.dead || S.state !== 'aim') return;
  const c = ctx, bob = Math.sin(S.time * 5) * 4, ty = hh.y - 162 + bob;
  c.fillStyle = '#ffd25e'; c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(hh.x - 10, ty); c.lineTo(hh.x + 10, ty); c.lineTo(hh.x, ty + 13); c.closePath(); c.fill(); c.stroke();
  const rad = (hh.angle * Math.PI) / 180, px = hh.x + hh.facing * 2, py = hh.y - HIT_Y, dx = hh.facing * Math.cos(rad), dy = -Math.sin(rad);
  c.save(); c.strokeStyle = 'rgba(255,240,200,.8)'; c.setLineDash([7, 7]); c.lineWidth = 2.5; c.beginPath(); c.moveTo(px + dx * 50, py + dy * 50); c.lineTo(px + dx * 130, py + dy * 130); c.stroke(); c.setLineDash([]);
  c.strokeStyle = 'rgba(233,185,79,.55)'; c.beginPath(); if (hh.facing > 0) c.arc(px, py, 44, -rad, 0); else c.arc(px, py, 44, Math.PI, Math.PI + rad); c.stroke();
  c.font = '800 17px "Baloo 2",sans-serif'; c.fillStyle = '#ffe7a8'; c.textAlign = 'center'; c.lineWidth = 3.5; c.strokeStyle = 'rgba(12,8,22,.8)'; const tx = px + dx * 150, tyy = py + dy * 150 + 6; c.strokeText(Math.round(hh.angle) + '°', tx, tyy); c.fillText(Math.round(hh.angle) + '°', tx, tyy); c.restore();
  if (S.walkTo != null) { const g = groundAt(S.walkTo); if (g < Infinity) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.ellipse(S.walkTo, g, 12, 4, 0, 0, 7); c.stroke(); } }
  if (S.buff && S.buff.traj) { const pw = S.charging ? S.power : hh.lastPower ?? 50; const p = launch(hh, hh.angle, pw, shotW(SHOTS[S.weapon]), hh.facing, 0); c.fillStyle = 'rgba(159,220,255,.9)';
    for (let i = 0; i < 14 / DT; i++) { const r = physStep(p, DT); if (i % 14 === 0) { c.beginPath(); c.arc(p.x, p.y, 3, 0, 7); c.fill(); } if (r) { c.strokeStyle = '#9fdcff'; c.lineWidth = 2.5; c.beginPath(); c.arc(r.x, r.y, 14, 0, 7); c.stroke(); break; } } }
}
/* ---------- hình viên đạn: theo kiểu vũ khí, to dần theo bậc ---------- */
function pOrb(c, z, col, tier, t) {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, z * 1.9); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, col); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, z * 1.9, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(-z * 0.25, -z * 0.25, z * 0.45, 0, 7); c.fill();
  for (let i = 0; i < Math.min(5, tier); i++) { const a = t * 6 + (i * Math.PI * 2) / Math.min(5, tier); c.fillStyle = i % 2 ? '#fff' : col; c.beginPath(); c.arc(Math.cos(a) * z * 1.5, Math.sin(a) * z * 1.5, z * 0.22, 0, 7); c.fill(); }
}
function pArrow(c, z, col, tier) {
  c.strokeStyle = '#e8d6a8'; c.lineWidth = z * 0.32; c.lineCap = 'round'; c.beginPath(); c.moveTo(-z * 2.6, 0); c.lineTo(z * 1.2, 0); c.stroke();
  c.fillStyle = shade(col, 0.4); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-z * 2.7, 0); c.lineTo(-z * 1.8, 0); c.lineTo(-z * 2.4, s * z * 0.8); c.lineTo(-z * 3.1, s * z * 0.8); c.closePath(); c.fill(); }
  c.fillStyle = col; c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.moveTo(z * 2.3, 0); c.lineTo(z * 1.0, -z * 0.75); c.lineTo(z * 1.25, 0); c.lineTo(z * 1.0, z * 0.75); c.closePath(); c.fill(); c.stroke();
  if (tier >= 3) { c.fillStyle = '#fff'; c.beginPath(); c.arc(z * 2.3, 0, z * 0.3, 0, 7); c.fill(); }
}
function pSpear(c, z, col, tier) {
  c.strokeStyle = shade(col, -0.45); c.lineWidth = z * 0.38; c.lineCap = 'round'; c.beginPath(); c.moveTo(-z * 3, 0); c.lineTo(z * 1.2, 0); c.stroke();
  c.fillStyle = shade(col, 0.15); c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.moveTo(z * 2.8, 0); c.lineTo(z * 1.4, -z * 0.7); c.lineTo(z * 0.9, 0); c.lineTo(z * 1.4, z * 0.7); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(z * 2.6, 0); c.lineTo(z * 1.5, -z * 0.25); c.lineTo(z * 1.3, 0); c.closePath(); c.fill();
  if (tier >= 2) { c.fillStyle = col; c.beginPath(); c.arc(z * 0.7, 0, z * 0.32, 0, 7); c.fill(); }
}
function pSlash(c, z, col, tier, t) {
  c.rotate(t * 16); const R = z * 1.8;
  const g = c.createLinearGradient(-R, 0, R, 0); g.addColorStop(0, col + '00'); g.addColorStop(0.5, col); g.addColorStop(1, '#ffffff');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, -Math.PI * 0.85, Math.PI * 0.85); c.arc(-R * 0.35, 0, R * 0.78, Math.PI * 0.8, -Math.PI * 0.8, true); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, z * 0.35, 0, 7); c.fill();
  if (tier >= 3) { c.rotate(Math.PI); c.globalAlpha *= 0.6; c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 0.8, -Math.PI * 0.7, Math.PI * 0.7); c.arc(-R * 0.3, 0, R * 0.6, Math.PI * 0.65, -Math.PI * 0.65, true); c.closePath(); c.fill(); }
}
function pStar(c, z, col, tier, t) {
  c.rotate(t * 7); const R = z * 1.6, n = tier >= 4 ? 6 : 5;
  c.fillStyle = col; c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? R * 0.45 : R, a = (i * Math.PI) / n - Math.PI / 2; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, z * 0.45, 0, 7); c.fill();
}
function pFeather(c, z) {
  c.fillStyle = '#eafff6'; c.strokeStyle = '#4aa87a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(z * 2.2, 0); c.quadraticCurveTo(0, -z * 1.3, -z * 2, -z * 0.2); c.quadraticCurveTo(0, z * 1.1, z * 2.2, 0); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-z * 2.6, 0); c.lineTo(z * 2, 0); c.stroke();
}
function drawProjs() {
  const c = ctx;
  for (const p of S.projs) { if (p.delay > 0) continue;
    const boss = p.owner.isBoss, col = boss ? '#ff5a5a' : p.col || '#ffd36b', tier = p.tier || 0;
    const z = boss ? (p.w.r > 60 ? 15 : 11) : (10 + tier * 1.4) * (p.w.ult ? 1.45 : 1);
    if (p.trail.length > 1) { c.save(); c.lineCap = 'round'; for (let i = 1; i < p.trail.length; i++) { c.strokeStyle = col; c.globalAlpha = (i / p.trail.length) * (0.45 + tier * 0.05); c.lineWidth = z * 1.2 * (i / p.trail.length); c.beginPath(); c.moveTo(p.trail[i - 1].x, p.trail[i - 1].y); c.lineTo(p.trail[i].x, p.trail[i].y); c.stroke(); } c.restore(); }
    if (!p.alive) continue;
    const ang = Math.atan2(p.vy, p.vx), t = S.time;
    c.save(); c.translate(p.x, p.y); c.shadowColor = col; c.shadowBlur = 12 + tier * 3 + (p.w.ult ? 12 : 0);
    if (!boss && tier >= 4) { c.save(); c.strokeStyle = tier >= 5 ? '#ffd36b' : '#ffffff'; c.globalAlpha = 0.55 + Math.sin(t * 10) * 0.2; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, z * (2.1 + Math.sin(t * 8) * 0.15), 0, 7); c.stroke(); c.restore(); }
    if (boss) pOrb(c, z, col, 0, t);
    else if (p.w.fly) { c.rotate(ang); pFeather(c, z); }
    else switch (p.wt) {
      case 'bow': c.rotate(ang); pArrow(c, z, col, tier); break;
      case 'spear': c.rotate(ang); pSpear(c, z, col, tier); break;
      case 'sword': pSlash(c, z, col, tier, t); break;
      case 'scepter': pStar(c, z, col, tier, t); break;
      default: pOrb(c, z, col, tier, t);
    }
    c.restore(); }
}
function drawFx() {
  const fx = S.th.fx; if (!fx) return; const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const p of S.fx) {
    p.x += (S.wind * 0.0006 + (fx === 'snow' ? 0.0002 : fx === 'sand' ? 0.002 : 0.0004)) * p.v; p.y += (fx === 'snow' ? 0.0012 : fx === 'ash' ? 0.0007 : fx === 'leaf' ? 0.0009 : fx === 'firefly' ? Math.sin(S.time + p.p) * 0.0004 : 0.0002) * p.v;
    if (p.x > 1) p.x -= 1; if (p.x < 0) p.x += 1; if (p.y > 1) p.y -= 1; if (p.y < 0) p.y += 1;
    const x = p.x * cssW, y = p.y * cssH;
    if (fx === 'snow') { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x, y, 1.5 + p.v * 1.5, 0, 7); c.fill(); }
    else if (fx === 'leaf') { c.fillStyle = 'rgba(140,200,90,.75)'; c.save(); c.translate(x, y); c.rotate(S.time * 2 + p.p); c.fillRect(-3, -1.5, 6, 3); c.restore(); }
    else if (fx === 'sand') { c.fillStyle = 'rgba(255,220,160,.4)'; c.fillRect(x, y, 3 * p.v, 1.2); }
    else if (fx === 'ash') { c.fillStyle = p.p > 4 ? 'rgba(255,140,60,.8)' : 'rgba(80,70,70,.6)'; c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
    else if (fx === 'firefly') { c.fillStyle = `rgba(255,240,140,${0.4 + Math.sin(S.time * 3 + p.p) * 0.4})`; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
  }
}
function draw() {
  drawSky();
  const k = cam.z * dpr, sx = (Math.random() - 0.5) * S.shake, sy = (Math.random() - 0.5) * S.shake;
  ctx.setTransform(k, 0, 0, k, (-cam.x + sx) * k, (-cam.y + sy) * k);
  ctx.drawImage(bgCv, cam.x * 0.45, cam.y * 0.45 + 40);
  for (const cl of S.clouds) { const x = cl.x + cam.x * 0.3; ctx.fillStyle = `rgba(255,255,255,${cl.a})`; ctx.beginPath(); ctx.ellipse(x, cl.y, 90 * cl.s, 24 * cl.s, 0, 0, 7); ctx.ellipse(x + 50 * cl.s, cl.y - 14 * cl.s, 60 * cl.s, 22 * cl.s, 0, 0, 7); ctx.ellipse(x - 56 * cl.s, cl.y - 6 * cl.s, 48 * cl.s, 16 * cl.s, 0, 0, 7); ctx.fill(); }
  drawAbyss(ctx); ctx.drawImage(terCv, 0, 0); drawBossWorld(); for (const hh of S.heroes) drawHeroWorld(hh); drawAim(); drawProjs();
  for (const p of S.parts) { if (p.type === 'ring') { ctx.save(); ctx.strokeStyle = p.c; ctx.globalAlpha = Math.max(0, p.life / 0.45) * 0.8; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); ctx.restore(); continue; }
    ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.max) * 1.6)); ctx.fillStyle = p.c; if (p.sq) ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); } }
  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const f of S.floats) { ctx.globalAlpha = Math.min(1, f.life * 1.5); ctx.font = '800 26px "Baloo 2",sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.c; ctx.fillText(f.text, f.x, f.y); }
  ctx.globalAlpha = 1; drawFx();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const p of S.projs) { if (!p.alive || p.delay > 0) continue; const sxp = (p.x - cam.x) * cam.z, syp = (p.y - cam.y) * cam.z; if (syp < 0 || sxp < 0 || sxp > cssW) { const ax = Math.max(16, Math.min(cssW - 16, sxp)), ay = Math.max(70, Math.min(cssH - 16, syp)); ctx.fillStyle = p.owner.isBoss ? '#ff5a5a' : '#ffd36b'; ctx.beginPath(); ctx.arc(ax, ay, 7, 0, 7); ctx.fill(); } }
  const vg = ctx.createRadialGradient(cssW / 2, cssH / 2, cssH * 0.4, cssW / 2, cssH / 2, cssH * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, cssW, cssH);
  drawMini();
}
function drawMini() {
  const m = miniCtx, w = 440, hh = 200, sx = w / W, sy = hh / H; m.clearRect(0, 0, w, hh); m.fillStyle = 'rgba(30,40,70,.5)'; m.fillRect(0, 0, w, hh); m.drawImage(miniTer, 0, 0);
  if (S.boss && !S.boss.dead) { m.fillStyle = '#ff6b7d'; m.beginPath(); m.arc(S.boss.x * sx, (S.boss.y - 96) * sy, 9, 0, 7); m.fill(); }
  for (const x of S.heroes) { if (x.dead) continue; m.fillStyle = TEAMC[x.team]; m.beginPath(); m.arc(x.x * sx, (x.y - HIT_Y) * sy, x === S.cur ? 8 : 6, 0, 7); m.fill(); if (x === S.cur) { m.strokeStyle = '#fff'; m.lineWidth = 2; m.stroke(); } }
  for (const p of S.projs) if (p.alive && p.delay <= 0) { m.fillStyle = '#ffd36b'; m.beginPath(); m.arc(p.x * sx, Math.max(4, p.y * sy), 4, 0, 7); m.fill(); }
  m.strokeStyle = 'rgba(255,255,255,.9)'; m.lineWidth = 2.5; m.strokeRect(cam.x * sx, cam.y * sy, (cssW / cam.z) * sx, (cssH / cam.z) * sy);
}

/* =================== HUD =================== */
const el = (id) => document.getElementById(id);
const E = {}; ['powPct', 'stTxt', 'buffs', 'wFill', 'wVal', 'roundTxt', 'timer', 'clock', 'whoName', 'hpFill', 'shFill', 'hpTxt', 'enFill', 'enTxt', 'enMeter', 'angVal', 'needle', 'dialSvg', 'pVal', 'pLast', 'pFill', 'pMark', 'stFill', 'fireBtn', 'hudBot', 'me'].forEach((i) => (E[i] = el(i)));
function st(e, v) { if (e._v !== v) { e._v = v; e.textContent = v; } }
function sw(e, v) { if (e._w !== v) { e._w = v; e.style.width = v; } }
// Ô kỹ năng: 1 Đạn thường, 2 Tam liên, 4 Vật phẩm hỗ trợ; Tuyệt kỹ (3) là nút POW cạnh nút Bắn
const SK_ICON = {
  0: '<svg viewBox="0 0 40 40"><defs><radialGradient id="g0" cx=".4" cy=".35"><stop offset="0" stop-color="#fff6c9"/><stop offset=".5" stop-color="#ffc84a"/><stop offset="1" stop-color="#c8641a"/></radialGradient></defs><path d="M4 30 Q14 26 20 20" stroke="#ffe08a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><circle cx="24" cy="17" r="9" fill="url(#g0)" stroke="#5a2a00" stroke-width="1.5"/></svg>',
  1: '<svg viewBox="0 0 40 40"><g stroke="#5a2a00" stroke-width="1.2" fill="#ffc84a"><circle cx="11" cy="26" r="6"/><circle cx="21" cy="15" r="6"/><circle cx="31" cy="25" r="6"/></g><g fill="#fff6c9"><circle cx="9.5" cy="24.5" r="2"/><circle cx="19.5" cy="13.5" r="2"/><circle cx="29.5" cy="23.5" r="2"/></g></svg>',
};
const skBtns = {};
for (const i of [0, 1, 3]) {
  const ico = h('span', { class: 'ico' }); if (SK_ICON[i]) ico.innerHTML = SK_ICON[i];
  const b = h('button', { type: 'button', class: 'sk', id: 'sk' + i }, ico, h('kbd', {}, i + 1), h('em', { class: 'cd' }));
  b.addEventListener('click', () => { ensureAudio(); selectWeapon(i); }); $('#skills').append(b); skBtns[i] = b;
}
const spBtns = SPECIALS.map((sp) => { const b = h('button', { type: 'button', class: 'spc', id: 'sp-' + sp.id, title: `${sp.d} · tốn ${sp.cost} NL (phím ${sp.key})` }, h('b', {}, sp.n), h('small', {}, sp.cost));
  b.addEventListener('click', () => { ensureAudio(); toggleSpecial(sp.id); }); $('#specials').append(b); return b; });
skBtns[2] = $('#sk2'); skBtns[2].addEventListener('click', () => { ensureAudio(); selectWeapon(2); });
let teamEls = [];
function buildTeamsHud() {
  const box = $('#teams'); box.innerHTML = ''; teamEls = [];
  const rows = S.mode === 'boss' ? [['red', 'Đội của bạn'], ['boss', S.boss.name]] : [['red', TEAMN[0]], ['blue', TEAMN[1]]];
  for (const [cls, name] of rows) { const fill = h('i'), num = h('span'); box.append(h('div', { class: 'tb ' + cls }, h('div', { class: 'tl' }, h('b', {}, name), num), h('div', { class: 'bar' }, fill))); teamEls.push({ fill, num }); }
}
function updateHUD() {
  const sum = (t) => { const a = S.heroes.filter((x) => x.team === t); return [a.reduce((s, x) => s + Math.max(0, x.hp), 0), a.reduce((s, x) => s + x.maxHp, 0)]; };
  const vals = [sum(0), S.boss ? [Math.max(0, S.boss.hp), S.boss.maxHp] : sum(1)];
  vals.forEach(([v, m], i) => { st(teamEls[i].num, `${fmt(v)} / ${fmt(m)}`); sw(teamEls[i].fill, (v / m) * 100 + '%'); });
  const w = S.wind, pct = (Math.abs(w) / 10) * 50; if (E.wFill._wind !== w) { E.wFill._wind = w; E.wFill.style.left = (w >= 0 ? 50 : 50 - pct) + '%'; E.wFill.style.width = pct + '%'; }
  st(E.wVal, w === 0 ? '0' : w > 0 ? `${w} →` : `← ${-w}`); st(E.roundTxt, `Hiệp ${Math.max(1, S.round)}`);
  const tm = S.state === 'aim' ? Math.max(0, Math.ceil(S.timer)) : '–'; st(E.timer, String(tm)); E.clock.style.setProperty('--p', (S.state === 'aim' ? (S.timer / TURN_TIME) * 100 : 100) + '%'); E.clock.classList.toggle('low', S.state === 'aim' && S.timer < 6);
  const hh = S.cur;
  if (!hh || hh.isBoss) { E.hudBot.classList.add('locked'); st(E.fireBtn, hh && hh.isBoss ? 'Boss' : 'Chờ'); return; }
  E.me.style.setProperty('--team', TEAMC[hh.team]); st(E.whoName, hh.name);
  sw(E.hpFill, Math.max(0, (hh.hp / hh.maxHp) * 100) + '%'); sw(E.shFill, (hh.shield ? Math.min(1, hh.shield / hh.maxHp) * 100 : 0) + '%');
  st(E.hpTxt, `${fmt(Math.max(0, hh.hp))} / ${fmt(hh.maxHp)}${hh.shield ? ` · giáp ${fmt(hh.shield)}` : ''}`);
  const nl = S.state === 'aim' ? S.nl : NL_MAX; sw(E.enFill, nl + '%'); st(E.enTxt, `${nl} / ${NL_MAX}`);
  st(E.angVal, Math.round(hh.angle) + '°'); const a = (hh.angle * Math.PI) / 180; E.needle.setAttribute('x2', (40 + 32 * Math.cos(a)).toFixed(1)); E.needle.setAttribute('y2', (42 - 32 * Math.sin(a)).toFixed(1)); E.dialSvg.classList.toggle('flip', hh.facing < 0);
  st(E.pVal, `Lực ${Math.round(S.power)}`); st(E.pLast, hh.lastPower == null ? 'Lần trước: —' : `Lần trước: ${Math.round(hh.lastPower)}`); sw(E.pFill, S.power + '%');
  if (hh.lastPower != null) { E.pMark.hidden = false; E.pMark.style.left = hh.lastPower + '%'; } else E.pMark.hidden = true;
  sw(E.stFill, Math.max(0, (S.stamina / hh.move) * 100) + '%'); st(E.stTxt, String(Math.max(0, Math.round(S.state === 'aim' ? S.stamina : hh.move))));
  const human = humanCan(); E.hudBot.classList.toggle('locked', !human);
  st(E.fireBtn, !human ? (S.state === 'aim' ? 'Máy' : 'Chờ') : S.charging ? 'Thả' : 'Bắn');
  E.fireBtn.classList.toggle('charging', S.charging);
  for (const i of [0, 1]) { const b = skBtns[i], sh = SHOTS[i], cd = i === 1 && hh.cd > 0 ? hh.cd : 0;
    b.title = `${sh.n} (phím ${i + 1}): ${sh.sub}`; st(b.children[2], cd ? String(cd) : ''); b.disabled = !!cd || !human; b.classList.toggle('sel', S.weapon === i && human); }
  const pb = skBtns[2], full = hh.energy >= 100;
  pb.style.setProperty('--en', Math.floor(hh.energy) + '%'); st(E.powPct, Math.floor(hh.energy) + '%');
  SPECIALS.forEach((sp, i) => { const b = spBtns[i], on = S.sp.has(sp.id); b.classList.toggle('sel', on); b.disabled = !human || (!on && sp.cost > S.nl); }); pb.classList.toggle('ready', full); pb.disabled = !full || !human; pb.classList.toggle('sel', S.weapon === 2 && human);
  pb.title = full ? `${SHOTS[2].n} (phím 3): ${SHOTS[2].sub}` : `${SHOTS[2].n}: cần 100% nộ (${Math.floor(hh.energy)}%)`;
  const sb = skBtns[3], s = hh.sup, k = s ? s.kind : '';
  if (sb._k !== k) { sb._k = k; const ic = sb.children[0]; ic.innerHTML = ''; if (s) ic.append(sprCanvas(`items/${SUP[s.kind].img}.webp`, 96)); }
  st(sb.children[2], s && hh.supCd > 0 ? String(hh.supCd) : '');
  sb.disabled = !s || !human || hh.supCd > 0; sb.classList.toggle('on', !!(s && S.buff && S.buff.kind === s.kind));
  sb.title = s ? `${s.name} (phím 4): ` + ({ heal: `Hồi ${fmt(s.power)} máu`, shield: `+${fmt(s.power)} giáp`, fire: `+${s.power}% sát thương, nổ rộng`, frost: 'Đóng băng mục tiêu', wind: `Bỏ qua gió, +${s.power}%`, elixir: `+${s.power}% nộ` })[s.kind] : 'Chưa trang bị vật phẩm hỗ trợ';
  // Huy hiệu hiệu ứng đang bật trong lượt (giống ô "power 50%")
  const bk = S.buff ? S.buff.kind + S.buff.dmg : '';
  if (E.buffs._k !== bk) { E.buffs._k = bk; E.buffs.innerHTML = '';
    if (S.buff && SUP[S.buff.kind]) E.buffs.append(h('span', { class: 'buff' }, sprCanvas(`items/${SUP[S.buff.kind].img}.webp`, 40), S.buff.dmg ? `+${S.buff.dmg}%` : SUP[S.buff.kind].n)); }
}

/* =================== RESULT =================== */
async function gameOver(win) {
  if (S.over) return; S.over = true; S.state = 'over'; S.charging = false;
  banner(S.mode === 'boss' ? (win ? `Đã hạ ${S.boss.name}!` : 'Cả đội đã gục') : win ? 'Đội Đỏ chiến thắng!' : 'Đội Xanh chiến thắng!', '', win ? '#e9b94f' : '#ff6b7d');
  sfx(win ? 'win' : 'lose');
  let res = null, err = null; const snap = S;
  try { res = await act('battleEnd', { id: S.bt.id, win }); } catch (e) { err = e.message; }
  setTimeout(() => showResult(snap, win, res, err), 1500);
}
function showResult(s, win, res, err) {
  if (S !== s) return;
  const box = $('#resultBox'); box.innerHTML = '';
  const realWin = res ? res.win !== false && win : win;
  const title = s.mode === 'boss' ? (realWin ? `Hạ gục ${s.boss.name}` : `Thất bại trước ${s.boss.name}`) : realWin ? 'Đội Đỏ chiến thắng' : 'Đội Xanh chiến thắng';
  const sub = s.mode === 'boss' ? (realWin ? `Sau ${s.round} hiệp. Chiến lợi phẩm đã vào túi.` : `Boss còn ${fmt(Math.max(0, s.boss.hp))} máu. Nâng cấp trang bị ở Lò rèn rồi quay lại.`) : s.bt.opp === 'p2' ? 'Trận 2 người cùng máy không có phần thưởng.' : `Đối thủ ${TIERS[s.bt.tier].n}, sau ${s.round} hiệp.`;
  const rw = h('div', { class: 'rewards' });
  if (res && res.rewards) { for (const [k, v] of Object.entries(res.rewards.mats)) rw.append(h('span', { class: 'reward' }, matCanvas(k, 56), k === 'gold' ? 'Vàng' : MATS[k], ' ', h('b', {}, '×' + fmt(v))));
    for (const it of res.rewards.items) rw.append(h('span', { class: 'reward', style: `border-color:${TC(it.tier)}` }, iconCanvas(it, 56), h('span', { style: `color:${TC(it.tier)}` }, R.itemName(it)))); }
  if (!rw.children.length) rw.append(h('span', { class: 'muted' }, 'Không có'));
  const notes = [...((res && res.notes) || []), ...(err ? [err] : [])];
  box.append(h('div', {}, h('h2', { style: `color:${realWin ? 'var(--brass)' : 'var(--bad)'}` }, title), h('p', { class: 'muted', style: 'margin:6px 0 0' }, sub)),
    h('div', {}, h('span', { class: 'lbl' }, 'Phần thưởng'), h('div', { style: 'margin-top:6px' }, rw), notes.map((n) => h('p', { class: 'warnline', style: 'margin:6px 0 0' }, n))),
    h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Xạ thủ', 'Đội', 'Lực chiến', 'Sát thương', 'Chính xác', 'Hạ gục'].map((x) => h('th', {}, x)))),
      h('tbody', {}, s.heroes.map((x) => h('tr', {}, h('td', { style: `color:${TEAMC[x.team]}` }, x.name), h('td', {}, TEAMN[x.team]), h('td', {}, fmt(x.power)), h('td', {}, fmt(x.stats.dmg)), h('td', {}, x.stats.shots ? Math.round((x.stats.hits / x.stats.shots) * 100) + '%' : '–'), h('td', {}, x.stats.kills)))))),
    h('div', { class: 'row' }, h('button', { class: 'primary', type: 'button', id: 'btnAgain', onclick: () => { $('#result').hidden = true; startFight(lastCfg); } }, 'Đánh lại'), h('button', { class: 'btn', type: 'button', id: 'btnBack', onclick: () => { $('#result').hidden = true; exitBattle(); } }, 'Về sảnh')));
  $('#result').hidden = false;
}

/* =================== SOUND =================== */
let AC = null, soundOn = true;
function updSound() { try { if (soundOn) Music.resume(); else Music.stop(true); } catch (e) {} $('#btnSoundL').textContent = `Âm thanh: ${soundOn ? 'Bật' : 'Tắt'}`; $('#sndWave').style.display = soundOn ? '' : 'none'; }
function ensureAudio() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} }
function tone(f, d, type = 'sine', v = 0.12, slide = 0) { if (!AC || !soundOn) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); }
function noise(d, v, freq) { if (!AC || !soundOn) return; const t = AC.currentTime, len = Math.floor(AC.sampleRate * d), buf = AC.createBuffer(1, len, AC.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len); const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = v; s.connect(f).connect(g).connect(AC.destination); s.start(t); }
function sfx(k, r = 50) {
  if (k === 'fire') { tone(340, 0.16, 'square', 0.05, 0.45); noise(0.12, 0.12, 1800); }
  else if (k === 'ult') { tone(220, 0.5, 'sawtooth', 0.06, 2.2); noise(0.25, 0.18, 2200); }
  else if (k === 'boom') { noise(0.4 + r / 250, 0.32, 500 + r * 4); tone(95, 0.45, 'sine', 0.22, 0.4); }
  else if (k === 'heal') { tone(520, 0.18, 'sine', 0.07, 1.5); setTimeout(() => tone(780, 0.25, 'sine', 0.06, 1.3), 110); }
  else if (k === 'turn') tone(660, 0.08, 'triangle', 0.05);
  else if (k === 'win') [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.07), i * 140));
  else if (k === 'lose') [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.06), i * 180));
  else if (k === 'ok') { tone(660, 0.12, 'triangle', 0.07); setTimeout(() => tone(990, 0.25, 'triangle', 0.07), 110); }
  else if (k === 'bad') tone(200, 0.3, 'sawtooth', 0.06, 0.6);
}

/* =================== MUSIC =================== */
// Nhạc nền tạo bằng Web Audio, mỗi bản đồ một bài (thang âm, nhịp, tiếng đàn khác nhau). Không cần file nhạc.
let musicOn = lsGet('h2t-music') !== '0';
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], hijaz: [0, 1, 4, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], pmaj: [0, 2, 4, 7, 9], pmin: [0, 3, 5, 7, 10] };
const SONGS = {
  forest: { bpm: 100, root: 57, sc: 'major', prog: [0, 5, 3, 4], lead: 'triangle', drums: 1 },
  desert: { bpm: 90, root: 52, sc: 'hijaz', prog: [0, 1, 0, 6], lead: 'square', drums: 1 },
  snow: { bpm: 76, root: 62, sc: 'lydian', prog: [0, 4, 5, 3], lead: 'sine', bell: true, drums: 0 },
  volcano: { bpm: 136, root: 45, sc: 'minor', prog: [0, 5, 6, 4], lead: 'sawtooth', drums: 2 },
  ruins: { bpm: 84, root: 50, sc: 'dorian', prog: [0, 3, 6, 4], lead: 'triangle', drums: 1 },
  sky: { bpm: 116, root: 60, sc: 'pmaj', prog: [0, 3, 4, 2], lead: 'triangle', bell: true, drums: 1 },
  night: { bpm: 72, root: 55, sc: 'pmin', prog: [0, 3, 2, 4], lead: 'sine', drums: 0 },
  canyon: { bpm: 104, root: 53, sc: 'mixo', prog: [0, 6, 3, 0], lead: 'square', drums: 1 },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function seeded(str) { let a = 0; for (const ch of str) a = (a * 31 + ch.charCodeAt(0)) | 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Sinh bài: 8 ô nhịp × 8 nốt móc đơn, cấu trúc A A' B A cho dễ nhớ
function composeSong(id, boss) {
  const cfg = SONGS[id] || SONGS.forest, sc = SCALES[cfg.sc], rnd2 = seeded(id + (boss ? '!' : '')), L = sc.length;
  const deg = (d) => cfg.root + sc[((d % L) + L) % L] + 12 * Math.floor(d / L);
  const motif = () => { const out = []; let cur = 7 + Math.floor(rnd2() * 3); for (let i = 0; i < 16; i++) { const rest = rnd2() < (i % 2 ? 0.45 : 0.15); if (rest) { out.push(null); continue; } cur += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rnd2() * 8)]; cur = Math.max(4, Math.min(13, cur)); out.push({ d: cur, len: rnd2() < 0.3 ? 2 : 1 }); } return out; };
  const A = motif(), B = motif(), A2 = A.map((n) => (n && rnd2() < 0.3 ? { ...n, d: n.d + (rnd2() < 0.5 ? 1 : -1) } : n));
  const mel = [...A, ...A2, ...B, ...A], prog = [...cfg.prog, ...cfg.prog];
  return { cfg: { ...cfg, bpm: cfg.bpm * (boss ? 1.12 : 1), drums: boss ? Math.max(1, cfg.drums) : cfg.drums }, mel, prog, deg };
}
const Music = {
  song: null, id: null, timer: null, step: 0, next: 0, out: null, noise: null,
  play(id, boss) {
    this.id = id; this.boss = !!boss; if (!AC || !soundOn || !musicOn) { this.stop(true); return; }
    if (this.timer && this.key === id + boss) return;
    this.stop(true); this.key = id + boss; this.song = composeSong(id, boss); this.step = 0; this.next = AC.currentTime + 0.1;
    this.out = AC.createGain(); this.out.gain.setValueAtTime(0.0001, AC.currentTime); this.out.gain.exponentialRampToValueAtTime(0.55, AC.currentTime + 1.2); this.out.connect(AC.destination);
    if (!this.noise) { const len = AC.sampleRate * 0.2, buf = AC.createBuffer(1, len, AC.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; this.noise = buf; }
    this.timer = setInterval(() => this.tick(), 40); this.tick();
  },
  stop(keep) { if (this.timer) clearInterval(this.timer); this.timer = null; this.key = null;
    if (this.out && AC) { const o = this.out; o.gain.cancelScheduledValues(AC.currentTime); o.gain.setValueAtTime(Math.max(0.0001, o.gain.value), AC.currentTime); o.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.4); setTimeout(() => o.disconnect(), 600); }
    this.out = null; if (!keep) this.id = null; },
  resume() { if (this.id) this.play(this.id, this.boss); },
  tick() { const sd = 60 / this.song.cfg.bpm / 2; while (this.next < AC.currentTime + 0.25) { this.at(this.step, this.next, sd); this.next += sd; this.step++; } },
  note(t, midi, dur, type, vol) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
  at(step, t, sd) {
    const { cfg, mel, prog, deg } = this.song, i = step % 64, bar = Math.floor(i / 8), beat = i % 8, ch = prog[bar];
    const n = mel[i]; if (n) { const lv = cfg.lead === 'sawtooth' || cfg.lead === 'square' ? 0.028 : 0.05; this.note(t, deg(n.d + ch % 3), sd * (n.len + 0.6), cfg.lead, lv); if (cfg.bell) this.note(t, deg(n.d + ch % 3) + 12, sd * 2.5, 'sine', 0.015); }
    if (beat === 0) for (const k of [0, 2, 4]) this.note(t, deg(ch + k), sd * 7.5, 'triangle', 0.016);
    if (beat === 0 || beat === 4 || (cfg.drums > 1 && beat % 2 === 0)) this.note(t, deg(ch) - 24, sd * 1.6, cfg.drums > 1 ? 'sawtooth' : 'sine', cfg.drums > 1 ? 0.03 : 0.07);
    if (cfg.drums && (beat === 0 || beat === 4)) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.2); }
    if (cfg.drums && (beat % 2 === 1 || cfg.drums > 1)) { const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(beat % 2 ? 0.05 : 0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f).connect(g).connect(this.out); s.start(t); s.stop(t + 0.06); }
  },
};
function updMusic() { $('#btnMusicL').textContent = `Nhạc: ${musicOn ? 'Bật' : 'Tắt'}`; $('#musSlash').style.display = musicOn ? 'none' : ''; }
function toggleMusic() { ensureAudio(); musicOn = !musicOn; lsSet('h2t-music', musicOn ? '1' : '0'); updMusic(); if (musicOn) Music.resume(); else Music.stop(true); }
$('#btnMusicL').addEventListener('click', toggleMusic); $('#tMusic').addEventListener('click', toggleMusic); updMusic();
document.addEventListener('visibilitychange', () => { if (document.hidden) Music.stop(true); else if (S && !$('#battle').hidden) Music.resume(); });

/* =================== LOOP =================== */
let last = performance.now();
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (S && !$('#battle').hidden) { update(dt); draw(); updateHUD(); } requestAnimationFrame(frame); }
requestAnimationFrame(frame);
boot();
})();

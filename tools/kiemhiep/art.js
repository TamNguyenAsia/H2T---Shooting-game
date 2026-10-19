/* H2T-shooting — bộ hình kiếm hiệp cổ trang, vẽ bằng SVG.
   Chạy trong trình duyệt (tools/kiemhiep/render.py dùng Playwright) để xuất ra WebP theo đúng tên file
   mà game đang dùng: char/body, eq/<ô>/<kiểu>/<bậc>(i), items/*, use/*, mats/*, tier/aura*, tier/ring*.
   Toạ độ nhân vật trên khung 512×512: chân ở (256, 474), tay phải cầm vũ khí ở (362, 300), tay trái ở (176, 384). */
(function (root) {
'use strict';
const OUT = '#2a1712';
const SKIN = '#ffe2c8', SKIN_D = '#f2bf98', HAIR = '#1d1820', HAIR_L = '#3d3446';
const F_R = [362, 300], F_L = [176, 384];          // nắm tay phải (cầm vũ khí) và tay trái (đeo nhẫn)

/* Bảng màu theo bậc: c vải chính, d vải tối, l vải sáng, m kim loại/viền, mL viền sáng, mD viền tối, g đá quý, glow hào quang */
const P = [
  { c: '#8b95a5', d: '#586070', l: '#c6cdd8', m: '#a27a4c', mL: '#d9b585', mD: '#6b4a2b', g: '#86aac8', glow: null },
  { c: '#e3b143', d: '#a3741f', l: '#f8e3a2', m: '#f2d27a', mL: '#fff3c6', mD: '#a8761e', g: '#d8392e', glow: '#ffd76a' },
  { c: '#5c3e9b', d: '#30205a', l: '#9d85d8', m: '#dfe3ef', mL: '#ffffff', mD: '#8b90a8', g: '#c49dff', glow: '#a77bff' },
  { c: '#c7662a', d: '#773414', l: '#ef9f62', m: '#ecc66a', mL: '#fff1b6', mD: '#996c1d', g: '#35c58d', glow: '#ff9a4a' },
  { c: '#edf5fb', d: '#86b4d8', l: '#ffffff', m: '#5ab8ee', mL: '#cdeeff', mD: '#2d7db2', g: '#6fe0ff', glow: '#7fd8ff' },
  { c: '#b31f2e', d: '#620c17', l: '#ea5a5f', m: '#ffd04d', mL: '#fff4b4', mD: '#b4801a', g: '#ff8a3a', glow: '#ff5a3c' },
];

/* ---------- khung SVG ---------- */
class Doc {
  constructor(w, h, vb) { this.w = w; this.h = h; this.vb = vb || `0 0 ${w} ${h}`; this.defs = []; this.body = []; this.n = 0; }
  id(p) { Doc.N = (Doc.N || 0) + 1; return p + Doc.N; }
  add(...s) { this.body.push(...s); return this; }
  lg(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
    const id = this.id('lg');
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`);
    return `url(#${id})`;
  }
  rg(stops, cx = 0.5, cy = 0.5, r = 0.5, fx, fy) {
    const id = this.id('rg');
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ''}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`);
    return `url(#${id})`;
  }
  blur(std) { const id = this.id('bl'); this.defs.push(`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${std}"/></filter>`); return `url(#${id})`; }
  clip(inner) { const id = this.id('cp'); this.defs.push(`<clipPath id="${id}">${inner}</clipPath>`); return `url(#${id})`; }
  svg() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="${this.vb}"><defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>`; }
}
const ol = (w = 5) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const st = (w, extra) => (/(^|\s)stroke="/.test(extra) ? '' : w ? ol(w) : 'stroke="none"');
const fl = (fill, extra) => (/(^|\s)fill="/.test(extra) ? '' : `fill="${fill}"`);
const path = (d, fill, w = 5, extra = '') => `<path d="${d}" ${fl(fill, extra)} ${st(w, extra)} ${extra}/>`;
const circ = (x, y, r, fill, w = 5, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" ${fl(fill, extra)} ${st(w, extra)} ${extra}/>`;
const ell = (x, y, rx, ry, fill, w = 5, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${fl(fill, extra)} ${st(w, extra)} ${extra}/>`;
const line = (d, col, w, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" ${/stroke-linecap/.test(extra) ? '' : 'stroke-linecap="round"'} stroke-linejoin="round" ${extra}/>`;
const g = (inner, attr = '') => `<g ${attr}>${inner}</g>`;
const cloth = (D, p) => D.lg([[0, p.l], [0.45, p.c], [1, p.d]], 0, 0, 0.35, 1);
const metal = (D, p) => D.lg([[0, p.mL], [0.5, p.m], [1, p.mD]], 0, 0, 1, 1);
const gem = (D, p, x, y, r) => circ(x, y, r, D.rg([[0, '#ffffff'], [0.35, p.g], [1, shadeHex(p.g, -0.45)]], 0.35, 0.3, 0.75), 3) + circ(x - r * 0.3, y - r * 0.35, r * 0.28, '#ffffff', 0, 'opacity=".85"');
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; gg *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; gg += (255 - gg) * f; b += (255 - b) * f; }
  return '#' + [r, gg, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
// Hoạ tiết tường vân (mây cuộn) và ngọn lửa, dùng trang trí đồ bậc cao
function cloudPath(x, y, s) {
  return `M${x - 18 * s} ${y + 6 * s} C${x - 26 * s} ${y + 6 * s} ${x - 26 * s} ${y - 8 * s} ${x - 16 * s} ${y - 8 * s} C${x - 14 * s} ${y - 20 * s} ${x + 2 * s} ${y - 22 * s} ${x + 6 * s} ${y - 10 * s} C${x + 14 * s} ${y - 16 * s} ${x + 26 * s} ${y - 8 * s} ${x + 20 * s} ${y + 2 * s} C${x + 28 * s} ${y + 4 * s} ${x + 26 * s} ${y + 10 * s} ${x + 18 * s} ${y + 10 * s} Z`;
}
const cloud = (x, y, s, fill, w = 3) => path(cloudPath(x, y, s), fill, w) + line(`M${x - 8 * s} ${y + 1 * s} c${4 * s} ${-6 * s} ${12 * s} ${-4 * s} ${10 * s} ${3 * s}`, OUT, Math.max(1.5, w * 0.6), 'opacity=".6"');
function flamePath(x, y, s, lean = 0) {
  return `M${x} ${y} C${x - 14 * s} ${y - 8 * s} ${x - 12 * s + lean} ${y - 26 * s} ${x - 2 * s + lean} ${y - 40 * s} C${x + 2 * s + lean} ${y - 28 * s} ${x + 10 * s + lean} ${y - 26 * s} ${x + 6 * s + lean * 1.3} ${y - 50 * s} C${x + 22 * s + lean} ${y - 30 * s} ${x + 16 * s} ${y - 6 * s} ${x} ${y} Z`;
}
const flame = (D, x, y, s, lean = 0) => path(flamePath(x, y, s, lean), D.lg([[0, '#fff3b0'], [0.4, '#ffb03a'], [1, '#e8361f']], 0, 1, 0, 0), 3);
// Hào quang mờ phía sau một hình (bậc cao)
const halo = (D, inner, col, std, op = 0.8) => g(inner, `filter="${D.blur(std)}" opacity="${op}"`).replace(/fill="[^"]*"/g, `fill="${col}"`).replace(/stroke="[^"]*"/g, `stroke="${col}"`);

/* =================== NHÂN VẬT (thiếu hiệp, búi tóc, đuôi tóc dài) =================== */
function bodyParts(D) {
  const hair = D.lg([[0, HAIR_L], [1, HAIR]], 0, 0, 0.4, 1), skin = D.rg([[0, '#fff1e2'], [0.7, SKIN], [1, SKIN_D]], 0.42, 0.38, 0.65);
  const robe = D.lg([[0, '#ffffff'], [1, '#d9d2c6']], 0, 0, 0.3, 1);
  const s = [];
  // đuôi tóc bay phía sau
  s.push(path('M226 150 C150 162 112 236 120 318 C126 372 108 418 86 452 C138 440 168 396 166 340 C164 286 184 226 244 186 Z', hair));
  s.push(line('M150 230 C134 280 140 330 130 380', '#5a4f66', 3, 'opacity=".55"'));
  // khối tóc sau đầu
  s.push(path('M160 214 C152 134 202 98 256 98 C310 98 360 134 352 214 C352 252 344 282 334 304 L178 304 C168 282 160 252 160 214 Z', hair));
  // chân, ủng
  s.push(path('M206 404 L306 404 L310 448 L202 448 Z', D.lg([[0, '#4a4352'], [1, '#2a2530']]), 5));
  for (const x of [222, 290]) {
    s.push(path(`M${x - 26} 440 L${x + 22} 440 L${x + 24} 466 C${x + 24} 474 ${x + 18} 477 ${x + 10} 477 L${x - 26} 477 C${x - 34} 477 ${x - 34} 466 ${x - 26} 462 Z`, D.lg([[0, '#3a3240'], [1, '#141016']]), 5));
    s.push(line(`M${x - 28} 470 L${x + 20} 470`, '#e8e0d4', 3, 'opacity=".8"'));
    s.push(line(`M${x - 22} 446 L${x + 18} 446`, '#6a6070', 3));
  }
  // thân áo lót trắng, cổ áo giao lĩnh
  s.push(path('M198 312 C202 300 224 294 256 294 C288 294 310 300 314 312 L320 420 C300 432 212 432 192 420 Z', robe));
  s.push(path('M232 298 L262 356 L270 344 L246 298 Z', '#cfc5b4', 3));
  s.push(path('M280 298 L246 350 L240 340 L266 298 Z', '#e8e1d6', 3));
  s.push(path('M194 382 L318 382 L319 400 L193 400 Z', '#3b2a24', 4));
  s.push(path('M226 384 C214 398 214 420 222 432 L232 432 C228 418 230 404 238 396 Z', '#7a2a22', 3));
  // tay
  s.push(line('M306 318 C336 328 352 320 360 306', OUT, 42), line('M306 318 C336 328 352 320 360 306', robe, 32));
  s.push(line('M206 322 C190 340 182 360 177 380', OUT, 42), line('M206 322 C190 340 182 360 177 380', robe, 32));
  s.push(circ(F_R[0], F_R[1], 17, skin), circ(F_L[0], F_L[1], 17, skin));
  // cổ + mặt
  s.push(path('M240 276 L272 276 L270 300 L242 300 Z', SKIN_D, 4));
  s.push(ell(166, 216, 13, 18, skin, 4), ell(346, 216, 13, 18, skin, 4));
  s.push(ell(256, 208, 90, 84, skin));
  s.push(ell(196, 252, 16, 9, '#ff8a8a', 0, 'opacity=".38"'), ell(316, 252, 16, 9, '#ff8a8a', 0, 'opacity=".38"'));
  for (const [x, f] of [[218, 1], [294, -1]]) {
    s.push(ell(x, 224, 17, 22, '#ffffff', 4));
    s.push(ell(x + 1, 229, 13, 17, D.lg([[0, '#1c1016'], [0.6, '#4a2a1c'], [1, '#8a5a34']])));
    s.push(ell(x + 1, 231, 6, 8, '#120a0e', 0));
    s.push(circ(x - 5, 220, 5.5, '#ffffff', 0), circ(x + 6, 238, 2.6, '#ffffff', 0, 'opacity=".8"'));
    s.push(line(`M${x - 19} 214 C${x - 10} 200 ${x + 10} 200 ${x + 20} 212`, OUT, 6));
    s.push(line(`M${x - 22 * f} ${187} L${x + 18 * f} ${196}`, HAIR, 7));
  }
  s.push(line('M254 246 L256 252', '#d09070', 3));
  s.push(line('M242 264 Q256 274 270 264', '#9a4a3a', 4));
  // tóc mái nhọn
  s.push(path('M164 210 C158 140 200 108 256 108 C312 108 354 140 348 210 C340 190 334 178 324 170 C328 190 320 202 314 208 C304 188 294 176 280 168 C282 186 276 198 268 204 C260 182 248 170 234 164 C232 184 220 198 206 206 C202 188 194 178 186 172 C184 190 176 202 164 210 Z', hair));
  s.push(line('M206 132 C228 120 262 118 290 126', '#6a5f78', 4, 'opacity=".6"'));
  // tóc mai hai bên
  s.push(path('M172 186 C160 228 160 262 172 296 C178 272 182 242 188 210 Z', hair, 4));
  s.push(path('M340 186 C352 228 352 262 340 296 C334 272 330 242 324 210 Z', hair, 4));
  // búi tóc + dây buộc
  s.push(circ(256, 96, 28, hair));
  s.push(path('M234 112 L278 112 L280 124 L232 124 Z', '#b8322a', 4));
  s.push(line('M246 84 C252 78 262 78 268 84', '#6a5f78', 4, 'opacity=".6"'));
  return s;
}
function body() { const D = new Doc(512, 512); D.add(...bodyParts(D)); return D.svg(); }

root.KH = { P, Doc, ol, path, circ, ell, line, g, cloth, metal, gem, shadeHex, cloud, cloudPath, flame, flamePath, halo, bodyParts, body, OUT, SKIN, SKIN_D, F_R, F_L };
})(typeof window !== 'undefined' ? window : globalThis);

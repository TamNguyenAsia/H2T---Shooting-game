/* Icon trang sức, vật phẩm hỗ trợ, nguyên liệu, hào quang theo bậc; và danh sách toàn bộ hình cần xuất. */
(function (root) {
'use strict';
const KH = root.KH;
const { P, Doc, path, circ, ell, line, g, metal, gem, shadeHex, cloud, flame, OUT } = KH;
const JADE = ['#a9c9b4', '#f0d27a', '#b48cff', '#3fbf86', '#f4fbff', '#e8484a'];
const glowBg = (D, t, r = 70, cx = 80, cy = 80) => (P[t].glow ? circ(cx, cy, r, D.rg([[0, P[t].glow, t >= 4 ? 0.55 : 0.4], [1, P[t].glow, 0]]), 0) : '');
const jadeFill = (D, t) => D.rg([[0, '#ffffff'], [0.35, JADE[t]], [1, shadeHex(JADE[t], -0.45)]], 0.35, 0.3, 0.8);
const mtl = (D, t) => (t === 0 ? D.lg([[0, '#d9b585'], [0.5, '#a27a4c'], [1, '#6b4a2b']], 0, 0, 1, 1) : metal(D, P[t]));
const tassel = (D, t, x, y, len = 34) => {
  const col = [ '#b8322a', '#d8392e', '#8a5ae8', '#d8392e', '#5ab8ee', '#ffb03a'][t];
  return line(`M${x} ${y} L${x} ${y + 10}`, OUT, 4) + circ(x, y + 12, 6, mtl(D, t), 2.5) + path(`M${x - 8} ${y + 16} L${x + 8} ${y + 16} L${x + 10} ${y + 16 + len} L${x - 10} ${y + 16 + len} Z`, col, 3) + line(`M${x - 4} ${y + 20} L${x - 5} ${y + 12 + len} M${x + 4} ${y + 20} L${x + 5} ${y + 12 + len}`, OUT, 1.5, 'opacity=".4"');
};

/* ---------- Nhẫn (icon to, nhẫn dựng đứng) ---------- */
function ringIcon(type, t) {
  const D = new Doc(160, 160), p = P[t], mt = mtl(D, t), s = [glowBg(D, t)];
  const band = (col) => ell(80, 98, 38, 42, 'none', 0, `stroke="${OUT}" stroke-width="18"`) + ell(80, 98, 38, 42, 'none', 0, `stroke="${col}" stroke-width="11"`) + path('M50 80 A38 42 0 0 1 72 57', 'none', 0, 'stroke="#ffffff" stroke-width="3" opacity=".6"');
  if (type === 'twist') {
    s.push(band(jadeFill(D, t === 0 ? 0 : t)));
    for (let a = 0; a < 360; a += 30) { const r = (a * Math.PI) / 180; s.push(line(`M${80 + Math.cos(r) * 32} ${98 + Math.sin(r) * 36} L${80 + Math.cos(r + 0.25) * 44} ${98 + Math.sin(r + 0.25) * 48}`, OUT, 2, 'opacity=".35"')); }
    s.push(circ(80, 56, 11, mt, 3), gem(D, p, 80, 56, 6));
  } else {
    s.push(band(mt));
    if (type === 'solitaire') s.push(path('M62 66 L70 46 L90 46 L98 66 Z', mt, 4), circ(80, 44, 18, jadeFill(D, t), 4), circ(74, 38, 5, '#ffffff', 0, 'opacity=".8"'));
    if (type === 'signet') s.push(path('M56 34 L104 34 L104 70 L56 70 Z', mt, 4), path('M64 42 L96 42 L96 62 L64 62 Z', '#b8322a', 3), line('M70 48 L90 48 M80 44 L80 60 M72 56 L88 56', '#ffe8c8', 3));
    if (type === 'claw') { s.push(circ(80, 46, 15, jadeFill(D, t), 4), circ(75, 41, 4, '#ffffff', 0, 'opacity=".8"')); for (const d of [-1, 0, 1]) s.push(line(`M${80 + d * 18} 70 C${80 + d * 26} 52 ${80 + d * 20} 36 ${80 + d * 8} 28`, OUT, 9), line(`M${80 + d * 18} 70 C${80 + d * 26} 52 ${80 + d * 20} 36 ${80 + d * 8} 28`, t ? p.m : '#c8a878', 5)); }
    if (type === 'crown') s.push(path('M54 70 L52 36 L66 50 L80 26 L94 50 L108 36 L106 70 Z', mt, 4), gem(D, p, 80, 56, 7), circ(52, 36, 4, p.g, 2), circ(108, 36, 4, p.g, 2), circ(80, 26, 4, p.g, 2));
  }
  if (t >= 4) s.push(cloud(124, 36, 0.6, p.mL), cloud(36, 130, 0.5, p.mL));
  if (t === 5) s.push(flame(D, 128, 118, 0.6, 4), flame(D, 32, 60, 0.5, -4));
  D.add(...s); return D.svg();
}

/* ---------- Dây chuyền ---------- */
const NECK = {
  pendant(D, t) { // Ngọc Bội: ngọc bích tròn có lỗ, tua đỏ
    return line('M24 20 C30 70 60 72 80 74 C100 72 130 70 136 20', OUT, 6) + line('M24 20 C30 70 60 72 80 74 C100 72 130 70 136 20', t ? P[t].m : '#8a5a2e', 3) +
      path('M80 64 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0 Z M80 64 m-10 0 a10 10 0 1 1 20 0 a10 10 0 1 1 -20 0 Z', jadeFill(D, t), 4, 'fill-rule="evenodd" transform="translate(0 30)"') +
      line('M56 94 C62 82 74 80 80 84 M104 94 C98 106 86 108 80 104', '#ffffff', 2.5, 'opacity=".55"') + tassel(D, t, 80, 128, 18);
  },
  amulet(D, t) { // Trường Mệnh Tỏa: khoá bạc/vàng hình mây, chuông nhỏ
    const mt = mtl(D, t);
    return line('M30 18 C40 50 60 56 80 58 C100 56 120 50 130 18', OUT, 5) + line('M30 18 C40 50 60 56 80 58 C100 56 120 50 130 18', t ? P[t].mL : '#c8a878', 2.5) +
      path('M38 78 C38 60 58 56 66 66 C72 56 88 56 94 66 C102 56 122 60 122 78 C122 100 104 116 80 120 C56 116 38 100 38 78 Z', mt, 4) +
      path('M60 82 L100 82 L100 98 L60 98 Z', t ? shadeHex(P[t].g, -0.2) : '#b8322a', 3) + line('M68 90 L92 90 M80 84 L80 96', '#fff3c4', 2.5) +
      [56, 80, 104].map((x) => line(`M${x} 116 L${x} 126`, OUT, 2) + circ(x, 132, 6, mt, 2.5)).join('');
  },
  pearl(D, t) { // Chuỗi ngọc trai, viên chủ ở giữa
    let s = '';
    for (let i = 0; i <= 14; i++) { const a = Math.PI * (0.08 + (i / 14) * 0.84), x = 80 - Math.cos(a) * 58, y = 26 + Math.sin(a) * 66; s += circ(x, y, 7.5, D.rg([[0, '#ffffff'], [0.6, t === 5 ? '#ffd8d0' : t === 2 ? '#e6d8ff' : '#f2ece2'], [1, '#a89c8c']], 0.35, 0.3), 2.5); }
    return s + path('M80 92 L96 112 L80 140 L64 112 Z', mtl(D, t), 4) + gem(D, P[t], 80, 114, 9);
  },
  heart(D, t) { // Tâm Ngọc: ngọc hình tim, nút thắt đồng tâm
    return line('M28 18 C36 54 64 58 80 60 C96 58 124 54 132 18', OUT, 5) + line('M28 18 C36 54 64 58 80 60 C96 58 124 54 132 18', t ? P[t].m : '#8a5a2e', 2.5) +
      path('M76 54 L84 54 L86 66 L74 66 Z', t ? P[t].g : '#b8322a', 3) +
      path('M80 140 C40 116 30 92 42 78 C54 64 72 70 80 84 C88 70 106 64 118 78 C130 92 120 116 80 140 Z', jadeFill(D, t), 4) +
      line('M54 86 C58 80 66 80 70 86', '#ffffff', 3, 'opacity=".7"');
  },
  fang(D, t) { // Nanh hổ trên dây da, hạt gỗ
    let s = line('M26 20 C34 60 62 70 80 72 C98 70 126 60 134 20', OUT, 6) + line('M26 20 C34 60 62 70 80 72 C98 70 126 60 134 20', '#7a4a2a', 3);
    for (const [x, y] of [[50, 58], [110, 58], [64, 68], [96, 68]]) s += circ(x, y, 6, t ? jadeFill(D, t) : '#9a6a3a', 2.5);
    return s + path('M80 70 C96 74 102 96 92 122 C88 132 80 144 74 146 C76 126 70 104 66 88 C64 78 70 70 80 70 Z', D.lg([[0, '#fffaf0'], [1, '#d8c8a8']]), 4) + path('M70 74 L90 74 L88 86 L72 86 Z', mtl(D, t), 3) + (t >= 2 ? gem(D, P[t], 80, 80, 5) : '');
  },
};
/* ---------- Vòng tay ---------- */
const BRACE = {
  bangle(D, t) { const mt = mtl(D, t); return ell(80, 84, 56, 34, 'none', 0, `stroke="${OUT}" stroke-width="26"`) + ell(80, 84, 56, 34, 'none', 0, `stroke="${t === 0 ? '#c79a62' : P[t].m}" stroke-width="18"`) + path('M30 78 A56 34 0 0 1 130 78', 'none', 0, 'stroke="#ffffff" stroke-width="4" opacity=".55"') + cloud(80, 120, 0.7, mt, 2.5) + cloud(36, 96, 0.5, mt, 2) + cloud(124, 96, 0.5, mt, 2); },
  beads(D, t) {
    let s = '';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, x = 80 + Math.cos(a) * 52, y = 84 + Math.sin(a) * 32; s += circ(x, y, 9.5, t ? jadeFill(D, t) : D.rg([[0, '#d8a870'], [1, '#6e4724']], 0.35, 0.3), 3); }
    return s + circ(80, 120, 13, mtl(D, t), 3.5) + tassel(D, t, 80, 130, 10);
  },
  chain(D, t) {
    let s = '';
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = 80 + Math.cos(a) * 54, y = 84 + Math.sin(a) * 32; s += ell(x, y, 9, 6, 'none', 0, `stroke="${OUT}" stroke-width="7" transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})"`) + ell(x, y, 9, 6, 'none', 0, `stroke="${t ? P[t].m : '#b0b6c0'}" stroke-width="3.5" transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})"`); }
    return s + path('M68 108 L92 108 L92 128 L68 128 Z', mtl(D, t), 3.5) + (t >= 1 ? gem(D, P[t], 80, 118, 6) : '');
  },
  cuff(D, t) { // Hộ Uyển: bao cổ tay, đinh tán, dây buộc
    const mt = mtl(D, t), leather = t === 0 ? D.lg([[0, '#9a6a3a'], [1, '#5a3a1e']]) : D.lg([[0, P[t].l], [1, P[t].d]]);
    return path('M28 52 C60 40 100 40 132 52 L132 118 C100 130 60 130 28 118 Z', leather, 5) +
      path('M28 52 C60 40 100 40 132 52 L132 64 C100 52 60 52 28 64 Z', mt, 3.5) + path('M28 106 C60 118 100 118 132 106 L132 118 C100 130 60 130 28 118 Z', mt, 3.5) +
      [50, 80, 110].map((x) => circ(x, 86, 5, mt, 2.5)).join('') + line('M66 70 L94 100 M94 70 L66 100', OUT, 2.5, 'opacity=".45"') + (t >= 2 ? gem(D, P[t], 80, 86, 9) : '');
  },
  charm(D, t) { // Lắc chuông bạc
    let s = ell(80, 70, 56, 30, 'none', 0, `stroke="${OUT}" stroke-width="8"`) + ell(80, 70, 56, 30, 'none', 0, `stroke="${t ? P[t].m : '#c0c6d0'}" stroke-width="4"`);
    for (const [x, y] of [[40, 94], [80, 104], [120, 94]]) s += line(`M${x} ${y - 8} L${x} ${y}`, OUT, 2) + path(`M${x - 11} ${y + 18} C${x - 11} ${y + 4} ${x - 6} ${y} ${x} ${y} C${x + 6} ${y} ${x + 11} ${y + 4} ${x + 11} ${y + 18} Z`, mtl(D, t), 3) + circ(x, y + 19, 3, OUT, 0);
    return s + (t >= 1 ? gem(D, P[t], 80, 42, 7) : '');
  },
};
function jewelIcon(slot, type, t) {
  const D = new Doc(160, 160), p = P[t];
  D.add(glowBg(D, t), (slot === 'necklace' ? NECK : BRACE)[type](D, t));
  if (t >= 4) D.add(cloud(130, 140, 0.55, p.mL), cloud(28, 140, 0.45, p.mL));
  if (t === 5) D.add(flame(D, 140, 150, 0.45, 4));
  return D.svg();
}

/* ---------- Vật phẩm hỗ trợ (6) ---------- */
const ITEMS = {
  heal_potion(D) { // Hồi Xuân Đan: bình sứ trắng lam hồ lô
    const por = D.rg([[0, '#ffffff'], [0.7, '#eef2f8'], [1, '#b8c4d8']], 0.38, 0.32, 0.8);
    return ell(80, 148, 40, 7, '#000000', 0, 'opacity=".25"') + path('M80 26 C96 26 100 40 94 52 C116 60 128 82 126 104 C124 132 104 148 80 148 C56 148 36 132 34 104 C32 82 44 60 66 52 C60 40 64 26 80 26 Z', por, 5) +
      path('M50 92 C62 84 72 98 80 92 C88 86 98 98 110 92', 'none', 0, 'stroke="#2d6ab4" stroke-width="4" fill="none"') + cloud(80, 118, 0.85, 'none', 3).replace(/stroke="#2a1712"/g, 'stroke="#2d6ab4"') +
      path('M70 18 L90 18 L92 30 L68 30 Z', '#b8322a', 4) + path('M66 30 C72 36 88 36 94 30 L96 40 C88 46 72 46 64 40 Z', '#d8392e', 3) +
      path('M100 62 L120 70 L112 92 L94 84 Z', '#d8392e', 3) + line('M104 72 L112 76 M101 80 L109 84', '#fff3c4', 2.5);
  },
  crystal_shield(D) { // Kim Chung Tráo: chuông vàng, khí bao quanh
    const gold = D.lg([[0, '#fff3c0'], [0.5, '#f2c84a'], [1, '#a8761e']], 0, 0, 1, 1);
    return circ(80, 86, 66, D.rg([[0, '#ffe080', 0.55], [1, '#ffe080', 0]]), 0) + path('M72 18 L88 18 L88 30 L72 30 Z', gold, 4) +
      path('M80 28 C52 28 44 52 42 80 C40 104 34 116 24 126 L136 126 C126 116 120 104 118 80 C116 52 108 28 80 28 Z', gold, 5) +
      path('M22 122 L138 122 L140 138 L20 138 Z', gold, 4) + line('M48 70 L112 70 M46 96 L114 96', OUT, 3, 'opacity=".45"') +
      [56, 80, 104].map((x) => circ(x, 83, 5, '#fff3c0', 2.5)).join('') + path('M60 40 C56 54 54 66 54 74', 'none', 0, 'stroke="#ffffff" stroke-width="5" opacity=".6" fill="none" stroke-linecap="round"') + circ(80, 140, 7, gold, 3);
  },
  fire_rune(D) { // Hỏa Phù: lá bùa vàng chữ chu sa, đang cháy
    return path('M48 16 L112 16 L114 128 L46 128 Z', D.lg([[0, '#fff1a8'], [1, '#e8b840']]), 5) + path('M54 22 L106 22 L107 122 L53 122 Z', 'none', 0, 'stroke="#c8342a" stroke-width="2.5" fill="none"') +
      line('M80 30 L80 112 M66 44 L94 44 M64 62 C76 56 86 70 96 62 M68 80 L92 98 M92 80 L68 98', '#c8342a', 5) + circ(80, 108, 6, '#c8342a', 0) +
      flame(D, 60, 150, 0.85, -4) + flame(D, 98, 150, 0.9, 5) + flame(D, 80, 152, 1.1, 0);
  },
  frost_bomb(D) { // Hàn Băng Châu: viên ngọc băng, hơi lạnh
    let s = circ(80, 84, 64, D.rg([[0, '#bfefff', 0.6], [1, '#bfefff', 0]]), 0) + circ(80, 84, 46, D.rg([[0, '#ffffff'], [0.45, '#9fe2ff'], [1, '#2d7db2']], 0.35, 0.3, 0.8), 5);
    for (let a = 0; a < 6; a++) { const r = (a * Math.PI) / 3; s += line(`M80 84 L${80 + Math.cos(r) * 28} ${84 + Math.sin(r) * 28}`, '#ffffff', 4) + line(`M${80 + Math.cos(r) * 18} ${84 + Math.sin(r) * 18} L${80 + Math.cos(r + 0.5) * 24} ${84 + Math.sin(r + 0.5) * 24} M${80 + Math.cos(r) * 18} ${84 + Math.sin(r) * 18} L${80 + Math.cos(r - 0.5) * 24} ${84 + Math.sin(r - 0.5) * 24}`, '#ffffff', 2.5); }
    return s + circ(64, 66, 9, '#ffffff', 0, 'opacity=".8"') + cloud(36, 130, 0.7, '#e8f8ff') + cloud(124, 132, 0.6, '#e8f8ff');
  },
  wind_feather(D) { // Lông Hạc Ngự Phong: lông hạc trắng đầu đen, gió cuộn
    return line('M30 70 C52 56 70 70 66 84 C62 94 50 90 52 82', '#bfe8ff', 4) + line('M100 120 C122 112 138 124 132 138', '#bfe8ff', 4) +
      path('M40 140 C56 104 82 60 124 22 C130 46 120 84 98 108 C82 124 60 134 40 140 Z', D.lg([[0, '#ffffff'], [1, '#d8e4ee']], 0, 0, 1, 1), 5) +
      path('M124 22 C130 46 120 84 98 108 L110 92 C118 70 120 46 124 22 Z', '#2a2430', 3) + line('M40 140 C70 104 96 64 122 26', OUT, 3) +
      line('M60 120 L74 104 M70 110 L88 90 M82 96 L100 72', OUT, 1.8, 'opacity=".35"') + path('M40 140 L32 152', '#c8342a', 0, 'stroke="#c8342a" stroke-width="5"');
  },
  power_elixir(D) { // Đại Hoàn Đan: viên đan vàng trên đĩa sơn mài
    let s = '';
    for (let a = 0; a < 12; a++) { const r = (a * Math.PI) / 6; s += line(`M${80 + Math.cos(r) * 34} ${70 + Math.sin(r) * 34} L${80 + Math.cos(r) * 58} ${70 + Math.sin(r) * 58}`, '#ffd04d', 4, 'opacity=".6"'); }
    return s + ell(80, 118, 56, 18, D.lg([[0, '#d8392e'], [1, '#6a0f1a']]), 5) + ell(80, 112, 46, 12, '#8a1a22', 3) +
      circ(80, 76, 32, D.rg([[0, '#fff8d0'], [0.5, '#ffcf3a'], [1, '#b4801a']], 0.35, 0.3, 0.8), 5) + circ(70, 66, 8, '#ffffff', 0, 'opacity=".8"') + cloud(80, 88, 0.55, 'none', 2).replace(/stroke="#2a1712"/g, 'stroke="#a8761e"');
  },
};
function itemSvg(id, size) { const D = new Doc(size, size, '0 0 160 160'); D.add(ITEMS[id](D)); return D.svg(); }

/* ---------- Nguyên liệu ---------- */
const MATS = {
  gold(D) { // nén vàng + tiền đồng
    const gold = D.lg([[0, '#fff3c0'], [0.5, '#f2c84a'], [1, '#a8761e']], 0, 0, 1, 1);
    const coin = (x, y) => circ(x, y, 22, gold, 4) + path(`M${x - 7} ${y - 7} L${x + 7} ${y - 7} L${x + 7} ${y + 7} L${x - 7} ${y + 7} Z`, '#3a2a18', 2.5);
    return coin(40, 116) + coin(122, 120) + path('M22 96 C22 76 40 70 52 80 C60 58 100 58 108 80 C120 70 138 76 138 96 C138 120 112 132 80 132 C48 132 22 120 22 96 Z', gold, 5) +
      ell(80, 78, 26, 16, gold, 4) + line('M40 92 C60 100 100 100 120 92', '#ffffff', 4, 'opacity=".55"');
  },
  stone(D) { // đá cường hóa: huyền thiết
    return path('M30 110 L42 54 L80 30 L122 48 L134 104 L94 136 L50 132 Z', D.lg([[0, '#6d7a92'], [1, '#262c3a']], 0, 0, 1, 1), 5) +
      path('M42 54 L80 30 L122 48 L84 66 Z', '#9aa8c4', 3) + path('M84 66 L122 48 L134 104 L94 136 Z', 'none', 3, 'opacity=".5"') +
      [[62, 90], [100, 86], [76, 114]].map(([x, y]) => path(`M${x} ${y - 9} L${x + 4} ${y} L${x} ${y + 9} L${x - 4} ${y} Z`, '#7fd8ff', 0)).join('') + circ(76, 50, 4, '#ffffff', 0, 'opacity=".8"');
  },
  luck(D) { // Bùa may mắn: lá bùa vàng có ấn đỏ
    return path('M46 14 L114 14 L116 146 L44 146 Z', D.lg([[0, '#fff1a8'], [1, '#e8b840']]), 5) + path('M52 20 L108 20 L109 140 L51 140 Z', 'none', 0, 'stroke="#c8342a" stroke-width="2.5" fill="none"') +
      line('M80 28 L80 100 M64 40 L96 40 M62 58 C74 52 86 66 98 58 M66 76 L94 76', '#c8342a', 5) + circ(80, 120, 16, '#c8342a', 3) + line('M72 114 L88 126 M88 114 L72 126', '#fff1a8', 3);
  },
  guard(D) { // Bùa bảo hộ: ngọc bội bát quái
    let s = circ(80, 80, 56, jadeFill(D, 3), 5) + circ(80, 80, 40, 'none', 3, 'opacity=".5"');
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, x = 80 + Math.cos(a) * 47, y = 80 + Math.sin(a) * 47; s += line(`M${x - Math.sin(a) * 7} ${y + Math.cos(a) * 7} L${x + Math.sin(a) * 7} ${y - Math.cos(a) * 7}`, OUT, 3.5); }
    const tj = (x, y, r) => circ(x, y, r, '#ffffff', 3) + path(`M${x} ${y - r} A${r / 2} ${r / 2} 0 0 1 ${x} ${y} A${r / 2} ${r / 2} 0 0 0 ${x} ${y + r} A${r} ${r} 0 0 1 ${x} ${y - r} Z`, '#1a1020', 0) + circ(x, y - r / 2, r / 6, '#1a1020', 0) + circ(x, y + r / 2, r / 6, '#ffffff', 0) + circ(x, y, r, 'none', 3);
    return s + tj(80, 80, 26);
  },
};
function crystal(D, t) { // Tinh Thạch: cụm tinh thể theo màu bậc, đế mây
  const c = ['#c3bad0', '#f0c94a', '#a77bff', '#e08a3c', '#49c6ff', '#ff4d6d'][t];
  const fill = (k) => D.lg([[0, '#ffffff'], [0.35, c], [1, shadeHex(c, -0.5)]], 0, 0, 1, 1);
  return circ(80, 80, 66, D.rg([[0, c, 0.5], [1, c, 0]]), 0) + cloud(80, 132, 1.5, '#f4efe4') +
    path('M44 128 L36 70 L52 52 L62 120 Z', fill(), 4) + path('M116 128 L126 76 L110 60 L100 120 Z', fill(), 4) +
    path('M58 130 L56 46 L80 14 L104 46 L102 130 Z', fill(), 5) + path('M80 14 L88 46 L84 126 L76 126 L72 46 Z', '#ffffff', 0, 'opacity=".45"') + circ(70, 40, 4, '#ffffff', 0);
}
function matSvg(k) {
  const D = new Doc(160, 160);
  if (k[0] === 't') D.add(crystal(D, +k[1])); else D.add(MATS[k](D));
  return D.svg();
}

/* ---------- Hào quang + vòng dưới chân theo bậc (vẽ chế độ cộng sáng) ---------- */
function aura(t) {
  const D = new Doc(512, 512), p = P[t], col = p.glow || '#c8d0e0';
  D.add(ell(256, 300, 150, 190, D.rg([[0, col, t === 0 ? 0.08 : 0.42], [0.6, col, t === 0 ? 0.03 : 0.16], [1, col, 0]]), 0));
  if (t >= 2) for (let k = 0; k < 10 + t * 2; k++) { const a = -Math.PI / 2 + (k - (5 + t)) * 0.2, r0 = 150, r1 = 210 + (k % 3) * 22; D.add(line(`M${256 + Math.cos(a) * r0} ${300 + Math.sin(a) * r0} L${256 + Math.cos(a) * r1} ${300 + Math.sin(a) * r1}`, col, 3, 'opacity=".5"')); }
  if (t >= 3) D.add(cloud(130, 190, 1, 'none', 3).replace(/stroke="#2a1712"/g, `stroke="${col}"`), cloud(384, 180, 1, 'none', 3).replace(/stroke="#2a1712"/g, `stroke="${col}"`));
  if (t >= 4) D.add(circ(256, 210, 120, 'none', 0, `stroke="${col}" stroke-width="3" opacity=".35" stroke-dasharray="4 10"`));
  if (t === 5) for (const [x, y, s, l] of [[150, 420, 1.2, -6], [362, 420, 1.2, 6], [120, 330, 0.9, -8], [392, 330, 0.9, 8], [180, 250, 0.7, -4], [332, 250, 0.7, 4]]) D.add(g(flame(D, x, y, s, l), 'opacity=".75"'));
  return D.svg();
}
function footRing(t) {
  const D = new Doc(512, 512), p = P[t], col = p.glow || '#b8c0d0', cx = 256, cy = 462, rx = 150, ry = 38;
  const E = (k, w, op, dash = '') => ell(cx, cy, rx * k, ry * k, 'none', 0, `stroke="${col}" stroke-width="${w}" opacity="${op}" ${dash}`);
  D.add(ell(cx, cy, rx, ry, D.rg([[0, col, t === 0 ? 0.1 : 0.3], [1, col, 0]]), 0));
  D.add(E(1, 4, t === 0 ? 0.35 : 0.9));
  if (t >= 1) D.add(E(0.8, 2.5, 0.7, 'stroke-dasharray="10 8"'));
  if (t >= 2) for (let k = 0; k < 8; k++) { // tám quẻ bát quái quanh vòng
    const a = (k * Math.PI) / 4, x = cx + Math.cos(a) * rx * 0.9, y = cy + Math.sin(a) * ry * 0.9;
    for (let j = 0; j < 3; j++) { const broken = ((k >> j) & 1) === 1, dy = (j - 1) * 4.5; D.add(broken ? line(`M${x - 12} ${y + dy} L${x - 3} ${y + dy} M${x + 3} ${y + dy} L${x + 12} ${y + dy}`, col, 2.5, 'opacity=".9"') : line(`M${x - 12} ${y + dy} L${x + 12} ${y + dy}`, col, 2.5, 'opacity=".9"')); }
  }
  if (t >= 3) D.add(E(0.55, 3, 0.8));
  if (t >= 4) D.add(ell(cx, cy, 34, 9, 'none', 0, `stroke="${col}" stroke-width="3"`), path(`M${cx - 34} ${cy} C${cx - 17} ${cy - 9} ${cx + 17} ${cy + 9} ${cx + 34} ${cy}`, 'none', 0, `stroke="${col}" stroke-width="3" fill="none"`));
  if (t === 5) for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; D.add(g(flame(D, x, y + 4, 0.55, Math.cos(a) * 6), 'opacity=".85"')); }
  return D.svg();
}

/* ---------- Danh sách hình xuất ra (đúng tên file game đang dùng) ---------- */
const TYPES = {
  weapon: ['staff', 'sword', 'bow', 'scepter', 'spear'], hat: ['wizard', 'crown', 'hood', 'helmet', 'beret'],
  armor: ['robe', 'plate', 'mantle', 'scale', 'leather'], ring: ['solitaire', 'signet', 'twist', 'claw', 'crown'],
  necklace: ['pendant', 'amulet', 'pearl', 'heart', 'fang'], bracelet: ['bangle', 'beads', 'chain', 'cuff', 'charm'],
};
function base256() {
  const s = KH.stack([KH.body(), KH.layer('armor', 'robe', 1), KH.layer('hat', 'wizard', 1), KH.layer('weapon', 'sword', 1)]);
  return s.replace('width="512" height="512"', 'width="256" height="256"');
}
function ASSETS() {
  const a = [];
  a.push({ path: 'char/body.webp', w: 512, h: 512, svg: KH.body() }, { path: 'char/base.webp', w: 256, h: 256, svg: base256() });
  for (const slot of ['armor', 'hat', 'weapon', 'ring']) for (const ty of TYPES[slot]) for (let t = 0; t < 6; t++) {
    a.push({ path: `eq/${slot}/${ty}/${t}.webp`, w: 512, h: 512, svg: KH.layer(slot, ty, t) });
    a.push({ path: `eq/${slot}/${ty}/${t}i.webp`, w: 160, h: 160, svg: slot === 'ring' ? ringIcon(ty, t) : KH.icon(slot, ty, t) });
  }
  for (const slot of ['necklace', 'bracelet']) for (const ty of TYPES[slot]) for (let t = 0; t < 6; t++) a.push({ path: `eq/${slot}/${ty}/${t}i.webp`, w: 160, h: 160, svg: jewelIcon(slot, ty, t) });
  for (const id of Object.keys(ITEMS)) a.push({ path: `items/${id}.webp`, w: 160, h: 160, svg: itemSvg(id, 160) }, { path: `use/${id}.webp`, w: 320, h: 320, svg: itemSvg(id, 320) });
  for (const k of ['gold', 'stone', 't1', 't2', 't3', 't4', 't5', 'luck', 'guard']) a.push({ path: `mats/${k}.webp`, w: 160, h: 160, svg: matSvg(k) });
  for (let t = 0; t < 6; t++) a.push({ path: `tier/aura${t}.webp`, w: 512, h: 512, svg: aura(t) }, { path: `tier/ring${t}.webp`, w: 512, h: 512, svg: footRing(t) });
  return a;
}
KH.stack = KH.stack || ((svgs, w = 512, h = 512) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgs.join('')}</svg>`);
Object.assign(KH, { ringIcon, jewelIcon, itemSvg, matSvg, aura, footRing, ASSETS, TYPES_ALL: TYPES });
})(typeof window !== 'undefined' ? window : globalThis);

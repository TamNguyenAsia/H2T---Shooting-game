/* Trang bị mặc lên nhân vật: áo, nón, vũ khí, nhẫn — 5 kiểu × 6 bậc. Dùng chung khung 512×512 với char/body. */
(function (root) {
'use strict';
const { P, Doc, path, circ, ell, line, g, cloth, metal, gem, shadeHex, cloud, flame, halo, OUT, SKIN, SKIN_D, F_R, F_L } = root.KH;
const skinFill = (D) => D.rg([[0, '#fff1e2'], [0.7, SKIN], [1, SKIN_D]], 0.42, 0.38, 0.65);

/* ---------- phần dùng chung của áo ---------- */
const SLV_R = 'M304 316 C328 326 340 322 346 314', SLV_L = 'M208 320 C194 336 186 352 181 366';
function sleeves(D, fill, w = 44) {
  return [line(SLV_R, OUT, w + 10, 'stroke-linecap="butt"'), line(SLV_R, fill, w, 'stroke-linecap="butt"'),
    line(SLV_L, OUT, w + 10, 'stroke-linecap="butt"'), line(SLV_L, fill, w, 'stroke-linecap="butt"')].join('');
}
const cuffs = (col, w = 44) => line('M346 314 l0 0', col, 1) + line(`M${346 - 4} ${314 - 18} L${346 + 6} ${314 + 20}`, col, 7) + line(`M${181 - 21} ${366 - 2} L${181 + 21} ${366 + 6}`, col, 7);
function legsRedraw(D) {
  const s = [path('M206 404 L306 404 L310 448 L202 448 Z', D.lg([[0, '#4a4352'], [1, '#2a2530']]), 5)];
  for (const x of [222, 290]) {
    s.push(path(`M${x - 26} 440 L${x + 22} 440 L${x + 24} 466 C${x + 24} 474 ${x + 18} 477 ${x + 10} 477 L${x - 26} 477 C${x - 34} 477 ${x - 34} 466 ${x - 26} 462 Z`, D.lg([[0, '#3a3240'], [1, '#141016']]), 5));
    s.push(line(`M${x - 28} 470 L${x + 20} 470`, '#e8e0d4', 3, 'opacity=".8"'));
  }
  return s.join('');
}
const fists = (D) => circ(F_R[0], F_R[1], 17, skinFill(D)) + circ(F_L[0], F_L[1], 17, skinFill(D));
const TORSO = 'M196 312 C200 300 224 292 256 292 C288 292 312 300 316 312 L320 392 L192 392 Z';
function taiji(D, x, y, r, a, b) {
  return circ(x, y, r, a, 3) + path(`M${x} ${y - r} A${r / 2} ${r / 2} 0 0 1 ${x} ${y} A${r / 2} ${r / 2} 0 0 0 ${x} ${y + r} A${r} ${r} 0 0 1 ${x} ${y - r} Z`, b, 0) +
    circ(x, y - r / 2, r / 6, b, 0) + circ(x, y + r / 2, r / 6, a, 0) + circ(x, y, r, 'none', 3);
}
function lapel(D, p, t) {
  const trim = t ? metal(D, p) : shadeHex(p.d, -0.1);
  return path('M270 294 L250 346 L258 352 L284 300 Z', '#f2ede4', 3) + path('M228 294 L262 362 L278 352 L244 294 Z', trim, 4);
}
function sash(D, p, t, y = 380) {
  const col = t === 0 ? '#3b2a24' : t === 4 ? p.m : t === 2 ? '#1e1430' : shadeHex(p.d, -0.15);
  let s = path(`M190 ${y} L322 ${y} L323 ${y + 20} L189 ${y + 20} Z`, col, 4);
  s += path(`M226 ${y + 18} C214 ${y + 32} 214 ${y + 54} 222 ${y + 66} L234 ${y + 66} C230 ${y + 52} 232 ${y + 38} 240 ${y + 30} Z`, t >= 1 ? metal(D, p) : '#7a2a22', 3);
  if (t >= 2) s += gem(D, p, 256, y + 10, 8);
  return s;
}

/* ---------- 5 kiểu áo ---------- */
const ARMOR = {
  // Đạo Bào: áo dài tay rộng, Thái Cực trước bụng
  robe(D, t) {
    const p = P[t], cf = cloth(D, p), s = [];
    s.push(path('M194 330 L318 330 L336 458 C300 470 212 470 176 458 Z', cf));
    s.push(path('M178 446 C212 458 300 458 334 446 L336 458 C300 470 212 470 176 458 Z', t ? metal(D, p) : shadeHex(p.d, -0.1), 4));
    s.push(line('M256 400 L256 462', OUT, 3, 'opacity=".35"'));
    s.push(sleeves(D, cf, 46));
    s.push(path('M300 326 C320 342 340 346 352 330 L357 358 C338 370 312 362 298 346 Z', cf, 5));
    s.push(path('M198 332 C184 350 174 362 160 368 L194 374 C196 360 202 348 212 338 Z', cf, 5));
    s.push(line('M352 330 L357 358', t ? p.m : p.d, 6), line('M160 368 L194 374', t ? p.m : p.d, 6));
    s.push(path(TORSO, cf), lapel(D, p, t), sash(D, p, t));
    if (t >= 2) s.push(taiji(D, 256, 428, 16, t === 4 ? '#ffffff' : p.m, t === 4 ? p.mD : '#1a1020'));
    if (t >= 3) s.push(line('M182 432 C214 442 298 442 330 432', p.m, 3, 'stroke-dasharray="6 7"'));
    if (t >= 4) s.push(cloud(204, 448, 0.55, p.m), cloud(308, 448, 0.55, p.m), cloud(220, 330, 0.45, p.mL), cloud(292, 330, 0.45, p.mL));
    if (t === 5) s.push(flame(D, 186, 456, 0.5, -4), flame(D, 326, 456, 0.5, 4), flame(D, 256, 466, 0.45, 0));
    return s.join('');
  },
  // Chiến Giáp: giáp lá, hộ tâm kính, giáp vai
  plate(D, t) {
    const p = P[t], mt = metal(D, p), cf = cloth(D, p), s = [];
    s.push(path('M196 380 L316 380 L328 452 C296 462 216 462 184 452 Z', cf));
    s.push(path('M198 398 L250 398 L246 452 L190 446 Z', mt), path('M262 398 L314 398 L322 446 L266 452 Z', mt));
    for (const y of [412, 426, 440]) s.push(line(`M196 ${y} L248 ${y}`, OUT, 2.5, 'opacity=".5"'), line(`M264 ${y} L318 ${y}`, OUT, 2.5, 'opacity=".5"'));
    s.push(sleeves(D, shadeHex(p.d, -0.15), 42));
    s.push(path('M198 310 C204 298 226 292 256 292 C286 292 308 298 314 310 L318 388 L194 388 Z', mt));
    const clip = D.clip('<path d="M198 310 C204 298 226 292 256 292 C286 292 308 298 314 310 L318 388 L194 388 Z"/>');
    let rows = '';
    for (let y = 312, k = 0; y < 388; y += 13, k++) { rows += line(`M190 ${y} L322 ${y}`, OUT, 2, 'opacity=".45"'); for (let x = 196 + (k % 2) * 9; x < 320; x += 18) rows += line(`M${x} ${y} L${x} ${y + 13}`, OUT, 1.6, 'opacity=".3"'); }
    s.push(g(rows, `clip-path="${clip}"`));
    for (const x of [228, 284]) s.push(circ(x, 334, 17, D.rg([[0, p.mL], [1, p.m]], 0.35, 0.3), 4), circ(x, 334, 9, 'none', 2, 'opacity=".5"'));
    if (t >= 2) s.push(gem(D, p, 228, 334, 6), gem(D, p, 284, 334, 6));
    s.push(path('M188 378 L324 378 L325 398 L187 398 Z', '#3a2620', 4));
    s.push(t >= 3 ? circ(256, 388, 15, mt, 4) + circ(250, 385, 2.5, OUT, 0) + circ(262, 385, 2.5, OUT, 0) + line('M249 394 Q256 399 263 394', OUT, 2.5) : path('M244 380 L268 380 L268 396 L244 396 Z', mt, 3));
    s.push(path('M288 304 C316 294 344 306 344 332 C324 340 302 334 288 322 Z', mt), path('M224 304 C196 294 168 306 168 332 C188 340 210 334 224 322 Z', mt));
    s.push(line('M298 316 C312 314 326 318 336 326', OUT, 2.5, 'opacity=".45"'), line('M214 316 C200 314 186 318 176 326', OUT, 2.5, 'opacity=".45"'));
    if (t >= 4) s.push(cloud(338, 308, 0.6, p.mL), cloud(174, 308, 0.6, p.mL));
    if (t === 5) s.push(flame(D, 340, 304, 0.55, 6), flame(D, 172, 304, 0.55, -6));
    if (t >= 1) s.push(line('M200 300 C230 290 282 290 312 300', p.mL, 3, 'opacity=".8"'));
    return s.join('');
  },
  // Phi Phong: áo choàng sau lưng, cổ lông, khóa ngọc
  mantle(D, t) {
    const p = P[t], cf = cloth(D, p), s = [];
    const lining = t === 5 ? '#2a0a10' : t === 4 ? '#bfe2f8' : shadeHex(p.d, -0.25);
    s.push(path('M196 296 C140 312 112 392 100 472 C186 486 326 486 412 472 C400 392 372 312 316 296 Z', cf));
    s.push(line('M150 340 C134 380 126 420 120 460 M362 340 C378 380 386 420 392 460', OUT, 2.5, 'opacity=".3"'));
    s.push(path('M110 440 C126 460 140 472 152 478 L100 472 Z', lining, 3), path('M402 440 C386 460 372 472 360 478 L412 472 Z', lining, 3));
    if (t >= 3) s.push(line('M106 464 C190 478 322 478 406 464', p.m, 4));
    if (t >= 4) s.push(cloud(132, 420, 0.7, p.m), cloud(380, 420, 0.7, p.m));
    if (t === 5) s.push(flame(D, 112, 472, 0.6, -6), flame(D, 400, 472, 0.6, 6), flame(D, 150, 480, 0.5, -3), flame(D, 362, 480, 0.5, 3));
    s.push(legsRedraw(D));
    const tun = D.lg([[0, '#fbf8f2'], [1, '#d8d0c4']]);
    s.push(path('M198 312 C202 300 224 294 256 294 C288 294 310 300 314 312 L320 424 C300 434 212 434 192 424 Z', tun));
    s.push(sleeves(D, tun, 40), fists(D), lapel(D, P[0], 0), sash(D, p, t, 384));
    s.push(path('M196 304 C214 322 298 322 316 304 C318 292 296 284 256 284 C216 284 194 292 196 304 Z', t === 0 ? '#9a8a76' : metal(D, p)));
    s.push(line('M206 300 C230 312 282 312 306 300', OUT, 2.5, 'opacity=".4"'));
    s.push(t >= 1 ? gem(D, p, 256, 314, 9) : circ(256, 314, 7, '#6b4a2b', 3));
    return s.join('');
  },
  // Lân Giáp: áo giáp vảy cá ngoài trường bào
  scale(D, t) {
    const p = P[t], cf = D.lg([[0, shadeHex(p.d, 0.15)], [1, shadeHex(p.d, -0.2)]]), mt = metal(D, p), s = [];
    s.push(path('M194 330 L318 330 L332 452 C300 462 212 462 180 452 Z', cf));
    s.push(path('M256 404 L262 456 L250 456 Z', OUT, 0, 'opacity=".35"'));
    s.push(sleeves(D, cf, 42));
    s.push(path(TORSO, mt));
    const clip = D.clip(`<path d="${TORSO}"/>`);
    let sc = '';
    for (let y = 300, k = 0; y < 400; y += 12, k++) for (let x = 188 + (k % 2) * 8; x < 326; x += 16) sc += path(`M${x - 8} ${y} A8 9 0 0 0 ${x + 8} ${y}`, 'none', 2, 'opacity=".55"') + line(`M${x - 4} ${y + 4} A4 4 0 0 0 ${x + 3} ${y + 5}`, p.mL, 1.6, 'opacity=".7"');
    s.push(g(sc, `clip-path="${clip}"`));
    s.push(lapel(D, P[0], 0), sash(D, p, t));
    s.push(path('M290 306 C312 300 334 310 336 328 C318 332 300 326 290 316 Z', mt, 4), path('M222 306 C200 300 178 310 176 328 C194 332 212 326 222 316 Z', mt, 4));
    s.push(line('M334 300 L346 330', p.mD, 9), line('M334 300 L346 330', mt, 5));
    if (t >= 2) s.push(gem(D, p, 256, 326, 7));
    if (t >= 4) s.push(cloud(204, 444, 0.5, p.m), cloud(308, 444, 0.5, p.m));
    if (t === 5) s.push(flame(D, 336, 306, 0.5, 5), flame(D, 176, 306, 0.5, -5));
    return s.join('');
  },
  // Võ Phục: áo ngắn xẻ tà, đai to, hộ uyển
  leather(D, t) {
    const p = P[t], cf = cloth(D, p), s = [];
    s.push(sleeves(D, cf, 38));
    s.push(path('M196 312 C200 300 224 292 256 292 C288 292 312 300 316 312 L322 432 L262 438 L256 412 L250 438 L190 432 Z', cf));
    s.push(line('M194 424 L250 430 M262 430 L320 424', t ? p.m : shadeHex(p.d, -0.2), 5));
    s.push(path('M232 296 L262 352 L272 344 L248 296 Z', t ? metal(D, p) : shadeHex(p.d, -0.15), 4));
    s.push(path('M186 372 L326 372 L327 400 L185 400 Z', t >= 1 ? shadeHex(p.g, -0.25) : '#3b2a24', 4));
    s.push(path('M290 374 C306 380 312 396 306 412 L296 412 C298 398 294 388 284 384 Z', t >= 1 ? shadeHex(p.g, -0.1) : '#5a3a2a', 3));
    s.push(line('M330 302 L348 326', OUT, 22), line('M330 302 L348 326', t ? metal(D, p) : '#6b4a2b', 14));
    s.push(line('M196 346 L184 366', OUT, 22), line('M196 346 L184 366', t ? metal(D, p) : '#6b4a2b', 14));
    if (t >= 2) s.push(gem(D, p, 256, 386, 7));
    if (t >= 3) s.push(line('M206 330 C222 344 236 360 240 380', p.m, 3, 'opacity=".8" stroke-dasharray="5 6"'));
    if (t >= 4) s.push(cloud(214, 412, 0.5, p.m), cloud(300, 412, 0.5, p.m));
    if (t === 5) s.push(flame(D, 200, 434, 0.5, -4), flame(D, 312, 434, 0.5, 4));
    return s.join('');
  },
};

/* ---------- 5 kiểu nón ---------- */
const HAT = {
  // Nón Lá (đấu lạp), bậc cao có mạng che hai bên
  wizard(D, t) {
    const p = P[t], s = [];
    const straw = t === 0 ? D.lg([[0, '#efd9a4'], [1, '#b9925a']], 0, 0, 1, 1) : D.lg([[0, p.l], [0.5, p.c], [1, p.d]], 0, 0, 1, 1);
    if (t >= 2) s.push(path('M112 156 C108 220 118 280 130 330 L172 300 C160 252 160 206 168 168 Z', t === 5 ? '#ff6a5a' : p.l, 3, 'opacity=".55"'), path('M400 156 C404 220 394 280 382 330 L340 300 C352 252 352 206 344 168 Z', t === 5 ? '#ff6a5a' : p.l, 3, 'opacity=".55"'));
    s.push(ell(256, 156, 152, 30, shadeHex(t === 0 ? '#b9925a' : p.d, -0.1)));
    s.push(path('M104 156 L256 24 L408 156 C360 176 152 176 104 156 Z', straw));
    for (let k = 1; k < 6; k++) { const y = 24 + k * 22, hw = (152 * (y - 24)) / 132; s.push(line(`M${256 - hw} ${y} Q256 ${y + 8} ${256 + hw} ${y}`, OUT, 2, 'opacity=".28"')); }
    s.push(line('M256 24 L256 168', OUT, 2, 'opacity=".2"'));
    s.push(path('M150 150 C200 162 312 162 362 150 L366 160 C312 174 200 174 146 160 Z', t ? metal(D, p) : '#8a5a2a', 3));
    if (t >= 1) s.push(gem(D, p, 256, 160, 9));
    if (t >= 3) s.push(line('M256 24 L256 8', p.m, 5), circ(256, 8, 6, metal(D, p), 3));
    if (t >= 4) s.push(cloud(196, 118, 0.6, p.mL), cloud(316, 118, 0.6, p.mL));
    if (t === 5) s.push(flame(D, 140, 160, 0.5, -6), flame(D, 372, 160, 0.5, 6));
    s.push(line('M190 168 C200 230 226 286 252 296', '#6b4a2b', 3, 'opacity=".9"'), line('M322 168 C312 230 286 286 260 296', '#6b4a2b', 3, 'opacity=".9"'));
    return s.join('');
  },
  // Kim Quan: mũ nhỏ cài búi tóc + trâm ngang
  crown(D, t) {
    const p = P[t], mt = t === 0 ? D.lg([[0, '#c79a62'], [1, '#7a5230']]) : metal(D, p), s = [];
    if (t >= 2) s.push(path('M186 96 C162 140 150 200 146 262 C156 246 160 216 168 190 C172 160 180 128 194 104 Z', t === 5 ? '#ff6a5a' : p.c, 3), path('M330 86 C352 132 362 196 366 258 C356 242 352 212 344 186 C340 156 332 124 320 96 Z', t === 5 ? '#ff6a5a' : p.c, 3));
    s.push(path('M224 120 C222 92 230 66 256 60 C282 66 290 92 288 120 Z', mt));
    s.push(path('M222 112 L290 112 L292 126 L220 126 Z', t ? shadeHex(p.mD, -0.1) : '#5a3a20', 4));
    s.push(line('M240 70 C246 90 248 104 248 112 M272 70 C266 90 264 104 264 112', OUT, 2.5, 'opacity=".4"'));
    s.push(line('M186 98 L330 86', OUT, 11), line('M186 98 L330 86', t ? p.mL : '#d8c09a', 6));
    s.push(circ(332, 86, 8, mt, 3), circ(184, 98, 5, mt, 3));
    if (t >= 1) s.push(gem(D, p, 256, 88, 9));
    if (t >= 3) s.push(path('M244 62 L256 40 L268 62 Z', mt, 3), gem(D, p, 256, 52, 5));
    if (t >= 4) s.push(cloud(214, 80, 0.5, p.mL), cloud(300, 74, 0.5, p.mL));
    if (t === 5) s.push(flame(D, 256, 44, 0.55, 0), path('M332 86 C352 70 364 74 372 66 C368 84 354 92 336 92 Z', '#ff7a3a', 3));
    return s.join('');
  },
  // Mũ Cánh Chuồn: mũ quan sơn đen, hai cánh dài ngang
  hood(D, t) {
    const p = P[t], s = [], lac = D.lg([[0, '#3a3440'], [1, '#121014']]);
    const wingC = t === 0 ? '#2a2630' : t === 4 ? '#e8f4fc' : p.c;
    for (const d of [-1, 1]) {
      const x0 = 256 + d * 70;
      s.push(path(`M${x0} 132 L${256 + d * 176} 126 C${256 + d * 190} 126 ${256 + d * 190} 146 ${256 + d * 176} 146 L${x0} 144 Z`, wingC, 4));
      if (t >= 1) s.push(line(`M${256 + d * 172} 128 L${256 + d * 172} 144`, p.m, 5));
    }
    s.push(path('M170 178 C168 120 206 94 256 94 C306 94 344 120 342 178 C304 166 208 166 170 178 Z', lac));
    s.push(path('M214 112 C214 74 236 58 256 58 C276 58 298 74 298 112 Z', lac));
    s.push(path('M170 170 C210 158 302 158 342 170 L342 182 C302 170 210 170 170 182 Z', t ? metal(D, p) : '#5a5260', 3));
    s.push(line('M222 80 C232 68 246 64 256 64', '#6a6274', 4, 'opacity=".6"'));
    if (t >= 2) s.push(gem(D, p, 256, 160, 9));
    if (t >= 3) s.push(line('M212 112 L300 112', p.m, 4));
    if (t >= 4) s.push(cloud(256, 90, 0.5, p.m));
    if (t === 5) s.push(flame(D, 80, 136, 0.45, -8), flame(D, 432, 136, 0.45, 8));
    return s.join('');
  },
  // Mũ Trụ: mũ giáp tướng quân, chóp có tua đỏ (hồng anh)
  helmet(D, t) {
    const p = P[t], mt = t === 0 ? D.lg([[0, '#cfd4dc'], [0.5, '#9aa2ae'], [1, '#5a6270']], 0, 0, 1, 1) : metal(D, p), s = [];
    const plume = t === 4 ? '#ffffff' : t === 2 ? '#7a4ad8' : '#d22a2a';
    s.push(path('M244 56 C228 34 226 16 242 10 C250 24 262 24 270 10 C286 16 284 34 268 56 Z', plume, 4));
    s.push(path('M166 210 C150 160 170 92 256 86 C342 92 362 160 346 210 L330 214 C334 170 318 130 256 128 C194 130 178 170 182 214 Z', mt));
    s.push(path('M168 196 L184 196 C186 230 190 256 196 274 L174 270 C166 246 164 220 168 196 Z', mt, 4), path('M344 196 L328 196 C326 230 322 256 316 274 L338 270 C346 246 348 220 344 196 Z', mt, 4));
    s.push(path('M176 154 C214 136 298 136 336 154 L340 172 C298 156 214 156 172 172 Z', t ? shadeHex(p.mD, -0.05) : '#4a505a', 4));
    s.push(path('M246 56 L266 56 L272 90 L240 90 Z', mt, 4));
    for (const x of [208, 232, 280, 304]) s.push(circ(x, 160, 3.5, p.mL, 1.5));
    s.push(line('M196 112 C220 98 248 94 270 96', '#ffffff', 5, 'opacity=".45"'));
    if (t >= 1) s.push(gem(D, p, 256, 150, 9));
    if (t >= 3) s.push(path('M226 132 C232 108 244 98 256 96 C268 98 280 108 286 132 C276 120 266 116 256 116 C246 116 236 120 226 132 Z', p.m, 3));
    if (t >= 4) s.push(cloud(170, 150, 0.55, p.mL), cloud(342, 150, 0.55, p.mL));
    if (t === 5) s.push(flame(D, 176, 126, 0.55, -6), flame(D, 336, 126, 0.55, 6));
    return s.join('');
  },
  // Đầu Đới: dải băng trán, nơ buộc với hai dải lụa bay
  beret(D, t) {
    const p = P[t], s = [], band = t === 0 ? '#b8322a' : cloth(D, p);
    s.push(path('M168 176 C150 200 120 230 92 238 C110 248 140 240 162 218 C150 248 138 274 116 290 C150 286 172 258 178 228 Z', band, 4));
    s.push(path('M164 176 C194 150 318 150 348 176 L346 194 C316 170 196 170 166 194 Z', band, 4));
    s.push(ell(168, 186, 14, 12, band, 4));
    if (t >= 1) s.push(line('M170 172 C204 152 308 152 342 172', p.m, 3));
    if (t >= 1) s.push(path('M244 158 L268 158 L272 176 L240 176 Z', metal(D, p), 3), gem(D, p, 256, 167, 7));
    if (t >= 3) s.push(path('M104 240 L92 238 L100 246 Z', p.m, 2), circ(118, 290, 5, metal(D, p), 2.5), circ(94, 238, 5, metal(D, p), 2.5));
    if (t >= 4) s.push(cloud(214, 162, 0.42, p.mL), cloud(298, 162, 0.42, p.mL));
    if (t === 5) s.push(flame(D, 112, 292, 0.5, -6), flame(D, 92, 240, 0.45, -8), flame(D, 256, 156, 0.45, 0));
    return s.join('');
  },
};

/* ---------- 5 kiểu vũ khí: vẽ theo trục dọc, gốc ở nắm tay, rồi xoay nghiêng 12° ---------- */
const WANG = 12;
const WEAPON = {
  // Thiền Trượng: gậy dài, đầu vòng có khoen
  staff: { ext: [-250, 170], draw(D, t) {
    const p = P[t], wood = t === 0 ? D.lg([[0, '#b98a52'], [1, '#6e4724']], 0, 0, 1, 0) : t === 4 ? D.lg([[0, '#ffffff'], [1, '#9ccbea']], 0, 0, 1, 0) : D.lg([[0, p.l], [1, p.d]], 0, 0, 1, 0);
    const mt = t === 0 ? D.lg([[0, '#d8c7a8'], [1, '#8a7a5c']]) : metal(D, p), s = [];
    s.push(path('M-7 -186 L7 -186 L8 170 L-8 170 Z', wood, 5));
    for (const y of [-120, -40, 40, 120]) s.push(path(`M-10 ${y} L10 ${y} L10 ${y + 10} L-10 ${y + 10} Z`, mt, 3));
    s.push(path('M-9 160 L9 160 L6 178 L-6 178 Z', mt, 3));
    s.push(path('M0 -250 C34 -250 46 -222 38 -200 C32 -186 18 -182 10 -184 L-10 -184 C-18 -182 -32 -186 -38 -200 C-46 -222 -34 -250 0 -250 Z', 'none', 0, `stroke="${OUT}" stroke-width="9"`));
    s.push(path('M0 -250 C34 -250 46 -222 38 -200 C32 -186 18 -182 10 -184 L-10 -184 C-18 -182 -32 -186 -38 -200 C-46 -222 -34 -250 0 -250 Z', 'none', 0, `stroke="${t === 0 ? '#b8a07a' : p.m}" stroke-width="5"`));
    s.push(path('M-8 -188 L8 -188 L6 -244 L0 -262 L-6 -244 Z', mt, 4));
    for (const [x, y] of [[-40, -206], [-34, -186], [40, -206], [34, -186]]) s.push(circ(x, y + 10, 8, 'none', 0, `stroke="${t === 0 ? '#c8b088' : p.mL}" stroke-width="4"`), circ(x, y + 10, 8, 'none', 1.5, 'opacity=".5"'));
    if (t >= 2) s.push(gem(D, p, 0, -218, 9));
    if (t >= 4) s.push(g(cloud(0, -272, 0.7, p.mL), ''));
    if (t === 5) s.push(flame(D, 0, -262, 0.8, 0));
    return s.join('');
  } },
  // Trường Kiếm: kiếm thẳng hai lưỡi, kiếm tuệ (tua) ở chuôi
  sword: { ext: [-292, 50], tassel: 46, draw(D, t) {
    const p = P[t], mt = t === 0 ? D.lg([[0, '#c79a62'], [1, '#6e4724']]) : metal(D, p), s = [];
    const steel = t === 5 ? D.lg([[0, '#fff2d0'], [0.5, '#ffb84a'], [1, '#d24a22']], 0, 0, 1, 0) : t === 4 ? D.lg([[0, '#ffffff'], [0.5, '#d8f2ff'], [1, '#7cc2ea']], 0, 0, 1, 0) : D.lg([[0, '#f6f8fb'], [0.5, '#c8ced8'], [1, '#7c8494']], 0, 0, 1, 0);
    s.push(path('M-11 -26 L11 -26 L11 -262 L0 -292 L-11 -262 Z', steel, 5));
    s.push(line('M0 -36 L0 -270', OUT, 2, 'opacity=".35"'));
    if (t >= 3) s.push(line('M-4 -60 L-4 -230', p.g, 2.5, 'opacity=".9"'));
    s.push(path('M-30 -30 C-22 -18 -10 -16 0 -18 C10 -16 22 -18 30 -30 L26 -14 C16 -8 -16 -8 -26 -14 Z', mt, 4));
    s.push(path('M-7 -14 L7 -14 L7 34 L-7 34 Z', t === 0 ? '#3a2a24' : shadeHex(p.d, -0.2), 4));
    for (let y = -8; y < 34; y += 8) s.push(line(`M-7 ${y} L7 ${y + 6}`, t ? p.m : '#7a5a40', 2.5));
    s.push(circ(0, 42, 9, mt, 4));
    if (t >= 2) s.push(gem(D, p, 0, -21, 6));
    return s.join('');
  } },
  // Cung: cung sừng hai đầu cong ngược
  bow: { ext: [-170, 170], draw(D, t) {
    const p = P[t], wood = t === 0 ? '#8a5a2e' : t === 4 ? '#e8f6ff' : p.c, mt = t === 0 ? '#c8a878' : metal(D, p), s = [];
    s.push(line('M-14 -150 L-14 150', '#efe6d2', 2.5));
    s.push(path('M-16 -160 C-6 -170 8 -166 12 -150 C30 -90 34 -40 20 -14 L20 14 C34 40 30 90 12 150 C8 166 -6 170 -16 160 C-4 150 0 140 2 130 C14 80 16 40 6 14 L6 -14 C16 -40 14 -80 2 -130 C0 -140 -4 -150 -16 -160 Z', wood, 5));
    s.push(path('M4 -18 L22 -18 L22 18 L4 18 Z', mt, 4));
    for (const y of [-120, 120]) s.push(path(`M${y < 0 ? 4 : 4} ${y - 8} L18 ${y - 8} L18 ${y + 8} L4 ${y + 8} Z`, mt, 3));
    if (t >= 2) s.push(gem(D, p, 13, 0, 6));
    if (t >= 4) s.push(cloud(26, -150, 0.5, p.mL), cloud(26, 150, 0.5, p.mL));
    if (t === 5) s.push(flame(D, 16, -158, 0.5, 4), flame(D, 16, 166, 0.5, 4));
    return s.join('');
  } },
  // Hồng Anh Thương: thương dài, tua đỏ dưới mũi
  spear: { ext: [-292, 150], draw(D, t) {
    const p = P[t], wood = t === 0 ? D.lg([[0, '#b98a52'], [1, '#6e4724']], 0, 0, 1, 0) : D.lg([[0, p.l], [1, p.d]], 0, 0, 1, 0);
    const steel = t === 5 ? D.lg([[0, '#fff2d0'], [1, '#e0502a']], 0, 0, 1, 0) : t === 4 ? D.lg([[0, '#ffffff'], [1, '#8cc8ec']], 0, 0, 1, 0) : D.lg([[0, '#f6f8fb'], [1, '#7c8494']], 0, 0, 1, 0);
    const mt = t === 0 ? '#9aa2ae' : metal(D, p), red = t === 4 ? '#ffffff' : t === 2 ? '#8a5ae8' : '#d4262a', s = [];
    s.push(path('M-6 -224 L6 -224 L7 150 L-7 150 Z', wood, 5));
    s.push(path('M-20 -228 C-28 -214 -20 -196 0 -186 C20 -196 28 -214 20 -228 C16 -220 8 -216 0 -216 C-8 -216 -16 -220 -20 -228 Z', red, 4));
    s.push(line('M-10 -220 C-16 -206 -12 -196 -4 -190 M10 -220 C16 -206 12 -196 4 -190', OUT, 2, 'opacity=".4"'));
    s.push(path('M-9 -232 L9 -232 L9 -222 L-9 -222 Z', mt, 3));
    s.push(path('M0 -292 C14 -272 16 -248 8 -232 L-8 -232 C-16 -248 -14 -272 0 -292 Z', steel, 4));
    s.push(line('M0 -284 L0 -236', OUT, 2, 'opacity=".35"'));
    s.push(path('M-8 140 L8 140 L5 156 L-5 156 Z', mt, 3));
    if (t >= 2) s.push(gem(D, p, 0, -227, 5));
    if (t >= 4) s.push(cloud(18, -250, 0.45, p.mL));
    if (t === 5) s.push(flame(D, 0, -286, 0.5, 0));
    return s.join('');
  } },
  // Thiết Phiến: quạt sắt xoè, mặt quạt vẽ núi mây
  scepter: { ext: [-150, 30], fan: true, rot: 42, draw(D, t) {
    const p = P[t], s = [], R = 132, A = 62;
    const paper = t === 0 ? '#efe4cc' : t === 2 ? '#2c1e4a' : t === 5 ? '#7a1018' : t === 4 ? '#f4fbff' : p.l;
    const ink = t === 2 || t === 5 ? p.m : '#3a2a24';
    const pt = (a, r) => [Math.sin((a * Math.PI) / 180) * r, -Math.cos((a * Math.PI) / 180) * r];
    const [x1, y1] = pt(-A, R), [x2, y2] = pt(A, R), [x3, y3] = pt(A, 46), [x4, y4] = pt(-A, 46);
    s.push(path(`M${x4} ${y4} L${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} L${x3} ${y3} A46 46 0 0 0 ${x4} ${y4} Z`, paper, 5));
    const clip = D.clip(`<path d="M${x4} ${y4} L${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} L${x3} ${y3} A46 46 0 0 0 ${x4} ${y4} Z"/>`);
    s.push(g(path('M-120 -50 L-72 -98 L-44 -76 L0 -120 L40 -82 L72 -104 L120 -50 Z', ink, 0, 'opacity=".35"') + line('M-110 -70 C-60 -80 40 -78 110 -72', ink, 3, 'opacity=".4"') + circ(60, -112, 12, t === 5 ? '#ffd04d' : '#c8342a', 0, 'opacity=".7"'), `clip-path="${clip}"`));
    for (let a = -A; a <= A + 0.1; a += (2 * A) / 10) { const [x, y] = pt(a, R); s.push(line(`M0 0 L${x * 0.98} ${y * 0.98}`, t === 0 ? '#8a6a44' : p.mD, 2, 'opacity=".55"')); }
    const [ax, ay] = pt(-A - 4, R + 4), [bx, by] = pt(A + 4, R + 4);
    s.push(line(`M0 0 L${ax} ${ay}`, OUT, 11), line(`M0 0 L${ax} ${ay}`, t === 0 ? '#5a5a62' : p.m, 6), line(`M0 0 L${bx} ${by}`, OUT, 11), line(`M0 0 L${bx} ${by}`, t === 0 ? '#5a5a62' : p.m, 6));
    s.push(circ(0, 0, 9, t === 0 ? '#7a7a82' : metal(D, p), 4));
    if (t >= 2) s.push(gem(D, p, 0, -132, 7));
    if (t >= 4) s.push(cloud(-70, -130, 0.5, p.mL), cloud(70, -130, 0.5, p.mL));
    if (t === 5) s.push(flame(D, -84, -112, 0.45, -5), flame(D, 84, -112, 0.45, 5), flame(D, 0, -142, 0.5, 0));
    return s.join('');
  } },
};
// Ngón tay ôm chuôi (vẽ đè lên chuôi để thấy tay cầm thật)
function fingers(D) {
  const [x, y] = F_R;
  return path(`M${x - 15} ${y - 11} C${x - 4} ${y - 18} ${x + 10} ${y - 16} ${x + 16} ${y - 6} L${x + 16} ${y + 8} C${x + 8} ${y + 16} ${x - 6} ${y + 16} ${x - 15} ${y + 9} Z`, skinFill(D), 4) +
    line(`M${x - 13} ${y - 2} L${x + 12} ${y - 4} M${x - 13} ${y + 5} L${x + 12} ${y + 4}`, '#d09a78', 2.5);
}
function weaponLayer(D, type, t) {
  const W = WEAPON[type], p = P[t], s = [];
  const inner = W.draw(D, t);
  const tf = `transform="translate(${F_R[0]} ${F_R[1]}) rotate(${W.rot ?? WANG})"`;
  if (p.glow && t >= 2) s.push(g(inner, `${tf} filter="${D.blur(t >= 4 ? 14 : 9)}" opacity="${t >= 4 ? 0.9 : 0.6}"`).replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${p.glow}"`));
  s.push(g(inner, tf));
  if (W.tassel) { // kiếm tuệ rủ xuống theo trọng lực
    const a = (WANG * Math.PI) / 180, px = F_R[0] - Math.sin(a) * -W.tassel, py = F_R[1] + Math.cos(a) * W.tassel;
    const col = t === 4 ? '#e8f6ff' : t === 2 ? '#8a5ae8' : t === 0 ? '#b8322a' : t === 1 ? '#d8392e' : t === 3 ? '#35c58d' : '#ffb03a';
    s.push(line(`M${px} ${py} C${px - 2} ${py + 18} ${px - 8} ${py + 30} ${px - 12} ${py + 44}`, OUT, 5), circ(px - 4, py + 22, 6, t ? metal(D, p) : '#c8a878', 3));
    s.push(path(`M${px - 18} ${py + 40} L${px - 4} ${py + 40} L${px - 2} ${py + 78} L${px - 22} ${py + 74} Z`, col, 4));
  }
  s.push(fingers(D));
  return s.join('');
}

/* ---------- 5 kiểu nhẫn (đeo tay trái) ---------- */
const RING = {
  solitaire(D, t, x, y, k) { const p = P[t]; return ell(x, y + 8 * k, 13 * k, 5 * k, 'none', 0, `stroke="${t ? p.m : '#b08a5a'}" stroke-width="${4 * k}"`) + gem(D, { ...p, g: t === 0 ? '#5aa87a' : p.g }, x, y, 7 * k); },
  signet(D, t, x, y, k) { const p = P[t], mt = t ? metal(D, p) : '#b08a5a'; return ell(x, y + 8 * k, 13 * k, 5 * k, 'none', 0, `stroke="${t ? p.m : '#b08a5a'}" stroke-width="${4 * k}"`) + path(`M${x - 8 * k} ${y - 7 * k} L${x + 8 * k} ${y - 7 * k} L${x + 8 * k} ${y + 7 * k} L${x - 8 * k} ${y + 7 * k} Z`, mt, 2.5 * k) + path(`M${x - 4 * k} ${y - 3 * k} L${x + 4 * k} ${y - 3 * k} L${x + 4 * k} ${y + 3 * k} L${x - 4 * k} ${y + 3 * k} Z`, '#b8322a', 0); },
  twist(D, t, x, y, k) { const p = P[t], jade = t === 0 ? '#7ab890' : p.g; return ell(x, y + 6 * k, 13 * k, 6 * k, 'none', 0, `stroke="${jade}" stroke-width="${6 * k}"`) + line(`M${x - 12 * k} ${y + 4 * k} Q${x} ${y + 14 * k} ${x + 12 * k} ${y + 4 * k}`, '#ffffff', 2 * k, 'opacity=".6"'); },
  claw(D, t, x, y, k) { const p = P[t], mt = t ? p.m : '#b08a5a'; return ell(x, y + 8 * k, 13 * k, 5 * k, 'none', 0, `stroke="${mt}" stroke-width="${4 * k}"`) + gem(D, { ...p, g: t === 0 ? '#e8e0d0' : p.g }, x, y, 6 * k) + [-1, 0, 1].map((d) => line(`M${x + d * 8 * k} ${y + 5 * k} Q${x + d * 10 * k} ${y - 4 * k} ${x + d * 3 * k} ${y - 8 * k}`, mt, 2.5 * k)).join(''); },
  crown(D, t, x, y, k) { const p = P[t], mt = t ? metal(D, p) : '#b08a5a'; return ell(x, y + 8 * k, 13 * k, 5 * k, 'none', 0, `stroke="${t ? p.m : '#b08a5a'}" stroke-width="${4 * k}"`) + path(`M${x - 10 * k} ${y + 3 * k} C${x - 10 * k} ${y - 8 * k} ${x - 2 * k} ${y - 12 * k} ${x + 2 * k} ${y - 4 * k} C${x + 6 * k} ${y - 14 * k} ${x + 14 * k} ${y - 6 * k} ${x + 10 * k} ${y + 3 * k} Z`, mt, 2.2 * k) + circ(x + 1 * k, y - 2 * k, 2.6 * k, t ? p.g : '#c8342a', 0); },
};
function ringLayer(D, type, t) {
  const p = P[t], [x, y] = [F_L[0] + 3, F_L[1] - 4];
  let s = '';
  if (p.glow && t >= 2) s += circ(x, y, 16, p.glow, 0, `filter="${D.blur(6)}" opacity=".8"`);
  return s + RING[type](D, t, x, y, 1);
}

/* ---------- xuất từng layer ---------- */
function layer(slot, type, t) {
  const D = new Doc(512, 512);
  if (slot === 'armor') D.add(ARMOR[type](D, t));
  else if (slot === 'hat') D.add(HAT[type](D, t));
  else if (slot === 'weapon') D.add(weaponLayer(D, type, t));
  else if (slot === 'ring') D.add(ringLayer(D, type, t));
  return D.svg();
}
const ICON_BOX = { armor: [140, 284, 232], hat: { wizard: [96, 0, 320], crown: [176, 34, 160], hood: [60, -60, 392], helmet: [136, -6, 240], beret: [76, 96, 260] } };
function iconGlow(D, t, cx, cy, r) {
  const p = P[t]; if (!p.glow) return '';
  return circ(cx, cy, r, D.rg([[0, p.glow, t >= 4 ? 0.55 : 0.4], [1, p.glow, 0]]), 0);
}
// Icon 160×160 cho túi đồ / cửa hàng
function icon(slot, type, t) {
  if (slot === 'weapon') {
    const W = WEAPON[type], [a, b] = W.ext, len = b - a, k = (W.fan ? 0.62 : 1) * 178 / len;
    const D = new Doc(160, 160); D.add(iconGlow(D, t, 80, 80, 74));
    const inner = W.draw(D, t), rot = W.fan ? 0 : 45, mid = (a + b) / 2;
    const tf = `transform="translate(80 ${W.fan ? 128 : 80}) rotate(${rot}) scale(${k}) translate(0 ${W.fan ? 0 : -mid})"`;
    if (P[t].glow && t >= 2) D.add(g(inner, `${tf} filter="${D.blur(20)}" opacity=".7"`).replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${P[t].glow}"`));
    D.add(g(inner, tf));
    return D.svg();
  }
  if (slot === 'ring') { const D = new Doc(160, 160); D.add(iconGlow(D, t, 80, 80, 70), RING[type](D, t, 80, 76, 4.2)); return D.svg(); }
  const box = slot === 'armor' ? ICON_BOX.armor : ICON_BOX.hat[type];
  const D = new Doc(160, 160, `${box[0]} ${box[1]} ${box[2]} ${box[2]}`);
  D.add(iconGlow(D, t, box[0] + box[2] / 2, box[1] + box[2] / 2, box[2] * 0.46));
  D.add(slot === 'armor' ? ARMOR[type](D, t) : HAT[type](D, t));
  return D.svg();
}

Object.assign(root.KH, { ARMOR, HAT, WEAPON, RING, layer, icon, fingers });
})(typeof window !== 'undefined' ? window : globalThis);

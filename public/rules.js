/* H2T-shooting — luật game dùng chung cho server (Node) và trình duyệt.
 * Mọi thay đổi hồ sơ người chơi (mặc đồ, nâng cấp, mua, phần thưởng) đi qua apply().
 * Trên server, apply() chạy với dữ liệu trong PostgreSQL nên người chơi không tự sửa được kết quả. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.H2T = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TIERS = [
    { n: 'Cơ bản', c: '#c3bad0', m: 1 },
    { n: 'Hoàng cấp', c: '#f0c94a', m: 1.8 },
    { n: 'Huyền cấp', c: '#a77bff', m: 3.2 },
    { n: 'Địa cấp', c: '#e08a3c', m: 5.7 },
    { n: 'Thiên cấp', c: '#49c6ff', m: 10 },
    { n: 'Tuyệt cấp', c: '#ff4d6d', m: 17.6 },
  ];
  const STATS = [['atk', 'Tấn công'], ['def', 'Phòng thủ'], ['hp', 'Sinh lực'], ['crit', 'Chí mạng'], ['agi', 'Nhanh nhẹn'], ['luk', 'May mắn']];
  const STATN = Object.fromEntries(STATS);
  const BASE = { atk: 100, def: 40, hp: 1000, crit: 20, agi: 30, luk: 10 };
  const SLOT_ORDER = ['weapon', 'hat', 'armor', 'support', 'necklace', 'ring', 'bracelet'];
  const SLOTS = {
    weapon: { n: 'Vũ khí', up: true, typed: true, base: { atk: 40, crit: 12, luk: 6 } },
    hat: { n: 'Nón', up: true, typed: true, base: { def: 22, hp: 120, agi: 6 } },
    armor: { n: 'Áo', up: true, typed: true, base: { hp: 240, def: 30 } },
    support: { n: 'Hỗ trợ', up: true, base: { agi: 16, hp: 90 } },
    necklace: { n: 'Dây chuyền', up: false, typed: true, base: { atk: 22, hp: 110, crit: 6, luk: 16 }, names: ['Dây Gỗ', 'Kim Ngọc Liên', 'Huyền Châu Liên', 'Địa Tâm Liên', 'Thiên Tinh Liên', 'Thần Ấn Liên'] },
    ring: { n: 'Nhẫn', up: false, typed: true, base: { crit: 24, atk: 16, luk: 20 } },
    bracelet: { n: 'Vòng tay', up: false, typed: true, base: { agi: 28, def: 14, hp: 60, luk: 12 }, names: ['Vòng Dây', 'Kim Xà Trạc', 'Huyền Phong Trạc', 'Địa Linh Trạc', 'Thiên Vân Trạc', 'Thần Phong Trạc'] },
  };
  // Kiểu trang bị (theo gói hình fantasy): mỗi ô có 5 kiểu, mỗi kiểu 6 bậc. Kiểu chỉ đổi ngoại hình và tên, không đổi chỉ số.
  const TSUF = ['Sơ Khai', 'Hổ Phách', 'Nguyệt Huyền', 'Địa Linh', 'Thiên Dực', 'Phượng Hoàng'];
  const tn = (n) => TSUF.map((x) => n + ' ' + x);
  const TYPES = {
    weapon: { staff: { n: 'Trượng', names: ['Gậy Gỗ Sơ Khai', 'Trượng Hổ Phách', 'Nguyệt Huyền Trượng', 'Địa Linh Ngọc Trượng', 'Thiên Dực Thánh Trượng', 'Tuyệt Thế Phượng Hoàng Trượng'] },
      sword: { n: 'Kiếm', names: tn('Kiếm') }, bow: { n: 'Cung', names: tn('Cung') }, scepter: { n: 'Quyền Trượng', names: tn('Quyền Trượng') }, spear: { n: 'Thương', names: tn('Thương') } },
    hat: { wizard: { n: 'Mũ Phù Thủy', names: tn('Mũ Phù Thủy') }, crown: { n: 'Vương Miện', names: tn('Vương Miện') }, hood: { n: 'Mũ Trùm', names: tn('Mũ Trùm') },
      helmet: { n: 'Mũ Giáp', names: tn('Mũ Giáp') }, beret: { n: 'Mũ Lông Vũ', names: tn('Mũ Lông Vũ') } },
    armor: { robe: { n: 'Pháp Bào', names: tn('Pháp Bào') }, plate: { n: 'Giáp Ngực', names: tn('Giáp Ngực') }, mantle: { n: 'Áo Choàng Vai', names: tn('Áo Choàng Vai') },
      scale: { n: 'Giáp Vảy', names: tn('Giáp Vảy') }, leather: { n: 'Giáp Da', names: tn('Giáp Da') } },
    ring: { solitaire: { n: 'Nhẫn Ngọc', names: tn('Nhẫn Ngọc') }, signet: { n: 'Nhẫn Ấn', names: tn('Nhẫn Ấn') }, twist: { n: 'Nhẫn Xoắn', names: tn('Nhẫn Xoắn') },
      claw: { n: 'Nhẫn Long Trảo', names: tn('Nhẫn Long Trảo') }, crown: { n: 'Nhẫn Vương Miện', names: tn('Nhẫn Vương Miện') } },
  };
  TYPES.necklace = { pendant: { n: 'Dây Ngọc Bội', names: tn('Dây Ngọc Bội') }, amulet: { n: 'Bùa Hộ Mệnh', names: tn('Bùa Hộ Mệnh') }, pearl: { n: 'Chuỗi Ngọc Trai', names: tn('Chuỗi Ngọc Trai') },
    heart: { n: 'Mặt Dây Tâm Ngọc', names: tn('Mặt Dây Tâm Ngọc') }, fang: { n: 'Vòng Cổ Nanh Thú', names: tn('Vòng Cổ Nanh Thú') } };
  TYPES.bracelet = { bangle: { n: 'Kim Trạc', names: tn('Kim Trạc') }, beads: { n: 'Chuỗi Hạt', names: tn('Chuỗi Hạt') }, chain: { n: 'Lắc Xích', names: tn('Lắc Xích') },
    cuff: { n: 'Hộ Uyển', names: tn('Hộ Uyển') }, charm: { n: 'Lắc Bùa', names: tn('Lắc Bùa') } };
  const DEFAULT_TYPE = { weapon: 'staff', hat: 'wizard', armor: 'robe', ring: 'solitaire', necklace: 'pendant', bracelet: 'bangle' };
  // Vật phẩm hỗ trợ: 6 loại, mỗi loại có hình riêng trong assets/items và assets/use
  const SUP = {
    heal: { n: 'Bình Hồi Phục', img: 'heal_potion', names: ['Bình Hồi Phục', 'Bình Hồi Phục Hoàng', 'Bình Hồi Phục Huyền', 'Bình Hồi Phục Địa', 'Bình Hồi Phục Thiên', 'Bình Hồi Phục Tuyệt'] },
    shield: { n: 'Khiên Pha Lê', img: 'crystal_shield', names: ['Khiên Pha Lê', 'Khiên Pha Lê Hoàng', 'Khiên Pha Lê Huyền', 'Khiên Pha Lê Địa', 'Khiên Pha Lê Thiên', 'Khiên Pha Lê Tuyệt'] },
    fire: { n: 'Đá Rune Lửa', img: 'fire_rune', names: ['Đá Rune Lửa', 'Rune Lửa Hoàng', 'Rune Lửa Huyền', 'Rune Lửa Địa', 'Rune Lửa Thiên', 'Rune Lửa Tuyệt'] },
    frost: { n: 'Bom Băng Giá', img: 'frost_bomb', names: ['Bom Băng Giá', 'Bom Băng Hoàng', 'Bom Băng Huyền', 'Bom Băng Địa', 'Bom Băng Thiên', 'Bom Băng Tuyệt'] },
    wind: { n: 'Lông Vũ Gió', img: 'wind_feather', names: ['Lông Vũ Gió', 'Lông Vũ Gió Hoàng', 'Lông Vũ Gió Huyền', 'Lông Vũ Gió Địa', 'Lông Vũ Gió Thiên', 'Lông Vũ Gió Tuyệt'] },
    elixir: { n: 'Tiên Dược Vàng', img: 'power_elixir', names: ['Tiên Dược Vàng', 'Tiên Dược Hoàng', 'Tiên Dược Huyền', 'Tiên Dược Địa', 'Tiên Dược Thiên', 'Tiên Dược Tuyệt'] },
  };
  const SUP_KINDS = Object.keys(SUP);
  const SUP_MIGRATE = { scope: 'wind' };
  const MATS = { stone: 'Đá cường hóa', t1: 'Hoàng Tinh Thạch', t2: 'Huyền Tinh Thạch', t3: 'Địa Tinh Thạch', t4: 'Thiên Tinh Thạch', t5: 'Thần Tinh Thạch', luck: 'Bùa may mắn', guard: 'Bùa bảo hộ' };
  const LV_RATE = [[95, 90, 85], [80, 74, 68], [62, 56, 50], [45, 40, 35], [30, 25, 20], [15, 11, 8]];
  const BREAK_RATE = [70, 55, 40, 26, 14];
  const LUCK_BONUS = 15;
  const INV_CAP = 80;
  const START_GOLD = 2000;
  const lvCost = (t, l) => ({ stone: (l + 1) * (2 + t * 4), gold: 100 * (t + 1) * (l + 1) });
  const breakCost = (t) => ({ stone: 10 * (t + 1), ['t' + (t + 1)]: 1 + Math.floor(t / 2), gold: 1000 * (t + 1) });
  const SHOTS = [
    { n: 'Đạn thường', sub: 'Sát thương ×1.7', mul: 1.7, r: 50 },
    { n: 'Tam liên', sub: '3 viên, mỗi viên ×0.75', mul: 0.75, r: 38, count: 3, spread: 5, cd: 3 },
    { n: 'Tuyệt kỹ', sub: '×3.6, nổ rất rộng', mul: 3.6, r: 92, crater: 1.4, ult: true },
  ];
  const BOSSES = [
    { n: 'Gấu Đá Rừng Sâu', t: 0, col: '#8f7a66', horn: 0, map: 'forest' },
    { n: 'Kim Sư Vương', t: 1, col: '#c99a34', horn: 1, map: 'desert' },
    { n: 'Huyền Quy Lão Tổ', t: 2, col: '#5f4ca6', horn: 2, map: 'ruins' },
    { n: 'Địa Ma Vương', t: 3, col: '#a9502b', horn: 3, map: 'volcano' },
    { n: 'Thiên Lôi Điểu', t: 4, col: '#2c86c4', horn: 4, map: 'snow' },
    { n: 'Thần Long Thái Cổ', t: 5, col: '#b8293f', horn: 5, map: 'night' },
  ];
  const MAPS = [
    { id: 'forest', n: 'Rừng Xanh' }, { id: 'desert', n: 'Sa Mạc Vàng' }, { id: 'snow', n: 'Đỉnh Tuyết' }, { id: 'volcano', n: 'Núi Lửa' },
    { id: 'ruins', n: 'Thành Cổ' }, { id: 'sky', n: 'Đảo Trời' }, { id: 'night', n: 'Biển Đêm' }, { id: 'canyon', n: 'Hẻm Núi' },
  ];
  const SHOP = [
    { id: 'box0', n: 'Rương Cơ bản', desc: '1 trang bị Cơ bản ngẫu nhiên, có thể là trang sức', price: 300, tier: 0 },
    { id: 'box1', n: 'Rương Hoàng cấp', desc: '1 trang bị Hoàng cấp ngẫu nhiên, có thể là trang sức', price: 4000, tier: 1 },
    { id: 'box2', n: 'Rương Huyền cấp', desc: '1 trang bị Huyền cấp ngẫu nhiên, có thể là trang sức', price: 16000, tier: 2 },
  ];
  // Tiệm vũ khí: người chơi chọn kiểu + bậc, giá cao hơn rương vì không phải ngẫu nhiên
  const WEAPON_SHOP = [{ tier: 0, price: 800 }, { tier: 1, price: 9000 }, { tier: 2, price: 32000 }];
  const MIN_WIN_MS = 15000;
  // Ngoại hình: g = giới tính (0 nam, 1 nữ), hs = kiểu tóc, hc = màu tóc, ec = màu mắt
  const LOOK = { g: 2, hs: 3, hc: 7, ec: 5 };
  const DEFAULT_LOOK = { g: 0, hs: 0, hc: 0, ec: 0 };

  /* ---------- items ---------- */
  const pick = (a, rng) => a[Math.floor(rng() * a.length)];
  function uid(rng) { return 'i' + Date.now().toString(36) + Math.floor(rng() * 1e9).toString(36); }
  function mkItem(slot, tier, lvl, roll, kind, rng) {
    rng = rng || Math.random;
    const it = { uid: uid(rng), slot, tier: clampInt(tier, 0, 5), lvl: SLOTS[slot].up ? clampInt(lvl || 0, 0, 3) : 0, roll: Math.round((roll || 1) * 100) / 100 };
    if (slot === 'support') it.kind = SUP[kind] ? kind : pick(SUP_KINDS, rng);
    else if (TYPES[slot]) it.type = TYPES[slot][kind] ? kind : pick(Object.keys(TYPES[slot]), rng);
    return it;
  }
  function clampInt(v, a, b) { v = Math.floor(Number(v) || 0); return Math.max(a, Math.min(b, v)); }
  function itemName(it) {
    if (it.slot === 'support') return (SUP[it.kind] || SUP.heal).names[it.tier];
    if (TYPES[it.slot]) return (TYPES[it.slot][it.type] || TYPES[it.slot][DEFAULT_TYPE[it.slot]]).names[it.tier];
    return SLOTS[it.slot].names[it.tier];
  }
  function typeName(it) { return it.slot === 'support' ? (SUP[it.kind] || SUP.heal).n : TYPES[it.slot] ? (TYPES[it.slot][it.type] || {}).n : SLOTS[it.slot].n; }
  // Cường hoá: mỗi level +25% chỉ số của món (Lv3 = +75%). Hệ số bậc được chọn để đột phá lên bậc mới (Lv0) vẫn mạnh hơn Lv3 bậc cũ.
  const LV_BONUS = 0.25;
  const lvMul = (lvl) => 1 + LV_BONUS * (lvl || 0);
  function itemStats(it) { const o = {}, b = SLOTS[it.slot].base, m = TIERS[it.tier].m * lvMul(it.lvl) * it.roll; for (const k in b) o[k] = Math.round(b[k] * m); return o; }
  // Sức mạnh kỹ năng: hồi máu/giáp tính theo điểm, các loại còn lại tính theo %
  function supPower(it) {
    const m = TIERS[it.tier].m * lvMul(it.lvl) * it.roll;
    switch (it.kind) {
      case 'heal': return Math.round(150 * m);
      case 'shield': return Math.round(200 * m);
      case 'fire': return Math.round(15 + it.tier * 5 + it.lvl * 2);
      case 'frost': return Math.round(5 + it.tier * 2 + it.lvl);
      case 'elixir': return Math.min(100, Math.round(40 + it.tier * 10 + it.lvl * 3));
      default: return Math.round(10 + it.tier * 3 + it.lvl); // wind
    }
  }
  const SUP_CD = { heal: 3, shield: 3, fire: 3, frost: 4, wind: 3, elixir: 4 };
  const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
  function supDesc(it) {
    const p = supPower(it);
    switch (it.kind) {
      case 'heal': return `Hồi ${fmt(p)} máu cho bản thân, ${fmt(p / 2)} cho đồng đội`;
      case 'shield': return `Tạo ${fmt(p)} giáp pha lê cho bản thân`;
      case 'fire': return `Đạn trong lượt +${p}% sát thương, vùng nổ rộng thêm 30%`;
      case 'frost': return `Đạn trong lượt đóng băng người trúng 1 lượt (boss kháng băng), +${p}% sát thương`;
      case 'elixir': return `Tăng ngay ${p}% nộ và +10% sát thương trong lượt`;
      default: return `Hiện đường đạn, đạn không bị gió ảnh hưởng, +${p}% sát thương trong lượt`;
    }
  }
  function statLine(st) { return Object.entries(st).map(([k, v]) => `${STATN[k]} ${fmt(v)}`).join(' · '); }
  function totalStats(items) { const o = { ...BASE }; for (const it of items) { const s = itemStats(it); for (const k in s) o[k] += s[k]; } return o; }
  const powerOf = (st) => Math.round(st.atk * 2 + st.def * 1.6 + st.hp * 0.25 + st.crit * 1.8 + st.agi * 1.4 + (st.luk || 0) * 1.5);
  const red = (def) => def / (def + 500);
  // heavy: tỉ lệ Trọng thương (sát thương ×2) theo chỉ số May mắn, tối đa 35%
  function derived(st) { return { heavy: Math.min(0.35, (st.luk || 0) / ((st.luk || 0) + 600)), crit: Math.min(0.6, st.crit / (st.crit + 400)), dodge: st.agi / (st.agi + 2500), move: Math.min(280, 120 + st.agi * 0.2), reduce: red(st.def) }; }
  function genSet(tier, rng) { rng = rng || Math.random; return SLOT_ORDER.map((s) => mkItem(s, tier, Math.floor(rng() * 3), 0.94 + rng() * 0.16, null, rng)); }
  const refCache = {};
  function refStats(t) { return refCache[t] || (refCache[t] = totalStats(SLOT_ORDER.map((s) => mkItem(s, t, 1, 1, 'heal')))); }
  function bossStats(b, team) {
    const r = refStats(b.t), def = Math.round(r.def * 0.9);
    const hit = r.atk * 1.7 * (1 - red(def));
    return { hp: Math.round(hit * 7 * team), def, atk: Math.round((0.24 * r.hp) / (1.25 * (1 - red(r.def)))), power: powerOf(r) };
  }

  /* ---------- profile ---------- */
  function newProfile(name) {
    const items = SLOT_ORDER.map((s) => mkItem(s, 0, 0, 1, s === 'support' ? 'heal' : DEFAULT_TYPE[s]));
    return { v: 3, name: name || 'Xạ thủ', look: { ...DEFAULT_LOOK }, gold: START_GOLD, items, gear: Object.fromEntries(items.map((i) => [i.slot, i.uid])),
      mats: { stone: 30, t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, luck: 1, guard: 1 }, rec: { wins: 0, losses: 0, boss: [0, 0, 0, 0, 0, 0] }, pending: null };
  }
  function validProfile(p) { return !!(p && [1, 2, 3].includes(p.v) && Array.isArray(p.items) && p.gear && p.mats); }
  // Kiểu cố định theo uid để đồ cũ (trước khi có gói hình) luôn ra cùng một ngoại hình
  function hashType(slot, uid) { const ks = Object.keys(TYPES[slot]); let h = 0; for (const ch of String(uid)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ks[h % ks.length]; }
  function fixItem(it) {
    if (it.slot === 'support') { if (SUP_MIGRATE[it.kind]) it.kind = SUP_MIGRATE[it.kind]; if (!SUP[it.kind]) it.kind = 'heal'; }
    else if (TYPES[it.slot] && !TYPES[it.slot][it.type]) it.type = hashType(it.slot, it.uid);
    if (it.tier > 5) it.tier = 5;
    return it;
  }
  function migrate(p) {
    if (p.v === 1) { p.v = 2; p.gold = START_GOLD; p.pending = null; p.name = p.name || 'Xạ thủ'; }
    if (p.v === 2) p.v = 3;
    for (const it of p.items) fixItem(it);
    p.look = cleanLook(p.look);
    return p;
  }
  const needsMigrate = (p) => !!p && (p.v !== 3 || !p.look || p.items.some((it) => (it.slot === 'support' && !SUP[it.kind]) || (TYPES[it.slot] && !TYPES[it.slot][it.type])));
  function cleanLook(l) { l = l || {}; const o = {}; for (const k in LOOK) o[k] = clampInt(l[k], 0, LOOK[k] - 1); return o; }
  function randomLook(rng) { rng = rng || Math.random; const o = {}; for (const k in LOOK) o[k] = Math.floor(rng() * LOOK[k]); return o; }
  const itemById = (p, id) => p.items.find((i) => i.uid === id);
  const isEquipped = (p, it) => p.gear[it.slot] === it.uid;
  function equippedItems(p) { return SLOT_ORDER.map((s) => itemById(p, p.gear[s])).filter(Boolean); }
  // Ngoại hình nhân vật = bậc + kiểu của từng món đang mặc (dùng để chồng layer hình)
  function looksOf(items, look) {
    const L = { look: cleanLook(look), type: {} };
    for (const it of items) { L[it.slot] = it.tier; if (it.slot === 'support') L.kind = it.kind; if (it.type) L.type[it.slot] = it.type; }
    const core = ['weapon', 'hat', 'armor'].map((s) => L[s]).filter((t) => t != null);
    L.set = core.length ? Math.round(core.reduce((a, b) => a + b, 0) / core.length) : 0;
    return L;
  }
  const salvageValue = (it) => 2 + it.tier * 4 + it.lvl * 2;
  // Giá bán trang bị lấy vàng (thấp hơn giá mua để tránh lãi vô hạn)
  const sellValue = (it) => Math.round(40 * (1 + it.tier * it.tier * 4) * (1 + it.lvl * 0.4) * (SLOTS[it.slot].up ? 1 : 1.2));
  // Cửa hàng nguyên liệu: giá 1 cái
  const MAT_SHOP = [{ k: 'stone', price: 60 }, { k: 't1', price: 1500 }, { k: 't2', price: 5000 }, { k: 't3', price: 15000 }, { k: 't4', price: 40000 }, { k: 't5', price: 100000 },
    { k: 'luck', price: 2500 }, { k: 'guard', price: 4000 }];
  function addMats(p, o) { for (const k in o) { if (k === 'gold') p.gold += o[k]; else p.mats[k] = (p.mats[k] || 0) + o[k]; } }
  function addItem(p, it) {
    if (p.items.filter((i) => !isEquipped(p, i)).length >= INV_CAP) { const v = salvageValue(it); p.mats.stone += v; return `Túi đầy, ${itemName(it)} đã phân rã thành ${v} đá`; }
    p.items.push(it); return null;
  }

  /* ---------- forge ---------- */
  function forgeInfo(it) {
    if (!SLOTS[it.slot].up) return { none: true };
    if (it.tier === 5 && it.lvl === 3) return { max: true };
    if (it.lvl < 3) return { type: 'lv', rate: LV_RATE[it.tier][it.lvl], cost: lvCost(it.tier, it.lvl), next: { tier: it.tier, lvl: it.lvl + 1 }, risk: it.tier >= 3 };
    return { type: 'break', rate: BREAK_RATE[it.tier], cost: breakCost(it.tier), next: { tier: it.tier + 1, lvl: 0 }, risk: it.tier >= 3 };
  }
  const have = (p, k) => (k === 'gold' ? p.gold : p.mats[k] || 0);
  const canPay = (p, c) => Object.entries(c).every(([k, v]) => have(p, k) >= v);
  function pay(p, c) { for (const k in c) { if (k === 'gold') p.gold -= c[k]; else p.mats[k] -= c[k]; } }

  /* ---------- rewards ---------- */
  // Vàng/đá nhận được sau mỗi trận (t = bậc đối thủ hoặc bậc boss)
  const REWARD = {
    pvpWin: (t) => ({ gold: 300 + t * 220, stone: 4 + t * 2 }), pvpLose: (t) => ({ gold: 120 + t * 60, stone: 2 }),
    bossWin: (t) => ({ gold: 600 + t * 600, stone: 8 + t * 6 }), bossLose: (t) => ({ gold: 200 + t * 100, stone: 3 }),
  };
  function rewardsFor(pend, win, rng) {
    const out = { mats: {}, items: [] };
    const add = (k, v) => { out.mats[k] = (out.mats[k] || 0) + v; };
    if (pend.mode === 'boss') {
      const b = BOSSES[pend.boss];
      if (win) {
        const r = REWARD.bossWin(b.t); add('gold', r.gold); add('stone', r.stone + Math.floor(rng() * 6));
        add('t' + Math.min(5, b.t + 1), 1 + (rng() < 0.35 ? 1 : 0));
        if (rng() < 0.4) add('luck', 1);
        if (rng() < 0.25) add('guard', 1);
        if (rng() < 0.4) out.items.push(mkItem(pick(SLOT_ORDER, rng), b.t, 0, 0.92 + rng() * 0.23, null, rng));
      } else { const r = REWARD.bossLose(b.t); add('gold', r.gold); add('stone', r.stone); }
    } else if (pend.opp === 'bot' || pend.opp === 'online') {
      if (win) { const r = REWARD.pvpWin(pend.tier); add('gold', r.gold); add('stone', r.stone); if (rng() < 0.15) add('luck', 1); }
      else { const r = REWARD.pvpLose(pend.tier); add('gold', r.gold); add('stone', r.stone); }
    }
    return out;
  }

  /* ---------- actions ---------- */
  function apply(p, type, d, ctx) {
    ctx = ctx || {}; const rng = ctx.rng || Math.random, now = ctx.now || Date.now(); d = d || {};
    const fail = (error) => ({ ok: false, error });
    switch (type) {
      case 'equip': {
        const it = itemById(p, d.uid); if (!it) return fail('Không tìm thấy trang bị');
        p.gear[it.slot] = it.uid; return { ok: true };
      }
      case 'look': {
        const cur = cleanLook(p.look);
        for (const k in LOOK) if (d[k] != null) cur[k] = clampInt(d[k], 0, LOOK[k] - 1);
        p.look = cur; return { ok: true };
      }
      case 'unequip': {
        if (!SLOTS[d.slot]) return fail('Ô không hợp lệ'); delete p.gear[d.slot]; return { ok: true };
      }
      case 'salvage': {
        const it = itemById(p, d.uid); if (!it) return fail('Không tìm thấy trang bị'); if (isEquipped(p, it)) return fail('Tháo trang bị trước khi phân rã');
        const v = salvageValue(it); p.items = p.items.filter((x) => x !== it); p.mats.stone += v; return { ok: true, stone: v };
      }
      case 'sell': {
        const it = itemById(p, d.uid); if (!it) return fail('Không tìm thấy trang bị'); if (isEquipped(p, it)) return fail('Tháo trang bị trước khi bán');
        const g = sellValue(it); p.items = p.items.filter((x) => x !== it); p.gold += g; return { ok: true, gold: g };
      }
      case 'sellBulk': { // bán nhanh mọi món chưa mặc có bậc <= maxTier (lọc theo ô nếu có)
        const maxT = clampInt(d.maxTier, 0, 5), slot = SLOTS[d.slot] ? d.slot : null;
        const list = p.items.filter((it) => !isEquipped(p, it) && it.tier <= maxT && (!slot || it.slot === slot));
        if (!list.length) return fail('Không có món nào để bán');
        const g = list.reduce((a, it) => a + sellValue(it), 0); const ids = new Set(list.map((x) => x.uid));
        p.items = p.items.filter((x) => !ids.has(x.uid)); p.gold += g; return { ok: true, gold: g, count: list.length };
      }
      case 'buyMat': {
        const m = MAT_SHOP.find((x) => x.k === d.mat); if (!m) return fail('Không bán nguyên liệu này');
        const q = clampInt(d.qty, 1, 999), cost = m.price * q; if (p.gold < cost) return fail('Không đủ vàng');
        p.gold -= cost; p.mats[m.k] = (p.mats[m.k] || 0) + q; return { ok: true, mat: m.k, qty: q, cost };
      }
      case 'forge': {
        const it = itemById(p, d.uid); if (!it) return fail('Không tìm thấy trang bị');
        const f = forgeInfo(it); if (f.none) return fail('Trang bị này không nâng cấp được'); if (f.max) return fail('Đã đạt cấp tối đa');
        if (!canPay(p, f.cost)) return fail('Không đủ nguyên liệu hoặc vàng');
        const luck = !!d.luck && p.mats.luck > 0, guard = !!d.guard && f.risk && p.mats.guard > 0;
        pay(p, f.cost); if (luck) p.mats.luck--; if (guard) p.mats.guard--;
        const rate = Math.min(100, f.rate + (luck ? LUCK_BONUS : 0)), success = rng() * 100 < rate; let dropped = false;
        if (success) { it.tier = f.next.tier; it.lvl = f.next.lvl; }
        else if (f.risk && !guard) { const before = it.lvl; it.lvl = f.type === 'lv' ? Math.max(0, it.lvl - 1) : 2; dropped = it.lvl < before; }
        return { ok: true, success, rate, dropped, kind: f.type, tier: it.tier, lvl: it.lvl };
      }
      case 'buy': {
        const s = SHOP.find((x) => x.id === d.id); if (!s) return fail('Không có món này');
        if (p.gold < s.price) return fail('Không đủ vàng');
        p.gold -= s.price; const it = mkItem(pick(SLOT_ORDER, rng), s.tier, 0, 0.92 + rng() * 0.2, null, rng); const note = addItem(p, it);
        return { ok: true, item: it, note };
      }
      case 'buyWeapon': {
        const s = WEAPON_SHOP.find((x) => x.tier === Number(d.tier)); if (!s) return fail('Bậc này không bán');
        if (!TYPES.weapon[d.type]) return fail('Không có loại vũ khí này');
        if (p.gold < s.price) return fail('Không đủ vàng');
        p.gold -= s.price; const it = mkItem('weapon', s.tier, 0, 0.96 + rng() * 0.14, d.type, rng); const note = addItem(p, it);
        return { ok: true, item: it, note };
      }
      case 'battleStart': {
        const mode = d.mode === 'boss' ? 'boss' : 'pvp';
        const pend = { id: 'b' + now.toString(36) + Math.floor(rng() * 1e6).toString(36), mode, startedAt: now };
        const out = { id: pend.id, mode };
        if (mode === 'boss') {
          pend.boss = clampInt(d.boss, 0, 5); pend.size = clampInt(d.size, 2, 4);
          const b = BOSSES[pend.boss]; out.boss = pend.boss; out.size = pend.size; out.bossStats = bossStats(b, pend.size); out.map = b.map;
        } else {
          pend.size = clampInt(d.size, 1, 4); pend.tier = clampInt(d.tier, 0, 5); pend.opp = ['p2', 'online'].includes(d.opp) ? d.opp : 'bot';
          out.size = pend.size; out.tier = pend.tier; out.opp = pend.opp; out.diff = ['easy', 'normal', 'hard'].includes(d.diff) ? d.diff : 'normal';
          out.map = MAPS.some((m) => m.id === d.map) ? d.map : 'forest';
          out.enemies = Array.from({ length: pend.size }, () => genSet(pend.tier, rng));
        }
        p.pending = pend; return { ok: true, battle: out };
      }
      case 'battleEnd': {
        const pend = p.pending; if (!pend || pend.id !== d.id) return fail('Trận đấu không hợp lệ hoặc đã nhận thưởng');
        p.pending = null;
        if (d.forfeit) { return { ok: true, rewards: { mats: {}, items: [] }, note: 'Bỏ trận, không có phần thưởng' }; }
        let win = !!d.win, note = null;
        const short = now - pend.startedAt < MIN_WIN_MS;
        if (win && short) { win = false; note = 'Trận kết thúc quá nhanh, không được tính thắng'; }
        // Thua quá nhanh cũng không có thưởng tham gia (chống mở trận rồi thoát ngay để lấy vàng)
        const rw = short ? { mats: {}, items: [] } : rewardsFor(pend, win, rng); addMats(p, rw.mats);
        const notes = []; for (const it of rw.items) { const n = addItem(p, it); if (n) notes.push(n); }
        if (pend.mode === 'boss' && win) p.rec.boss[BOSSES[pend.boss].t] = (p.rec.boss[BOSSES[pend.boss].t] || 0) + 1;
        if (pend.mode === 'pvp' && pend.opp !== 'p2') { if (win) p.rec.wins++; else p.rec.losses++; }
        if (note) notes.push(note);
        return { ok: true, win, rewards: rw, notes };
      }
      default: return fail('Hành động không hợp lệ');
    }
  }

  /* ---------- admin ---------- */
  function adminGrant(p, d) {
    const notes = [];
    if (d.gold) { const g = clampInt(d.gold, -1e9, 1e9); p.gold = Math.max(0, p.gold + g); notes.push(`${g >= 0 ? '+' : ''}${fmt(g)} vàng`); }
    if (d.mat && MATS[d.mat]) { const q = clampInt(d.qty, 1, 99999); p.mats[d.mat] = (p.mats[d.mat] || 0) + q; notes.push(`+${q} ${MATS[d.mat]}`); }
    if (d.item && SLOTS[d.item.slot]) { const it = mkItem(d.item.slot, d.item.tier, d.item.lvl, 1, d.item.slot === 'support' ? d.item.kind : d.item.type); const n = addItem(p, it); notes.push(n || `Tạo ${itemName(it)} (${TIERS[it.tier].n})`); }
    return { ok: true, notes };
  }

  return { LV_BONUS, lvMul, TIERS, STATS, STATN, BASE, SLOT_ORDER, SLOTS, SUP, SUP_KINDS, SUP_CD, TYPES, DEFAULT_TYPE, typeName, needsMigrate, MATS, LV_RATE, BREAK_RATE, LUCK_BONUS, INV_CAP, START_GOLD, SHOTS, BOSSES, MAPS, SHOP, WEAPON_SHOP, MAT_SHOP, sellValue, REWARD, MIN_WIN_MS,
    lvCost, breakCost, mkItem, itemName, itemStats, supPower, supDesc, statLine, totalStats, powerOf, red, derived, genSet, refStats, bossStats,
    LOOK, DEFAULT_LOOK, cleanLook, randomLook,
    newProfile, validProfile, migrate, itemById, isEquipped, equippedItems, looksOf, salvageValue, forgeInfo, canPay, have, apply, adminGrant, fmt };
});

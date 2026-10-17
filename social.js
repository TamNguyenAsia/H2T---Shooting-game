/* H2T-shooting — kết nối thời gian thực (WebSocket): ai đang online, chat, phòng chơi, mời vào phòng, trận online.
   Trận online: chủ phòng (host) mô phỏng trận trên trình duyệt của mình, người khác gửi thao tác qua máy chủ;
   máy chủ chỉ chuyển tin, tạo trận (battleStart) và trả thưởng (battleEnd) cho từng người khi host báo kết quả.
   Dữ liệu phòng/chat chỉ nằm trong bộ nhớ: khởi động lại máy chủ là mất (hồ sơ người chơi vẫn trong database). */
'use strict';
const { WebSocketServer } = require('ws');

module.exports = function attachSocial(server, { readToken, store, R, rng }) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
  const users = new Map();   // uid -> { uid, name, socks:Set, room, lastChat }
  const rooms = new Map();   // id -> room
  const globalChat = [];
  let roomSeq = 1;

  const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
  const toUser = (uid, msg) => { const u = users.get(uid); if (u) for (const ws of u.socks) send(ws, msg); };
  const toAll = (msg) => { const s = JSON.stringify(msg); for (const u of users.values()) for (const ws of u.socks) if (ws.readyState === 1) ws.send(s); };
  const toRoom = (room, msg, exceptUid) => { for (const m of room.members) if (m.uid !== exceptUid) toUser(m.uid, msg); };
  const clean = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

  /* ---------- trạng thái gửi cho client ---------- */
  const presence = () => [...users.values()].map((u) => ({ name: u.name, room: u.room || null, playing: !!(u.room && rooms.get(u.room) && rooms.get(u.room).status === 'playing') }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const roomSummary = (r) => ({ id: r.id, name: r.name, host: nameOf(r.host), mode: r.mode, size: r.size, boss: r.boss, map: r.map, status: r.status, count: r.members.length, cap: cap(r) });
  const roomFull = (r) => ({ ...roomSummary(r), hostUid: r.host, diff: r.diff, members: r.members.map((m) => ({ uid: m.uid, name: m.name, team: m.team, ready: m.ready })), chat: r.chat });
  const nameOf = (uid) => (users.get(uid) || {}).name || '?';
  const cap = (r) => (r.mode === 'boss' ? 4 : r.size * 2);
  const broadcastLobby = () => toAll({ type: 'lobby', online: presence(), rooms: [...rooms.values()].map(roomSummary) });
  const pushRoom = (r) => toRoom(r, { type: 'room', room: roomFull(r) });

  /* ---------- phòng ---------- */
  function leaveRoom(uid, why) {
    const u = users.get(uid); if (!u || !u.room) return;
    const r = rooms.get(u.room); u.room = null; if (!r) return;
    const m = r.members.find((x) => x.uid === uid);
    r.members = r.members.filter((x) => x.uid !== uid);
    toUser(uid, { type: 'room', room: null });
    if (r.status === 'playing') {
      forfeit(uid, r);
      if (uid === r.host) { // host thoát: huỷ trận cho mọi người
        for (const x of r.members) forfeit(x.uid, r);
        r.status = 'lobby'; r.battle = null; toRoom(r, { type: 'battleAbort', reason: `Chủ phòng ${m ? m.name : ''} đã thoát, trận bị huỷ` });
      } else toUser(r.host, { type: 'peerLeft', uid });
    }
    if (!r.members.length) { rooms.delete(r.id); broadcastLobby(); return; }
    if (r.host === uid) r.host = r.members[0].uid;
    roomSay(r, null, `${m ? m.name : 'Một người'} ${why || 'đã rời phòng'}`);
    pushRoom(r); broadcastLobby();
  }
  function forfeit(uid, r) {
    const pid = r.battle && r.battle.pend[uid]; if (!pid) return;
    delete r.battle.pend[uid];
    store.withProfile(uid, (p) => R.apply(p, 'battleEnd', { id: pid, forfeit: true }, { rng })).catch(() => {});
  }
  function roomSay(r, from, text) {
    const msg = { from, text: clean(text, 200), at: Date.now() };
    r.chat.push(msg); if (r.chat.length > 40) r.chat.shift();
    toRoom(r, { type: 'chat', scope: 'room', msg });
  }
  function joinRoom(uid, r) {
    const u = users.get(uid);
    if (r.status !== 'lobby') return 'Phòng đang trong trận, đợi trận xong';
    if (r.members.some((m) => m.uid === uid)) return null;
    if (r.members.length >= cap(r)) return 'Phòng đã đầy';
    if (u.room) leaveRoom(uid);
    const t0 = r.members.filter((m) => m.team === 0).length, t1 = r.members.filter((m) => m.team === 1).length;
    const team = r.mode === 'boss' ? 0 : t0 <= t1 && t0 < r.size ? 0 : 1;
    r.members.push({ uid, name: u.name, team, ready: false }); u.room = r.id;
    roomSay(r, null, `${u.name} đã vào phòng`); pushRoom(r); broadcastLobby();
    return null;
  }
  function fixTeams(r) { // sau khi đổi chế độ / số người: xếp lại đội cho hợp lệ
    if (r.mode === 'boss') { r.members.forEach((m) => (m.team = 0)); return; }
    for (const t of [0, 1]) { const list = r.members.filter((m) => m.team === t); while (list.length > r.size) { const m = list.pop(); m.team = 1 - t; } }
  }
  const avgTier = (items) => { const core = items.filter((i) => ['weapon', 'hat', 'armor'].includes(i.slot)); return core.length ? Math.round(core.reduce((a, i) => a + i.tier, 0) / core.length) : 0; };

  async function startBattle(r) {
    // Lấy trang bị từng người từ database (không tin dữ liệu trình duyệt gửi lên)
    const players = [];
    for (const m of r.members) {
      const p = await store.getProfile(m.uid); if (!p) continue; R.migrate(p);
      players.push({ uid: m.uid, name: m.name, team: m.team, items: R.equippedItems(p), look: p.look });
    }
    const bots = []; let boss = null, bossStats = null;
    if (r.mode === 'pvp') {
      const humanTier = players.length ? Math.round(players.reduce((a, x) => a + avgTier(x.items), 0) / players.length) : 0;
      for (const t of [0, 1]) for (let i = players.filter((x) => x.team === t).length; i < r.size; i++) bots.push({ name: `Máy ${bots.length + 1}`, team: t, items: R.genSet(humanTier) });
    } else {
      boss = r.boss; const size = Math.max(2, players.length);
      for (let i = players.length; i < size; i++) bots.push({ name: `Đồng đội máy ${i}`, team: 0, items: players[0].items });
      bossStats = R.bossStats(R.BOSSES[boss], size);
    }
    const pend = {};
    for (const pl of players) {
      const foes = [...players, ...bots].filter((x) => x.team !== pl.team);
      const tier = foes.length ? Math.round(foes.reduce((a, x) => a + avgTier(x.items), 0) / foes.length) : 0;
      const d = r.mode === 'boss' ? { mode: 'boss', boss, size: Math.max(2, players.length) } : { mode: 'pvp', size: r.size, tier, opp: 'online', map: r.map };
      const out = await store.withProfile(pl.uid, (p) => R.apply(p, 'battleStart', d, { rng }));
      if (out.ok) pend[pl.uid] = out.battle.id;
    }
    r.status = 'playing'; r.battle = { pend, startedAt: Date.now() };
    const map = r.mode === 'boss' ? R.BOSSES[boss].map : r.map;
    toRoom(r, { type: 'battle', setup: { mode: r.mode, map, boss, bossStats, size: r.size, diff: r.diff, hostUid: r.host, players, bots } });
    broadcastLobby();
  }
  async function endBattle(r, winTeam) {
    if (r.status !== 'playing' || !r.battle) return;
    const b = r.battle; r.battle = null; r.status = 'lobby'; r.members.forEach((m) => (m.ready = false));
    for (const m of r.members) {
      const pid = b.pend[m.uid]; if (!pid) continue;
      const win = winTeam === m.team;
      try { const out = await store.withProfile(m.uid, (p) => R.apply(p, 'battleEnd', { id: pid, win }, { rng }));
        toUser(m.uid, { type: 'battleResult', win: out.win, rewards: out.rewards, notes: out.notes || [], profile: out.profile });
      } catch (e) { toUser(m.uid, { type: 'battleResult', win, rewards: { mats: {}, items: [] }, notes: ['Lỗi lưu phần thưởng'] }); }
    }
    pushRoom(r); broadcastLobby();
  }

  /* ---------- tin nhắn từ client ---------- */
  async function onMessage(uid, msg) {
    const u = users.get(uid); if (!u || !msg || typeof msg.type !== 'string') return;
    const r = u.room ? rooms.get(u.room) : null, err = (text) => toUser(uid, { type: 'error', text });
    switch (msg.type) {
      case 'chat': {
        const text = clean(msg.text, 200); if (!text) return;
        const now = Date.now(); if (now - (u.lastChat || 0) < 700) return err('Bạn gửi tin nhanh quá'); u.lastChat = now;
        if (msg.scope === 'room') { if (r) roomSay(r, u.name, text); return; }
        const m = { from: u.name, text, at: now }; globalChat.push(m); if (globalChat.length > 50) globalChat.shift();
        return toAll({ type: 'chat', scope: 'global', msg: m });
      }
      case 'roomCreate': {
        if (r) leaveRoom(uid);
        const mode = msg.mode === 'boss' ? 'boss' : 'pvp';
        const room = { id: 'r' + roomSeq++, name: clean(msg.name, 30) || `Phòng của ${u.name}`, host: uid, mode, size: msg.size === 1 ? 1 : 2,
          boss: Math.max(0, Math.min(5, msg.boss | 0)), map: R.MAPS.some((m) => m.id === msg.map) ? msg.map : 'forest', diff: 'normal', status: 'lobby', members: [], chat: [], battle: null };
        rooms.set(room.id, room); joinRoom(uid, room); return;
      }
      case 'roomJoin': { const room = rooms.get(msg.id); if (!room) return err('Phòng không còn'); const e = joinRoom(uid, room); if (e) err(e); return; }
      case 'roomLeave': return leaveRoom(uid);
      case 'roomTeam': {
        if (!r || r.mode !== 'pvp' || r.status !== 'lobby') return; const t = msg.team ? 1 : 0, me = r.members.find((m) => m.uid === uid);
        if (r.members.filter((m) => m.team === t).length >= r.size) return err('Đội đó đã đủ người');
        me.team = t; me.ready = false; pushRoom(r); return;
      }
      case 'roomReady': { if (!r || r.status !== 'lobby') return; const me = r.members.find((m) => m.uid === uid); me.ready = !!msg.ready; pushRoom(r); return; }
      case 'roomSet': {
        if (!r || r.host !== uid || r.status !== 'lobby') return;
        if (msg.mode === 'boss' || msg.mode === 'pvp') r.mode = msg.mode;
        if (msg.size === 1 || msg.size === 2) r.size = msg.size;
        if (msg.boss != null) r.boss = Math.max(0, Math.min(5, msg.boss | 0));
        if (R.MAPS.some((m) => m.id === msg.map)) r.map = msg.map;
        if (['easy', 'normal', 'hard'].includes(msg.diff)) r.diff = msg.diff;
        if (msg.name) r.name = clean(msg.name, 30) || r.name;
        if (r.members.length > cap(r)) { r.mode = 'pvp'; r.size = 2; }
        fixTeams(r); r.members.forEach((m) => (m.ready = false)); pushRoom(r); broadcastLobby(); return;
      }
      case 'roomKick': {
        if (!r || r.host !== uid || r.status !== 'lobby') return; const t = r.members.find((m) => m.name === msg.name); if (!t || t.uid === uid) return;
        leaveRoom(t.uid, 'đã bị mời ra khỏi phòng'); toUser(t.uid, { type: 'error', text: 'Bạn đã bị chủ phòng mời ra' }); return;
      }
      case 'roomStart': {
        if (!r || r.host !== uid || r.status !== 'lobby') return;
        const notReady = r.members.filter((m) => m.uid !== uid && !m.ready).map((m) => m.name);
        if (notReady.length) return err('Chưa sẵn sàng: ' + notReady.join(', '));
        try { await startBattle(r); } catch (e) { console.error('[H2T ws] startBattle', e); err('Không tạo được trận'); }
        return;
      }
      case 'roomEnd': { if (!r || r.host !== uid) return; await endBattle(r, msg.winTeam === 1 ? 1 : 0); return; }
      case 'invite': {
        const name = clean(msg.name, 20).toLowerCase(), t = [...users.values()].find((x) => x.name === name);
        if (!r) return err('Tạo hoặc vào phòng trước khi mời');
        if (!t) return err(`${name} không online`);
        if (t.room === r.id) return err(`${name} đã ở trong phòng`);
        const now = Date.now(); u.inv = u.inv || {}; if (now - (u.inv[name] || 0) < 10000) return err('Đợi 10 giây rồi mời lại'); u.inv[name] = now;
        toUser(t.uid, { type: 'invite', from: u.name, roomId: r.id, roomName: r.name, mode: r.mode });
        toUser(uid, { type: 'info', text: `Đã gửi lời mời tới ${name}` }); return;
      }
      case 'inviteReply': {
        const room = rooms.get(msg.roomId); if (!room) return err('Phòng không còn');
        const host = users.get(room.host);
        if (!msg.accept) { if (host) toUser(room.host, { type: 'info', text: `${u.name} đã từ chối lời mời` }); return; }
        const e = joinRoom(uid, room); if (e) err(e); return;
      }
      case 'g': { // chuyển dữ liệu trận: host -> mọi người, khách -> host
        if (!r || r.status !== 'playing') return;
        if (uid === r.host) toRoom(r, { type: 'g', d: msg.d }, uid); else toUser(r.host, { type: 'g', from: uid, d: msg.d });
        return;
      }
    }
  }

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://x'), d = readToken(url.searchParams.get('t'));
    const user = d && (await store.getUserById(d.uid).catch(() => null));
    if (!user) { send(ws, { type: 'error', text: 'Phiên đăng nhập hết hạn' }); return ws.close(); }
    let u = users.get(user.id);
    if (!u) { u = { uid: user.id, name: user.username, socks: new Set(), room: null }; users.set(user.id, u); }
    u.socks.add(ws); ws.isAlive = true;
    const r = u.room && rooms.get(u.room);
    send(ws, { type: 'welcome', me: u.name, online: presence(), rooms: [...rooms.values()].map(roomSummary), chat: globalChat, room: r ? roomFull(r) : null });
    if (u.socks.size === 1) broadcastLobby();
    ws.on('pong', () => (ws.isAlive = true));
    ws.on('message', (raw) => { let msg; try { msg = JSON.parse(raw); } catch (e) { return; } onMessage(user.id, msg).catch((e) => console.error('[H2T ws]', e)); });
    ws.on('close', () => {
      u.socks.delete(ws);
      if (!u.socks.size) { // chờ 8 giây phòng khi chỉ là tải lại trang / mạng chập chờn
        setTimeout(() => { if (u.socks.size) return; leaveRoom(u.uid, 'đã mất kết nối'); users.delete(u.uid); broadcastLobby(); }, 8000);
      }
    });
  });
  const ping = setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 25000);
  ping.unref();
  return { onlineCount: () => users.size };
};

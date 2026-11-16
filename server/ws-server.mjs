/**
 * ws-server.mjs —— 3D 체험관 多人房间服务器（生产版，单文件，仅依赖 ws）
 *
 * 特性：
 *   · 房间 = roomId（region:room:instance），坐满 CAPACITY 人返回 room_full，
 *     客户端自己 +1 换下一个殿 → 这就是"自动分殿"
 *   · 房间空了立刻从内存删除 → 这就是"自动缩容"，不做任何额外调度
 *   · 消息限流、字段校验、来源白名单、首包超时、心跳超时清理
 *   · 自带 HTTP /health（给宝塔/监控探活用）
 *
 * 运行：node ws-server.mjs
 * 环境变量：
 *   PORT=8090
 *   CAPACITY=20
 *   ALLOW_ORIGIN=https://mindulle.kr,https://3d.mindulle.kr
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8090);
const CAPACITY = Math.max(2, Math.min(60, Number(process.env.CAPACITY || 20)));
const ALLOW_ORIGIN = (process.env.ALLOW_ORIGIN
  || 'https://mindulle.kr,https://www.mindulle.kr,https://3d.mindulle.kr')
  .split(',').map(s => s.trim()).filter(Boolean);

const MOVE_PER_SEC = 12;          // 每连接每秒最多 12 次位置上报
const JOIN_TIMEOUT_MS = 20000;    // 连上 20 秒不发 join 就断开
const HEARTBEAT_CHECK_MS = 25000;
const HEARTBEAT_TIMEOUT_MS = 70000; // 客户端 20s 一次 ping，容忍三次丢包
const ROOM_ID_MAX = 48;
const NAME_MAX = 20;
const COORD_MAX = 300;            // 场景范围外视为异常，直接丢弃

const rooms = new Map();          // roomId -> Set<ws>
const stat = { conns: 0, peak: 0, joins: 0, rejected: 0, dropped: 0 };

/* ---------------- 工具 ---------------- */

const clampNum = (v, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-max, Math.min(max, n));
};

/** 昵称：去控制字符、压缩空白、截断长度 */
function cleanName(v) {
  return String(v || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const cleanColor = v => (COLOR_RE.test(String(v || '')) ? String(v) : '#8a6d3b');

/** roomId 只允许 a-z A-Z 0-9 _ - : 与点 */
function cleanRoomId(v) {
  const s = String(v || '').slice(0, ROOM_ID_MAX);
  return /^[A-Za-z0-9_\-:.]+$/.test(s) ? s : '';
}

function peersOf(set, except) {
  return [...set]
    .filter(ws => ws !== except)
    .map(ws => ({
      id: ws.clientId || '',
      name: ws.name || '',
      color: ws.color || '#8a6d3b',
      x: ws.pos ? ws.pos.x : 0,
      z: ws.pos ? ws.pos.z : 0,
      rot: ws.pos ? ws.pos.rot : 0,
      anim: ws.pos ? ws.pos.anim : 'idle',
    }));
}

function broadcast(roomId, sender, msg) {
  const set = rooms.get(roomId);
  if (!set) return;
  const data = JSON.stringify(msg);
  for (const ws of set) {
    if (ws !== sender && ws.readyState === 1) ws.send(data);
  }
}

/* ---------------- HTTP：健康检查 ---------------- */

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    const mem = process.memoryUsage();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      ok: true,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      rooms: rooms.size,
      online: stat.conns,
      peak: stat.peak,
      joins: stat.joins,
      rejected: stat.rejected,
      dropped: stat.dropped,
      capacity: CAPACITY,
      rssMB: Math.round(mem.rss / 1048576),
      heapMB: Math.round(mem.heapUsed / 1048576),
      roomDetail: [...rooms.entries()].map(([id, set]) => ({ roomId: id, count: set.size })),
    }, null, 2));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('care ws server');
});

const startedAt = Date.now();

/* ---------------- WebSocket ---------------- */

const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 4096,               // 只允许很小的 JSON，挡住大包攻击
  perMessageDeflate: false,
});

wss.on('connection', (ws, req) => {
  // 来源校验：只允许自己站点的页面连
  const origin = String(req.headers.origin || '');
  if (ALLOW_ORIGIN.length && !ALLOW_ORIGIN.includes(origin)) {
    stat.rejected++;
    try { ws.send(JSON.stringify({ type: 'error', code: 'origin' })); } catch {}
    ws.close(1008, 'origin not allowed');
    return;
  }

  stat.conns++;
  if (stat.conns > stat.peak) stat.peak = stat.conns;
  ws.lastPing = Date.now();
  ws.rl = { t: 0, n: 0 };

  const joinTimer = setTimeout(() => {
    if (!ws.roomId) ws.close(1008, 'join timeout');
  }, JOIN_TIMEOUT_MS);

  ws.on('message', raw => {
    if (raw.length > 2048) return;
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    ws.lastPing = Date.now();

    switch (msg.type) {
      case 'join':
        clearTimeout(joinTimer);
        handleJoin(ws, msg);
        break;
      case 'move':
        if (!limitOk(ws)) return;
        handleMove(ws, msg);
        break;
      case 'action':
        if (!limitOk(ws)) return;
        handleAction(ws, msg);
        break;
      case 'ping':
        try { ws.send('{"type":"pong"}'); } catch {}
        break;
      default:
        break;
    }
  });

  ws.on('close', () => { clearTimeout(joinTimer); handleLeave(ws); });
  ws.on('error', () => { /* 由 close 清理 */ });
});

/** 每秒最多 MOVE_PER_SEC 条，超了直接丢（不排队、不回包） */
function limitOk(ws) {
  const now = Date.now();
  if (now - ws.rl.t >= 1000) {
    ws.rl.t = now;
    ws.rl.n = 0;
  }
  ws.rl.n++;
  return ws.rl.n <= MOVE_PER_SEC;
}

function handleJoin(ws, msg) {
  if (ws.roomId) return;                       // 重复 join 忽略
  const roomId = cleanRoomId(msg.roomId);
  const clientId = String(msg.clientId || '').slice(0, 40).replace(/[^A-Za-z0-9\-_:.]/g, '');
  if (!roomId || !clientId) { stat.dropped++; ws.close(1008, 'bad join'); return; }

  let set = rooms.get(roomId);
  if (!set) { set = new Set(); rooms.set(roomId, set); }

  // 同一 clientId 重连：踢掉旧连接，避免重复计数与幽灵影子
  for (const old of [...set]) {
    if (old.clientId === clientId) {
      set.delete(old);
      try { old.terminate(); } catch {}
    }
  }

  if (set.size >= CAPACITY) {
    // 满员 → 客户端收到 room_full 后 instance+1 自动去下一殿
    try { ws.send('{"type":"room_full"}'); } catch {}
    stat.dropped++;
    ws.close(1000, 'room full');
    return;
  }

  ws.clientId = clientId;
  ws.roomId = roomId;
  ws.name = cleanName(msg.name);
  ws.color = cleanColor(msg.color);
  ws.pos = { x: 0, z: 0, rot: 0, anim: 'idle' };
  set.add(ws);
  stat.joins++;

  try {
    ws.send(JSON.stringify({
      type: 'joined',
      selfId: clientId,
      roomId,
      capacity: CAPACITY,
      count: set.size,
      peers: peersOf(set, ws),
    }));
  } catch {}

  broadcast(roomId, ws, {
    type: 'peer_join',
    id: clientId, name: ws.name, color: ws.color, x: 0, z: 0,
  });
}

function handleMove(ws, msg) {
  if (!ws.roomId || !ws.pos) return;
  ws.pos = {
    x: clampNum(msg.x, COORD_MAX),
    z: clampNum(msg.z, COORD_MAX),
    rot: clampNum(msg.rot, 10),
    anim: typeof msg.anim === 'string' ? msg.anim.slice(0, 16) : 'idle',
  };
  broadcast(ws.roomId, ws, {
    type: 'peer_move',
    id: ws.clientId,
    x: ws.pos.x, z: ws.pos.z, rot: ws.pos.rot, anim: ws.pos.anim,
  });
}

const ACTIONS = new Set([
  'bow_start', 'bow_stop', 'pray', 'beads_start', 'beads_stop', 'woodfish',
]);

function handleAction(ws, msg) {
  if (!ws.roomId) return;
  const action = String(msg.action || '');
  if (!ACTIONS.has(action)) return;            // 白名单，挡住伪造动作
  broadcast(ws.roomId, ws, { type: 'peer_action', id: ws.clientId, action });
}

function handleLeave(ws) {
  stat.conns = Math.max(0, stat.conns - 1);
  if (!ws.roomId) return;
  const set = rooms.get(ws.roomId);
  if (set) {
    set.delete(ws);
    broadcast(ws.roomId, ws, { type: 'peer_leave', id: ws.clientId });
    // 空房间立即回收：人走了殿就消失，不需要额外缩容调度
    if (set.size === 0) rooms.delete(ws.roomId);
  }
  ws.roomId = undefined;
}

/* ---------------- 心跳巡检 ---------------- */

setInterval(() => {
  const now = Date.now();
  for (const set of rooms.values()) {
    for (const ws of set) {
      if (now - (ws.lastPing || 0) > HEARTBEAT_TIMEOUT_MS) {
        try { ws.terminate(); } catch {}
      }
    }
  }
}, HEARTBEAT_CHECK_MS);

/* ---------------- 日志与优雅退出 ---------------- */

setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[care] rooms=${rooms.size} online=${stat.conns} peak=${stat.peak} rss=${Math.round(mem.rss / 1048576)}MB`);
}, 60000);

const shutdown = sig => {
  console.log(`[care] ${sig} received, closing…`);
  for (const set of rooms.values()) for (const ws of set) { try { ws.close(1001, 'server restart'); } catch {} }
  wss.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(0), 3000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  console.log(`[care] ws server on :${PORT}/ws  capacity=${CAPACITY}  origin=${ALLOW_ORIGIN.join('|')}`);
});

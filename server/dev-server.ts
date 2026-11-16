/**
 * dev-server.ts —— 本地 WebSocket 房间服务器（开发阶段）
 * 只做房间管理与广播，不做服务端权威位置校验。
 *
 * 启动：npm run server   （默认 8080 端口，容量 20）
 * 环境变量：PORT、CAPACITY
 */
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8080);
const CAPACITY = Number(process.env.CAPACITY || 20);
const HEARTBEAT_CHECK_MS = 20000;   // 巡检间隔
const HEARTBEAT_TIMEOUT_MS = 60000; // 60s 无 ping 断开

interface Pos {
  x: number;
  z: number;
  rot: number;
  anim: string;
}

interface RoomSocket extends WebSocket {
  clientId?: string;
  roomId?: string;
  name?: string;
  color?: string;
  pos?: Pos;
  lastPing?: number;
}

interface PeerInfo {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  rot: number;
  anim: string;
}

/** roomId -> 连接集合 */
const rooms = new Map<string, Set<RoomSocket>>();

function broadcast(roomId: string, sender: RoomSocket, msg: object): void {
  const set = rooms.get(roomId);
  if (!set) return;
  const data = JSON.stringify(msg);
  set.forEach(ws => {
    if (ws !== sender && ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

function peersOf(set: Set<RoomSocket>, exclude?: RoomSocket): PeerInfo[] {
  return [...set]
    .filter(ws => ws !== exclude)
    .map(ws => ({
      id: ws.clientId ?? '',
      name: ws.name ?? '',
      color: ws.color ?? '#8a6d3b',
      x: ws.pos?.x ?? 0,
      z: ws.pos?.z ?? 0,
      rot: ws.pos?.rot ?? 0,
      anim: ws.pos?.anim ?? 'idle',
    }));
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[mindulle] ws server listening on :${PORT}, capacity=${CAPACITY}`);

wss.on('connection', (ws: RoomSocket) => {
  ws.lastPing = Date.now();

  ws.on('message', raw => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'join': handleJoin(ws, msg); break;
      case 'move': handleMove(ws, msg); break;
      case 'action': handleAction(ws, msg); break;
      case 'ping':
        ws.lastPing = Date.now();
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        break;
    }
  });

  ws.on('close', () => handleLeave(ws));
  ws.on('error', () => { /* 连接级错误忽略，由 close 统一清理 */ });
});

function handleJoin(ws: RoomSocket, msg: any): void {
  const roomId = String(msg.roomId ?? '');
  const clientId = String(msg.clientId ?? '');
  const name = String(msg.name ?? '');
  const color = String(msg.color ?? '#8a6d3b');

  if (!roomId || !clientId) return;

  let set = rooms.get(roomId);
  if (!set) {
    set = new Set();
    rooms.set(roomId, set);
  }

  // 同一 clientId 重连：先踢掉旧连接再占位，避免重复计数
  set.forEach(old => {
    if (old.clientId === clientId) {
      old.terminate();
      set.delete(old);
    }
  });

  // 满员：返回 room_full，不加入
  if (set.size >= CAPACITY) {
    ws.send(JSON.stringify({ type: 'room_full' }));
    ws.terminate();
    return;
  }

  ws.clientId = clientId;
  ws.roomId = roomId;
  ws.name = name;
  ws.color = color;
  ws.pos = { x: 0, z: 0, rot: 0, anim: 'idle' };
  set.add(ws);

  ws.send(JSON.stringify({
    type: 'joined',
    selfId: clientId,
    roomId,
    capacity: CAPACITY,
    count: set.size,
    peers: peersOf(set, ws),
  }));

  broadcast(roomId, ws, { type: 'peer_join', id: clientId, name, color, x: 0, z: 0 });
}

function handleMove(ws: RoomSocket, msg: any): void {
  if (!ws.roomId) return;
  ws.pos = {
    x: Number(msg.x) || 0,
    z: Number(msg.z) || 0,
    rot: Number(msg.rot) || 0,
    anim: msg.anim ?? 'idle',
  };
  broadcast(ws.roomId, ws, {
    type: 'peer_move',
    id: ws.clientId,
    x: ws.pos.x,
    z: ws.pos.z,
    rot: ws.pos.rot,
    anim: ws.pos.anim,
  });
}

function handleAction(ws: RoomSocket, msg: any): void {
  // 服务端不维护动作状态，收到即原样转发给同房间其他人
  // 合法值：bow_start / bow_stop / pray / beads_start / beads_stop / woodfish
  if (!ws.roomId) return;
  broadcast(ws.roomId, ws, { type: 'peer_action', id: ws.clientId, action: msg.action });
}

function handleLeave(ws: RoomSocket): void {
  if (!ws.roomId) return;
  const set = rooms.get(ws.roomId);
  if (set) {
    set.delete(ws);
    broadcast(ws.roomId, ws, { type: 'peer_leave', id: ws.clientId });
    if (set.size === 0) rooms.delete(ws.roomId); // 空房间销毁
  }
  ws.roomId = undefined;
}

// 心跳巡检：超时未 ping 的连接断开
setInterval(() => {
  const now = Date.now();
  rooms.forEach(set => {
    set.forEach(ws => {
      if (now - (ws.lastPing ?? 0) > HEARTBEAT_TIMEOUT_MS) ws.terminate();
    });
  });
}, HEARTBEAT_CHECK_MS);

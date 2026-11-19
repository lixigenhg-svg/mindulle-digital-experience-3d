/**
 * privateRoom.ts —— 私密金阁的房号/密钥入口
 *
 * 线上：服务端 ws-server.mjs 生成 pri-xxxx + 6 位密钥；进房时服务端校验，
 *      链接只带房号，密钥不写进 URL。
 * 离线/演示：用 localStorage 做同一套房号+密钥，保证演示页也能走密钥门。
 */
import { OFFLINE, WS_URL } from './config';

export const PRIVATE_ROOM_PREFIX = 'pri-';
const ENTRY_PREFIX = 'mindulle.private.entry.';
const OFFLINE_ROOMS = 'mindulle.private.rooms';

export interface PrivateRoomCredential {
  room: string;
  key: string;
  url: string;
}

export function isPrivateRoom(room: string): boolean {
  return room.startsWith(PRIVATE_ROOM_PREFIX);
}

export function buildPrivateUrl(room: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', room);
  url.searchParams.delete('instance');
  if (!url.searchParams.get('region')) url.searchParams.set('region', 'apac');
  return url.toString();
}

/** 记住当前标签页已通过的密钥，切后台/刷新不必反复输 */
export function rememberPrivateEntry(room: string, key: string): void {
  try { sessionStorage.setItem(ENTRY_PREFIX + room, key); } catch { /* 隐私模式忽略 */ }
}

export function getPrivateEntry(room: string): string {
  try { return sessionStorage.getItem(ENTRY_PREFIX + room) || ''; } catch { return ''; }
}

export function forgetPrivateEntry(room: string): void {
  try { sessionStorage.removeItem(ENTRY_PREFIX + room); } catch { /* 忽略 */ }
}

function randomCode(): string {
  return `${PRIVATE_ROOM_PREFIX}${1000 + Math.floor(Math.random() * 9000)}`;
}

function randomKey(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

function offlineRooms(): Record<string, { key: string; room: string; createdAt: number }> {
  try {
    const raw = localStorage.getItem(OFFLINE_ROOMS);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, { key?: string; room?: string; createdAt?: number }>;
    return o && typeof o === 'object' ? (o as Record<string, { key: string; room: string; createdAt: number }>) : {};
  } catch {
    return {};
  }
}

function saveOfflineRooms(rooms: Record<string, { key: string; room: string; createdAt: number }>): void {
  try { localStorage.setItem(OFFLINE_ROOMS, JSON.stringify(rooms)); } catch { /* 忽略 */ }
}

/** 打开一条一次性 WebSocket，只做 create/verify，不进入场景 */
function wsOnce(
  send: (ws: WebSocket) => void,
  accept: (msg: { type?: string; [key: string]: unknown }) => boolean,
  timeoutMs = 9000,
): Promise<{ type: string; [key: string]: unknown }> {
  return new Promise(resolve => {
    let done = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      resolve({ type: 'error', msg: '연결할 수 없습니다.' });
      return;
    }
    const finish = (msg: { type: string; [key: string]: unknown }) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      try { ws.close(); } catch { /* 忽略 */ }
      resolve(msg);
    };
    const timer = window.setTimeout(() => finish({ type: 'error', msg: '서버 응답이 없습니다.' }), timeoutMs);
    ws.onopen = () => {
      try { send(ws); } catch { finish({ type: 'error', msg: '요청을 보내지 못했습니다.' }); }
    };
    ws.onmessage = ev => {
      let msg: { type?: string; [key: string]: unknown };
      try { msg = JSON.parse(String(ev.data)); } catch { return; }
      if (msg && accept(msg)) finish(msg as { type: string; [key: string]: unknown });
    };
    ws.onerror = () => finish({ type: 'error', msg: '연결이 실패했습니다.' });
    ws.onclose = () => finish({ type: 'error', msg: '연결이 닫혔습니다.' });
  });
}

/** 创建一间私密金阁，返回房号 + 6 位密钥 + 分享链接 */
export async function createPrivateRoom(): Promise<PrivateRoomCredential> {
  if (OFFLINE) {
    const rooms = offlineRooms();
    let room = randomCode();
    while (rooms[room]) room = randomCode();
    const key = randomKey();
    rooms[room] = { room, key, createdAt: Date.now() };
    saveOfflineRooms(rooms);
    return { room, key, url: buildPrivateUrl(room) };
  }

  const clientId = (() => {
    try {
      const k = 'mindulle_client_id';
      let id = sessionStorage.getItem(k);
      if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(k, id); }
      return id;
    } catch { return crypto.randomUUID(); }
  })();

  const msg = await wsOnce(
    ws => ws.send(JSON.stringify({ type: 'private_create', clientId, region: 'apac' })),
    m => m.type === 'private_created' || m.type === 'error',
  );
  if (msg.type !== 'private_created' || typeof msg.room !== 'string' || typeof msg.key !== 'string') {
    throw new Error(typeof msg.msg === 'string' ? msg.msg : '프라이빗 금각을 만들지 못했습니다.');
  }
  const room = msg.room;
  const key = msg.key;
  return { room, key, url: buildPrivateUrl(room) };
}

/** 进房前校验密钥；成功才允许渲染私密场景 */
export async function verifyPrivateRoom(room: string, key: string): Promise<{ ok: boolean; msg: string }> {
  const cleanKey = key.replace(/[^0-9]/g, '');
  if (!isPrivateRoom(room)) return { ok: false, msg: '프라이빗 금각 번호가 올바르지 않습니다.' };
  if (cleanKey.length !== 6) return { ok: false, msg: '6자리 초대 키를 입력해 주세요.' };

  if (OFFLINE) {
    const rec = offlineRooms()[room];
    if (!rec) return { ok: false, msg: '초대 링크가 유효하지 않습니다.' };
    return rec.key === cleanKey ? { ok: true, msg: '금각이 열렸습니다' } : { ok: false, msg: '초대 키가 올바르지 않습니다.' };
  }

  const clientId = (() => {
    try {
      const k = 'mindulle_client_id';
      let id = sessionStorage.getItem(k);
      if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(k, id); }
      return id;
    } catch { return crypto.randomUUID(); }
  })();

  const msg = await wsOnce(
    ws => ws.send(JSON.stringify({
      type: 'join',
      roomId: `apac:${room}:0`,
      key: cleanKey,
      clientId,
      name: '초대 손님',
      color: '#d6b25e',
    })),
    m => m.type === 'joined' || m.type === 'private_locked' || m.type === 'private_unknown' || m.type === 'error',
  );

  if (msg.type === 'joined') return { ok: true, msg: '금각이 열렸습니다' };
  if (msg.type === 'private_locked') return { ok: false, msg: '초대 키가 올바르지 않습니다.' };
  if (msg.type === 'private_unknown') return { ok: false, msg: '초대 링크가 유효하지 않거나 만료되었습니다.' };
  return { ok: false, msg: typeof msg.msg === 'string' ? msg.msg : '금각에 연결할 수 없습니다.' };
}

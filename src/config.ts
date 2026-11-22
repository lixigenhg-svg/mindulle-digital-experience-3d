/**
 * config.ts —— 房间容量、同步频率、边界、WS 地址与 URL 参数解析
 * 与旧工程协议保持一致，便于复用现有 ws 服务端。
 */

/** 单殿人数上限（与服务端 CAPACITY 保持一致：一殿 100 人） */
export const ROOM_CAPACITY = 100;

/** 最多自动开到第几殿（满员就 +1，服务端 MAX_HALLS 同样限制） */
export const MAX_HALLS = 100;

/** 本地移动上报节流间隔（毫秒） */
export const MOVE_SEND_INTERVAL = 80;

/** 可活动地面半边长（大殿 20 x 20） */
export const BOUNDS = 14.6;
export const BOUNDS_Z_MIN = -1.4; // 塑像前为止：不允许绕到塑像背后（配合壁龛禁入区）
export const BOUNDS_Z_MAX = 60.0;

/** 移动速度 m/s */
export const MOVE_SPEED = 0.78; // 与步幅匹配的慢速：一步约 0.30 m、1.3 步/秒，走路不打滑

/** 相机限位（第三人称近距离跟随，角色约占画面高度三分之一） */
export const CAM = {
  distMin: 2.0,
  distMax: 9,
  pitchMin: 0.16,
  pitchMax: 1.1,
};

/** WebSocket 地址：优先环境变量，默认本地开发服 */
const ENV = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const WS_URL: string = ENV.VITE_WS_URL || 'off';

/** 'off' = 纯前端静态部署，不建立 WS（单人模式） */
export const OFFLINE = WS_URL === 'off';

/** 重连策略 */
export const RECONNECT = {
  delayMs: 3000,
  maxRetries: 5,
  roomFullDelayMs: 500,
};

export interface RoomInfo {
  room: string;
  instance: number;
  region: string;
  roomId: string;
}

function buildRoomId(region: string, room: string, instance: number): string {
  return `${region}:${room}:${instance}`;
}

/** 解析 ?room=maru-02&instance=0&region=apac */
export function parseRoom(): RoomInfo {
  const p = new URLSearchParams(location.search);
  const room = p.get('room') || 'maru-01';
  const instance = parseInt(p.get('instance') || '0', 10) || 0;
  const region = p.get('region') || 'apac';
  return { room, instance, region, roomId: buildRoomId(region, room, instance) };
}

/** 可选服务器（区域）—— 纯前端选择占位；真实多服后端上线后按此分组路由 */
export const REGIONS = [
  { id: 'apac', label: '한국 · 아시아', zh: '' },
  { id: 'global', label: '해외 글로벌', zh: '' },
] as const;

/** 可选房间（山寺编号） */
export const ROOMS = [
  { id: 'maru-01', label: '민들레 안심당 01' },
  { id: 'maru-02', label: '민들레 안심당 02' },
  { id: 'maru-03', label: '민들레 안심당 03' },
] as const;

/** 切换服务器/房间：写入 URL 查询参数并重建 RoomInfo（instance 重置 0） */
export function applyRoom(region: string, room: string): RoomInfo {
  const url = new URL(location.href);
  url.searchParams.set('region', region);
  url.searchParams.set('room', room);
  url.searchParams.set('instance', '0');
  history.replaceState(null, '', url);
  return { room, instance: 0, region, roomId: buildRoomId(region, room, 0) };
}

/** 满员后 instance +1 并刷新 roomId（超过 MAX_HALLS 时回落 0 号殿） */
export function bumpInstance(room: RoomInfo): void {
  room.instance += 1;
  if (room.instance > MAX_HALLS) room.instance = 0;
  room.roomId = buildRoomId(room.region, room.room, room.instance);
}

/** 坐垫阵列：25 行 × 20 列 = 500 块（场景与玩家共用同一份坐标） */
// Space the larger cushions evenly within the original prayer area.
export const CUSHION_ROWS = Array.from({ length: 15 }, (_, row) => -2.1 + row * (27.55 / 14));

export const CUSHION_COLS = [-8.55, -6.65, -4.75, -2.85, -0.95, 0.95, 2.85, 4.75, 6.65, 8.55];

/** 大殿壳体相对缩小系数（场景与人群坐标共用） */
export const HALL_SCALE = 0.62;
export const CUSHION_RADIUS = 0.56;
// Stand behind the visual center so the cushion extends under the forehead.
export const CUSHION_FORWARD_OFFSET = 0.24;




// The incense burner is inside the scaled main hall.
export const INCENSE_BURNER_LOCAL_Z = -5.87;
export const INCENSE_BURNER_Z = INCENSE_BURNER_LOCAL_Z * HALL_SCALE + 8 * (1 - HALL_SCALE);
export const INCENSE_INSERT_Y = 0.67;

export const INCENSE_INSERT_DURATION_MS = 10500;
export const INCENSE_DURATION_MS = 17500;
export const INCENSE_RELEASE = 0.64;

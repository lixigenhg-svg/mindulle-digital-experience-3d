/**
 * seats.ts —— 可坐位置（茶室坐垫 / 庭院长凳）的唯一来源
 *
 * 茶垫坐标 = 茶室局部坐标（±1.15, -0.92 / 0.22）绕 y 轴 -0.35 旋转后平移到 (11.4, 36.6)。
 * 长凳坐标取自 Exterior 的 Bench 布置，y 是凳面高度。
 * 玩家走近这些位置按「좌선」，就会吸附过去坐下：
 *  · kind='tea'   坐在茶垫上，自动进入倒茶 → 端杯 → 饮茶 → 放下 的循环
 *  · kind='bench' 坐在长凳上，双腿自然垂下
 */
export type SeatKind = 'tea' | 'bench';

export type Seat = { x: number; z: number; kind: SeatKind; y: number; rot?: number };

export const SEATS: Seat[] = [
  // 茶室 안심당 四张坐垫（rot 按 atan2(-dx,-dz) 算好，坐下即转向茶桌）
  { x: 12.54, z: 36.25, kind: 'tea', y: 0.095, rot: 1.91 },
  { x: 12.23, z: 37.10, kind: 'tea', y: 0.095, rot: 1.09 },
  { x: 10.76, z: 35.60, kind: 'tea', y: 0.095, rot: -2.61 },
  { x: 10.44, z: 36.45, kind: 'tea', y: 0.095, rot: -1.79 },
  // 庭院六处休息点：坐在矮长凳的凳面上（座面高 0.32），面朝庭院中轴
  { x: -7.20, z: 37.50, kind: 'bench', y: 0.30, rot: -Math.PI / 2 },
  { x: -7.20, z: 41.50, kind: 'bench', y: 0.30, rot: -Math.PI / 2 },
  { x: -7.40, z: 43.00, kind: 'bench', y: 0.30, rot: -Math.PI / 2 },
  { x: 7.20, z: 37.50, kind: 'bench', y: 0.30, rot: Math.PI / 2 },
  { x: 7.20, z: 41.50, kind: 'bench', y: 0.30, rot: Math.PI / 2 },
  { x: 8.60, z: 46.50, kind: 'bench', y: 0.30, rot: Math.PI / 2 },
];

/** 走到多近就会坐到这张垫子/凳子上 */
export const SEAT_RADIUS = 1.8;

/** 找最近的可坐位置（超出 searchR 返回 null） */
export function nearestSeat(x: number, z: number, searchR = SEAT_RADIUS): Seat | null {
  let best: Seat | null = null;
  let bestD = searchR;
  for (const st of SEATS) {
    const d = Math.hypot(st.x - x, st.z - z);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best;
}

/**
 * yardObstacles.ts —— 庭院障碍表（给室外游走的角色绕路用）
 *
 * 坐标与 LocalPlayer 里的 OBSTACLES、Exterior 里的实物位置保持一致：
 * 茶室、祈愿壁、三层石塔、两座莲花池、六张长凳。
 * 角色每帧算出的位置若落进这些矩形，就沿最近的边推出去，
 * 于是它会自然地绕开建筑，不会从茶室里穿过去。
 */
export type YardBox = { x: number; z: number; hx: number; hz: number };

export const YARD_OBSTACLES: YardBox[] = [
  { x: 11.4, z: 36.6, hx: 3.10, hz: 2.70 },   // 茶室 안심당（含墙体与檐廊）
  { x: -8.6, z: 29.2, hx: 0.55, hz: 2.60 },   // 祈愿壁
  { x: -8.8, z: 47.6, hx: 2.90, hz: 2.90 },   // 三层石塔
  { x: -11.2, z: 38.5, hx: 2.30, hz: 2.30 },  // 莲花池（左）
  { x: 10.4, z: 48.4, hx: 2.30, hz: 2.30 },   // 莲花池（右）
  { x: -7.2, z: 37.5, hx: 0.75, hz: 1.45 },   // 长凳
  { x: -7.2, z: 41.5, hx: 0.75, hz: 1.45 },
  { x: -7.4, z: 43.0, hx: 0.75, hz: 1.45 },
  { x: 7.2, z: 37.5, hx: 0.75, hz: 1.45 },
  { x: 7.2, z: 41.5, hx: 0.75, hz: 1.45 },
  { x: 8.6, z: 46.5, hx: 0.75, hz: 1.45 },
  { x: 16.0, z: 47.6, hx: 2.20, hz: 2.20 },   // 咖啡亭
];

/** 若点落在某个障碍矩形里，就沿最近的一条边把它推出来（margin 是额外留的余量） */
export function pushOutOfYard(x: number, z: number, margin = 0.25): { x: number; z: number } {
  let px = x, pz = z;
  for (const o of YARD_OBSTACLES) {
    const dx = px - o.x;
    const dz = pz - o.z;
    const ex = o.hx + margin;
    const ez = o.hz + margin;
    if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
      const ox = ex - Math.abs(dx);
      const oz = ez - Math.abs(dz);
      if (ox < oz) px += (dx >= 0 ? 1 : -1) * ox;
      else pz += (dz >= 0 ? 1 : -1) * oz;
    }
  }
  return { x: px, z: pz };
}

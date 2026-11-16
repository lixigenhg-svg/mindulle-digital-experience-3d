export const TOTAL_BEADS = 108;
export const MALA_STEP_DEGREES = 360 / TOTAL_BEADS;

/** 把任意整数稳定映射到 0–107 */
export function wrapBeads(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const n = Math.trunc(value);
  return ((n % TOTAL_BEADS) + TOTAL_BEADS) % TOTAL_BEADS;
}

/** 最短角度差，处理 0/360 接缝 */
export function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

/**
 * 拖动累积器：每满 360/108 度转一颗。
 * 使用 1e-6 容差，避免 40° 这类整步输入因浮点误差少算一颗。
 */
export function advanceMala(
  accumulator: number,
  delta: number,
  step = MALA_STEP_DEGREES
): { accumulator: number; turned: number; direction: 1 | -1 } {
  let rest = accumulator + delta;
  let turned = 0;
  const direction: 1 | -1 = Math.sign(delta) < 0 ? -1 : 1;
  const threshold = step - 1e-6;

  while (Math.abs(rest) >= threshold) {
    rest -= Math.sign(rest) * step;
    turned += 1;
  }

  return { accumulator: rest, turned, direction };
}

/** 由圆心与指针坐标求角度（0° 在右侧，顺时针为正） */
export function angleFromPoint(x: number, y: number): number {
  return (Math.atan2(y, x) * 180) / Math.PI;
}

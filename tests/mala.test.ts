import { describe, expect, it } from 'vitest';
import {
  MALA_STEP_DEGREES,
  TOTAL_BEADS,
  advanceMala,
  angleFromPoint,
  shortestAngleDelta,
  wrapBeads
} from '../src/mala';

describe('108 佛珠数学', () => {
  it('总数是 108，单颗角度为 360/108', () => {
    expect(TOTAL_BEADS).toBe(108);
    expect(MALA_STEP_DEGREES).toBeCloseTo(10 / 3, 10);
  });

  it('0–107 正常映射，负数与越界回绕', () => {
    expect(wrapBeads(0)).toBe(0);
    expect(wrapBeads(107)).toBe(107);
    expect(wrapBeads(108)).toBe(0);
    expect(wrapBeads(-1)).toBe(107);
    expect(wrapBeads(217)).toBe(1);
  });

  it('最短角度差处理 0/360 接缝', () => {
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
    expect(shortestAngleDelta(0, 180)).toBe(180);
  });

  it('拖动 40° 恰好累计 12 颗（1e-6 容差）', () => {
    let accumulator = 0;
    let turned = 0;
    for (let i = 0; i < 40; i++) {
      const result = advanceMala(accumulator, 1);
      accumulator = result.accumulator;
      turned += result.turned;
    }
    expect(turned).toBe(12);
    expect(accumulator).toBeLessThan(MALA_STEP_DEGREES);
  });

  it('一次给足整步也能跨多颗', () => {
    const result = advanceMala(0, MALA_STEP_DEGREES * 3);
    expect(result.turned).toBe(3);
    expect(Math.abs(result.accumulator)).toBeLessThan(1e-6);
  });

  it('反向拖动产生负向计数，累积器符号正确', () => {
    const result = advanceMala(0, -MALA_STEP_DEGREES * 2);
    expect(result.turned).toBe(2);
    expect(result.direction).toBe(-1);
    expect(result.accumulator).toBeGreaterThan(-1e-6);
  });

  it('不足一颗时只累积不计数', () => {
    const result = advanceMala(0, MALA_STEP_DEGREES / 2);
    expect(result.turned).toBe(0);
    expect(result.accumulator).toBeCloseTo(1.6666, 3);
  });

  it('由圆心坐标求角度：右 0°，下 90°，左 180°', () => {
    expect(angleFromPoint(10, 0)).toBeCloseTo(0, 6);
    expect(angleFromPoint(0, 10)).toBeCloseTo(90, 6);
    expect(angleFromPoint(-10, 0)).toBeCloseTo(180, 6);
  });
});

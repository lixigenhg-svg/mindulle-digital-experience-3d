/**
 * avatar/poses.ts —— 小角色骨骼动作（纯数据 + 纯函数）
 *
 * 原项目 avatar.glb 只有 17 根骨骼、没有动画剪辑，动作全部由本文件的姿态表驱动：
 * 每根骨骼给出「叠加在静止姿态上的本地欧拉角」，运行时用四元数插值平滑过渡。
 *
 * 轴向约定（已用 17 根骨骼逐一实测校准）：
 *   · 脊柱 / 胸 / 颈：X 负值 = 上身前俯，正值 = 后仰
 *   · 上臂：X 负值 = 手臂向前抬起，Z 正值（右臂）= 向身体中线内收
 *   · 前臂：X 正值 = 屈肘把手带到身前（负值会甩到背后）
 *   · 大腿：X 正值 = 抬腿向前；小腿：X 负值 = 屈膝
 * 注：该模型宽袖覆盖手臂，小臂动作以「手掌出现在身前」为准，作用力度已按此校准。
 */
import type { ActionState } from '../actions';

export type BoneName =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'upper_armL' | 'forearmL' | 'handL'
  | 'upper_armR' | 'forearmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL'
  | 'thighR' | 'shinR' | 'footR';

export const BONES: BoneName[] = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upper_armL', 'forearmL', 'handL',
  'upper_armR', 'forearmR', 'handR',
  'thighL', 'shinL', 'footL',
  'thighR', 'shinR', 'footR',
];

/** 骨骼 → 叠加欧拉角 [x, y, z]，单位弧度 */
export type Pose = Partial<Record<BoneName, [number, number, number]>>;

const IDLE: Pose = { chest: [0.02, 0, 0] };

/** 合手：双掌抬到身前胸腹之间合十，头略低 */
const PRAY: Pose = {
  upper_armL: [-1.3, 0, -0.75],
  forearmL: [1.7, 0, 0],
  handL: [0, 0, -0.35],
  upper_armR: [-1.3, 0, 0.75],
  forearmR: [1.7, 0, 0],
  handR: [0, 0, 0.35],
  chest: [0.02, 0, 0],
  neck: [0.1, 0, 0],
  head: [0.15, 0, 0],
};

/** 行礼：上身前俯近 70°，双手垂向地面，屈膝下沉（脚不离地） */
const BOW: Pose = {
  spine: [-0.75, 0, 0],
  chest: [-0.45, 0, 0],
  neck: [0.3, 0, 0],
  head: [0.22, 0, 0],
  upper_armL: [-0.35, 0, -0.1],
  forearmL: [0.35, 0, 0],
  upper_armR: [-0.35, 0, 0.1],
  forearmR: [0.35, 0, 0],
  thighL: [0.12, 0, 0],
  shinL: [-0.2, 0, 0],
  thighR: [0.12, 0, 0],
  shinR: [-0.2, 0, 0],
  footL: [0.08, 0, 0],
  footR: [0.08, 0, 0],
};

/** 珠串：双手抬到腹前，拇指数珠的细微起伏 */
const BEADS: Pose = {
  upper_armL: [-1.05, 0, -0.7],
  forearmL: [1.5, 0, 0],
  handL: [0, 0, -0.3],
  upper_armR: [-1.05, 0, 0.7],
  forearmR: [1.5, 0, 0],
  handR: [0, 0, 0.3],
  chest: [-0.06, 0, 0],
  head: [0.1, 0, 0],
};

/** 木鼓：左掌托钵于腹前，右臂抬槌起落 */
const WOODFISH: Pose = {
  upper_armL: [-1.05, 0, -0.7],
  forearmL: [1.45, 0, 0],
  upper_armR: [-1.25, 0, 0.5],
  forearmR: [0.6, 0, 0],
  chest: [-0.08, 0, 0],
  head: [0.12, 0, 0],
};

/** 行走时四肢摆动的基准幅度 */
const WALK = {
  thigh: 0.42,
  shin: 0.34,
  arm: 0.26,
  elbow: 0.22,
};

function sin(t: number, hz: number, phase = 0): number {
  return Math.sin((t * hz + phase) * Math.PI * 2);
}

/** 把 [x,y,z] 统一成元组，避免展开时被 TypeScript 推断成 number[] */
const e = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

/**
 * 计算某一帧的目标姿态。
 * @param action 当前动作状态
 * @param anim   行走 / 待机
 * @param t      秒级时间
 */
export function poseFor(action: ActionState, anim: 'idle' | 'walk', t: number): Pose {
  const breathe = sin(t, 0.22) * 0.022;

  switch (action) {
    case 'praying': {
      // 合手为 1.5s 一次性动作，掌心随呼吸轻微起伏
      const lift = sin(t, 0.5) * 0.03;
      return {
        ...PRAY,
        forearmL: e(1.7 + lift, 0, 0),
        forearmR: e(1.7 + lift, 0, 0),
        head: e(0.15 + breathe * 0.5, 0, 0),
      };
    }
    case 'bowing': {
      // 行礼为持续姿态，在最低点做极缓呼吸
      return { ...BOW, chest: e(-0.45 + breathe, 0, 0) };
    }
    case 'beads': {
      const tick = sin(t, 1.1) * 0.05;
      return {
        ...BEADS,
        forearmL: e(1.5 + tick, 0, 0),
        handL: e(0, 0, -0.3 - tick),
        head: e(0.1 + breathe * 0.4, 0, 0),
      };
    }
    case 'wood_hit': {
      const chop = (sin(t, 1.6) + 1) * 0.5;
      return {
        ...WOODFISH,
        forearmR: e(0.6 + chop * 0.55, 0, 0),
        handR: e(-chop * 0.25, 0, 0),
      };
    }
    default: {
      if (anim === 'walk') {
        const s = sin(t, 1.35);
        const s2 = sin(t, 1.35, 0.5);
        return {
          hips: [0.03, 0, 0],
          chest: [-0.06, 0, 0],
          neck: [0.03, 0, 0],
          head: [0.02, 0, 0],
          thighL: e(s * WALK.thigh, 0, 0),
          shinL: e(-Math.max(0, s) * WALK.shin, 0, 0),
          footL: e(Math.max(0, -s) * 0.22, 0, 0),
          thighR: e(-s * WALK.thigh, 0, 0),
          shinR: e(-Math.max(0, -s) * WALK.shin, 0, 0),
          footR: e(Math.max(0, s) * 0.22, 0, 0),
          // 手臂反向摆动，右手与右腿同步（同手同脚会显得呆板）
          upper_armL: e(-s * WALK.arm, 0, -0.08),
          forearmL: e(WALK.elbow + Math.max(0, s) * 0.1, 0, 0),
          upper_armR: e(s2 * WALK.arm, 0, 0.08),
          forearmR: e(WALK.elbow + Math.max(0, -s2) * 0.1, 0, 0),
        };
      }
      return { ...IDLE, chest: e(0.02 + breathe, 0, 0), head: e(breathe * 0.6, 0, 0) };
    }
  }
}

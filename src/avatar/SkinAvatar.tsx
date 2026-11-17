/**
 * SkinAvatar.tsx —— 玩家角色：门童同款雕刻稿外观 + 原项目 17 根真骨骼
 *
 * 做法：把 avatar.glb（17 骨、12 块已蒙皮服装件）静止姿态下的**世界空间**顶点
 * 建一张哈希网格，再让雕刻稿（avatar2.glb，单网格 8.3k 顶点）的每个顶点
 * 去找网格上最近的和尚顶点，直接继承它的骨骼索引与权重，最后沿雕刻稿的
 * 拓扑做两轮权重平滑。这样雕刻稿的袖子、袍摆会自然跟着各自最近的那块布料走，
 * 不会出现"整条裙摆被两条大腿各拉一半"的撕裂。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playerMotion } from './animState';

export const RIG_AVATAR_URL = 'assets/models/avatar.glb';
export const SCULPT_AVATAR_URL = 'assets/models/avatar-alt/avatar2.glb';

type Pose = 'stand' | 'walk' | 'pray' | 'bow' | 'sit' | 'sitTap';

const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upper_arm.L', 'forearm.L', 'hand.L', 'upper_arm.R', 'forearm.R', 'hand.R',
  'thigh.L', 'shin.L', 'foot.L', 'thigh.R', 'shin.R', 'foot.R',
];

const R = (deg: number) => (deg * Math.PI) / 180;
const norm = (s: string) => s.replace(/[._]/g, '').toLowerCase();

/** 骨骼名（glTF 原名）→ 姿态表里的简写键 */
const poseKey = (n: string): string => {
  const base = norm(n);
  if (base.startsWith('upperarm')) return base.endsWith('l') ? 'armL' : 'armR';
  if (base.startsWith('forearm')) return base.endsWith('l') ? 'foreL' : 'foreR';
  if (base.startsWith('hand')) return base.endsWith('l') ? 'handL' : 'handR';
  if (base.startsWith('thigh')) return base.endsWith('l') ? 'thighL' : 'thighR';
  if (base.startsWith('shin')) return base.endsWith('l') ? 'shinL' : 'shinR';
  if (base.startsWith('foot')) return base.endsWith('l') ? 'footL' : 'footR';
  return base;
};

interface Props {
  position?: [number, number, number];
  rotationY?: number;
  height?: number;
  motion?: 'idle' | 'walk';
  action?: 'idle' | 'praying' | 'bowing' | 'wood_hit' | 'beads' | 'sitting' | 'kowtow' | 'incense' | 'offering' | 'greet';
  /** 走路相位（按位移推进，避免脚底打滑） */
  stridePhase?: number;
  /** true = 每帧从 playerMotion 读实时动作（本地玩家用） */
  live?: boolean;
  /** 时间偏移：让一群角色的行礼节奏各不相同，不再整齐划一 */
  timeShift?: number;
  /** 坐在什么上面（本地玩家用：tea=茶室坐垫，bench=庭院长凳） */
  seatKind?: 'floor' | 'tea' | 'bench';
}

function poseOf(motion: 'idle' | 'walk', action: Props['action'], t: number, wt = t * 6.4, seatKind: 'floor' | 'tea' | 'bench' = 'floor') {
  if (action === 'sitting' && seatKind === 'bench') {
    // 庭院休息：坐在矮长凳上靠背，大腿略下倾、脚掌踏地，双手搭在膝上慢慢呼吸
    const br = Math.sin(t * 1.15) * R(2.0);
    const sway = Math.sin(t * 0.55) * R(1.0);
    return {
      thighL: [R(78), 0, R(8)], thighR: [R(78), 0, R(-8)],
      shinL: [R(-76), 0, R(-6)], shinR: [R(-76), 0, R(6)],
      footL: [R(-8), 0, R(-3)], footR: [R(-8), 0, R(3)],
      hips: [R(4), 0, 0],
      spine: [R(3) + br, 0, sway * 0.4], chest: [R(1), 0, 0],
      neck: [R(-3), 0, 0], head: [R(-3) + br * 0.6, 0, sway],
      armL: [R(30) + br * 0.5, 0, R(-14)], armR: [R(30) + br * 0.5, 0, R(14)],
      foreL: [R(44), 0, R(-10)], foreR: [R(44), 0, R(10)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'sitting' && seatKind === 'tea') {
    // 茶室坐垫上的茶事：倒茶 → 端杯 → 饮 → 放下 → 静坐，7 秒一轮，循环往复
    const breath = Math.sin(t * 1.1) * R(1.5);
    const period = 7.0;
    const p = ((t % period) / period + 1) % 1;
    // 关键帧：[进度, 右上臂X, 右前臂X, 右臂内收, 左上臂X, 左前臂X, 头X, 颈X]
    // 头部一律用负角度（负=低头），坐姿保持端端正正，不仰头
    const K: [number, number, number, number, number, number, number, number][] = [
      [0.00, 58, 34, -10, 30, 46, -9, -4],   // 伸手到茶壶上，低头看壶
      [0.10, 52, 26, -8, 30, 50, -12, -5],   // 倒茶，视线落在杯上
      [0.24, 40, 74, -14, 30, 52, -7, -3],   // 提起茶壶、换杯
      [0.34, 44, 96, -18, 28, 50, -4, -2],   // 端杯到胸前
      [0.44, 48, 108, -22, 26, 44, -6, -3],  // 举杯近唇（低头就杯，不仰头）
      [0.56, 44, 96, -18, 28, 50, -4, -2],   // 饮毕放下一点
      [0.70, 34, 54, -14, 28, 44, -3, -2],   // 杯放回膝前
      [0.82, 28, 40, -16, 28, 40, -2, -1],   // 静坐，双手叠在膝上
      [0.96, 28, 40, -16, 28, 40, -2, -1],   // 静坐保持
      [1.00, 58, 34, -10, 30, 46, -9, -4],   // 回到倒茶，闭合循环
    ];
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1][0]) i++;
    const a = K[i], b2 = K[i + 1];
    const span = b2[0] - a[0] || 1;
    let u = (p - a[0]) / span;
    u = Math.max(0, Math.min(1, u));
    // 缓入缓出，避免关键帧之间出现生硬折角
    u = u * u * (3 - 2 * u);
    const lerp = (x: number, y: number) => x + (y - x) * u;
    const armRX = lerp(a[1], b2[1]);
    const foreRX = lerp(a[2], b2[2]);
    const armRZ = lerp(a[3], b2[3]);
    const armLX = lerp(a[4], b2[4]);
    const foreLX = lerp(a[5], b2[5]);
    const headX = lerp(a[6], b2[6]);
    const neckX = lerp(a[7], b2[7]);
    return {
      // 盘腿坐在坐垫上：大腿前折近水平、小腿收回压向内侧
      thighL: [R(78), 0, R(8)], thighR: [R(78), 0, R(-8)],
      shinL: [R(-76), 0, R(-6)], shinR: [R(-76), 0, R(6)],
      footL: [R(-8), 0, R(-3)], footR: [R(-8), 0, R(3)],
      hips: [R(4), 0, 0],
      spine: [R(5) + breath, 0, 0], chest: [R(2), 0, 0], neck: [R(neckX), 0, 0], head: [R(headX) + breath, 0, 0],
      armL: [R(armLX), 0, R(-16)], armR: [R(armRX), 0, R(armRZ)],
      foreL: [R(foreLX), 0, R(-12)], foreR: [R(foreRX), 0, R(armRZ * 0.6)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'offering') {
    // 供养：双手托举供花/供水，先举到胸前，再随躬身一起送到供案上方
    const ph = Math.min(1, Math.max(0, (t % 2.8) / 2.8));
    // 0~0.35 举起，0.35~0.72 保持躬身，0.72~1 放下
    const lift = ph < 0.35 ? ph / 0.35 : ph < 0.72 ? 1 : 1 - (ph - 0.72) / 0.28;
    const e2 = lift * lift * (3 - 2 * lift);
    const bow = e2 * R(30);
    return {
      spine: [bow, 0, 0], chest: [R(6) * e2, 0, 0], neck: [R(4) * e2, 0, 0], head: [R(10) * e2, 0, 0],
      thighL: [R(3), 0, R(3)], thighR: [R(3), 0, R(-3)],
      shinL: [R(-4), 0, 0], shinR: [R(-4), 0, 0],
      armL: [R(46) + R(44) * e2, 0, R(-24)], armR: [R(46) + R(44) * e2, 0, R(24)],
      foreL: [R(52) + R(18) * e2, 0, R(-16)], foreR: [R(52) + R(18) * e2, 0, R(16)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'sitting') {
    // 跪坐（正坐）在铺垫上：大腿前折、小腿后收压在垫面，上身直立，双手结印
    const breath = Math.sin(t * 1.1) * R(1.5);
    // 落座程度：坐下即完全落座（此前漏定义导致坐下动作报错）
    const down = 1;
    return {
      // 盘腿（结跏趺坐）：大腿外展 + 前折，小腿内收交叉压在垫上
      thighL: [R(10) * down + R(20) * (1 - down), 0, R(2)], thighR: [R(10) * down + R(20) * (1 - down), 0, R(-2)],
      shinL: [R(84) * (1 - 0.2 * down), 0, R(-2)], shinR: [R(84) * (1 - 0.2 * down), 0, R(2)],
      footL: [R(-18), 0, 0], footR: [R(-18), 0, 0],
      hips: [R(8), 0, 0],
      spine: [R(2) + breath, 0, 0], chest: [R(0), 0, 0], neck: [R(1), 0, 0], head: [R(4) + breath, 0, 0],
      armL: [R(26) + R(50) * down, 0, R(-14)], armR: [R(26) + R(50) * down, 0, R(14)],
      foreL: [R(28) + R(14) * down, 0, R(-10)], foreR: [R(28) + R(14) * down, 0, R(10)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'kowtow' || action === 'bowing') {
    // 五体投地：整个人放平（由 root 整体前倾实现），上身保持笔直，
    // 只抬头让脸不埋进垫子，双手向前伸到垫面前方
    const cyc = Math.sin(t * 1.05);
    const down = Math.min(1, Math.max(0, (cyc + 0.95) / 1.15)) ** 0.9;
    return {
      thighL: [R(4) * down, 0, R(3)], thighR: [R(4) * down, 0, R(-3)],
      shinL: [R(96) * down, 0, R(-2)], shinR: [R(96) * down, 0, R(2)],
      footL: [R(-26) * down, 0, 0], footR: [R(-26) * down, 0, 0],
      hips: [R(-92) * down, 0, 0],
      spine: [0, 0, 0],
      chest: [0, 0, 0],
      neck: [R(2) * down, 0, 0],
      head: [R(-4) * down, 0, 0],
      armL: [R(46) * down, 0, R(-16)], armR: [R(46) * down, 0, R(16)],
      foreL: [R(30) * down, 0, R(-10)], foreR: [R(30) * down, 0, R(10)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'wood_hit' || action === 'beads') {
    const tap = action === 'wood_hit' ? Math.sin(t * 8) * R(14) : Math.sin(t * 3) * R(6);
    return {
      thighL: [R(34), 0, R(26)], thighR: [R(34), 0, R(-26)],
      shinL: [R(-46), 0, R(-12)], shinR: [R(-46), 0, R(12)],
      footL: [R(18), 0, R(-8)], footR: [R(18), 0, R(8)],
      spine: [R(5), 0, 0], head: [R(8), 0, 0],
      armL: [R(30), 0, R(-34)], armR: [R(30), 0, R(34)],
      foreL: [R(10) + tap, 0, R(-30)], foreR: [R(10) - tap, 0, R(30)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'greet') {
    // 相遇行礼：向前倾身、双手在胸前抱拳，起落各占一半，1.5 秒一轮
    const T = 1.5;
    const p = Math.min(1, t / T);
    const lift = p < 0.5 ? p * 2 : (1 - p) * 2;        // 0 → 1 → 0
    const e = lift * lift * (3 - 2 * lift);            // 缓入缓出
    return {
      spine: [R(7 * e), 0, 0], chest: [R(9 * e), 0, 0],
      neck: [R(3 * e), 0, 0], head: [R(9 * e), 0, 0],
      // 上臂向前抬起并向内收，前臂折到胸前，两手在中间相抱
      armL: [R(46 * e), 0, R(20 * e)], armR: [R(46 * e), 0, R(-20 * e)],
      foreL: [R(74 * e), 0, R(16 * e)], foreR: [R(74 * e), 0, R(-16 * e)],
      thighL: [R(1), 0, R(3)], thighR: [R(1), 0, R(-3)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'incense') {
    // 上香四步，一口气慢慢做完：挺直站立 → 向前躬身 → 双手把香插进香炉 → 直身收回
    // 进度按 6.4 秒一轮推进，动作之间用缓动过渡，不跳帧
    const T = 6.4;
    const p = Math.min(1, t / T);
    const K = [0, 0.24, 0.5, 0.74, 1];          // 四个关键节点
    const ease = (u: number) => u * u * (3 - 2 * u);
    const seg = (vals: number[]) => {
      for (let i = 0; i < K.length - 1; i++) {
        if (p <= K[i + 1] || i === K.length - 2) {
          const u = ease(Math.min(1, Math.max(0, (p - K[i]) / (K[i + 1] - K[i]))));
          return vals[i] + (vals[i + 1] - vals[i]) * u;
        }
      }
      return vals[vals.length - 1];
    };
    const spine = seg([0, 6, 22, 28, 4]);
    const chest = seg([0, 2, 7, 9, 1]);
    const neck = seg([0, 1, 4, 5, 1]);
    const head = seg([0, 2, 11, 14, 2]);
    const armX = seg([34, 44, 62, 74, 26]);
    const foreX = seg([64, 52, 26, 16, 56]);
    const armZ = seg([10, 8, 5, 3, 12]);        // 双臂向中间收拢，双手合着香
    const breath = Math.sin(t * 0.9) * R(0.6);
    return {
      spine: [R(spine) + breath, 0, 0], chest: [R(chest), 0, 0],
      neck: [R(neck), 0, 0], head: [R(head), 0, 0],
      armL: [R(armX), 0, R(-armZ)], armR: [R(armX), 0, R(armZ)],
      foreL: [R(foreX), 0, R(-armZ * 0.6)], foreR: [R(foreX), 0, R(armZ * 0.6)],
      thighL: [R(2), 0, R(3)], thighR: [R(2), 0, R(-3)],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'praying') {
    // 合手时带一个缓慢的鞠躬起伏：掌在胸前、上身一起一落
    const bow = (Math.sin(t * 1.1 - Math.PI / 2) + 1) * 0.5;
    return {
      armL: [R(46), 0, R(-52)], armR: [R(46), 0, R(52)],
      foreL: [R(6), 0, R(-34)], foreR: [R(6), 0, R(34)],
      spine: [R(4) + R(26) * bow, 0, 0], chest: [R(6) * bow, 0, 0], head: [R(8) + R(8) * bow, 0, 0],
    } as Record<string, [number, number, number]>;
  }

  if (motion === 'walk') {
    // 正常人走路：大腿前后摆约 ±26°，摆动腿屈膝 45°，支撑腿几乎伸直；
    // 脚踝随大腿回正保持脚掌贴地，手臂自然前后摆，骨盆与胸腔反向轻微扭转
    const sw = Math.sin(wt);                       // ±1，左右交替
    const swingL = Math.max(0, -Math.cos(wt));     // 左腿在"向前摆"的半程
    const swingR = Math.max(0, Math.cos(wt));
    const kneeL = 0; // 下半身解析权重只跟大腿，屈膝不再驱动网格
    const kneeR = 0;
    const thighL = sw * R(13);
    const thighR = -sw * R(13);
    // 脚踝：抵消大腿+小腿的转动，让脚掌在支撑期基本水平，离地时脚尖下压
    const ankleL = -thighL * 0.6;
    const ankleR = -thighR * 0.6;
    return {
      thighL: [thighL, 0, R(2)], thighR: [thighR, 0, R(-2)],
      shinL: [-kneeL, 0, 0], shinR: [-kneeR, 0, 0],
      footL: [ankleL, 0, 0], footR: [ankleR, 0, 0],
      armL: [-sw * R(24) + R(4), 0, R(4)], armR: [sw * R(24) - R(4), 0, R(-4)],
      foreL: [R(14) - sw * R(10) + Math.max(0, -sw) * R(8), 0, R(-4)],
      foreR: [R(14) + sw * R(10) + Math.max(0, sw) * R(8), 0, R(4)],
      hips: [0, sw * R(4), 0],
      spine: [R(3), 0, 0],
      chest: [R(1), -sw * R(5), -sw * R(1.5)],
      head: [R(-1), 0, 0],
    } as Record<string, [number, number, number]>;
  }

  const br = Math.sin(t * 1.4) * R(2);
  return {
    spine: [br, 0, 0], chest: [br * 0.5, 0, 0],
    armL: [0, 0, R(3)], armR: [0, 0, R(-3)],
  } as Record<string, [number, number, number]>;
}

/** 用哈希网格找最近的已蒙皮顶点，把骨骼权重搬过来（全部在根节点局部空间里算） */
function transferWeights(
  src: THREE.SkinnedMesh[],
  dst: THREE.BufferGeometry,
  targetBones: THREE.Bone[],
) {
  const CELL = 0.04;
  const grid = new Map<string, { p: THREE.Vector3; idx: number[]; w: number[] }[]>();
  const nameToIdx = new Map<string, number>();
  targetBones.forEach((b, i) => nameToIdx.set(norm(b.name), i));

  const mInv = new THREE.Matrix4().copy(targetBones[0].parent!.matrixWorld).invert();

  src.forEach((mesh) => {
    mesh.updateMatrixWorld(true);
    mesh.skeleton.update();
    const geom = mesh.geometry;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const si = geom.getAttribute('skinIndex') as THREE.BufferAttribute;
    const sw = geom.getAttribute('skinWeight') as THREE.BufferAttribute;
    if (!pos || !si || !sw) return;
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
      p.applyMatrix4(mesh.matrixWorld).applyMatrix4(mInv);
      const out = new THREE.Vector3();
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (!w) continue;
        const bone = mesh.skeleton.bones[si.getComponent(i, k)];
        const q = p.clone().applyMatrix4(mesh.skeleton.boneInverses[si.getComponent(i, k)]).applyMatrix4(bone.matrixWorld).applyMatrix4(mInv);
        out.addScaledVector(q, w);
      }
      const idx: number[] = [];
      const wts: number[] = [];
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w <= 0.0001) continue;
        const bi = nameToIdx.get(norm(mesh.skeleton.bones[si.getComponent(i, k)].name));
        if (bi === undefined) continue;
        idx.push(bi);
        wts.push(w);
      }
      if (!idx.length) continue;
      const key = `${Math.floor(out.x / CELL)}|${Math.floor(out.y / CELL)}|${Math.floor(out.z / CELL)}`;
      let arr = grid.get(key);
      if (!arr) { arr = []; grid.set(key, arr); }
      arr.push({ p: out, idx, w: wts });
    }
  });

  const pos = dst.getAttribute('position') as THREE.BufferAttribute;
  const skinIndex = new Uint16Array(pos.count * 4);
  const skinWeight = new Float32Array(pos.count * 4);

  // 每根骨在根节点局部空间里的静止位置（用于分区闸门）
  const bpos: Record<string, THREE.Vector3> = {};
  targetBones.forEach((b) => {
    const w = new THREE.Vector3();
    b.getWorldPosition(w);
    bpos[norm(b.name)] = w.applyMatrix4(mInv);
  });

  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const cx = Math.floor(v.x / CELL), cy = Math.floor(v.y / CELL), cz = Math.floor(v.z / CELL);
    let best = Infinity;
    let bi1: number[] = [0], bw1: number[] = [1];
    for (let r = 0; r <= 2 && best === Infinity; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        const arr = grid.get(`${cx + dx}|${cy + dy}|${cz + dz}`);
        if (!arr) continue;
        for (const item of arr) {
          const d = item.p.distanceToSquared(v);
          if (d < best) { best = d; bi1 = item.idx; bw1 = item.w; }
        }
      }
    }

    // 分区闸门：手臂骨只允许出现在两侧袖管区域，避免袍身/领口被手臂拉成尖刺
    const side = v.x < 0 ? 'l' : 'r';
    const armOk = Math.abs(v.x) > 0.115 && v.y > 0.45 && v.y < 0.97;
    const legOk = v.y < 0.66;
    const kept: [number, number][] = [];
    for (let k = 0; k < Math.min(4, bi1.length); k++) {
      const bi = bi1[k];
      const nm = norm(targetBones[bi]?.name ?? '');
      const isArm = /arm|hand/.test(nm);
      const isLeg = /thigh|shin|foot/.test(nm);
      if (isArm && !armOk) continue;
      if (isLeg && !legOk) continue;
      // 手臂骨距离过远（>0.22）也不给权重
      if (isArm) {
        const bp = bpos[nm];
        if (bp && bp.distanceTo(v) > 0.26) continue;
      }
      kept.push([bi, bw1[k]]);
    }
    if (!kept.length) {
      // 退回到最合适的躯干骨
      const fallback = v.y > 0.97 ? 'head' : v.y > 0.86 ? 'chest' : v.y > 0.7 ? 'spine' : 'hips';
      const bi = targetBones.findIndex((b) => norm(b.name) === fallback);
      kept.push([bi >= 0 ? bi : 0, 1]);
    }
    const total = kept.reduce((s2, x) => s2 + x[1], 0) || 1;
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = kept[k] ? kept[k][0] : 0;
      skinWeight[i * 4 + k] = kept[k] ? kept[k][1] / total : 0;
    }
  }

  // 按“到骨段距离”二次过滤四肢权重：只有真正贴在骨段附近的顶点才允许跟手臂/腿走
  const seg = (a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3) => {
    const ab = b.clone().sub(a);
    const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1)));
    return a.clone().addScaledVector(ab, t).distanceTo(p);
  };
  const armSeg: Record<string, THREE.Vector3[]> = {};
  const legSeg: Record<string, THREE.Vector3[]> = {};
  for (const side of ['L', 'R']) {
    armSeg[side.toLowerCase()] = [
      bpos['upperarm' + side.toLowerCase()], bpos['forearm' + side.toLowerCase()], bpos['hand' + side.toLowerCase()],
    ].filter(Boolean) as THREE.Vector3[];
    legSeg[side.toLowerCase()] = [
      bpos['thigh' + side.toLowerCase()], bpos['shin' + side.toLowerCase()], bpos['foot' + side.toLowerCase()],
    ].filter(Boolean) as THREE.Vector3[];
  }
  const distToChain = (chain: THREE.Vector3[], p: THREE.Vector3) => {
    let d = Infinity;
    for (let k = 0; k < chain.length - 1; k++) d = Math.min(d, seg(chain[k], chain[k + 1], p));
    return d;
  };
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const side = v.x < 0 ? 'l' : 'r';
    const armD = distToChain(armSeg[side] ?? [], v);
    const legD = distToChain(legSeg[side] ?? [], v);
    const armOk = armD < 0.062;
    const legOk = legD < 0.072;
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const bi = skinIndex[i * 4 + k];
      const nm = norm(targetBones[bi]?.name ?? '');
      const isArm = /arm|hand/.test(nm);
      const isLeg = /thigh|shin|foot/.test(nm);
      if ((isArm && !armOk) || (isLeg && !legOk)) { skinWeight[i * 4 + k] = 0; }
      sum += skinWeight[i * 4 + k];
    }
    if (sum < 0.0001) {
      skinWeight.fill(0, i * 4, i * 4 + 4);
      skinIndex.fill(0, i * 4, i * 4 + 4);
      skinWeight[i * 4] = 1; // 交给下面的躯干解析权重覆盖
    }
  }

  // 躯干改解析权重（按高度在 hips→spine→chest→neck→head 之间线性过渡），
  // 这是唯一能保证弯腰时袍面平滑、不被个别顶点拉成尖刺的做法
  const spineChain = ['hips', 'spine', 'chest', 'neck', 'head'];
  const chainIdx = spineChain.map((n) => targetBones.findIndex((b) => norm(b.name) === n));
  const chainY = spineChain.map((n) => bpos[n]?.y ?? 0);
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const armNear = distToChain(armSeg[v.x < 0 ? 'l' : 'r'] ?? [], v) < 0.13;
    if (armNear) continue;
    // 找相邻两根高度
    let lo = 0;
    for (let k = 0; k < chainY.length - 1; k++) if (v.y >= chainY[k]) lo = k;
    const y0 = chainY[lo], y1 = chainY[Math.min(lo + 1, chainY.length - 1)];
    let t = y1 > y0 ? (v.y - y0) / (y1 - y0) : 1;
    t = Math.max(0, Math.min(1, t));
    // 腰部以下（袍摆）全部锁死在髋骨：否则一脚踩住、一脚抬起时，
    // 邻近顶点一个跟脊柱一个留髋部，袍面会被拉成长条碎片
    if (v.y < 0.72) {
      for (let k = 0; k < 4; k++) { skinIndex[i * 4 + k] = 0; skinWeight[i * 4 + k] = 0; }
      const hi = chainIdx[0];
      if (hi >= 0) { skinIndex[i * 4] = hi; skinWeight[i * 4] = 1; }
      continue;
    }
    if (v.y < 0.30) continue;
    const wT = Math.max(0, Math.min(1, (v.y - 0.30) / 0.28));
    const b0 = chainIdx[lo], b1 = chainIdx[Math.min(lo + 1, chainIdx.length - 1)];
    const blended: [number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const w = skinWeight[i * 4 + k] * (1 - wT);
      if (w > 0.0005) blended.push([skinIndex[i * 4 + k], w]);
    }
    if (wT > 0) {
      blended.push([b0 >= 0 ? b0 : 0, wT * (1 - t)]);
      if (t > 0) blended.push([b1 >= 0 ? b1 : 0, wT * t]);
    }
    const top = blended.sort((a2, b2) => b2[1] - a2[1]).slice(0, 4);
    const total2 = top.reduce((s2, x) => s2 + x[1], 0) || 1;
    for (let k = 0; k < 4; k++) { skinIndex[i * 4 + k] = 0; skinWeight[i * 4 + k] = 0; }
    top.forEach(([bi, w], k) => { skinIndex[i * 4 + k] = bi; skinWeight[i * 4 + k] = w / total2; });
  }

  // 袖子/手臂权重平滑过渡：原来按"到臂骨距离 <0.062"硬切，
  // 边界两侧相邻顶点一个跟手臂、一个留在躯干，一摆臂就撕成条。改成距离渐变。
  {
    const chestI = targetBones.findIndex((b) => norm(b.name) === 'chest');
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      if (v.y < 0.55) continue;
      const armD = distToChain(armSeg[v.x < 0 ? 'l' : 'r'] ?? [], v);
      const f = Math.max(0, Math.min(1, (0.085 - armD) / 0.045)); // 贴骨=1，离开=0
      if (f >= 0.999) continue;
      let armW = 0;
      for (let k = 0; k < 4; k++) {
        const nm = norm(targetBones[skinIndex[i * 4 + k]]?.name ?? '');
        if (/arm|hand/.test(nm)) armW += skinWeight[i * 4 + k];
      }
      if (armW <= 0.0001) continue;
      const keep = armW * f;
      const give = armW - keep;
      for (let k = 0; k < 4; k++) {
        const nm = norm(targetBones[skinIndex[i * 4 + k]]?.name ?? '');
        if (/arm|hand/.test(nm)) skinWeight[i * 4 + k] *= f;
      }
      // 让出来的份额交给胸腔，并归一化
      const slot = skinWeight[i * 4 + 3] > 0.0001 && !/arm|hand/.test(norm(targetBones[skinIndex[i * 4 + 3]]?.name ?? '')) ? 3 : 0;
      if (chestI >= 0) { skinIndex[i * 4 + slot] = chestI; skinWeight[i * 4 + slot] += give; }
      let total = 0;
      for (let k = 0; k < 4; k++) total += skinWeight[i * 4 + k];
      if (total > 0) for (let k = 0; k < 4; k++) skinWeight[i * 4 + k] /= total;
    }
  }

  // 下半身（袍摆 + 腿）改解析权重：只用 hips 与左右大腿三根骨，
  // 按高度从髋部渐变到腿、按横向位置从右腿渐变到左腿。
  // 原来这些顶点靠"最近已蒙皮顶点"迁移，接缝处相邻顶点被分给不同腿骨，
  // 一迈腿就被撕成碎条 —— 这也是"悬空 + 脚不像人走路"的根源。
  {
    const hipI = targetBones.findIndex((b) => norm(b.name) === 'hips');
    const tLI = targetBones.findIndex((b) => norm(b.name) === 'thighl');
    const tRI = targetBones.findIndex((b) => norm(b.name) === 'thighr');
    const fLI = targetBones.findIndex((b) => norm(b.name) === 'footl');
    const fRI = targetBones.findIndex((b) => norm(b.name) === 'footr');
    const sLI = targetBones.findIndex((b) => norm(b.name) === 'shinl');
    const sRI = targetBones.findIndex((b) => norm(b.name) === 'shinr');
    const TOP = 0.56, BOT = 0.05;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      if (v.y >= TOP) continue;
      if (distToChain(armSeg[v.x < 0 ? 'l' : 'r'] ?? [], v) < 0.13) continue; // 别动袖口/手
      const t = Math.max(0, Math.min(1, (TOP - v.y) / (TOP - BOT)));
      const legShare = 0.9 * t;
      const lat = Math.max(0, Math.min(1, 0.5 + v.x / 0.22)); // 0 = 全左腿, 1 = 全右腿
      // 袍摆（膝盖以上）跟随"两条腿的平均"，整片袍子才不会从中间裂成条；
      // 越往下越偏向各自那条腿，到脚踝完全分左右，这样迈步能看到脚交替。
      const split = Math.max(0, Math.min(1, (0.24 - v.y) / 0.16));
      const mix = 0.5 + (lat - 0.5) * split;
      // 小腿参与一点：站直走路时小腿不转，不影响步态；
      // 坐/行礼时小腿后收，袍摆才跟着折起来
      const shf = Math.max(0, Math.min(1, (0.34 - v.y) / 0.18)) * 0.55;
      const shinI = mix > 0.5 ? sRI : sLI;
      const rest = 1 - shf;
      const w: [number, number][] = [
        [hipI, 1 - legShare],
        [tLI, legShare * (1 - mix) * rest],
        [tRI, legShare * mix * rest],
        [shinI, legShare * shf],
      ];
      const top = w.filter((x) => x[1] > 0.0005);
      const total = top.reduce((a, b) => a + b[1], 0) || 1;
      for (let k = 0; k < 4; k++) { skinIndex[i * 4 + k] = 0; skinWeight[i * 4 + k] = 0; }
      top.slice(0, 4).forEach(([bi, wt], k) => {
        if (bi < 0) return;
        skinIndex[i * 4 + k] = bi;
        skinWeight[i * 4 + k] = wt / total;
      });
    }
  }

  // 沿拓扑平滑两轮，减小接缝
  const idxA = dst.getIndex();
  if (idxA) {
    const nbr = new Map<number, number[]>();
    for (let i = 0; i < idxA.count; i += 3) {
      const a = idxA.getX(i), b = idxA.getX(i + 1), c = idxA.getX(i + 2);
      const push = (x: number, y: number) => { const l = nbr.get(x) ?? nbr.set(x, []).get(x)!; l.push(y); };
      push(a, b); push(b, c); push(c, a);
    }
    for (let pass = 0; pass < 6; pass++) {
      const outI = skinIndex.slice();
      const outW = skinWeight.slice();
      for (let i = 0; i < pos.count; i++) {
        const list = nbr.get(i);
        if (!list || !list.length) continue;
        const accum = new Map<number, number>();
        for (let k = 0; k < 4; k++) accum.set(skinIndex[i * 4 + k], (accum.get(skinIndex[i * 4 + k]) ?? 0) + skinWeight[i * 4 + k] * 0.55);
        const share = 0.45 / list.length;
        for (const j of list) for (let k = 0; k < 4; k++) accum.set(skinIndex[j * 4 + k], (accum.get(skinIndex[j * 4 + k]) ?? 0) + skinWeight[j * 4 + k] * share);
        const top = [...accum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        const total = top.reduce((s, x) => s + x[1], 0) || 1;
        for (let k = 0; k < 4; k++) {
          outI[i * 4 + k] = top[k] ? top[k][0] : 0;
          outW[i * 4 + k] = top[k] ? top[k][1] / total : 0;
        }
      }
      skinIndex.set(outI);
      skinWeight.set(outW);
    }
  }

  dst.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  dst.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  return grid.size;
}

function Avatar({ position = [0, 0, 0], rotationY = 0, height = 1.42, motion = 'idle', action = 'idle', stridePhase, live = true, timeShift = 0, seatKind = 'floor' }: Props) {
  const rig = useGLTF(RIG_AVATAR_URL);
  const sculpt = useGLTF(SCULPT_AVATAR_URL);
  const [ready, setReady] = useState(false);
  const root = useRef<THREE.Group>(null);
  const bones = useRef<Record<string, THREE.Bone>>({});
  const rest = useRef<Record<string, THREE.Euler>>({});
  const cur = useRef<Record<string, [number, number, number]>>({});

  const prepared = useMemo(() => {
    const scene = cloneSkeleton(rig.scene);
    const map: Record<string, THREE.Bone> = {};
    const restMap: Record<string, THREE.Euler> = {};
    const skinned: THREE.SkinnedMesh[] = [];

    scene.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone) {
        const alias = BONE_NAMES.find((n) => norm(n) === norm(b.name));
        if (alias) { map[alias] = b; restMap[alias] = b.rotation.clone(); }
        return;
      }
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) {
        skinned.push(m);
        m.visible = true; // 原生网格自带正确蒙皮，行礼/盘腿不再碎
      }
    });

    // 雕刻稿：烘焙世界变换后，把身高/脚下/中线对齐到 avatar.glb 的局部空间
    let found: THREE.Mesh | null = null;
    sculpt.scene.traverse((o) => { if (!found && (o as THREE.Mesh).isMesh) found = o as unknown as THREE.Mesh; });
    const srcMesh = found as unknown as THREE.Mesh;
    sculpt.scene.updateMatrixWorld(true);
    const geo = srcMesh.geometry.clone();
    geo.applyMatrix4(srcMesh.matrixWorld);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const h = box.max.y - box.min.y;
    const rigBox = new THREE.Box3().setFromObject(skinned[0].parent ?? scene);
    const targetH = 1.45;
    const s = targetH / h;
    geo.scale(s, s, s);
    geo.computeBoundingBox();
    const b2 = geo.boundingBox!;
    geo.translate(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);

    // 把雕刻稿换回根节点局部空间
    const invRoot = new THREE.Matrix4().copy(scene.matrixWorld).invert();
    geo.applyMatrix4(invRoot);

    const mesh = new THREE.SkinnedMesh(geo, srcMesh.material as THREE.Material);
    mesh.castShadow = true;
    mesh.receiveShadow = false; // 自投影阴影贴图分辨率有限，会在袍面上糊成黑斑
    mesh.frustumCulled = false;

    const result = transferWeights(skinned, geo, skinned[0].skeleton.bones);
    // scene.add(mesh);
    scene.updateMatrixWorld(true);
    mesh.bind(skinned[0].skeleton, new THREE.Matrix4());

    // 用雕刻稿的顶点色给原生服装上色，保留金色袈裟的观感
    {
      const col = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
      if (col) {
        const cell = 0.05;
        const cgrid = new Map<string, number[]>();
        for (let i = 0; i < geo.attributes.position.count; i++) {
          const x = geo.attributes.position.getX(i), y = geo.attributes.position.getY(i), z = geo.attributes.position.getZ(i);
          const key = `${Math.floor(x / cell)}|${Math.floor(y / cell)}|${Math.floor(z / cell)}`;
          const arr = cgrid.get(key) ?? [];
          arr.push(i); cgrid.set(key, arr);
        }
        const inv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
        const tmp = new THREE.Vector3();
        for (const sm of skinned) {
          const nm = (sm.name || '').toLowerCase();
          const tone = nm.includes('head') || nm.includes('mitten') ? 0xf2c9a8
            : nm.includes('shoe') ? 0x6b4a2f
            : nm.includes('collar') || nm.includes('hem') ? 0xf4e6c8
            : nm.includes('wrap') ? 0xd98319
            : 0xe8a12a;
          const mats0 = Array.isArray(sm.material) ? sm.material : [sm.material];
          for (const mm of mats0) {
            const m2 = (mm as THREE.MeshStandardMaterial).clone();
            m2.vertexColors = false; m2.map = null; m2.color.setHex(tone);
            m2.roughness = 0.85; m2.metalness = 0.0;
            (sm as any).material = m2;
          }
          const g2 = sm.geometry;
          if (!g2.getAttribute('color')) {
            const n = g2.attributes.position.count;
            const ca = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
              tmp.fromBufferAttribute(g2.attributes.position, i).applyMatrix4(sm.matrixWorld).applyMatrix4(inv);
              const cx = Math.floor(tmp.x / cell), cy = Math.floor(tmp.y / cell), cz = Math.floor(tmp.z / cell);
              let bi = -1, bd = Infinity;
              for (let r = 0; r <= 3 && bi < 0; r++) {
                for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
                  const arr = cgrid.get(`${cx + dx}|${cy + dy}|${cz + dz}`);
                  if (!arr) continue;
                  for (const j of arr) {
                    const d = (geo.attributes.position.getX(j) - tmp.x) ** 2 + (geo.attributes.position.getY(j) - tmp.y) ** 2 + (geo.attributes.position.getZ(j) - tmp.z) ** 2;
                    if (d < bd) { bd = d; bi = j; }
                  }
                }
              }
              if (bi >= 0) { ca[i * 3] = col.getX(bi); ca[i * 3 + 1] = col.getY(bi); ca[i * 3 + 2] = col.getZ(bi); }
              else { ca[i * 3] = 0.85; ca[i * 3 + 1] = 0.62; ca[i * 3 + 2] = 0.28; }
            }
            g2.setAttribute('color', new THREE.BufferAttribute(ca, 3));
          }
          const mats = Array.isArray(sm.material) ? sm.material : [sm.material];
          for (const mm of mats) {
            const m2 = (mm as THREE.MeshStandardMaterial).clone();
            m2.vertexColors = true;
            m2.map = null;
            m2.roughness = 0.8; m2.metalness = 0.02;
            (sm as any).material = m2;
          }
        }
      }
    }

    {
      for (const sm of skinned) {
        const nm = (sm.name || '').toLowerCase();
        const tone = nm.includes('head') || nm.includes('mitten') ? 0xf0c9a6
          : nm.includes('shoe') ? 0x6b4a2f
          : nm.includes('collar') || nm.includes('hem') ? 0xf2e3c4
          : nm.includes('wrap') ? 0xd9821a
          : 0xe8a12a;
        const mats0 = Array.isArray(sm.material) ? sm.material : [sm.material];
        for (const mm of mats0) {
          const m2 = (mm as THREE.MeshStandardMaterial).clone();
          m2.vertexColors = false; m2.color = new THREE.Color(tone);
          m2.roughness = 0.85; m2.metalness = 0.0;
          (sm as any).material = m2;
        }
      }
    }

    bones.current = map;
    rest.current = restMap;
    (scene as any).userData.rig = result;
    return scene;
  }, [rig, sculpt]);

  useEffect(() => { setReady(true); }, [prepared]);

  useFrame(({ clock }, dt) => {
    if (!ready) return;
    const t = clock.getElapsedTime() + timeShift;
    // 本地玩家：直接读实时状态，避免 props 冻结
    const m = live ? playerMotion.motion : motion;
    // 动作以 React 传下来的 props 为准（共享对象只用来同步走路相位，动作值以这里更可靠）
    const a = live && playerMotion.action !== 'idle' ? playerMotion.action : action;
    const wt = live ? playerMotion.phase : stridePhase ?? t * 6.4;
    const sk = seatKind ?? 'floor';
    const target = poseOf(m, a, t, wt, sk);
    const k = cur.current;
    const lerp = Math.min(1, dt * 9);

    for (const name of BONE_NAMES) {
      const b = bones.current[name];
      const r = rest.current[name];
      if (!b || !r) continue;
      const tg = target[poseKey(name)] ?? [0, 0, 0];
      const c = k[name] ?? [0, 0, 0];
      c[0] += (tg[0] - c[0]) * lerp;
      c[1] += (tg[1] - c[1]) * lerp;
      c[2] += (tg[2] - c[2]) * lerp;
      k[name] = c;
      b.rotation.set(r.x + c[0], r.y + c[1], r.z + c[2]);
    }

    const sitting = a === 'wood_hit' || a === 'beads' || a === 'sitting' || a === 'kowtow' || a === 'bowing';
    if (root.current) {
      const kow = a === 'kowtow' || a === 'bowing';
      // 俯身越深，整个人再往下压一点：跪直时脚贴在垫上，贴地时额头才够到垫面
      const cyc = Math.sin(t * 1.05);
      const down = Math.min(1, Math.max(0, (cyc + 0.95) / 1.15)) ** 0.9;
      const want = kow
        ? -0.02 - 0.46 * down
        : a === 'sitting'
          ? (seatKind === 'bench' ? -0.42 : -0.42)   // 盘腿要明显下沉；坐凳时脚垂到地面
          : 0;
      // 走路时重心上下起伏（每步一次），站定时归零
      // 大腿前后摆会把两只脚同时抬高，这里按摆角把重心等量下沉，
      // 保证迈步时脚掌始终踩在地面上，同时形成"落地最低、直立最高"的自然起伏
      const swAmt = Math.sin(wt);
      const bobY = m === 'walk' && a === 'idle' ? -(1 - Math.cos(swAmt * (17 * Math.PI / 180))) * 0.62 - 0.012 : 0;
      // 左右重心摆动，每步一次，让脚步有重量感
      const swayX = m === 'walk' && a === 'idle' ? Math.sin(wt) * 0.012 : 0;
      const targetY = want + bobY;
      root.current.position.y += (targetY - root.current.position.y) * Math.min(1, dt * 10);
      // 坐下时整个人再压矮一截：宽袍把腿盖住了，只靠骨骼弯腿看不出"坐"，
      // 用整体纵向压缩配合下沉，才能一眼看出是坐在地上/凳上。
      const sq = a === 'sitting' ? (seatKind === 'bench' ? 0.86 : 0.86) : 1;
      root.current.scale.y += (sq - root.current.scale.y) * Math.min(1, dt * 8);
      // 俯身改成整个人绕脚前倾（刚性旋转），不做脊骨折叠：蒙皮不会被拉成碎片
      const tiltWant = 0;
      root.current.rotation.x += (tiltWant - root.current.rotation.x) * Math.min(1, dt * 8);
      root.current.position.x += (swayX - root.current.position.x) * Math.min(1, dt * 8);
    }
  });

  return (
    <group position={position} rotation-y={rotationY} ref={root}>
      <primitive object={prepared} scale={height / 1.45} />
    </group>
  );
}

export default function SkinAvatar(props: Props) {
  return <Avatar {...props} />;
}

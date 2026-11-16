/**
 * avatar/autorig.ts —— 静态雕刻稿的自动蒙皮
 *
 * 上传的 角色*.glb 是单网格、无骨骼、无动画的静态雕刻（约 8–9k 顶点）。
 * 直接在网格上刷权重最麻烦的地方是：袖子、裙摆、袍身是同一张连续曲面，
 * 用「欧氏距离」做权重会把裙摆粘到手腕上。
 * 这里改用**表面测地距离**（沿网格边走的最短路）给骨骼分配权重：
 * 从每根骨骼附近的顶点出发做一次 Dijkstra，离哪根骨头"沿表面"更近，
 * 权重就归谁——裙摆沿表面离胯最近，不会跟手跑。
 *
 * 坐标：模型空间（站立总高 1.0，脚底 y=-0.5，头顶 y=+0.5）。
 */

import * as THREE from 'three';
import { BONES, type BoneName } from './poses';

/** 模型空间里的关节点（y 轴向上，单位 = 模型高 1.0） */
export const JOINTS: Record<string, [number, number, number]> = {
  hips: [0, -0.21, 0],
  spine: [0, -0.10, 0],
  chest: [0, 0.02, 0],
  neck: [0, 0.175, 0],
  head: [0, 0.185, 0],
  shoulderL: [-0.145, 0.13, 0],
  elbowL: [-0.185, -0.05, 0.005],
  wristL: [-0.205, -0.185, 0.005],
  shoulderR: [0.145, 0.13, 0],
  elbowR: [0.185, -0.05, 0.005],
  wristR: [0.205, -0.185, 0.005],
  thighL: [-0.055, -0.21, 0],
  kneeL: [-0.055, -0.30, 0],
  ankleL: [-0.055, -0.44, 0],
  thighR: [0.055, -0.21, 0],
  kneeR: [0.055, -0.30, 0],
  ankleR: [0.055, -0.44, 0],
};

/** 每根骨的"骨段"（用于撒种子）与权重衰减半径 */
const BONE_SEG: Record<BoneName, { a: string; b: string; sigma: number }> = {
  hips: { a: 'hips', b: 'spine', sigma: 0.16 },
  spine: { a: 'spine', b: 'chest', sigma: 0.15 },
  chest: { a: 'chest', b: 'neck', sigma: 0.15 },
  neck: { a: 'neck', b: 'head', sigma: 0.09 },
  head: { a: 'head', b: 'head', sigma: 0.22 },
  upper_armL: { a: 'shoulderL', b: 'elbowL', sigma: 0.085 },
  forearmL: { a: 'elbowL', b: 'wristL', sigma: 0.075 },
  handL: { a: 'wristL', b: 'wristL', sigma: 0.07 },
  upper_armR: { a: 'shoulderR', b: 'elbowR', sigma: 0.085 },
  forearmR: { a: 'elbowR', b: 'wristR', sigma: 0.075 },
  handR: { a: 'wristR', b: 'wristR', sigma: 0.07 },
  thighL: { a: 'thighL', b: 'kneeL', sigma: 0.12 },
  shinL: { a: 'kneeL', b: 'ankleL', sigma: 0.09 },
  footL: { a: 'ankleL', b: 'ankleL', sigma: 0.075 },
  thighR: { a: 'thighR', b: 'kneeR', sigma: 0.12 },
  shinR: { a: 'kneeR', b: 'ankleR', sigma: 0.09 },
  footR: { a: 'ankleR', b: 'ankleR', sigma: 0.075 },
};

/** 父子关系（与 poses.ts 的骨骼命名一致） */
export const BONE_PARENT: Record<BoneName, BoneName | null> = {
  hips: null,
  spine: 'hips',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  upper_armL: 'chest',
  forearmL: 'upper_armL',
  handL: 'forearmL',
  upper_armR: 'chest',
  forearmR: 'upper_armR',
  handR: 'forearmR',
  thighL: 'hips',
  shinL: 'thighL',
  footL: 'shinL',
  thighR: 'hips',
  shinR: 'thighR',
  footR: 'shinR',
};

/** 每根骨在模型空间的位置（= 其骨段的起点） */
export const BONE_POS: Record<BoneName, [number, number, number]> = {
  hips: JOINTS.hips, spine: JOINTS.spine, chest: JOINTS.chest, neck: JOINTS.neck, head: JOINTS.head,
  upper_armL: JOINTS.shoulderL, forearmL: JOINTS.elbowL, handL: JOINTS.wristL,
  upper_armR: JOINTS.shoulderR, forearmR: JOINTS.elbowR, handR: JOINTS.wristR,
  thighL: JOINTS.thighL, shinL: JOINTS.kneeL, footL: JOINTS.ankleL,
  thighR: JOINTS.thighR, shinR: JOINTS.kneeR, footR: JOINTS.ankleR,
};

/* ---------------- 邻接表 + Dijkstra ---------------- */

type Graph = { nbr: Int32Array; off: Int32Array; w: Float32Array; n: number };

function buildGraph(geo: THREE.BufferGeometry): Graph {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const n = pos.count;
  const idx = geo.getIndex();
    // 收集无向边，去重
  const edges: number[] = [];
  const pairs = new Set<number>();
  const push = (i: number, j: number) => {
    if (i === j) return;
    const k = i < j ? i * 100000 + j : j * 100000 + i;
    if (pairs.has(k)) return;
    pairs.add(k);
    edges.push(i, j);
  };
  if (idx) {
    const arr = idx.array as ArrayLike<number>;
    for (let f = 0; f < arr.length; f += 3) {
      push(arr[f], arr[f + 1]); push(arr[f + 1], arr[f + 2]); push(arr[f + 2], arr[f]);
    }
  } else {
    for (let i = 0; i < n; i += 3) { push(i, i + 1); push(i + 1, i + 2); push(i + 2, i); }
  }
  const deg = new Int32Array(n);
  for (let e = 0; e < edges.length; e += 2) { deg[edges[e]]++; deg[edges[e + 1]]++; }
  const off = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) off[i + 1] = off[i] + deg[i];
  const nbr = new Int32Array(edges.length / 2);
  const w = new Float32Array(edges.length / 2);
  const cursor = off.slice(0, n);
  const P = new THREE.Vector3();
  for (let e = 0; e < edges.length; e += 2) {
    const i = edges[e], j = edges[e + 1];
    P.fromBufferAttribute(pos, i);
    const d = P.distanceTo(new THREE.Vector3().fromBufferAttribute(pos, j));
    nbr[cursor[i]] = j; w[cursor[i]] = d; cursor[i]++;
    nbr[cursor[j]] = i; w[cursor[j]] = d; cursor[j]++;
  }
  return { nbr, off, w, n };
}

/** 从多源顶点做 Dijkstra，返回每个顶点的测地距离 */
function dijkstra(g: Graph, seeds: number[], pos: THREE.BufferAttribute): Float32Array {
  const dist = new Float32Array(g.n).fill(Infinity);
  // 简易二叉堆
  const heapIdx: number[] = [];
  const heapKey: number[] = [];
  const cmp = (a: number, b: number) => heapKey[a] - heapKey[b];
  const swap = (a: number, b: number) => {
    [heapIdx[a], heapIdx[b]] = [heapIdx[b], heapIdx[a]];
    [heapKey[a], heapKey[b]] = [heapKey[b], heapKey[a]];
  };
  const pushH = (v: number, k: number) => {
    heapIdx.push(v); heapKey.push(k);
    let i = heapIdx.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (cmp(p, i) <= 0) break;
      swap(p, i); i = p;
    }
  };
  const popH = () => {
    const top = heapIdx[0];
    const lastI = heapIdx.length - 1;
    swap(0, lastI); heapIdx.pop(); heapKey.pop();
    let i = 0;
    while (true) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < heapIdx.length && cmp(l, m) < 0) m = l;
      if (r < heapIdx.length && cmp(r, m) < 0) m = r;
      if (m === i) break;
      swap(i, m); i = m;
    }
    return top;
  };
  for (const s of seeds) { dist[s] = 0; pushH(s, 0); }
  while (heapIdx.length) {
    const u = popH();
    const du = dist[u];
    for (let k = g.off[u]; k < g.off[u + 1]; k++) {
      const v = g.nbr[k];
      const nd = du + g.w[k];
      if (nd < dist[v]) { dist[v] = nd; pushH(v, nd); }
    }
  }
  return dist;
}

function pointSegmentDistance(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const ap = p.clone().sub(a);
  const t = Math.max(0, Math.min(1, ap.dot(ab) / Math.max(1e-9, ab.lengthSq())));
  return ap.sub(ab.multiplyScalar(t)).length();
}

/**
 * 计算蒙皮属性：把 skinIndex / skinWeight 就地写到 geometry 上。
 * 返回每根骨的顶点数统计，便于控制台排查权重是否合理。
 */
export function skinGeometry(geo: THREE.BufferGeometry): Record<string, number> {
  const g = buildGraph(geo);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const P = new THREE.Vector3();

  const dists: Partial<Record<BoneName, Float32Array>> = {};
  const seedsFor = (a: string, b: string) => {
    const A = new THREE.Vector3(...JOINTS[a]);
    const B = new THREE.Vector3(...JOINTS[b]);
    const seeds: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      P.fromBufferAttribute(pos, i);
      if (pointSegmentDistance(P, A, B) < 0.045) seeds.push(i);
    }
    if (!seeds.length) {
      // 兜底：最近的顶点当种子
      let best = 0, bd = Infinity;
      for (let i = 0; i < pos.count; i++) {
        P.fromBufferAttribute(pos, i);
        const d = P.distanceTo(A);
        if (d < bd) { bd = d; best = i; }
      }
      seeds.push(best);
    }
    return seeds;
  };

  for (const name of BONES) {
    const s = BONE_SEG[name];
    dists[name] = dijkstra(g, seedsFor(s.a, s.b), pos);
  }

  const B = BONES.length;
  const n = pos.count;
  // 稠密权重矩阵，先按测地距离给初值
  let W = new Float32Array(n * B);
  for (let v = 0; v < n; v++) {
    for (let i = 0; i < B; i++) {
      const name = BONES[i];
      const d = dists[name]![v];
      if (!isFinite(d)) continue;
      const sigma = BONE_SEG[name].sigma;
      W[v * B + i] = Math.exp(-(d / sigma) * (d / sigma));
    }
  }
  // 沿网格做若干次拉普拉斯平滑：袖口与袍身的权重过渡变软，动作时不会撕成碎片
  const smooth = new Float32Array(n * B);
  for (let it = 0; it < 3; it++) {
    for (let v = 0; v < n; v++) {
      const cnt = g.off[v + 1] - g.off[v] + 1;
      for (let i = 0; i < B; i++) {
        let acc = W[v * B + i] * 1.0;
        for (let k = g.off[v]; k < g.off[v + 1]; k++) acc += W[g.nbr[k] * B + i];
        smooth[v * B + i] = acc / cnt;
      }
    }
    W.set(smooth);
  }

  const COUNT = 4;
  const idxArr = new Uint16Array(n * COUNT);
  const wArr = new Float32Array(n * COUNT);
  const counts: Record<string, number> = {};
  const cand: { i: number; w: number }[] = [];

  for (let v = 0; v < n; v++) {
    P.fromBufferAttribute(pos, v);
    const armSide = Math.abs(P.x) >= 0.122
      ? (Math.min(
          pointSegmentDistance(P, new THREE.Vector3(...JOINTS.shoulderL), new THREE.Vector3(...JOINTS.wristL)),
          pointSegmentDistance(P, new THREE.Vector3(...JOINTS.shoulderR), new THREE.Vector3(...JOINTS.wristR))
        ) < 0.11 ? (P.x < 0 ? 'L' : 'R') : null) as ('L' | 'R' | null)
      : null;
    cand.length = 0;
    for (let i = 0; i < B; i++) {
      const w = W[v * B + i];
      if (w > 1e-3) cand.push({ i, w });
    }
    if (armSide) {
      for (const c of cand) {
        const nm = BONES[c.i];
        const ok = nm.endsWith('_arm' + armSide) || nm.startsWith('upper_arm' + armSide) || nm.startsWith('forearm' + armSide) || nm.startsWith('hand' + armSide);
        if (!ok) c.w = 0;
      }
      if (cand.every(c => c.w <= 0)) cand.push({ i: BONES.indexOf(('upper_arm' + armSide) as BoneName), w: 1 });
    } else {
      for (const c of cand) {
        const nm = BONES[c.i];
        if (nm.indexOf('arm') >= 0 || nm.startsWith('hand')) c.w = 0;
      }
      if (cand.every(c => c.w <= 0)) cand.push({ i: BONES.indexOf('chest'), w: 1 });
    }
    if (!cand.length) { cand.push({ i: BONES.indexOf('hips'), w: 1 }); }
    cand.sort((a, b) => b.w - a.w);
    const top = cand.slice(0, COUNT);
    const sum = top.reduce((s, c) => s + c.w, 0);
    for (let k = 0; k < COUNT; k++) {
      const c = top[k];
      idxArr[v * COUNT + k] = c ? c.i : 0;
      wArr[v * COUNT + k] = c ? c.w / sum : 0;
      if (c && k === 0) counts[BONES[c.i]] = (counts[BONES[c.i]] || 0) + 1;
    }
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idxArr, COUNT));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wArr, COUNT));
  return counts;
}

/**
 * 把两条手臂从雕刻稿上"切"下来：返回剔除手臂三角形后的几何。
 * 依据：顶点到手臂骨轴的三维距离 + |x| 阈值（保护躯干与裙摆）。
 * 切下来的断口会由肩部同色小球塞住，外观像人偶的肩关节。
 */
export function carveArms(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const P = new THREE.Vector3();
  const SEGS: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(...JOINTS.shoulderL), new THREE.Vector3(...JOINTS.wristL)],
    [new THREE.Vector3(...JOINTS.shoulderR), new THREE.Vector3(...JOINTS.wristR)],
  ];
  const isArm = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    P.fromBufferAttribute(pos, i);
    if (Math.abs(P.x) < 0.115) continue;
    const d = Math.min(
      pointSegmentDistance(P, SEGS[0][0], SEGS[0][1]),
      pointSegmentDistance(P, SEGS[1][0], SEGS[1][1])
    );
    if (d < 0.082) isArm[i] = 1;
  }
  const idx = geo.getIndex();
  if (!idx) return geo;
  const arr = idx.array as ArrayLike<number>;
  const keep: number[] = [];
  for (let f = 0; f < arr.length; f += 3) {
    if (isArm[arr[f]] && isArm[arr[f + 1]] && isArm[arr[f + 2]]) continue;
    keep.push(arr[f], arr[f + 1], arr[f + 2]);
  }
  const g2 = geo.clone();
  g2.setIndex(keep);
  return g2;
}

/** 建立骨骼层级，返回根骨与按名字索引的骨骼表 */
export function buildBones(): { root: THREE.Bone; bones: Record<BoneName, THREE.Bone> } {
  const bones = {} as Record<BoneName, THREE.Bone>;
  for (const name of BONES) {
    const b = new THREE.Bone();
    b.name = name;
    const p = BONE_POS[name];
    const parent = BONE_PARENT[name];
    const pp = parent ? BONE_POS[parent] : [0, 0, 0];
    b.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    bones[name] = b;
  }
  for (const name of BONES) {
    const parent = BONE_PARENT[name];
    if (parent) bones[parent].add(bones[name]);
  }
  return { root: bones.hips, bones };
}

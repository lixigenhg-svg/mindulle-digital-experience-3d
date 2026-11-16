/**
 * rigSheet.ts —— 把「三视图」静态模型稿切成单个人像，并现场装配骨骼 + 蒙皮
 *
 * 上传的 sample-v1.glb 是雕刻稿：一个网格里并排正面 / 含布袋 / 背面三个小人，
 * 没有 skin、没有 animation。要让它做出合手、行礼、木鼓等动作，只能：
 *   1) 按三角形重心 x 区间切出中间那个人像（其余两视图丢弃）
 *   2) 按人体比例摆一套 13 根骨骼
 *   3) 用「顶点到骨段距离」做包络蒙皮权重（top-4 归一化）
 *   4) 动作仍由 poseFor 生成角度，复用既有姿态语义
 */
import * as THREE from 'three';

export interface RigPart {
  /** 骨骼名 */
  name: string;
  /** 该骨骼在世界（模型局部）坐标中的位置 */
  pos: [number, number, number];
  /** 父骨骼名，null 表示根 */
  parent: string | null;
}

/** 以身高 1 归一化的骨骼位置（y 向上，脚底 y=0，面朝 -Z） */
export const RIG_PARTS: RigPart[] = [
  { name: 'root', pos: [0, 0, 0], parent: null },
  { name: 'hips', pos: [0, 0.52, 0], parent: 'root' },
  { name: 'spine', pos: [0, 0.60, 0], parent: 'hips' },
  { name: 'chest', pos: [0, 0.68, 0], parent: 'spine' },
  { name: 'neck', pos: [0, 0.78, 0], parent: 'chest' },
  { name: 'head', pos: [0, 0.84, 0], parent: 'neck' },
  { name: 'shoulderL', pos: [-0.082, 0.66, 0], parent: 'chest' },
  { name: 'elbowL', pos: [-0.118, 0.55, 0], parent: 'shoulderL' },
  { name: 'handL', pos: [-0.145, 0.455, 0], parent: 'elbowL' },
  { name: 'shoulderR', pos: [0.082, 0.66, 0], parent: 'chest' },
  { name: 'elbowR', pos: [0.118, 0.55, 0], parent: 'shoulderR' },
  { name: 'handR', pos: [0.145, 0.455, 0], parent: 'elbowR' },
  { name: 'thighL', pos: [-0.062, 0.5, 0], parent: 'hips' },
  { name: 'kneeL', pos: [-0.068, 0.27, 0], parent: 'thighL' },
  { name: 'footL', pos: [-0.07, 0.05, 0], parent: 'kneeL' },
  { name: 'thighR', pos: [0.062, 0.5, 0], parent: 'hips' },
  { name: 'kneeR', pos: [0.068, 0.27, 0], parent: 'thighR' },
  { name: 'footR', pos: [0.07, 0.05, 0], parent: 'kneeR' },
];

/** 参与蒙皮的骨段（父 → 子），权重只按这些段算 */
const SEGMENTS: [string, string][] = [
  ['root', 'hips'],
  ['hips', 'spine'],
  ['spine', 'chest'],
  ['chest', 'neck'],
  ['neck', 'head'],
  ['chest', 'shoulderL'],
  ['shoulderL', 'elbowL'],
  ['elbowL', 'handL'],
  ['chest', 'shoulderR'],
  ['shoulderR', 'elbowR'],
  ['elbowR', 'handR'],
  ['hips', 'thighL'],
  ['thighL', 'kneeL'],
  ['kneeL', 'footL'],
  ['hips', 'thighR'],
  ['thighR', 'kneeR'],
  ['kneeR', 'footR'],
];

/**
 * 切出单个立像：按三角形重心 x 落在 [xMin, xMax] 判定，
 * 同时把顶点重排成「只含被采用的顶点」，便于计算权重。
 */
export function splitFigure(source: THREE.BufferGeometry, xMin: number, xMax: number): THREE.BufferGeometry {
  const posAttr = source.getAttribute('position') as THREE.BufferAttribute;
  const uvAttr = source.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const index = source.getIndex();

  const keepTri: number[] = [];
  const triCount = index ? index.count / 3 : posAttr.count / 3;
  for (let t = 0; t < triCount; t++) {
    const a = index ? index.getX(t * 3) : t * 3;
    const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    const cx = (posAttr.getX(a) + posAttr.getX(b) + posAttr.getX(c)) / 3;
    if (cx >= xMin && cx <= xMax) keepTri.push(a, b, c);
  }

  const map = new Map<number, number>();
  const outPos: number[] = [];
  const outUv: number[] = [];
  const outIdx: number[] = [];
  for (const old of keepTri) {
    let ni = map.get(old);
    if (ni === undefined) {
      ni = outPos.length / 3;
      map.set(old, ni);
      // 注意：glb 的 POSITION 是交错缓冲（byteStride），必须走 getX/getY/getZ
      outPos.push(posAttr.getX(old), posAttr.getY(old), posAttr.getZ(old));
      if (uvAttr) outUv.push(uvAttr.getX(old), uvAttr.getY(old));
    }
    outIdx.push(ni);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(outPos), 3));
  if (uvAttr) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(outUv), 2));
  geo.setIndex(outIdx);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/** 把几何体归一化：脚底落 y=0、左右居中、按身高缩放到 1 个单位 */
export function normalizeFigure(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const height = box.max.y - box.min.y;
  const scale = 1 / Math.max(height, 1e-6);
  geo.translate(-center.x, -box.min.y, -center.z);
  geo.scale(scale, scale, scale);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  return geo;
}

/** 建骨架：位置按 RIG_PARTS 的归一化坐标（身高 1） */
export function buildRig(): { rootBone: THREE.Bone; bones: Record<string, THREE.Bone> } {
  const bones: Record<string, THREE.Bone> = {};
  for (const part of RIG_PARTS) {
    const bone = new THREE.Bone();
    bone.name = part.name;
    bone.position.set(...part.pos);
    bones[part.name] = bone;
  }
  for (const part of RIG_PARTS) {
    if (part.parent) bones[part.parent].add(bones[part.name]);
  }
  return { rootBone: bones.root, bones };
}

function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = new THREE.Vector3().subVectors(b, a);
  const t = THREE.MathUtils.clamp(new THREE.Vector3().subVectors(p, a).dot(ab) / Math.max(ab.lengthSq(), 1e-8), 0, 1);
  const proj = new THREE.Vector3().copy(a).addScaledVector(ab, t);
  return proj.distanceTo(p);
}

/**
 * 蒙皮权重：分层包络
 * 扫描稿的袖子与袍身是同一张连续曲面，硬切区域会撕成碎片（实测），
 * 所以改为「每类骨骼一个连续影响场」，靠平滑过渡让袖子在腋下自然弯折：
 *   · 手臂场：到肩/肘/手骨段的距离，另叠 |x| 与 y 的平滑门限，避免拽住袍身
 *   · 腿脚场：y 越低权重越高
 *   · 其余权重按高度分给 hips/spine/chest/neck/head 链
 */
export function skinGeometry(geo: THREE.BufferGeometry, _bones: Record<string, THREE.Bone>): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const count = pos.count;
  const nameToIndex = new Map<string, number>(RIG_PARTS.map((p, i) => [p.name, i]));
  const at = (name: string) => new THREE.Vector3(...RIG_PARTS[nameToIndex.get(name)!].pos);

  const smooth = (edge0: number, edge1: number, v: number) => {
    const t = THREE.MathUtils.clamp((v - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const falloff = (d: number, r: number) => Math.exp(-Math.pow(d / r, 2));

  const spineChain: [string, number][] = [['hips', 0.52], ['spine', 0.6], ['chest', 0.68], ['neck', 0.78], ['head', 0.86]];

  const rows: Float32Array[] = [];
  const p = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i);
    const row = new Float32Array(RIG_PARTS.length);
    const ax = Math.abs(p.x);
    const side = p.x < 0 ? 'L' : 'R';

    // —— 手臂场 ——
    let armW = 0;
    const gateX = smooth(0.06, 0.115, ax);
    const gateY = smooth(0.10, 0.22, p.y) * (1 - smooth(0.62, 0.74, p.y));
    if (gateX > 0 && gateY > 0) {
      const segsArm: [string, string, number][] = [
        [`shoulder${side}`, `elbow${side}`, 0.075],
        [`elbow${side}`, `hand${side}`, 0.065],
      ];
      let best = 0; let bestBone = '';
      for (const [a, b, r] of segsArm) {
        const d = distToSegment(p, at(a), at(b));
        const w = falloff(d, r) * gateX * gateY;
        if (w > best) { best = w; bestBone = b; }
      }
      armW = THREE.MathUtils.clamp(best, 0, 1);
      if (armW > 0.02) row[nameToIndex.get(bestBone)!] += armW;
    }

    // —— 腿脚场 ——
    let legW = 0;
    const gateLegY = 1 - smooth(0.38, 0.56, p.y);
    if (gateLegY > 0) {
      const segsLeg: [string, string, number][] = [
        [`thigh${side}`, `knee${side}`, 0.07],
        [`knee${side}`, `foot${side}`, 0.07],
      ];
      let best = 0; let bestBone = '';
      for (const [a, b, r] of segsLeg) {
        const d = distToSegment(p, at(a), at(b));
        const w = falloff(d, r) * gateLegY;
        if (w > best) { best = w; bestBone = b; }
      }
      legW = THREE.MathUtils.clamp(best, 0, 1);
      if (legW > 0.02) row[nameToIndex.get(bestBone)!] += legW;
    }

    // —— 躯干剩余 ——
    const remaining = Math.max(0, 1 - armW - legW);
    if (remaining > 0.01) {
      const t = THREE.MathUtils.clamp(p.y, 0, 1);
      let lower: [string, number] = spineChain[0];
      let upper: [string, number] = spineChain[spineChain.length - 1];
      for (let k = 0; k < spineChain.length - 1; k++) {
        if (t >= spineChain[k][1] && t <= spineChain[k + 1][1]) { lower = spineChain[k]; upper = spineChain[k + 1]; break; }
      }
      const f = THREE.MathUtils.clamp((t - lower[1]) / Math.max(upper[1] - lower[1], 1e-4), 0, 1);
      const ff = f * f * (3 - 2 * f);
      row[nameToIndex.get(lower[0])!] += remaining * (1 - ff);
      row[nameToIndex.get(upper[0])!] += remaining * ff;
    }

    let sum = 0;
    for (let k = 0; k < row.length; k++) sum += row[k];
    if (sum > 0) for (let k = 0; k < row.length; k++) row[k] /= sum;
    rows.push(row);
  }

  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const top = Array.from(rows[i]).map((w, k) => ({ w, k })).sort((a, b) => b.w - a.w).slice(0, 4);
    const sum = top.reduce((a, b) => a + b.w, 0) || 1;
    top.forEach((item, k) => {
      skinIndex[i * 4 + k] = item.k;
      skinWeight[i * 4 + k] = item.w / sum;
    });
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
}

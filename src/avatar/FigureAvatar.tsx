/**
 * FigureAvatar.tsx —— 「写真版」可动角色
 *
 * 上传的 sample-v1.glb 是三视图雕刻稿（三个小人像合在一个网格、无骨骼无动画），
 * 袖子与袍身又是同一张连续曲面，蒙皮会把袖口撕成翻片（实测两套权重方案都失败）。
 * 所以按这张参考形象分部件重建：头 / 躯干 / 交领 / 绳腰带 / 宽袖 / 小臂 / 手 /
 * 灯笼短裤 / 小腿 / 赤足 / 布袋各自挂在 17 根骨骼上，动作仍由 poses.ts 驱动，
 * 合手、行礼、木鼓、数珠、行走都能真正做出来。
 *
 * 配色取自原模型贴图主色（#b9872f 金褐袍身、#71411b 绳带、#c2ad94 肤色）。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActionState } from '../actions';
import { BONES, type BoneName } from './poses';
import type { AvatarModelProps } from './AvatarModel';

const C = {
  robe: 0xd5791a,
  robeDark: 0xac5c15,
  robeLight: 0xe6ddb8,
  skin: 0xdaa176,
  skinShade: 0xc98f66,
  belt: 0x5f3a1c,
  bag: 0x7a5330,
  dark: 0x2c1708,
  brow: 0x3a2416,
  mouth: 0x8f5343,
  blush: 0xe59a80,
};

/** 关节点世界高度（米，站立总高约 1.39） */
const J: Record<string, number> = {
  hips: 0.62,
  spine: 0.7,
  chest: 0.8,
  neck: 0.9,
  head: 1.02,
  shoulder: 0.86,
  elbow: 0.7,
  hand: 0.545,
  thigh: 0.6,
  knee: 0.36,
  foot: 0.07,
};

const armX = { shoulder: 0.198, elbow: 0.232, hand: 0.248 };
const legX = 0.095;

interface Mats {
  robe: THREE.Material; robeDark: THREE.Material; robeLight: THREE.Material;
  skin: THREE.Material; skinShade: THREE.Material; belt: THREE.Material;
  bag: THREE.Material; dark: THREE.Material; brow: THREE.Material;
  mouth: THREE.Material; blush: THREE.Material;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], opts: { scale?: [number, number, number]; rot?: [number, number, number]; shadow?: boolean } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}

function build(mats: Mats) {
  const group = (name: string, y: number, x = 0, z = 0) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    return g;
  };

  // 骨骼：位置为「相对父骨骼的偏移」，让关节各自成为旋转中心
  const b = {
    hips: group('hips', J.hips),
    spine: group('spine', J.spine - J.hips),
    chest: group('chest', J.chest - J.spine),
    neck: group('neck', J.neck - J.chest),
    head: group('head', J.head - J.neck),
    upper_armL: group('upper_armL', J.shoulder - J.chest, -armX.shoulder),
    forearmL: group('forearmL', J.elbow - J.shoulder, -(armX.elbow - armX.shoulder)),
    handL: group('handL', J.hand - J.elbow, -(armX.hand - armX.elbow)),
    upper_armR: group('upper_armR', J.shoulder - J.chest, armX.shoulder),
    forearmR: group('forearmR', J.elbow - J.shoulder, armX.elbow - armX.shoulder),
    handR: group('handR', J.hand - J.elbow, armX.hand - armX.elbow),
    thighL: group('thighL', J.thigh - J.hips, -legX),
    shinL: group('shinL', J.knee - J.thigh),
    footL: group('footL', J.foot - J.knee),
    thighR: group('thighR', J.thigh - J.hips, legX),
    shinR: group('shinR', J.knee - J.thigh),
    footR: group('footR', J.foot - J.knee),
  } as Record<string, THREE.Group>;

  b.hips.add(b.spine);
  b.spine.add(b.chest);
  b.chest.add(b.neck, b.upper_armL, b.upper_armR);
  b.neck.add(b.head);
  b.upper_armL.add(b.forearmL); b.forearmL.add(b.handL);
  b.upper_armR.add(b.forearmR); b.forearmR.add(b.handR);
  b.hips.add(b.thighL, b.thighR);
  b.thighL.add(b.shinL); b.shinL.add(b.footL);
  b.thighR.add(b.shinR); b.shinR.add(b.footR);

  /* ---------------- 头 ---------------- */
  const headLocal = (worldY: number) => worldY - J.head;
  b.head.add(mesh(new THREE.SphereGeometry(0.25, 32, 28), mats.skin, [0, headLocal(1.14), 0], { scale: [1, 1.02, 0.98] }));
  for (const s of [-1, 1]) {
    b.head.add(mesh(new THREE.SphereGeometry(0.062, 16, 14), mats.skin, [s * 0.246, headLocal(1.14), 0.005], { scale: [0.46, 1.05, 0.78] }));
    // 眼
    b.head.add(mesh(new THREE.SphereGeometry(0.026, 16, 14), mats.dark, [s * 0.088, headLocal(1.272), 0.228], { scale: [1, 0.9, 0.45] }));
    // 眼球高光
    b.head.add(mesh(new THREE.SphereGeometry(0.009, 8, 8), mats.robeLight, [s * 0.078, headLocal(1.283), 0.246], { shadow: false }));
    // 眉
    b.head.add(mesh(new THREE.CapsuleGeometry(0.015, 0.066, 4, 10), mats.brow, [s * 0.094, headLocal(1.334), 0.226], { scale: [1.15, 0.4, 0.32], rot: [0, 0, s * -0.1] }));
    // 腮红
    b.head.add(mesh(new THREE.SphereGeometry(0.05, 14, 12), mats.blush, [s * 0.137, headLocal(1.185), 0.203], { scale: [1, 0.7, 0.32] }));
  }
  b.head.add(mesh(new THREE.SphereGeometry(0.021, 12, 10), mats.skinShade, [0, headLocal(1.20), 0.243], { scale: [1, 1.15, 0.7] }));
  b.head.add(mesh(new THREE.SphereGeometry(0.028, 12, 10), mats.mouth, [0, headLocal(1.153), 0.242], { scale: [1.7, 0.62, 0.45] }));

  /* ---------------- 颈 ---------------- */
  b.neck.add(mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.1, 16), mats.skin, [0, -0.01, 0]));

  /* ---------------- 躯干 ---------------- */
  b.chest.add(mesh(new THREE.SphereGeometry(1, 28, 24), mats.robe, [0, -0.01, 0], { scale: [0.188, 0.235, 0.158] }));
  // 交领：两襟斜贴 + 内领
  b.chest.add(mesh(new THREE.BoxGeometry(1, 1, 1), mats.robeDark, [-0.036, 0.055, 0.142], { scale: [0.115, 0.012, 0.058], rot: [-0.12, 0, 0.52], shadow: false }));
  b.chest.add(mesh(new THREE.BoxGeometry(1, 1, 1), mats.robeDark, [0.036, 0.055, 0.142], { scale: [0.115, 0.012, 0.058], rot: [-0.12, 0, -0.52], shadow: false }));
  b.chest.add(mesh(new THREE.BoxGeometry(1, 1, 1), mats.robeLight, [0, 0.075, 0.128], { scale: [0.082, 0.012, 0.05], rot: [-0.22, 0, 0], shadow: false }));

  /* ---------------- 下摆 / 绳腰带 / 布袋 ---------------- */
  b.hips.add(mesh(new THREE.CylinderGeometry(0.196, 0.245, 0.3, 28, 1, false), mats.robe, [0, -0.115, 0]));
  b.hips.add(mesh(new THREE.CylinderGeometry(0.247, 0.24, 0.02, 28, 1, false), mats.robeDark, [0, -0.272, 0]));
  b.hips.add(mesh(new THREE.TorusGeometry(0.208, 0.038, 8, 32), mats.belt, [0, 0.042, 0], { scale: [1, 0.45, 1] }));
  b.hips.add(mesh(new THREE.SphereGeometry(0.05, 14, 12), mats.belt, [0, 0.036, 0.198]));
  for (const x of [-0.028, 0.028]) {
    b.hips.add(mesh(new THREE.CapsuleGeometry(0.016, 0.11, 4, 8), mats.belt, [x, -0.09, 0.198], { rot: [0, 0, x * 4] }));
  }
  b.hips.add(mesh(new THREE.SphereGeometry(1, 18, 16), mats.bag, [0.196, -0.13, 0.055], { scale: [0.085, 0.105, 0.058], rot: [0, 0, -0.18] }));

  /* ---------------- 手臂 ---------------- */
  for (const s of ['L', 'R'] as const) {
    b[`upper_arm${s}`].add(mesh(new THREE.CylinderGeometry(0.058, 0.078, 0.19, 18, 1, true), mats.robe, [0, -0.07, 0], { scale: [1, 1, 0.92] }));
    b[`upper_arm${s}`].add(mesh(new THREE.SphereGeometry(0.072, 18, 14), mats.robe, [0, 0.0, 0]));
    b[`forearm${s}`].add(mesh(new THREE.CapsuleGeometry(0.047, 0.1, 6, 14), mats.skin, [0, -0.075, 0]));
    b[`hand${s}`].add(mesh(new THREE.SphereGeometry(0.058, 16, 14), mats.skin, [0, -0.045, 0], { scale: [0.9, 1.05, 0.75] }));
  }

  /* ---------------- 腿脚 ---------------- */
  for (const s of ['L', 'R'] as const) {
    b[`thigh${s}`].add(mesh(new THREE.CapsuleGeometry(0.072, 0.08, 6, 16), mats.robe, [0, -0.1, 0]));
    b[`shin${s}`].add(mesh(new THREE.CapsuleGeometry(0.05, 0.13, 6, 14), mats.skin, [0, -0.105, 0]));
    b[`foot${s}`].add(mesh(new THREE.SphereGeometry(1, 18, 14), mats.skin, [0, -0.03, 0.042], { scale: [0.075, 0.038, 0.105] }));
  }

  /* ---------------- 道具：木鼓 / 珠串 ---------------- */
  const wood_hit = new THREE.Group();
  wood_hit.position.set(0, -0.30, 0.20);
  wood_hit.add(mesh(new THREE.SphereGeometry(0.072, 20, 14), mats.bag, [0, 0, 0], { scale: [1, 0.62, 1] }));
  wood_hit.add(mesh(new THREE.SphereGeometry(0.028, 12, 10), mats.belt, [0, 0.028, 0], { scale: [1.6, 0.5, 1.2] }));
  const mallet = new THREE.Group();
  mallet.position.set(0.105, -0.235, 0.185);
  mallet.add(mesh(new THREE.CapsuleGeometry(0.008, 0.13, 4, 8), mats.belt, [0, -0.06, 0], { rot: [0, 0, 0.5] }));
  mallet.add(mesh(new THREE.SphereGeometry(0.026, 12, 10), mats.bag, [0.04, -0.125, 0]));
  wood_hit.visible = false;
  mallet.visible = false;

  const beads = new THREE.Group();
  beads.position.set(0, -0.235, 0.205);
  beads.rotation.x = 0.5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    beads.add(mesh(new THREE.SphereGeometry(0.013, 8, 8), mats.belt, [Math.cos(a) * 0.072, Math.sin(a) * 0.072, 0], { shadow: false }));
  }
  beads.visible = false;

  b.chest.add(wood_hit, mallet, beads);

  return { root: b.hips, bones: b, props: { wood_hit, mallet, beads } };
}

type Pose = Partial<Record<BoneName, [number, number, number]>>;

/** 本角色的姿态表：骨节都朝 -Y，所以 X 负 = 向前抬，左臂 Z 正 / 右臂 Z 负 = 向中线内收 */
const POSES: Record<'idle' | 'bowing' | 'praying' | 'beads' | 'wood_hit', Pose> & Partial<Record<'sitting' | 'kowtow' | 'incense' | 'offering', Pose>> = {
  idle: { chest: [0.02, 0, 0] },
  praying: {
    upper_armL: [-1.42, 0, 0.5], forearmL: [1.5, 0, 0.02], handL: [-0.1, 0, 0.16],
    upper_armR: [-1.42, 0, -0.5], forearmR: [1.5, 0, -0.02], handR: [-0.1, 0, -0.16],
    neck: [0.1, 0, 0], head: [0.16, 0, 0],
  },
  bowing: {
    spine: [-0.55, 0, 0], chest: [-0.24, 0, 0], neck: [-0.04, 0, 0], head: [0.08, 0, 0],
    upper_armL: [-0.9, 0, 0.42], forearmL: [1.05, 0, 0.05], handL: [-0.1, 0, 0.12],
    upper_armR: [-0.9, 0, -0.42], forearmR: [1.05, 0, -0.05], handR: [-0.1, 0, -0.12],
    thighL: [0.1, 0, 0], shinL: [-0.2, 0, 0], footL: [0.09, 0, 0],
    thighR: [0.1, 0, 0], shinR: [-0.2, 0, 0], footR: [0.09, 0, 0],
  },
  beads: {
    upper_armL: [-0.62, 0, 0.42], forearmL: [1.12, 0, 0.08], handL: [-0.1, 0, 0.1],
    upper_armR: [-0.62, 0, -0.42], forearmR: [1.12, 0, -0.08], handR: [-0.1, 0, -0.1],
    neck: [0.16, 0, 0], head: [0.2, 0, 0],
  },
  wood_hit: {
    upper_armL: [-0.7, 0, 0.5], forearmL: [1.15, 0, 0.1], handL: [-0.1, 0, 0.1],
    upper_armR: [-0.5, 0, -0.28], forearmR: [0.85, 0, -0.1], handR: [-0.15, 0, 0],
    chest: [0.06, 0, 0], neck: [0.12, 0, 0], head: [0.16, 0, 0],
  },
};

/** 行走：腿与手臂交替摆动 */
function walkPose(t: number): Pose {
  const s = Math.sin(t * 6.2);
  const c = Math.cos(t * 6.2);
  return {
    thighL: [0.42 * s, 0, 0], shinL: [-Math.max(0, -0.4 * s), 0, 0],
    thighR: [-0.42 * s, 0, 0], shinR: [-Math.max(0, 0.4 * s), 0, 0],
    upper_armL: [-0.3 * s, 0, 0.16], upper_armR: [0.3 * s, 0, -0.16],
    chest: [0.04, 0, 0],
    head: [0, 0, 0.05 * c],
  } as Pose;
}

function poseForFigure(action: ActionState, anim: 'idle' | 'walk', t: number): Pose {
  if (anim === 'walk' && action === 'idle') return walkPose(t);
  if (action === 'idle') return POSES.idle;
  return (POSES[action] ?? POSES.idle) as Pose;
}

const euler = new THREE.Euler();
const target = new THREE.Quaternion();

export default function FigureAvatar({ action, anim, bob }: AvatarModelProps) {
  const mats = useMemo<Mats>(() => ({
    robe: new THREE.MeshStandardMaterial({ color: C.robe, roughness: 0.72 }),
    robeDark: new THREE.MeshStandardMaterial({ color: C.robeDark, roughness: 0.76 }),
    robeLight: new THREE.MeshStandardMaterial({ color: C.robeLight, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ color: C.skin, roughness: 0.78 }),
    skinShade: new THREE.MeshStandardMaterial({ color: C.skinShade, roughness: 0.8 }),
    belt: new THREE.MeshStandardMaterial({ color: C.belt, roughness: 0.9 }),
    bag: new THREE.MeshStandardMaterial({ color: C.bag, roughness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.55 }),
    brow: new THREE.MeshStandardMaterial({ color: C.brow, roughness: 0.7 }),
    mouth: new THREE.MeshStandardMaterial({ color: C.mouth, roughness: 0.7 }),
    blush: new THREE.MeshStandardMaterial({ color: C.blush, roughness: 0.85, transparent: true, opacity: 0.5 }),
  }), []);

  const figure = useMemo(() => build(mats), [mats]);


  // 动作过渡：记录切换瞬间的骨骼朝向，再按时间插值到目标姿态（与帧率无关）
  const blend = useRef({ key: '', start: 0, from: new Map<string, THREE.Quaternion>() });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const key = `${action}|${anim}`;
    if (blend.current.key !== key) {
      blend.current.key = key;
      blend.current.start = t;
      for (const name of BONES) {
        const bone = figure.bones[name];
        if (bone) blend.current.from.set(name, bone.quaternion.clone());
      }
    }
    const walking = anim === 'walk' && action === 'idle';
    const raw = walking ? 1 : Math.min(1, (t - blend.current.start) / 0.22);
    const p = raw * raw * (3 - 2 * raw);

    figure.props.wood_hit.visible = action === 'wood_hit';
    figure.props.mallet.visible = action === 'wood_hit';
    figure.props.beads.visible = action === 'beads';
    if (action === 'wood_hit') figure.props.mallet.rotation.z = Math.sin(t * 9) * 0.42;
    if (action === 'beads') figure.props.beads.rotation.y = Math.sin(t * 3) * 0.12;

    const pose = poseForFigure(action, anim, t);
    for (const name of BONES) {
      const bone = figure.bones[name];
      if (!bone) continue;
      const e = pose[name];
      if (e) { euler.set(e[0], e[1], e[2], 'XYZ'); target.setFromEuler(euler); }
      else target.identity();
      const from = blend.current.from.get(name);
      if (from && p < 1) bone.quaternion.copy(from).slerp(target, p);
      else bone.quaternion.copy(target);
    }
  });

  return (
    <group position={[0, bob, 0]} rotation-y={Math.PI}>
      <primitive object={figure.root} />
    </group>
  );
}

export type { ActionState };

import { INCENSE_BURNER_Z, INCENSE_INSERT_Y } from '../config';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playerMotion } from './animState';

export const RIG_AVATAR_URL = 'assets/models/avatar.glb';
const MONK_URL = 'assets/models/little-monk-yellow.glb';
const MONK_HEIGHT = 1.686;
const INCENSE_DURATION = 6.4;
const STRIDE = 0.30;
const LEG_LENGTH = 0.29;
const WALK_DROP = 0.04;

function walkLeg(phase: number, scale: number, thigh: THREE.Bone, shin: THREE.Bone, foot: THREE.Bone) {
  const cycle = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
  const swing = Math.max(0, cycle * 2 - 1);
  const forward = (cycle < 0.5 ? 0.5 - cycle * 2 : -0.5 + swing * swing * (3 - 2 * swing))
    * STRIDE / scale;
  const lift = Math.sin(Math.PI * swing) * 0.085 / scale;
  const down = 2 * LEG_LENGTH - (WALK_DROP + lift * scale) / scale;
  const bend = Math.acos(Math.min(1, Math.hypot(forward, down) / (2 * LEG_LENGTH)));
  thigh.rotation.set(-Math.atan2(forward, down) - bend, 0, 0);
  shin.rotation.set(2 * bend, 0, 0);
  foot.rotation.set(-thigh.rotation.x - shin.rotation.x, 0, 0);
}

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
      hips: [0, 0, 0],
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

// The original rig defines the site's procedural pose axes. Convert those
// rotations into the new model's bone space for actions without baked clips.
export default function SkinAvatar({
  position = [0, 0, 0], rotationY = 0, height = 1.42, motion = 'idle', action = 'idle',
  stridePhase, live = true, timeShift = 0, seatKind = 'floor',
}: Props) {
  const original = useGLTF(RIG_AVATAR_URL);
  const model = useGLTF(MONK_URL);
  const offset = useRef<THREE.Group>(null);
  const previous = useRef<Props['action']>();
  const delta = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const insertion = useMemo(() => new THREE.Vector3(), []);
  const reachTools = useMemo(() => ({
    displacement: new THREE.Vector3(), target: new THREE.Vector3(),
    current: new THREE.Vector3(), desired: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
  }), []);

  const avatar = useMemo(() => {
    const scene = cloneSkeleton(model.scene);
    const facing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const bones = new Map<string, THREE.Bone>();
    let incense: THREE.Object3D | undefined;
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if ((object as THREE.Bone).isBone) bones.set(norm(object.name), object as THREE.Bone);
      if (object.name === 'IncenseSticks') incense = object;
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
      }
    });
    if (incense) incense.visible = false;

    const joints = BONE_NAMES.flatMap((name) => {
      const source = original.scene.getObjectByName(name);
      const opposite = name.replace(/\.([LR])$/, (_, side) => side === 'L' ? '.R' : '.L');
      const bone = bones.get(norm(opposite));
      if (!source || !bone) return [];
      const rest = bone.quaternion.clone();
      const basis = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(facing).invert()
        .multiply(source.getWorldQuaternion(new THREE.Quaternion()));
      return [{
        bone, rest, basis, inverseBasis: basis.clone().invert(),
        sourceRest: source.rotation.clone(), inverseSourceRest: source.quaternion.clone().invert(),
        key: poseKey(name), angles: [0, 0, 0],
      }];
    });

    const mixer = new THREE.AnimationMixer(scene);
    const clip = (name: string) => {
      const animation = THREE.AnimationClip.findByName(model.animations, name);
      return animation ? mixer.clipAction(animation) : undefined;
    };
    const legs = ['L', 'R'].map(side => (['Thigh', 'Shin', 'Foot'].map(
      name => bones.get(norm(`${name}.${side}`))!,
    ) as [THREE.Bone, THREE.Bone, THREE.Bone]));
    const arms = ['L', 'R'].map(side => (['UpperArm', 'Forearm', 'Hand'].map(
      name => bones.get(norm(`${name}.${side}`))!,
    ) as [THREE.Bone, THREE.Bone, THREE.Bone]));
    return { scene, joints, legs, arms, spine: bones.get('spine'), incenseBone: bones.get('incense'), mixer, bow: clip('Prostrate'), offer: clip('OfferIncense'), incense };
  }, [model, original]);

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime() + (timeShift ?? 0);
    const currentMotion = live ? playerMotion.motion : motion;
    const currentAction = action === 'incense' ? action
      : live && playerMotion.action !== 'idle' ? playerMotion.action : action;
    const phase = live ? playerMotion.phase : stridePhase ?? t * 6.4;
    const isBow = currentAction === 'kowtow' || currentAction === 'bowing';
    const isIncense = currentAction === 'incense';
    const ritual = isBow ? avatar.bow : isIncense ? avatar.offer : undefined;

    if (currentAction !== previous.current) {
      avatar.mixer.stopAllAction();
      if (ritual) {
        const repeat = !live || currentAction === 'bowing';
        ritual.reset().setLoop(repeat ? THREE.LoopRepeat : THREE.LoopOnce, repeat ? Infinity : 1);
        ritual.clampWhenFinished = !repeat;
        ritual.setDuration(repeat ? ritual.getClip().duration : isIncense ? INCENSE_DURATION : 3).play();
        if (repeat && timeShift) {
          const duration = ritual.getClip().duration;
          ritual.time = ((timeShift % duration) + duration) % duration;
        }
      }
      previous.current = currentAction;
    }

    const walking = currentMotion === 'walk' && currentAction === 'idle';
    if (avatar.incense) avatar.incense.visible = isIncense;
    if (ritual) {
      avatar.mixer.update(dt);
      const stick = avatar.incenseBone;
      if (isIncense && stick?.parent && avatar.incense) {
        const progress = ritual.time / ritual.getClip().duration;
        const reach = THREE.MathUtils.smoothstep(progress, 0.49, 0.66);
        const withdraw = 1 - THREE.MathUtils.smoothstep(progress, 0.66, 0.78);
        const { displacement, target, current, desired, rotation } = reachTools;
        insertion.set(0, INCENSE_INSERT_Y, INCENSE_BURNER_Z);
        stick.getWorldPosition(displacement);
        displacement.subVectors(insertion, displacement).multiplyScalar(reach * withdraw);
        if (reach > 0 && withdraw > 0) {
          // Keep the wrists with the incense as the last part of the reach is
          // aligned to the actual burner, then blend back to the baked release.
          avatar.spine?.rotateX(0.26 * reach * withdraw);
          for (const [shoulder, elbow, hand] of avatar.arms) {
            hand.getWorldPosition(target).addScaledVector(displacement, 0.8);
            for (let pass = 0; pass < 3; pass++) {
              for (const joint of [elbow, shoulder]) {
                joint.worldToLocal(hand.getWorldPosition(current)).normalize();
                joint.worldToLocal(desired.copy(target)).normalize();
                joint.quaternion.multiply(rotation.setFromUnitVectors(current, desired));
              }
            }
          }
        }
        stick.parent.worldToLocal(insertion);
        stick.position.lerp(insertion, reach);
        avatar.incense.visible = progress < 0.67;
      }
    } else {
      const pose = poseOf(currentMotion, currentAction, t, phase, seatKind);
      const blend = Math.min(1, dt * 9);
      for (const joint of avatar.joints) {
        const target = pose[joint.key] ?? [0, 0, 0];
        const { angles, sourceRest } = joint;
        for (let axis = 0; axis < 3; axis++) angles[axis] += (target[axis] - angles[axis]) * blend;
        euler.set(sourceRest.x + angles[0], sourceRest.y + angles[1], sourceRest.z + angles[2], sourceRest.order);
        delta.setFromEuler(euler).premultiply(joint.inverseSourceRest)
          .premultiply(joint.basis).multiply(joint.inverseBasis);
        joint.bone.quaternion.copy(joint.rest).multiply(delta);
      }
    }

    const group = offset.current;
    if (!group) return;
    if (walking) {
      // Keep the stance foot fixed relative to the floor as the avatar moves.
      const scale = avatar.scene.getWorldScale(insertion).y / group.scale.y;
      for (const [index, leg] of avatar.legs.entries()) {
        walkLeg(phase + index * Math.PI, scale, ...leg);
      }
    }
    const stride = Math.sin(phase);
    const bob = walking ? -WALK_DROP : 0;
    const seated = currentAction === 'sitting';
    const y = (seated ? -0.42 : 0) + bob;
    group.position.y += (y - group.position.y) * Math.min(1, dt * 10);
    group.position.x += ((walking ? stride * 0.012 : 0) - group.position.x) * Math.min(1, dt * 8);
    group.scale.y += ((seated ? 0.86 : 1) - group.scale.y) * Math.min(1, dt * 8);
  });

  return (
    <group position={position} rotation-y={rotationY}>
      <group ref={offset}>
        <primitive object={avatar.scene} rotation-y={Math.PI} scale={height / MONK_HEIGHT} />
      </group>
    </group>
  );
}

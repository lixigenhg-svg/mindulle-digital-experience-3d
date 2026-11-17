/**
 * BoneAvatar.tsx —— 真正带骨骼的角色（用原项目 avatar.glb 的 17 根骨骼 + 作者手绘蒙皮权重）
 *
 * 用户上传的雕刻稿（avatar2.glb）是一整块连续曲面、没有 skin/骨骼，
 * 袖子与袍身连在一起，硬蒙皮会撕开袍面（见 RiggedAvatar.tsx 头部记录）。
 * 所以「要真的动、手脚真的抬起来」只能用原项目这套已蒙皮的角色，
 * 这里把它按雕刻稿的配色重新上色，并补一对眼睛和小嘴，
 * 动作（行走 / 合手 / 行礼 / 坐姿木鼓 / 数珠）全部由骨骼旋转驱动。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const BONE_AVATAR_URL = 'assets/models/avatar.glb';

/** 姿态：站立 / 行走 / 合手 / 行礼 / 坐 */
type Pose = 'stand' | 'walk' | 'pray' | 'bow' | 'sit' | 'sitTap';

const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upper_arm.L', 'forearm.L', 'hand.L', 'upper_arm.R', 'forearm.R', 'hand.R',
  'thigh.L', 'shin.L', 'foot.L', 'thigh.R', 'shin.R', 'foot.R',
];

const R = (deg: number) => (deg * Math.PI) / 180;
const norm = (s: string) => s.replace(/[._]/g, '').toLowerCase();

/** 骨骼名 → 姿态表里的键 */
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

interface BoneAvatarProps {
  position?: [number, number, number];
  rotationY?: number;
  height?: number;
  motion?: 'idle' | 'walk';
  action?: 'idle' | 'praying' | 'bowing' | 'wood_hit' | 'beads' | 'sitting' | 'kowtow' | 'incense' | 'offering';
}

function poseOf(motion: 'idle' | 'walk', action: BoneAvatarProps['action'], t: number) {
  // 返回 { 骨骼: [x, y, z] 相对静止姿态的额外旋转 }
  if (action === 'bowing') {
    return {
      thighL: [R(92), 0, R(8)], thighR: [R(92), 0, R(-8)],
      shinL: [R(-100), 0, 0], shinR: [R(-100), 0, 0],
      footL: [R(30), 0, 0], footR: [R(30), 0, 0],
      spine: [R(34), 0, 0], chest: [R(14), 0, 0], neck: [R(10), 0, 0], head: [R(20), 0, 0],
      armL: [R(-34), 0, R(26)], armR: [R(-34), 0, R(-26)],
      foreL: [R(-44), 0, 0], foreR: [R(-44), 0, 0],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'wood_hit' || action === 'beads') {
    const tap = action === 'wood_hit' ? Math.sin(t * 8) * R(16) : Math.sin(t * 3) * R(6);
    return {
      thighL: [R(88), 0, R(42)], thighR: [R(88), 0, R(-42)],
      shinL: [R(-112), 0, R(-24)], shinR: [R(-112), 0, R(24)],
      footL: [R(34), 0, R(-10)], footR: [R(34), 0, R(10)],
      spine: [R(5), 0, 0], head: [R(8), 0, 0],
      armL: [R(-38), 0, R(20)], armR: [R(-38) + tap, 0, R(-20)],
      foreL: [R(-40), 0, 0], foreR: [R(-40) - tap, 0, 0],
    } as Record<string, [number, number, number]>;
  }

  if (action === 'praying') {
    return {
      armL: [R(58), 0, R(-70)], armR: [R(58), 0, R(70)],
      foreL: [R(8), 0, R(-40)], foreR: [R(8), 0, R(40)],
      handL: [R(-6), 0, R(-8)], handR: [R(-6), 0, R(8)],
      spine: [R(5), 0, 0], head: [R(9), 0, 0],
    } as Record<string, [number, number, number]>;
  }

  if (motion === 'walk') {
    const sw = Math.sin(t * 6.4);
    return {
      thighL: [sw * R(26), 0, 0], thighR: [-sw * R(26), 0, 0],
      shinL: [Math.max(0, -sw) * R(-34), 0, 0], shinR: [Math.max(0, sw) * R(-34), 0, 0],
      footL: [Math.max(0, -sw) * R(-12), 0, 0], footR: [Math.max(0, sw) * R(-12), 0, 0],
      armL: [-sw * R(20), 0, R(3)], armR: [sw * R(20), 0, R(-3)],
      foreL: [R(10), 0, 0], foreR: [R(10), 0, 0],
      spine: [R(3), 0, 0], chest: [R(-2), 0, Math.sin(t * 6.4) * R(2)],
    } as Record<string, [number, number, number]>;
  }

  // 站立：呼吸
  const br = Math.sin(t * 1.4) * R(2);
  return {
    spine: [br, 0, 0], chest: [br * 0.5, 0, 0],
    armL: [0, 0, R(3)], armR: [0, 0, R(-3)],
  } as Record<string, [number, number, number]>;
}

function Avatar({ position = [0, 0, 0], rotationY = 0, height = 1.42, motion = 'idle', action = 'idle' }: BoneAvatarProps) {
  const { scene } = useGLTF(BONE_AVATAR_URL);
  const [ready, setReady] = useState(false);
  const root = useRef<THREE.Group>(null);
  const bones = useRef<Record<string, THREE.Bone>>({});
  const rest = useRef<Record<string, THREE.Euler>>({});
  const cur = useRef<Record<string, [number, number, number]>>({});

  // 场景只准备一次：找骨骼、记静止姿态、换成雕刻稿配色、补五官
  const prepared = useMemo(() => {
    // 必须用 SkeletonUtils.clone，普通 clone 不会把骨骼与蒙皮对上
    const clone = cloneSkeleton(scene);
    const map: Record<string, THREE.Bone> = {};
    const restMap: Record<string, THREE.Euler> = {};

    clone.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone) {
        const alias = BONE_NAMES.find((n) => norm(n) === norm(b.name));
        if (alias) {
          map[alias] = b;
          restMap[alias] = b.rotation.clone();
        }
        return;
      }
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      const src = (m.material as THREE.MeshStandardMaterial);
      const mat = src.clone();
      // 按设计网格名换色：袍身橙、腰带褐、皮肤、鞋
      const name = m.name.toLowerCase();
      if (/head|face/.test(name)) mat.color.set('#efbf9d');
      else if (/mitten|hand|palm/.test(name)) mat.color.set('#e8b68f');
      else if (/shoe|foot/.test(name)) mat.color.set('#f2e6cd');
      else if (/wrap|saffron/.test(name)) mat.color.set('#bd6d16'); // 前襟略深，仍是袈裟色
      else if (/collar/.test(name)) mat.color.set('#a85f14');
      else mat.color.set('#cc7d1a'); // 袍身
      mat.roughness = 0.85;
      mat.metalness = 0;
      m.material = mat;
    });

    // 给头部补一对眼睛和小嘴（模型本身没有五官）；头朝 -Z，头骨世界高度约 1.009
    const head = map['head'];
    if (head) {
      const eyeMat = new THREE.MeshStandardMaterial({ color: '#241610', roughness: 0.45 });
      const mouthMat = new THREE.MeshStandardMaterial({ color: '#8a4a3c', roughness: 0.7 });
      for (const dx of [-0.085, 0.085]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 16), eyeMat);
        eye.position.set(dx, 0.203, -0.186);
        head.add(eye);
      }
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), mouthMat);
      mouth.scale.set(1.6, 0.5, 0.45);
      mouth.position.set(0, 0.142, -0.192);
      head.add(mouth);

      // 腰上补一条褐色绳腰带（雕刻稿的显著特征）
      const beltMat = new THREE.MeshStandardMaterial({ color: '#7a4a1d', roughness: 0.9 });
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.026, 10, 40), beltMat);
      belt.rotation.x = Math.PI / 2;
      belt.position.set(0, 0.10, 0);
      map['hips']?.add(belt);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), beltMat);
      knot.scale.set(1.2, 0.9, 0.8);
      knot.position.set(0, 0.10, -0.185);
      map['hips']?.add(knot);
      for (const dx of [-0.03, 0.03]) {
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.16, 8), beltMat);
        tail.position.set(dx, 0.02, -0.19);
        tail.rotation.z = dx > 0 ? -0.12 : 0.12;
        map['hips']?.add(tail);
      }
    }

    bones.current = map;
    rest.current = restMap;
    return clone;
  }, [scene]);

  useEffect(() => { setReady(true); }, [prepared]);

  useFrame(({ clock }, dt) => {
    if (!ready) return;
    const t = clock.getElapsedTime();
    const target = poseOf(motion, action, t);
    const k = cur.current;
    const lerp = Math.min(1, dt * 9);

    for (const name of BONE_NAMES) {
      const b = bones.current[name];
      const r = rest.current[name];
      if (!b || !r) continue;
      const key = poseKey(name);
      const tg = target[key] ?? [0, 0, 0];
      const c = k[key] ?? [0, 0, 0];
      c[0] += (tg[0] - c[0]) * lerp;
      c[1] += (tg[1] - c[1]) * lerp;
      c[2] += (tg[2] - c[2]) * lerp;
      k[key] = c;
      b.rotation.set(r.x + c[0], r.y + c[1], r.z + c[2]);
    }

    // 坐下时整体下沉，站立时回位
    const sitting = action === 'wood_hit' || action === 'beads' || action === 'bowing';
    if (root.current) {
      const want = action === 'bowing' ? -0.40 : sitting ? -0.40 : 0;
      root.current.position.y += (want - root.current.position.y) * Math.min(1, dt * 8);
    }
  });

  return (
    <group position={position} rotation-y={rotationY} ref={root}>
      <primitive object={prepared} scale={height / 1.45} />
    </group>
  );
}

export default function BoneAvatar(props: BoneAvatarProps) {
  return <Avatar {...props} />;
}

/**
 * AvatarModel.tsx —— 小角色角色
 *
 * 优先加载原项目骨骼模型（/assets/models/avatar.glb，17 根骨骼、无动画剪辑），
 * 动作由 `avatar/poses.ts` 逐骨骼驱动；模型缺失或加载失败时降级为内置 Q 版程序化占位。
 * 后续你上传正式模型后，无需改本文件逻辑，只替换 public/assets/models/ 下的文件即可。
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ActionState } from '../actions';
import { probeModel } from '../assets/probe';

export const AVATAR_MODEL_URL = 'assets/models/avatar.glb';

export interface AvatarModelProps {
  color: string;
  action: ActionState;
  anim: 'idle' | 'walk';
  bob: number;
}

/* ---------- 加载失败边界：GLTF 404 / 解析错误 → 程序化占位 ---------- */

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/* ---------- 骨骼版：原项目 glb 无动画剪辑，直接驱动 17 根骨骼 ---------- */

import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BONES, poseFor, type BoneName } from './poses';

interface Rig {
  bones: Partial<Record<BoneName, THREE.Bone>>;
  rest: Partial<Record<BoneName, THREE.Quaternion>>;
  target: Partial<Record<BoneName, THREE.Quaternion>>;
}

/**
 * 形象主题：原项目 glb 自带材质是灰绿长袍 + 芥末色围裙，
 * 与参考形象（橙黄长袍、褐色绳腰带、赤足）不符，这里按材质名统一替换。
 * 想回到模型原色只需把 AVATAR_THEME.enabled 置 false。
 */
const AVATAR_THEME = {
  enabled: true,
  robe: '#e8913a', // 橙黄长袍
  robeDark: '#c9742a', // 外袍暗部（围裙/衣摆）
  collar: '#f2c49b', // 内领 / 袖口 / 脚口统一肤色，接近赤足
  sash: '#f7c24d', // 束带
  skin: '#f2c49b',
  shoes: '#d59a72', // 赤足：布鞋染成略深肤色，避免在暖光下发白
};

function applyAvatarTheme(root: THREE.Object3D): void {
  if (!AVATAR_THEME.enabled) return;

  const recolor = (mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial => {
    const next = new THREE.MeshStandardMaterial({
      name: mat.name,
      color: mat.color.clone(),
      roughness: mat.roughness,
      metalness: mat.metalness ?? 0,
      map: mat.map ?? null,
      side: mat.side,
    });
    switch (mat.name) {
      case 'Soft sage linen':
        next.color.set(AVATAR_THEME.robe);
        next.roughness = 0.72;
        break;
      case 'Sunflower saffron outer robe':
        next.color.set(AVATAR_THEME.robeDark);
        next.roughness = 0.74;
        break;
      case 'Warm rice cotton':
        next.color.set(AVATAR_THEME.collar); // 内领 + 袖口 + 脚口
        break;
      case 'Warm peach skin':
        next.color.set(AVATAR_THEME.skin);
        break;
      case 'Soft oatmeal cloth shoes':
        next.color.set(AVATAR_THEME.shoes);
        break;
      default:
        break;
    }
    return next;
  };

  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(m => recolor(m as THREE.MeshStandardMaterial));
    } else if (mesh.material) {
      mesh.material = recolor(mesh.material as THREE.MeshStandardMaterial);
    }
  });
}

/** 褐色绳腰带：模型本身没有腰带，按参考图补一圈绳 + 前结 + 两条垂带 */
function RopeBelt() {
  const rope = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x7a5133, roughness: 0.92, metalness: 0 }),
    []
  );
  return (
    <group position={[0, 0.63, 0]} rotation-y={Math.PI}>
      {/* 腰带环：略微压扁，贴合腰身 */}
      <mesh material={rope} scale={[1, 0.55, 0.8]} castShadow>
        <torusGeometry args={[0.205, 0.032, 8, 32]} />
      </mesh>
      {/* 前结 */}
      <mesh position={[0, 0, 0.2]} material={rope} castShadow>
        <sphereGeometry args={[0.045, 12, 10]} />
      </mesh>
      {/* 两条垂带 */}
      {[-0.03, 0.03].map((x, i) => (
        <mesh key={i} position={[x, -0.1, 0.2]} rotation-z={x * 3} material={rope} castShadow>
          <capsuleGeometry args={[0.017, 0.18, 4, 8]} />
        </mesh>
      ))}
    </group>
  );
}

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();

function SkeletalAvatar({ action, anim, bob }: { action: ActionState; anim: 'idle' | 'walk'; bob: number }) {
  // 第二个参数关闭 Draco（不走外网解码器），第三个参数开启 meshopt（原项目 glb 为 EXT_meshopt_compression）
  const gltf = useGLTF(AVATAR_MODEL_URL, false, true);

  // 每个实例都必须克隆骨架，否则本地玩家与远端玩家会共用同一套骨骼而互相拉扯
  const scene = useMemo(() => {
    const cloned = cloneSkeleton(gltf.scene);
    cloned.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });
    applyAvatarTheme(cloned);
    return cloned;
  }, [gltf]);

  const rig = useRef<Rig>({ bones: {}, rest: {}, target: {} });
  const [ready, setReady] = useState(false);

  // 记录静止姿态：所有动作都是「静止姿态 + 叠加旋转」，不改原始绑定
  useEffect(() => {
    const bones: Rig['bones'] = {};
    const rest: Rig['rest'] = {};
    scene.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Bone).isBone && BONES.includes(o.name as BoneName)) {
        const name = o.name as BoneName;
        bones[name] = o as THREE.Bone;
        rest[name] = (o as THREE.Bone).quaternion.clone();
      }
    });
    rig.current = { bones, rest, target: {} };
    setReady(Object.keys(bones).length > 0);
  }, [scene]);

  useFrame((state, dt) => {
    const { bones, rest, target } = rig.current;
    if (!ready) return;
    const t = state.clock.elapsedTime;
    const pose = poseFor(action, anim, t);

    // 单帧内完成插值：动作切换 ~0.2s，行走摆动 ~0.1s，避免僵硬的瞬间跳变
    const smooth = 1 - Math.exp(-(anim === 'walk' ? 14 : 10) * Math.min(dt, 0.05));

    for (const name of BONES) {
      const bone = bones[name];
      const base = rest[name];
      if (!bone || !base) continue;
      const e = pose[name];
      if (e) {
        tmpEuler.set(e[0], e[1], e[2], 'XYZ');
        tmpQuat.setFromEuler(tmpEuler);
        (target[name] ??= new THREE.Quaternion()).copy(base).multiply(tmpQuat);
        bone.quaternion.slerp(target[name]!, smooth);
      } else {
        bone.quaternion.slerp(base, smooth);
      }
    }
  });

  return (
    <group position={[0, bob, 0]} rotation-y={Math.PI}>
      <primitive object={scene} />
      {AVATAR_THEME.enabled && <RopeBelt />}
    </group>
  );
}

/* ---------- 程序化 Q 版占位（模型未到位期间使用） ---------- */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** 大头短身的 Q 版比例：头半径 0.3，站立总高约 1.35 */
function poseTargets(action: ActionState) {
  switch (action) {
    case 'bowing':
      return { lean: 0.62, head: 0.2, squat: 0.94, l: v(-0.14, 0.36, 0.3), r: v(0.14, 0.36, 0.3) };
    case 'praying':
      return { lean: 0.06, head: 0.12, squat: 1, l: v(-0.05, 0.62, 0.28), r: v(0.05, 0.62, 0.28) };
    case 'beads':
      return { lean: 0.1, head: 0.02, squat: 1, l: v(-0.17, 0.66, 0.2), r: v(0.17, 0.66, 0.2) };
    case 'wood_hit':
      return { lean: 0.12, head: 0.02, squat: 1, l: v(-0.19, 0.56, 0.14), r: v(0.15, 0.44, 0.28) };
    default:
      return { lean: 0, head: 0, squat: 1, l: v(-0.3, 0.42, 0.04), r: v(0.3, 0.42, 0.04) };
  }
}

function ProceduralAvatar({ color, action, bob }: AvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const leanRef = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const handL = useRef<THREE.Mesh>(null);
  const handR = useRef<THREE.Mesh>(null);
  const pose = useRef({
    lean: 0, head: 0, squat: 1,
    l: v(-0.29, 0.5, 0.04), r: v(0.29, 0.5, 0.04),
  });

  useFrame((_, dt) => {
    const p = pose.current;
    const t = poseTargets(action);
    const k = 1 - Math.exp(-10 * dt);
    p.lean += (t.lean - p.lean) * k;
    p.head += (t.head - p.head) * k;
    p.squat += (t.squat - p.squat) * k;
    p.l.lerp(t.l, k);
    p.r.lerp(t.r, k);

    if (leanRef.current) leanRef.current.rotation.x = p.lean;
    if (body.current) body.current.scale.y = p.squat;
    if (head.current) head.current.rotation.x = p.head;
    if (handL.current) handL.current.position.copy(p.l);
    if (handR.current) handR.current.position.copy(p.r);
    if (group.current) group.current.position.y = bob;
  });

  /* 参考三视图：暖橙交领长袍 + 短袖宽袖 + 灯笼裤 + 脚踝绑带 + 赤足 + 麻绳腰带 */
  const robeMat = new THREE.MeshStandardMaterial({ color: 0xe8913a, roughness: 0.68, metalness: 0 });
  const robeDarkMat = new THREE.MeshStandardMaterial({ color: 0xc9742a, roughness: 0.72, metalness: 0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0xd97f2e, roughness: 0.72, metalness: 0 });
  const sashMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.7, metalness: 0 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.88, metalness: 0 });
  const wrapMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.8, metalness: 0 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3c9a4, roughness: 0.72, metalness: 0 });
  const skinShadeMat = new THREE.MeshStandardMaterial({ color: 0xe7b48c, roughness: 0.74, metalness: 0 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.5 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x4a3325, roughness: 0.45 });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.7 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb06a55, roughness: 0.65 });

  return (
    <group ref={group}>
      <group ref={leanRef} position={[0, 0.03, 0]}>
        {/* 灯笼裤大腿（宽松） */}
        <mesh position={[-0.115, 0.3, 0]} castShadow material={pantsMat}>
          <capsuleGeometry args={[0.115, 0.16, 6, 12]} />
        </mesh>
        <mesh position={[0.115, 0.3, 0]} castShadow material={pantsMat}>
          <capsuleGeometry args={[0.115, 0.16, 6, 12]} />
        </mesh>
        {/* 脚踝束口裤脚 */}
        <mesh position={[-0.115, 0.15, 0]} castShadow material={pantsMat}>
          <cylinderGeometry args={[0.07, 0.085, 0.12, 10]} />
        </mesh>
        <mesh position={[0.115, 0.15, 0]} castShadow material={pantsMat}>
          <cylinderGeometry args={[0.07, 0.085, 0.12, 10]} />
        </mesh>
        {/* 脚踝绑带（两道浅色缠绕） */}
        {[-0.115, 0.115].map(x => (
          <group key={x}>
            <mesh position={[x, 0.17, 0]} material={wrapMat}>
              <torusGeometry args={[0.078, 0.012, 6, 14]} />
            </mesh>
            <mesh position={[x, 0.12, 0]} material={wrapMat}>
              <torusGeometry args={[0.075, 0.012, 6, 14]} />
            </mesh>
          </group>
        ))}
        {/* 赤足 */}
        <mesh position={[-0.115, 0.055, 0.07]} castShadow material={skinShadeMat}>
          <sphereGeometry args={[0.085, 12, 10]} />
        </mesh>
        <mesh position={[0.115, 0.055, 0.07]} castShadow material={skinShadeMat}>
          <sphereGeometry args={[0.085, 12, 10]} />
        </mesh>

        {/* 袍身：圆润交领长袍，盖到大腿中部 */}
        <mesh ref={body} position={[0, 0.62, 0]} castShadow material={robeMat}>
          <capsuleGeometry args={[0.245, 0.3, 8, 16]} />
        </mesh>
        {/* 肩部圆弧 */}
        <mesh position={[0, 0.8, 0]} castShadow material={robeMat}>
          <sphereGeometry args={[0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>

        {/* 交领右衽：两片斜襟在胸前叠成 V 领 */}
        <mesh position={[-0.075, 0.66, 0.225]} rotation-z={0.5} material={robeDarkMat}>
          <boxGeometry args={[0.15, 0.42, 0.04]} />
        </mesh>
        <mesh position={[0.075, 0.66, 0.23]} rotation-z={-0.5} material={robeMat}>
          <boxGeometry args={[0.15, 0.42, 0.04]} />
        </mesh>
        {/* 斜襟滚边 */}
        <mesh position={[0.0, 0.7, 0.245]} rotation-z={-0.5} material={robeDarkMat}>
          <boxGeometry args={[0.04, 0.36, 0.02]} />
        </mesh>

        {/* 短袖宽袖（到上臂），小臂肤色露出 */}
        <mesh position={[-0.27, 0.72, 0.02]} rotation-z={0.22} castShadow material={robeDarkMat}>
          <capsuleGeometry args={[0.1, 0.16, 6, 12]} />
        </mesh>
        <mesh position={[0.27, 0.72, 0.02]} rotation-z={-0.22} castShadow material={robeDarkMat}>
          <capsuleGeometry args={[0.1, 0.16, 6, 12]} />
        </mesh>
        {/* 小臂（肤色） */}
        <mesh position={[-0.3, 0.55, 0.03]} castShadow material={skinMat}>
          <capsuleGeometry args={[0.055, 0.16, 6, 10]} />
        </mesh>
        <mesh position={[0.3, 0.55, 0.03]} castShadow material={skinMat}>
          <capsuleGeometry args={[0.055, 0.16, 6, 10]} />
        </mesh>

        {/* 麻绳腰带：三圈环 + 前结 + 双垂绳带与穗 */}
        <mesh position={[0, 0.5, 0]} rotation-x={Math.PI / 2} material={ropeMat}>
          <torusGeometry args={[0.245, 0.03, 8, 24]} />
        </mesh>
        <mesh position={[0, 0.54, 0]} rotation-x={Math.PI / 2} material={ropeMat}>
          <torusGeometry args={[0.24, 0.026, 8, 24]} />
        </mesh>
        <mesh position={[0, 0.46, 0]} rotation-x={Math.PI / 2} material={ropeMat}>
          <torusGeometry args={[0.24, 0.026, 8, 24]} />
        </mesh>
        <mesh position={[0, 0.5, 0.245]} material={ropeMat}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
        <mesh position={[-0.05, 0.38, 0.24]} material={ropeMat}>
          <boxGeometry args={[0.03, 0.22, 0.02]} />
        </mesh>
        <mesh position={[0.05, 0.38, 0.24]} material={ropeMat}>
          <boxGeometry args={[0.03, 0.22, 0.02]} />
        </mesh>
        {/* 绳带末端穗（多人区分色，小面积） */}
        <mesh position={[-0.05, 0.26, 0.24]} material={sashMat}>
          <sphereGeometry args={[0.025, 8, 6]} />
        </mesh>
        <mesh position={[0.05, 0.26, 0.24]} material={sashMat}>
          <sphereGeometry args={[0.025, 8, 6]} />
        </mesh>
        {/* 腰前垂布（与袍同色橙布） */}
        <mesh position={[0, 0.4, 0.255]} material={robeMat}>
          <boxGeometry args={[0.14, 0.2, 0.02]} />
        </mesh>

        {/* 头部：光头圆脸 */}
        <group ref={head} position={[0, 1.02, 0]}>
          <mesh castShadow material={skinMat} scale={[1, 1.08, 1]}>
            <sphereGeometry args={[0.29, 24, 18]} />
          </mesh>
          {/* 双耳 */}
          <mesh position={[-0.275, 0, 0]} material={skinShadeMat}>
            <sphereGeometry args={[0.055, 10, 8]} />
          </mesh>
          <mesh position={[0.275, 0, 0]} material={skinShadeMat}>
            <sphereGeometry args={[0.055, 10, 8]} />
          </mesh>
          {/* 眼白 + 黑瞳（睁开的大眼） */}
          <mesh position={[-0.1, 0.03, 0.26]} material={eyeWhiteMat}>
            <sphereGeometry args={[0.052, 12, 10]} />
          </mesh>
          <mesh position={[0.1, 0.03, 0.26]} material={eyeWhiteMat}>
            <sphereGeometry args={[0.052, 12, 10]} />
          </mesh>
          <mesh position={[-0.1, 0.02, 0.3]} material={pupilMat}>
            <sphereGeometry args={[0.026, 10, 8]} />
          </mesh>
          <mesh position={[0.1, 0.02, 0.3]} material={pupilMat}>
            <sphereGeometry args={[0.026, 10, 8]} />
          </mesh>
          {/* 眉毛 */}
          <mesh position={[-0.1, 0.13, 0.265]} rotation-z={0.1} material={browMat}>
            <boxGeometry args={[0.08, 0.014, 0.012]} />
          </mesh>
          <mesh position={[0.1, 0.13, 0.265]} rotation-z={-0.1} material={browMat}>
            <boxGeometry args={[0.08, 0.014, 0.012]} />
          </mesh>
          {/* 小鼻 */}
          <mesh position={[0, -0.03, 0.285]} material={skinShadeMat}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
          {/* 小嘴 */}
          <mesh position={[0, -0.11, 0.27]} material={mouthMat}>
            <boxGeometry args={[0.055, 0.014, 0.012]} />
          </mesh>
        </group>

        {/* 双手 */}
        <mesh ref={handL} position={[-0.3, 0.42, 0.04]} castShadow material={skinMat}>
          <sphereGeometry args={[0.065, 10, 8]} />
        </mesh>
        <mesh ref={handR} position={[0.3, 0.42, 0.04]} castShadow material={skinMat}>
          <sphereGeometry args={[0.065, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 出口：探测到骨骼 GLTF 才加载，否则降级程序化占位 ---------- */

export default function AvatarModel(props: AvatarModelProps) {
  const [exists, setExists] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    probeModel(AVATAR_MODEL_URL).then(ok => { if (alive) setExists(ok); });
    return () => { alive = false; };
  }, []);

  if (exists !== true) return <ProceduralAvatar {...props} />;

  return (
    <ModelBoundary fallback={<ProceduralAvatar {...props} />}>
      <Suspense fallback={<ProceduralAvatar {...props} />}>
        <SkeletalAvatar action={props.action} anim={props.anim} bob={props.bob} />
      </Suspense>
    </ModelBoundary>
  );
}

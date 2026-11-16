/**
 * RiggedAvatar.tsx —— 【实验分支，默认不启用】把上传的雕刻稿当皮肤做自动蒙皮
 *
 * 现状记录（避免以后再踩）：
 *   · 角色*.glb 是「单张连续曲面」的静态雕刻（8–9k 顶点、1 个网格、无骨骼无动画）；
 *     袖子 / 袍身 / 胸口是同一块连续布料，没有可以折叠的拓扑。
 *   · 试过四种权重方案：欧氏距离、表面测地距离（Dijkstra）、权重沿网格平滑、
 *     以及 |x| 硬分区 + 肩部同色球塞缝。前三种在合手/木鼓/数珠时会把胸口撕成碎片，
 *     第四种不再破面，但手臂与肩部会出现「人偶关节」外观，且姿态还原度不够。
 *   · 因此玩家角色仍用 FigureAvatar（分部件重建、五套动作完整）；
 *     这个雕刻稿目前用于殿门内两尊迎宾角色立像（见 SculptAvatar.tsx）。
 *
 * 要做「又快又像」的版本，正路是把这张雕刻稿按部位切开重做（头/袖/臂/袍/裤/脚
 * 各自成套），而不是硬绑骨。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActionState } from '../actions';
import type { AvatarModelProps } from './AvatarModel';
import { BONES, poseFor, type BoneName } from './poses';
import { buildBones, carveArms, skinGeometry, JOINTS, BONE_POS } from './autorig';
import FigureAvatar from './FigureAvatar';

export const RIGGED_AVATAR_URL = 'assets/models/avatar-alt/avatar2.glb';

/** 模型原始高度 = 1.0，放大到 1.39 m 与场景其他角色一致 */
const S = 1.39;

interface Rig {
  root: THREE.Group;
  mesh: THREE.SkinnedMesh;
  bones: Record<BoneName, THREE.Bone>;
}

const euler = new THREE.Euler();
const target = new THREE.Quaternion();

const COL = {
  robe: 0xcf7420,
  robeDark: 0xa85a12,
  skin: 0xe7b58c,
  skinShade: 0xd0946a,
};

const limbMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0 });

/** 在骨骼局部坐标系里造一条「锥形肢体」：从 a 到 b */
function limb(a: THREE.Vector3, b: THREE.Vector3, r1: number, r2: number, mat: THREE.Material) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r2, r1, len, 14, 1, false);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 肩关节球：塞住手臂硬分区之后肩部的缝，颜色同袍 */
function buildShoulderPlugs(): THREE.Mesh[] {
  const mat = new THREE.MeshStandardMaterial({ color: COL.robe, roughness: 0.8 });
  const out: THREE.Mesh[] = [];
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? -1 : 1;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 16), mat);
    m.position.set(sx * 0.128, 0.108, -0.004);
    m.scale.set(1, 0.95, 0.98);
    m.castShadow = true;
    out.push(m);
  }
  return out;
}

function buildRig(scene: THREE.Object3D): Rig {
  let src: THREE.Mesh | null = null;
  scene.traverse(o => { if ((o as THREE.Mesh).isMesh && !src) src = o as THREE.Mesh; });
  if (!src) throw new Error('模型里没有网格');

  const geo = (src as THREE.Mesh).geometry.clone();
  const mat = ((src as THREE.Mesh).material as THREE.Material).clone();
  skinGeometry(geo);

  const { root: boneRoot, bones } = buildBones();
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(boneRoot);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(BONES.map(n => bones[n])));
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const plugs = buildShoulderPlugs();
  for (const p of plugs) mesh.add(p);

  const root = new THREE.Group();
  root.scale.setScalar(S);
  root.position.y = 0.5 * S;
  root.add(mesh);
  return { root, mesh, bones };
}

export interface RiggedAvatarProps extends AvatarModelProps {
  /** 额外整体朝向修正（默认为 0，交给外层 group 控制） */
  yaw?: number;
}

export default function RiggedAvatar({ action, anim, bob, yaw = 0 }: RiggedAvatarProps) {
  const [rig, setRig] = useState<Rig | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      import('three-stdlib').then(({ MeshoptDecoder }) => {
      const ld = new GLTFLoader();
      try { ld.setMeshoptDecoder(MeshoptDecoder); } catch {}
      ld.load(
        RIGGED_AVATAR_URL,
        gltf => {
          if (!alive) return;
          try {
            const r = buildRig(gltf.scene);
            const m = r.mesh.material as THREE.MeshStandardMaterial;
            if (m && 'envMapIntensity' in m) m.envMapIntensity = 0.6;
            setRig(r);
          } catch (e) {
            console.error('[RiggedAvatar] 绑定失败', e);
            setErr(true);
          }
        },
        undefined,
        () => { if (alive) setErr(true); }
      );
      });
    });
    return () => { alive = false; };
  }, []);

  const blend = useRef({ key: '', start: 0, from: new Map<string, THREE.Quaternion>() });

  useFrame(state => {
    if (!rig) return;
    const t = state.clock.elapsedTime;
    const key = `${action}|${anim}`;
    if (blend.current.key !== key) {
      blend.current.key = key;
      blend.current.start = t;
      for (const name of BONES) blend.current.from.set(name, rig.bones[name].quaternion.clone());
    }
    const walking = anim === 'walk' && action === 'idle';
    const raw = walking ? 1 : Math.min(1, (t - blend.current.start) / 0.22);
    const p = raw * raw * (3 - 2 * raw);

    const pose = poseFor(action, anim, t);
    for (const name of BONES) {
      const bone = rig.bones[name];
      let e = pose[name];
      // 手臂按硬分区权重处理，角度直接用姿态表
      if (e) { euler.set(e[0], e[1], e[2], 'XYZ'); target.setFromEuler(euler); }
      else target.identity();
      const from = blend.current.from.get(name);
      if (from && p < 1) bone.quaternion.copy(from).slerp(target, p);
      else bone.quaternion.copy(target);
    }
    // 手臂配件直读骨骼世界矩阵

  });

  const node = useMemo(() => (rig ? <primitive object={rig.root} /> : null), [rig]);

  if (err) {
    // 绑定失败时退回分部件重建版，保证场上不空
    return <FigureAvatar action={action} anim={anim} bob={bob} color="#b9872f" />;
  }
  return (
    <group position={[0, bob, 0]} rotation-y={Math.PI + yaw}>
      {node}
    </group>
  );
}

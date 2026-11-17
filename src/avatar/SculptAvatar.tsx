/**
 * SculptAvatar.tsx —— 「写真版」小角色立像
 *
 * 用户上传的 sample-v1.glb 是一张雕刻稿：一个网格里并排正面 / 含布袋 / 背面三个人像，
 * 没有 skin、没有 animation。实测这套网格的袖子与袍身是同一张连续曲面，
 * 硬绑骨做合手会把袖子撕成翻片，因此它只作为「迎宾角色」立像使用：
 *   · 按三角形重心 x 切出中间那个人像（保留布袋与绳腰带）
 *   · 归一化到身高 1，再按目标身高缩放
 *   · 静态摆放 + 极轻的呼吸/微摆，避免看起来像纸片
 * 会动、能合手行礼敲木鼓的角色仍由 AvatarModel 的骨骼版负责。
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeFigure, splitFigure } from './rigSheet';

/** 旧的三视图稿仍保留（splitFigure 也只在这里用得到） */
void splitFigure;

export const SCULPT_AVATAR_URL = 'assets/models/avatar-sculpt.glb';
/** 新上传的单体雕刻稿（角色2.glb，8.3k 顶点，单网格） */
export const SCULPT_AVATAR_URL_V2 = 'assets/models/avatar-alt/avatar2.glb';

interface SculptAvatarProps {
  /** 世界坐标 */
  position?: [number, number, number];
  /** 目标身高（米） */
  height?: number;
  /** 朝向（弧度） */
  rotationY?: number;
  /** 是否做轻微呼吸/微摆 */
  animate?: boolean;
  /** 运动状态：站立呼吸 / 行走（雕刻稿无骨骼，用整体重心与起伏模拟走路） */
  motion?: 'idle' | 'walk';
  /** 动作状态（合手 / 行礼 / 木鼓 / 珠串），用整体前倾与点头近似 */
  action?: 'idle' | 'praying' | 'bowing' | 'wood_hit' | 'beads' | 'sitting' | 'kowtow' | 'incense' | 'offering';
}

function Sculpt({ position = [0, 0, 0], height = 1.42, rotationY = 0, animate = true, motion = 'idle', action = 'idle' }: SculptAvatarProps) {
  const { scene } = useGLTF(SCULPT_AVATAR_URL_V2, false, true);
  const group = useRef<THREE.Group>(null);
  const [seed] = useState(() => Math.random() * Math.PI * 2);

  const figure = useMemo(() => {
    let source: THREE.Mesh | null = null;
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !source) source = m;
    });
    if (!source) return null;
    const src = source as THREE.Mesh;
    // 新版雕刻稿是单个小人像（不再是三视图并排），直接归一化到身高 1
    const geo = normalizeFigure(src.geometry.clone() as THREE.BufferGeometry);
    const material = (src.material as THREE.MeshStandardMaterial).clone();
    material.roughness = 0.82;
    material.metalness = 0;
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [scene]);

  useEffect(() => () => {
    if (!figure) return;
    (figure.material as THREE.Material).dispose();
    figure.geometry.dispose();
  }, [figure]);

  const pose = useRef({ tilt: 0, nod: 0 });

  useFrame(({ clock }, dt) => {
    if (!group.current || !animate) return;
    const t = clock.getElapsedTime() + seed;
    const g = group.current;
    const walk = motion === 'walk';

    // 走路：整体上下颠 + 左右压重 + 轻微前倾，替代缺失的腿骨动画（约 7.6 步/秒两拍）
    const step = t * 7.6;
    g.position.y = walk ? Math.abs(Math.sin(step)) * 0.055 : 0;
    g.position.x = walk ? Math.sin(step) * 0.022 : 0;
    g.rotation.z = walk ? Math.sin(step) * 0.055 : Math.sin(t * 0.6) * 0.012;
    g.rotation.y = walk ? Math.sin(step * 0.5) * 0.04 : 0;

    // 动作姿态（惯性趋近，避免瞬跳）
    const targetTilt = action === 'bowing' ? 0.52 : action === 'praying' ? 0.10 : action === 'wood_hit' || action === 'beads' ? 0.06 : 0;
    const targetNod = action === 'wood_hit' || action === 'beads' ? 0.09 : 0;
    pose.current.tilt += (targetTilt - pose.current.tilt) * Math.min(1, dt * 4);
    pose.current.nod += (targetNod - pose.current.nod) * Math.min(1, dt * 4);
    g.rotation.x = (walk ? -0.05 : 0) + pose.current.tilt + Math.sin(t * (action === 'wood_hit' || action === 'beads' ? 6 : 1.4)) * pose.current.nod;

    // 呼吸：身高 ±0.4%
    g.scale.y = height * (1 + Math.sin(t * 1.4) * 0.004);
  });

  if (!figure) return null;

  return (
    <group position={position} rotation-y={rotationY}>
      <group ref={group} scale={[height, height, height]}>
        <primitive object={figure} />
      </group>
    </group>
  );
}

export default function SculptAvatar(props: SculptAvatarProps) {
  return (
    <Suspense fallback={null}>
      <Sculpt {...props} />
    </Suspense>
  );
}

import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';

/**
 * MeshStatue —— 用上传的立体造像模型（单网格静态扫描稿）摆进法堂
 *
 * 模型约定（三个文件实测一致）：
 *   · 单个 mesh / 单个 primitive / 无骨骼无动画
 *   · 原始包围盒高度 1.0（y −0.5…+0.5），水平 ±0.34
 *   · 脚（莲座底）在 −0.5，朝 +Z
 * 这里统一做：等比缩放到目标高度、贴地、水平居中、绕 Y 轴给朝向。
 */
export interface MeshStatueProps {
  url: string;
  /** 目标高度（米） */
  height: number;
  position?: [number, number, number];
  /** 绕 Y 轴朝向（弧度），默认 0 = 面朝 +Z（朝观众） */
  rotationY?: number;
  /** 是否投落地软阴影 */
  shadow?: boolean;
  /** 提亮用的自发光色（默认暖金；蓝衣药师塑像用冷色，避免被暖光洗成青绿） */
  emissive?: string;
  /** 自发光强度，越高越"鎏金发亮" */
  emissiveIntensity?: number;
  /** 粗糙度，越低越亮泽 */
  roughness?: number;
  /** 金属度 */
  metalness?: number;
  /** 贴图颜色乘子，用于整体提亮/调色 */
  tint?: string;
}

export default function MeshStatue({ url, height, position = [0, 0, 0], rotationY = 0, shadow = true, emissive = '#3a2408', emissiveIntensity = 0.35, roughness = 0.55, metalness = 0.25, tint = '#ffffff' }: MeshStatueProps) {
  const gltf = useGLTF(url, false, true);

  const { geo, mat } = useMemo(() => {
    let src: THREE.Mesh | null = null;
    gltf.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !src) src = m;
    });
    if (!src) return { geo: null, mat: null };

    const g = (src as THREE.Mesh).geometry.clone();
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const h = box.max.y - box.min.y;
    const s = height / Math.max(h, 1e-6);
    const c = box.getCenter(new THREE.Vector3());
    g.translate(-c.x, -box.min.y, -c.z);
    g.scale(s, s, s);
    g.computeBoundingBox();
    g.computeVertexNormals();

    const srcMat = (src as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const m = srcMat.clone();
    // 扫描稿贴图偏暗，稍微提亮并压一点粗糙度，避免在暖光下发闷
    m.roughness = roughness;
    m.metalness = metalness;
    m.color = new THREE.Color(tint);
    // 扫描贴图本身偏闷，加一点暖色自发光把鎏金提起来（不改变贴图细节）
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = emissiveIntensity;
    return { geo: g, mat: m };
  }, [gltf, height, emissive, emissiveIntensity, roughness, metalness, tint]);

  if (!geo || !mat) return null;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {shadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <circleGeometry args={[height * 0.28, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

useGLTF.preload('assets/models/statue-alt/west.glb', false, true);
useGLTF.preload('assets/models/statue-alt/north.glb', false, true);
useGLTF.preload('assets/models/statue-alt/east.glb', false, true);

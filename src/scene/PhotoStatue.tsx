/**
 * PhotoStatue.tsx —— 用参考图的真实渲染图做成「会转向镜头的立像」
 *
 * 为什么不用三维雕塑：三张塑像是 2D 渲染图，逐块建模做出来的形制细节（螺发、莲瓣、
 * 衣纹）远不如原图；改成「抠底 + 面向镜头（水平方向）的单面牌」后，任何角度看到的都是
 * 那张精准的造像图，代价是没有侧面体积感——所以只在静态装饰位使用。
 *
 * 缺图时自动回落到程序化三维造像（StatueFigure），保证不空着。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import StatueFigure, { type StatuePalette } from './StatueFigure';

export type PhotoStatueProps = {
  /** 贴图地址（已抠底的透明 PNG/WebP） */
  textureUrl: string;
  /** 立像高度（米），宽度按图片比例自动算 */
  height?: number;
  position?: [number, number, number];
  /** 缺图时的三维降级造像配色 */
  fallbackPalette: StatuePalette;
  fallbackMudra?: 'dhyana' | 'abhaya' | 'bowl';
  /** 地面阴影强度 0–1 */
  shadow?: number;
};

export default function PhotoStatue({
  textureUrl,
  height = 2.0,
  position = [0, 0, 0],
  fallbackPalette,
  fallbackMudra = 'dhyana',
  shadow = 0.55,
}: PhotoStatueProps) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load(
      textureUrl,
      t => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setTex(t);
      },
      undefined,
      () => { if (alive) setFailed(true); }
    );
    return () => { alive = false; };
  }, [textureUrl]);


  // 立像始终面向相机（只绕 Y 轴），塑像不会「背对」玩家
  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (!g) return;
    const dx = camera.position.x - position[0];
    const dz = camera.position.z - position[2];
    g.rotation.y = Math.atan2(dx, dz);
  });

  const geo = useMemo(() => {
    const aspect = tex ? (tex.image as HTMLImageElement).width / (tex.image as HTMLImageElement).height : 0.8;
    return new THREE.PlaneGeometry(height * aspect, height);
  }, [tex, height]);

  if (failed) {
    return <StatueFigure palette={fallbackPalette} mudra={fallbackMudra} position={position} />;
  }

  return (
    <group ref={groupRef} position={position}>
      {tex && (
        <mesh geometry={geo} position={[0, height / 2, 0]}>
          <meshBasicMaterial
            map={tex}
            transparent
            alphaTest={0.28}
            depthWrite
            toneMapped={false}
            color={new THREE.Color(0.94, 0.94, 0.94)}
          />
        </mesh>
      )}
      {/* 贴地软阴影：让牌状立像有「落地」的重量 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0.05]}>
        <circleGeometry args={[height * 0.28, 24]} />
        <meshBasicMaterial color="#120a05" transparent opacity={shadow} depthWrite={false} />
      </mesh>
    </group>
  );
}

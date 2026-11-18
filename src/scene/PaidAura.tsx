/**
 * PaidAura.tsx —— 프리미엄 光效（付费解锁）
 *
 * 1) 光环：角色头部后方的一团柔光（Sprite，始终朝向镜头，不挑视角）
 * 2) 연꽃 발광：脚下两圈缓慢旋转的暖色光环
 *
 * 只在已解锁时渲染；未解锁时组件返回 null，零开销。
 * 不修改角色模型与骨骼，只挂两层发光体。
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { activeAura, usePaid } from '../paid';

/** 柔光贴图：现生成，零外部资源 */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function PaidAura() {
  const paid = usePaid();
  const aura = activeAura(paid);
  const glowRef = useRef<THREE.Sprite>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);

  const tex = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    // 光环始终正对镜头，不看视角
    if (haloRef.current) haloRef.current.quaternion.copy(camera.quaternion);
    if (glowRef.current) {
      // 轻微呼吸：0.42 ~ 0.56，不闪到刺眼
      const m = glowRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.44 + Math.sin(t * 1.6) * 0.07;
    }
    if (ringARef.current) ringARef.current.rotation.z = t * 0.42;
    if (ringBRef.current) ringBRef.current.rotation.z = -t * 0.28;
    if (ringARef.current) {
      const m = ringARef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.34 + Math.sin(t * 1.2) * 0.08;
    }
  });

  if (!aura) return null;

  return (
    <group>
      {/* 头部光环 */}
      <sprite ref={glowRef} position={[0, 1.72, 0.02]} scale={[1.9, 1.9, 1]} renderOrder={4}>
        <spriteMaterial
          map={tex}
          color={aura.color}
          transparent
          opacity={0.62}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* 细光环：给出清晰边界，避免只有一团雾 */}
      <mesh ref={haloRef} position={[0, 1.79, 0.03]} renderOrder={5}>
        <ringGeometry args={[0.4, 0.47, 64]} />
        <meshBasicMaterial
          color={aura.color}
          transparent
          opacity={0.85}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 脚下 연꽃 발광（付费开关单独控制，颜色跟光环一致） */}
      {paid.lotus && (
        <>
          <mesh ref={ringARef} rotation-x={-Math.PI / 2} position={[0, 0.018, 0]}>
            <ringGeometry args={[0.34, 0.62, 48]} />
            <meshBasicMaterial
              color={aura.color}
              transparent
              opacity={0.36}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh ref={ringBRef} rotation-x={-Math.PI / 2} position={[0, 0.022, 0]}>
            <ringGeometry args={[0.66, 0.74, 48]} />
            <meshBasicMaterial
              color={aura.color}
              transparent
              opacity={0.2}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

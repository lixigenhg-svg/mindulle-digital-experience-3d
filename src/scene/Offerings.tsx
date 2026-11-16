/**
 * Offerings.tsx —— 供花 / 供水的 3D 呈现
 *
 * 供养数据来自 lamp-list.php（store.lampRecords 的 type 字段）：
 *   flower → 长香案上摆一束花（最多三束，对应前三位供养人）
 *   water  → 香案上摆一只清水碗
 * 没有对应供养记录时不渲染任何东西，避免凭空冒出花和水。
 *
 * 坐标是世界坐标：长香案缩到 0.62 之后，桌心在 (0, 0.52, -0.60)，
 * 桌面宽约 5.08 米（x 从 -2.54 到 2.54），两侧 x=±1.92 已被果盘占住。
 */
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { store } from '../store';

const PORCELAIN = new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: 0.35, metalness: 0.02 });
const STEM = new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.8 });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x3f6034, roughness: 0.85 });
const WATER = new THREE.MeshStandardMaterial({
  color: 0x6fa8c4,
  roughness: 0.05,
  metalness: 0.12,
  transparent: true,
  opacity: 0.88,
  emissive: 0x2f5d72,
  emissiveIntensity: 0.18,
});

/** 一束供花：白瓷小瓶 + 几枝花 */
function Bouquet({ x, z, tone }: { x: number; z: number; tone: number }) {
  const PETAL = new THREE.MeshStandardMaterial({
    color: tone,
    roughness: 0.6,
    emissive: tone,
    emissiveIntensity: 0.06,
  });
  const stems = [
    { a: 0.20, h: 0.30, bend: 0.13 },
    { a: -0.28, h: 0.36, bend: -0.11 },
    { a: 0.03, h: 0.42, bend: 0.03 },
    { a: 0.44, h: 0.26, bend: 0.20 },
    { a: -0.50, h: 0.28, bend: -0.18 },
  ];
  return (
    <group position={[x, 0.52, z]}>
      {/* 小瓷瓶 */}
      <mesh position={[0, 0.14, 0]} castShadow material={PORCELAIN}>
        <cylinderGeometry args={[0.085, 0.11, 0.28, 16]} />
      </mesh>
      <mesh position={[0, 0.285, 0]} material={PORCELAIN}>
        <cylinderGeometry args={[0.06, 0.05, 0.03, 14]} />
      </mesh>
      {/* 花枝 */}
      {stems.map((s, i) => (
        <group key={i} position={[0, 0.28, 0]} rotation-z={s.bend}>
          <mesh position={[0, s.h / 2, 0]} material={STEM}>
            <cylinderGeometry args={[0.013, 0.016, s.h, 7]} />
          </mesh>
          {/* 叶片 */}
          <mesh position={[s.a * 0.18, s.h * 0.55, 0]} rotation-y={s.a} material={LEAF}>
            <boxGeometry args={[0.11, 0.008, 0.05]} />
          </mesh>
          {/* 花头 */}
          <group position={[s.a * 0.62, s.h, s.a * 0.22]}>
            <mesh castShadow material={PETAL}>
              <sphereGeometry args={[0.058, 12, 10]} />
            </mesh>
            {[0, 1, 2, 3].map(k => (
              <mesh
                key={k}
                position={[Math.cos((k / 4) * Math.PI * 2) * 0.040, 0.010, Math.sin((k / 4) * Math.PI * 2) * 0.040]}
                rotation-z={0.5}
                material={PETAL}
              >
                <sphereGeometry args={[0.038, 10, 8]} />
              </mesh>
            ))}
            <mesh position={[0, 0.026, 0]} material={new THREE.MeshStandardMaterial({ color: 0xe8c46a, roughness: 0.5 })}>
              <sphereGeometry args={[0.018, 8, 6]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** 一只清水碗 */
function WaterBowl({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.52, z]}>
      {/* 碗身 */}
      <mesh position={[0, 0.055, 0]} castShadow material={PORCELAIN}>
        <cylinderGeometry args={[0.185, 0.11, 0.115, 22]} />
      </mesh>
      {/* 碗口沿 */}
      <mesh position={[0, 0.112, 0]} rotation-x={Math.PI / 2} material={PORCELAIN}>
        <torusGeometry args={[0.186, 0.011, 8, 24]} />
      </mesh>
      {/* 水面：抬到离口沿 4mm，否则被碗口遮住看不见 */}
      <mesh position={[0, 0.109, 0]} material={WATER}>
        <cylinderGeometry args={[0.180, 0.180, 0.016, 22]} />
      </mesh>
      {/* 一点反光的水纹 */}
      <mesh position={[0.05, 0.1135, 0.02]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.03, 0.062, 18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

const FLOWER_TONES = [0xf2b6c2, 0xf5d8a0, 0xe9a7b6];

export default function Offerings() {
  const records = useSyncExternalStore(store.subscribe, () => store.hud.lampRecords);
  const flowers = (records as { type?: string }[]).filter(r => r.type === 'flower').length;
  const waters = (records as { type?: string }[]).filter(r => r.type === 'water').length;

  const bouquetCount = Math.min(flowers, 3);
  return (
    <group>
      {Array.from({ length: bouquetCount }, (_, i) => (
        <Bouquet
          key={i}
          x={-1.3 + i * -0.34}
          z={-0.60 + (i % 2 === 0 ? 0 : 0.16)}
          tone={FLOWER_TONES[i % FLOWER_TONES.length]}
        />
      ))}
      {waters > 0 && <WaterBowl x={1.3} z={-0.60} />}
      {waters > 1 && <WaterBowl x={1.3} z={-0.36} />}
    </group>
  );
}

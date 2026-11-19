/**
 * PrivateSalon.tsx —— 프라이빗 금각（10,000원 사랑하는 이에게 专属空间）
 *
 * 与大殿完全分开：黑漆描金墙、朱红 silk 帷幔、白玉地面、私人佛龛、
 * 长明灯、茶席、屏风花艺、莲花池。房间内不出现公共大殿的格窗与长条坐席。
 *
 * 场景只负责“看见”；茶/灯/愿/氛围由 PrivateRoomUI 控制。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type PrivateMood = 'gold' | 'moon' | 'crimson';

const GOLD = '#c9a24b';
const GOLD_LIGHT = '#e6c77c';
const LACQUER = '#1a110a';
const SILK = '#6e1f28';
const MARBLE = '#e8dfcd';

const MOOD_LIGHT: Record<PrivateMood, { ambient: string; key: string; fill: string; keyI: number; fillI: number }> = {
  gold: { ambient: '#ffd8a0', key: '#ffc47d', fill: '#9a4c36', keyI: 3.4, fillI: 1.15 },
  moon: { ambient: '#e6efff', key: '#d8e6ff', fill: '#4a6480', keyI: 2.5, fillI: 0.9 },
  crimson: { ambient: '#ffd0bc', key: '#ffab84', fill: '#86242f', keyI: 3.3, fillI: 1.35 },
};

function makeMarbleTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = MARBLE;
  ctx.fillRect(0, 0, size, size);
  // 浅灰金纹，模拟白玉大理石
  for (let i = 0; i < 28; i++) {
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(176,144,92,0.35)' : 'rgba(122,112,96,0.18)';
    ctx.lineWidth = 1 + Math.random() * 2.2;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 110;
      y += (Math.random() - 0.5) * 110;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function makeScreenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#3b2913');
  g.addColorStop(0.5, '#6a4c21');
  g.addColorStop(1, '#2a180c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  // 金色山峦与雾带
  ctx.strokeStyle = 'rgba(242,210,130,0.86)';
  ctx.lineWidth = 2;
  for (let layer = 0; layer < 4; layer++) {
    ctx.beginPath();
    const y0 = 260 + layer * 55;
    for (let x = 0; x <= 1024; x += 8) {
      const y = y0 - Math.sin(x * 0.008 + layer * 1.4) * (46 + layer * 12)
        - Math.sin(x * 0.021 + layer) * 14;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 金色云纹
  ctx.strokeStyle = 'rgba(247,219,150,0.5)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(820 - i * 95, 120 + i * 18, 24 + i * 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function GoldTrim({ length, position, rotation = [0, 0, 0] as [number, number, number] }: {
  length: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[length, 0.05, 0.05]} />
      <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.28} />
    </mesh>
  );
}

/** 金色坐佛：莲座 + 身 + 头 + 背光；足够识别，不冒充真实文物 */
function GoldenBuddha({ lit }: { lit: boolean }) {
  const mat = { color: GOLD_LIGHT, metalness: 0.72, roughness: 0.3, emissive: '#3b2a10', emissiveIntensity: lit ? 0.9 : 0.25 };
  return (
    <group position={[0, 1.0, 2.15]}>
      {/* 莲座 */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.92, 1.08, 0.34, 18]} />
        <meshStandardMaterial color="#aa803e" metalness={0.55} roughness={0.38} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.98, 0.34, Math.sin(a) * 0.98]} rotation={[0.5, -a, 0]}>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshStandardMaterial color="#c79b55" metalness={0.6} roughness={0.34} />
          </mesh>
        );
      })}
      {/* 身体 */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.62, 20, 18]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0.62, 0.12]} scale={[0.85, 0.4, 0.8]}>
        <sphereGeometry args={[0.7, 18, 14]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* 头 + 螺发 + 肉髻 */}
      <mesh position={[0, 1.72, 0]}>
        <sphereGeometry args={[0.34, 18, 16]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 2.03, 0]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.26} />
      </mesh>
      {/* 眼睛/白毫用深色小点，保持金色主体 */}
      <mesh position={[-0.12, 1.77, 0.29]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#4a3516" roughness={0.6} />
      </mesh>
      <mesh position={[0.12, 1.77, 0.29]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#4a3516" roughness={0.6} />
      </mesh>
      {/* 背光 */}
      <mesh position={[0, 1.7, -0.22]}>
        <torusGeometry args={[0.95, 0.06, 10, 40]} />
        <meshStandardMaterial color={GOLD_LIGHT} metalness={0.85} roughness={0.24} emissive="#6b4a17" emissiveIntensity={lit ? 1.1 : 0.2} />
      </mesh>
      <mesh position={[0, 1.7, -0.2]}>
        <circleGeometry args={[0.88, 36]} />
        <meshBasicMaterial color="#3a2410" transparent opacity={0.34} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function LongLifeLamp({ lit }: { lit: boolean }) {
  const flame = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!flame.current) return;
    const t = performance.now() * 0.004;
    flame.current.intensity = lit ? 1.45 + Math.sin(t) * 0.18 : 0;
    flame.current.visible = lit;
  });
  return (
    <group position={[2.65, 0, 2.45]}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.28, 0.38, 0.56, 12]} />
        <meshStandardMaterial color="#3b2a12" metalness={0.5} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 1.1, 16, 1, true]} />
        <meshPhysicalMaterial color="#f5d79a" metalness={0.1} roughness={0.12} transparent opacity={0.38} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <torusGeometry args={[0.25, 0.035, 8, 24]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
      </mesh>
      {lit && (
        <mesh position={[0, 1.8, 0]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshBasicMaterial color="#ffd98d" />
        </mesh>
      )}
      <pointLight ref={flame} position={[0, 1.95, 0]} color="#ffc77a" intensity={0} distance={6} decay={2} />
    </group>
  );
}

function TeaSet({ tea }: { tea: number }) {
  const steam = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!steam.current) return;
    steam.current.children.forEach((c, i) => {
      c.position.y += dt * (0.16 + i * 0.03);
      if (c.position.y > 1.3) c.position.y = 0.55;
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.20 - (c.position.y - 0.55) * 0.18;
    });
  });
  const active = tea > 0;
  return (
    <group position={[-3.55, 0, 9.0]}>
      {/* 圆茶桌 */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[1.02, 1.02, 0.08, 28]} />
        <meshStandardMaterial color="#2c1b11" metalness={0.15} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <torusGeometry args={[1.0, 0.045, 8, 36]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.28} />
      </mesh>
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 0.24, Math.sin(a) * 0.62]}>
            <cylinderGeometry args={[0.07, 0.09, 0.48, 10]} />
            <meshStandardMaterial color="#1d1209" roughness={0.42} />
          </mesh>
        );
      })}
      {/* 茶壶 + 杯 */}
      <mesh position={[0.1, 0.68, 0.05]}>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#7b4a2a" metalness={0.15} roughness={0.35} />
      </mesh>
      <mesh position={[0.1, 0.9, 0.05]}>
        <cylinderGeometry args={[0.06, 0.08, 0.05, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 0.75, 0.06]} rotation={[0, 0, -0.6]}>
        <torusGeometry args={[0.12, 0.028, 8, 16, Math.PI * 1.25]} />
        <meshStandardMaterial color="#8c5b34" roughness={0.4} />
      </mesh>
      {[[-0.34, 0.02], [0.38, 0.34], [-0.08, 0.42]].map(([x, z], i) => (
        <group key={i} position={[x, 0.58, z]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.07, 0.055, 0.1, 12]} />
            <meshStandardMaterial color="#e9e2d2" roughness={0.35} />
          </mesh>
          {active && (
            <mesh position={[0, 0.085, 0]}>
              <cylinderGeometry args={[0.055, 0.045, 0.012, 12]} />
              <meshBasicMaterial color="#9a6333" transparent opacity={0.8} />
            </mesh>
          )}
        </group>
      ))}
      {active && (
        <group ref={steam}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[0.1 + i * 0.04, 0.9 + i * 0.13, 0.05]}>
              <sphereGeometry args={[0.16 + i * 0.04, 10, 8]} />
              <meshBasicMaterial color="#f3e7d3" transparent opacity={0.18} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}
      {/* 坐垫 */}
      {[[-1.3, 0.25], [1.15, 0.2], [0.1, -1.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]}>
          <cylinderGeometry args={[0.34, 0.38, 0.16, 18]} />
          <meshStandardMaterial color="#5d1b23" roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

function Candle({ position, delay }: { position: [number, number, number]; delay: number }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!light.current) return;
    const t = performance.now() * 0.005 + delay;
    light.current.intensity = 0.55 + Math.sin(t) * 0.1 + Math.sin(t * 2.7) * 0.04;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.05, 0.065, 0.24, 10]} />
        <meshStandardMaterial color="#efe4c8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#ffd89a" />
      </mesh>
      <pointLight ref={light} position={[0, 0.34, 0]} color="#ffb45e" intensity={0.55} distance={3.2} decay={2} />
    </group>
  );
}

function HangingSilk({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[i * 0.26 - 0.26, 2.9, 0]}>
          <boxGeometry args={[0.18, 3.4, 0.035]} />
          <meshStandardMaterial color={i === 1 ? '#8d2933' : SILK} roughness={0.78} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 4.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.92, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.78} roughness={0.28} />
      </mesh>
    </group>
  );
}

export default function PrivateSalon({ mood, lampLit, tea }: {
  mood: PrivateMood;
  lampLit: boolean;
  tea: number;
}) {
  const marble = useMemo(makeMarbleTexture, []);
  const screen = useMemo(makeScreenTexture, []);
  const moodLight = MOOD_LIGHT[mood];
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!lightRef.current) return;
    lightRef.current.intensity = moodLight.keyI + Math.sin(performance.now() * 0.002) * 0.08;
  });

  return (
    <group>
      <ambientLight color={moodLight.ambient} intensity={1.15} />
      <pointLight ref={lightRef} position={[0, 4.0, 7.5]} color={moodLight.key} intensity={moodLight.keyI} distance={20} decay={2} />
      <pointLight position={[-5.2, 2.2, 10.5]} color={moodLight.fill} intensity={moodLight.fillI} distance={13} decay={2} />
      <pointLight position={[5.2, 2.2, 4.0]} color="#ffd08a" intensity={1.1} distance={12} decay={2} />
      <pointLight position={[0, 3.6, 13.2]} color="#ffe2b0" intensity={1.35} distance={15} decay={2} />

      {/* 私人供桌：黑漆金边 + 香炉 + 双烛 */}
      <group position={[0, 0, 2.7]}>
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[3.6, 0.12, 1.0]} />
          <meshStandardMaterial color="#24160c" metalness={0.22} roughness={0.28} />
        </mesh>
        {[[-1.5, -0.35], [1.5, -0.35], [-1.5, 0.35], [1.5, 0.35]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.38, z]}>
            <boxGeometry args={[0.12, 0.76, 0.12]} />
            <meshStandardMaterial color="#1a1008" metalness={0.18} roughness={0.34} />
          </mesh>
        ))}
        <mesh position={[0, 0.84, 0]}>
          <boxGeometry args={[3.45, 0.035, 0.88]} />
          <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.18, 0.23, 0.2, 18]} />
          <meshStandardMaterial color="#3d2a16" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.04, 0]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshBasicMaterial color="#ffcf8a" />
        </mesh>
        <Candle position={[-1.15, 0.9, 0.02]} delay={0.4} />
        <Candle position={[1.15, 0.9, 0.02]} delay={1.2} />
      </group>

      {/* 白玉地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]} receiveShadow>
        <planeGeometry args={[14.4, 15.6]} />
        <meshStandardMaterial map={marble} color="#f2eadb" metalness={0.12} roughness={0.28} />
      </mesh>
      {/* 地面金色边框与朱红地毯 */}
      {[
        { p: [0, 0.012, 15.35] as [number, number, number], s: [14.4, 0.03, 0.12] as [number, number, number] },
        { p: [0, 0.012, 0.65] as [number, number, number], s: [14.4, 0.03, 0.12] as [number, number, number] },
        { p: [-7.05, 0.012, 8] as [number, number, number], s: [0.12, 0.03, 15.6] as [number, number, number] },
        { p: [7.05, 0.012, 8] as [number, number, number], s: [0.12, 0.03, 15.6] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.26} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 7.8]}>
        <planeGeometry args={[6.6, 10.4]} />
        <meshStandardMaterial color="#5b111b" roughness={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 7.8]}>
        <planeGeometry args={[6.1, 9.9]} />
        <meshStandardMaterial color="#741824" roughness={0.75} />
      </mesh>
      {/* 地毯金线 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 7.8]}>
        <planeGeometry args={[5.4, 9.2]} />
        <meshStandardMaterial color="#8f2130" roughness={0.7} />
      </mesh>

      {/* 黑漆描金墙、朱红 silk、顶部金梁 */}
      {[-7.2, 7.2].map((x, i) => (
        <group key={i} position={[x, 0, 8]}>
          <mesh position={[0, 2.9, 0]}>
            <boxGeometry args={[0.22, 5.8, 15.8]} />
            <meshStandardMaterial color={LACQUER} metalness={0.28} roughness={0.3} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[i === 0 ? 0.13 : -0.13, 2.8, -6 + k * 2.4]}>
              <boxGeometry args={[0.035, 5.2, 0.05]} />
              <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.26} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 后墙：金屏 + 佛龛 */}
      <mesh position={[0, 2.9, 0.5]}>
        <boxGeometry args={[14.4, 5.8, 0.22]} />
        <meshStandardMaterial color={LACQUER} metalness={0.26} roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.0, 0.64]}>
        <planeGeometry args={[9.6, 4.8]} />
        <meshStandardMaterial map={screen} color="#ffffff" metalness={0.1} roughness={0.48} />
      </mesh>
      {/* 佛龛金色框架 */}
      {[
        [0, 5.42, 0.72, 9.9, 0.08, 0.08],
        [0, 0.72, 0.72, 9.9, 0.08, 0.08],
        [-4.95, 3.07, 0.72, 0.08, 4.78, 0.08],
        [4.95, 3.07, 0.72, 0.08, 4.78, 0.08],
      ].map((v, i) => (
        <mesh key={i} position={[v[0], v[1], v[2]]}>
          <boxGeometry args={[v[3], v[4], v[5]]} />
          <meshStandardMaterial color={GOLD} metalness={0.84} roughness={0.25} />
        </mesh>
      ))}
      {/* 前墙：留门洞 */}
      <mesh position={[-5.2, 2.9, 15.7]}>
        <boxGeometry args={[4.6, 5.8, 0.22]} />
        <meshStandardMaterial color={LACQUER} metalness={0.26} roughness={0.32} />
      </mesh>
      <mesh position={[5.2, 2.9, 15.7]}>
        <boxGeometry args={[4.6, 5.8, 0.22]} />
        <meshStandardMaterial color={LACQUER} metalness={0.26} roughness={0.32} />
      </mesh>
      <mesh position={[0, 5.25, 15.7]}>
        <boxGeometry args={[6.0, 1.1, 0.22]} />
        <meshStandardMaterial color={LACQUER} metalness={0.26} roughness={0.32} />
      </mesh>
      <mesh position={[0, 4.66, 15.58]}>
        <boxGeometry args={[5.6, 0.08, 0.08]} />
        <meshStandardMaterial color={GOLD} metalness={0.84} roughness={0.25} />
      </mesh>

      {/* 顶棚：金格藻井 */}
      <mesh position={[0, 5.8, 8]}>
        <boxGeometry args={[14.4, 0.18, 15.8]} />
        <meshStandardMaterial color="#160e08" metalness={0.22} roughness={0.42} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <GoldTrim key={`x${i}`} length={15.4} position={[-6 + i * 2, 5.68, 8]} rotation={[0, Math.PI / 2, 0]} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <GoldTrim key={`z${i}`} length={14.0} position={[0, 5.68, 1 + i * 2]} />
      ))}
      {/* 顶部中央金莲 */}
      <mesh position={[0, 5.62, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshStandardMaterial color="#2a170a" metalness={0.5} roughness={0.32} />
      </mesh>
      <mesh position={[0, 5.6, 8]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.45, 0.08, 8, 32]} />
        <meshStandardMaterial color={GOLD} metalness={0.86} roughness={0.22} />
      </mesh>

      {/* 四角立柱 */}
      {[[-6.6, 2.4], [6.6, 2.4], [-6.6, 13.6], [6.6, 13.6]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.9, 0]}>
            <cylinderGeometry args={[0.28, 0.34, 5.8, 12]} />
            <meshStandardMaterial color="#1a0f09" metalness={0.32} roughness={0.3} />
          </mesh>
          <mesh position={[0, 5.35, 0]}>
            <cylinderGeometry args={[0.42, 0.3, 0.22, 12]} />
            <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.26} />
          </mesh>
        </group>
      ))}

      {/* 佛龛台座 */}
      <mesh position={[0, 0.34, 2.2]}>
        <boxGeometry args={[3.3, 0.68, 2.5]} />
        <meshStandardMaterial color="#2a170c" metalness={0.32} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 2.2]}>
        <boxGeometry args={[3.15, 0.08, 2.35]} />
        <meshStandardMaterial color={GOLD} metalness={0.84} roughness={0.24} />
      </mesh>
      <GoldenBuddha lit={lampLit} />
      <LongLifeLamp lit={lampLit} />

      {/* 香炉与供台 */}
      <mesh position={[0, 0.4, 4.55]}>
        <boxGeometry args={[2.6, 0.48, 0.78]} />
        <meshStandardMaterial color="#241208" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.68, 4.55]}>
        <cylinderGeometry args={[0.32, 0.4, 0.22, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.72} roughness={0.3} />
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[(i - 1) * 0.34, 0.82, 4.55]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
          <meshStandardMaterial color="#b67d42" roughness={0.5} />
        </mesh>
      ))}
      <pointLight position={[0, 0.95, 4.55]} color="#ffb066" intensity={lampLit ? 0.9 : 0.35} distance={4.0} decay={2} />

      <TeaSet tea={tea} />

      {/* 右侧屏风 + 花艺 */}
      <group position={[4.55, 0, 9.0]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[i * 0.52 - 0.52, 1.7, 0]} rotation={[0, -0.18, 0]}>
            <boxGeometry args={[0.5, 3.4, 0.05]} />
            <meshStandardMaterial color="#1b1008" metalness={0.2} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 3.4, 0]}>
          <boxGeometry args={[1.65, 0.08, 0.1]} />
          <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.26} />
        </mesh>
      </group>
      {/* 花艺 */}
      {[[-5.3, 5.8], [5.3, 5.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.22, 0.3, 1.5, 14]} />
            <meshStandardMaterial color="#2b160b" metalness={0.32} roughness={0.35} />
          </mesh>
          {Array.from({ length: 7 }, (_, k) => {
            const a = (k / 7) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 0.32, 1.55 + (k % 3) * 0.15, Math.sin(a) * 0.32]}>
                <sphereGeometry args={[0.14, 10, 8]} />
                <meshStandardMaterial color={k % 2 ? '#d7b06e' : '#a53b45'} roughness={0.5} />
              </mesh>
            );
          })}
          {[0, 1, 2].map(k => (
            <mesh key={`s${k}`} position={[k * 0.1 - 0.1, 1.9 + k * 0.2, 0]} rotation={[0, 0, 0.4]}>
              <cylinderGeometry args={[0.012, 0.018, 0.7, 6]} />
              <meshStandardMaterial color="#4f6c36" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 悬挂 silk + 灯笼 */}
      {[[-5.2, 5.0], [5.2, 5.0], [-5.2, 12.0], [5.2, 12.0]].map(([x, z], i) => (
        <HangingSilk key={i} x={x} z={z} />
      ))}
      {[[-4.2, 8.0], [4.2, 8.0]].map(([x, z], i) => (
        <group key={i} position={[x, 4.4, z]}>
          <mesh>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshBasicMaterial color="#ffdca0" />
          </mesh>
          <pointLight color="#ffc477" intensity={0.75} distance={4.5} decay={2} />
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
            <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* 蜡烛 */}
      {[[-6.2, 4.2], [6.2, 4.2], [-6.2, 13.4], [6.2, 13.4]].map(([x, z], i) => (
        <Candle key={i} position={[x, 0.82, z]} delay={i * 1.7} />
      ))}

      {/* 莲花池：右侧地面浅池，金边 + 漂浮莲 */}
      <group position={[4.3, 0.02, 13.0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[2.8, 2.1]} />
          <meshPhysicalMaterial color="#1f3d3b" metalness={0.2} roughness={0.18} clearcoat={1} clearcoatRoughness={0.2} />
        </mesh>
        {[-1.28, 1.28].map((x, i) => (
          <mesh key={i} position={[x, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.08, 0.08, 2.1]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.28} />
          </mesh>
        ))}
        {[-0.85, 0.85].map((z, i) => (
          <mesh key={i} position={[0, 0.03, z]}>
            <boxGeometry args={[2.8, 0.08, 0.08]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.28} />
          </mesh>
        ))}
        {[[-0.55, 0.2], [0.6, -0.3], [0.2, 0.5]].map(([x, z], i) => (
          <group key={i} position={[x, 0.06, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.16, 10]} />
              <meshStandardMaterial color="#3d8a68" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#f0d7ad" roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

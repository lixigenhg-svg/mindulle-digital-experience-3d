/**
 * Exterior.tsx —— 殿外庭院与山林背景（纯程序化，零外部模型）
 *
 * 不改变殿内活动边界（BOUNDS=9），只在殿周补充：石板/草地庭院、院墙、
 * 松树 / 枫树 / 竹林、景石、石灯笼、远山层次。从侧窗与入口门望出去时可见。
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { store } from '../store';

const STONE = new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 0.95 });
const WALL_MAT = new THREE.MeshStandardMaterial({ color: 0xb7a98f, roughness: 0.95 });
const ROOF_RIB_SUB = new THREE.MeshStandardMaterial({ color: 0x333839, roughness: 0.95 });
const ROOF_EDGE = new THREE.MeshStandardMaterial({ color: 0x3a322a, roughness: 0.9 });
const TRUNK = new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.9 });
const WOOD_RED = new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.88 });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 });
const PINE = new THREE.MeshStandardMaterial({ color: 0x2f4a34, roughness: 0.85 });
const MAPLE = new THREE.MeshStandardMaterial({ color: 0x9a4a2e, roughness: 0.85 });
const BAMBOO = new THREE.MeshStandardMaterial({ color: 0x5e7a44, roughness: 0.8 });
/* 枫林主色：深枫红、柿橙、赭黄和旧金 */
const AUTUMN = [0x9e3d32, 0xb85a32, 0xc9803d, 0xd49b45, 0x935137, 0xc6a458].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }),
);
const LEAF_SOIL = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 1 });
const BENCH_WOOD = new THREE.MeshStandardMaterial({ color: 0x5a3c26, roughness: 0.85 });
const LATTICE = new THREE.MeshStandardMaterial({ color: 0x2c1d13, roughness: 0.9 });
const PINK_PETAL = new THREE.MeshStandardMaterial({ color: 0xf3b7ad, roughness: 0.7, emissive: 0xff8a70, emissiveIntensity: 0.18 });

/* ---------- 木长椅（原项目沿石道两侧成排） ---------- */
function Bench({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow material={BENCH_WOOD}>
        <boxGeometry args={[1.7, 0.08, 0.64]} />
      </mesh>
      {[-0.75, 0.75].map(dx => [-0.24, 0.24].map(dz => (
        <mesh key={`${dx}${dz}`} position={[dx, 0.11, dz]} castShadow material={WOOD_DARK}>
          <boxGeometry args={[0.09, 0.22, 0.14]} />
        </mesh>
      )))}
      <mesh position={[0, 0.52, 0.28]} rotation-x={0.14} castShadow material={BENCH_WOOD}>
        <boxGeometry args={[1.7, 0.08, 0.14]} />
      </mesh>
    </group>
  );
}

/* ---------- 같은 자리 카페（CAFE25） ---------- */
function CafeKiosk({ x, z }: { x: number; z: number }) {
  const sign = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1d1410'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#efe6d4'; g.font = 'bold 62px serif'; g.textAlign = 'center';
    g.fillText('CAFE25', 256, 106);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }, []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow material={LATTICE}>
        <boxGeometry args={[5.2, 2.7, 3.4]} />
      </mesh>
      <mesh position={[0, 2.86, 0]} castShadow material={ROOF_EDGE}>
        <boxGeometry args={[6.0, 0.22, 4.1]} />
      </mesh>
      {[-1, 1].map(sg => (
        <mesh key={sg} position={[0, 3.1, sg * 1.1]} rotation-x={-sg * 0.3} castShadow material={ROOF_EDGE}>
          <boxGeometry args={[6.2, 0.12, 2.4]} />
        </mesh>
      ))}
      {/* 柜台窗口 */}
      <mesh position={[-1.0, 1.5, 1.72]} material={new THREE.MeshStandardMaterial({ color: 0x120d0a, roughness: 0.5, metalness: 0.2 })}>
        <boxGeometry args={[2.6, 1.1, 0.06]} />
      </mesh>
      {/* 招牌 */}
      <mesh position={[0, 2.3, 1.74]}>
        <boxGeometry args={[2.6, 0.55, 0.04]} />
        <meshBasicMaterial map={sign} />
      </mesh>
    </group>
  );
}

/* ---------- 莲花灯笼串（原项目山门内侧，粉莲一排排挂着） ---------- */
function LotusLanternString({ z, y = 3.9, span = 6.4, count = 7 }: { z: number; y?: number; span?: number; count?: number }) {
  const xs = Array.from({ length: count }, (_, i) => -span + (2 * span * i) / (count - 1));
  return (
    <group position={[0, 0, z]}>
      {[-span - 0.4, span + 0.4].map(x => (
        <mesh key={x} position={[x, y / 2, 0]} castShadow material={WOOD_DARK}>
          <cylinderGeometry args={[0.07, 0.09, y, 8]} />
        </mesh>
      ))}
      <mesh position={[0, y, 0]} material={WOOD_DARK}>
        <boxGeometry args={[span * 2 + 0.8, 0.04, 0.04]} />
      </mesh>
      {xs.map(x => (
        <group key={x} position={[x, y, 0]}>
          <mesh position={[0, -0.18, 0]} material={WOOD_DARK}>
            <cylinderGeometry args={[0.008, 0.008, 0.36, 5]} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => {
            const a = (k / 6) * Math.PI * 2;
            return (
              <mesh
                key={k}
                position={[Math.cos(a) * 0.17, -0.42, Math.sin(a) * 0.17]}
                rotation-z={Math.sin(a) * 0.5}
                material={PINK_PETAL}
                castShadow
              >
                <sphereGeometry args={[0.16, 10, 8]} />
              </mesh>
            );
          })}
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={0xffd9a8} emissive={0xffab63} emissiveIntensity={0.6} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* 程序化石板贴图：给地面加可辨识的石缝，人物走动时才有速度参照 */
function makeStoneTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#8b8274';
  g.fillRect(0, 0, S, S);
  // 石板格（2x2 块，错缝）
  const rnd = seeded(31);
  for (let ry = 0; ry < 2; ry++) {
    for (let rx = 0; rx < 2; rx++) {
      const ox = rx * 128 + (ry % 2) * 32;
      const v = 0.86 + rnd() * 0.24;
      g.fillStyle = `rgb(${Math.round(139 * v)},${Math.round(130 * v)},${Math.round(116 * v)})`;
      g.fillRect(ox % S, ry * 128, 124, 124);
      if (ox % S + 124 > S) g.fillRect((ox % S) - S, ry * 128, 124, 124);
      // 石面细颗粒
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(60,55,46,${0.05 + rnd() * 0.06})`;
        g.fillRect(ox % S + rnd() * 120, ry * 128 + rnd() * 120, 2, 2);
      }
    }
  }
  // 石缝
  g.strokeStyle = 'rgba(48,44,37,0.55)';
  g.lineWidth = 3;
  for (let i = 0; i <= S; i += 128) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke();
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

/* 固定伪随机，保证每次渲染布局一致，不抖动 */
function seeded(seed: number) {
  let s = THREE.MathUtils.euclideanModulo(seed, 233280);
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}


/* ---------- 枫叶纹理：白色五裂叶形，材质用 color 上色 ---------- */
let leafTex: THREE.CanvasTexture | null = null;
function getLeafTex() {
  if (leafTex) return leafTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  const drawLeaf = (cx: number, cy: number, r: number, rot: number, shade: string) => {
    g.fillStyle = shade;
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 40) {
      const lobe = Math.abs(Math.cos(2.5 * a)) ** 0.7;
      const rr = r * (0.42 + 0.58 * lobe);
      const x = cx + Math.cos(a + rot) * rr;
      const y = cy + Math.sin(a + rot) * rr * 0.92;
      if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
  };
  drawLeaf(66, 62, 56, 0.2, '#ffffff');
  drawLeaf(48, 78, 42, -0.5, '#e8e8e8');
  drawLeaf(84, 80, 38, 0.9, '#f2f2f2');
  leafTex = new THREE.CanvasTexture(c);
  leafTex.anisotropy = 8;
  return leafTex;
}

/* ---------- 松树（三层圆锥） ---------- */

function Pine({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow material={TRUNK}>
        <cylinderGeometry args={[0.07, 0.12, 1.8, 8]} />
      </mesh>
      {[
        { y: 2.0, r: 0.95, h: 1.8 },
        { y: 3.1, r: 0.72, h: 1.5 },
        { y: 4.0, r: 0.52, h: 1.2 },
        { y: 4.75, r: 0.32, h: 0.9 },
      ].map((c, i) => (
        <mesh key={i} position={[0, c.y, 0]} castShadow material={PINE}>
          <coneGeometry args={[c.r, c.h, 9]} />
        </mesh>
      ))}
    </group>
  );
}

/* 枫叶轮廓：五裂叶形，用 Shape 直接生成，叶尖带锯齿感 */
let MAPLE_LEAF_GEO: THREE.ShapeGeometry | null = null;
function mapleLeafGeo() {
  if (MAPLE_LEAF_GEO) return MAPLE_LEAF_GEO;
  const shape = new THREE.Shape();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const lobe = Math.max(0, Math.cos(5 * a));
    const wob = 0.06 * Math.cos(17 * a); // 边缘碎齿
    const r = 0.16 + 0.34 * Math.pow(lobe, 0.75) + wob * lobe;
    const x = Math.sin(a) * r * 1.02;
    const y = Math.cos(a) * r * 1.22 - 0.02;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  MAPLE_LEAF_GEO = new THREE.ShapeGeometry(shape, 6);
  MAPLE_LEAF_GEO.center();
  return MAPLE_LEAF_GEO;
}

/* ---------- 枫树（橙红球冠） ---------- */

const MAPLE_LEAVES = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.95 });

function Maple({ position, scale = 1, mat = MAPLE }: { position: [number, number, number]; scale?: number; mat?: THREE.MeshStandardMaterial }) {
  const skin = useMemo(() => {
    // 树冠骨架：几层小枝
    return [
      { p: [0, 2.45, 0], r: 0.44 },
      { p: [0.48, 2.95, 0.2], r: 0.36 },
      { p: [-0.44, 2.85, -0.2], r: 0.34 },
      { p: [0, 3.45, 0], r: 0.32 },
    ];
  }, []);
  // 叶卡实例：沿树冠椭球面撒开，朝向随机
  const inst = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!inst.current) return;
    const rnd = seeded(31 + Math.round(position[0] * 13 + position[2] * 7));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const N = 190;
    const leafColor = new THREE.Color();
    const tint = seeded(947 + Math.round(position[0] * 11 + position[2] * 17));
    for (let i = 0; i < N; i++) {
      const u = rnd() * Math.PI * 2;
      const z = rnd() * 2 - 1;
      const rr = Math.sqrt(1 - z * z);
      const lobe = 1 + 0.16 * Math.cos(u * 3 + position[2]);
      const rad = (0.55 + rnd() * 0.56) * lobe;
      v.set(Math.cos(u) * rr * rad * 1.29, 2.95 + z * 0.95, Math.sin(u) * rr * rad * 1.16);
      e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      q.setFromEuler(e);
      const sc = 0.46 + rnd() * 0.34;
      m.compose(v, q, new THREE.Vector3(sc, sc, sc));
      inst.current.setMatrixAt(i, m);
      leafColor.copy(mat.color).offsetHSL((tint() - 0.5) * 0.055, (tint() - 0.5) * 0.15, (tint() - 0.5) * 0.21);
      inst.current.setColorAt(i, leafColor);
    }
    inst.current.instanceMatrix.needsUpdate = true;
    if (inst.current.instanceColor) inst.current.instanceColor.needsUpdate = true;
    inst.current.computeBoundingSphere();
  }, [mat, position]);

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.0, 0]} castShadow material={TRUNK}>
        <cylinderGeometry args={[0.08, 0.14, 2.0, 7]} />
      </mesh>
      <mesh position={[0.18, 1.95, 0.1]} rotation-z={-0.4} castShadow material={TRUNK}>
        <cylinderGeometry args={[0.05, 0.07, 0.9, 6]} />
      </mesh>
      <mesh position={[-0.16, 2.0, -0.08]} rotation-z={0.36} castShadow material={TRUNK}>
        <cylinderGeometry args={[0.05, 0.07, 0.85, 6]} />
      </mesh>
      {/* 内部实心核，避免从下往上看穿 */}
      {skin.map((b, i) => (
        <mesh key={i} position={b.p as [number, number, number]} material={mat} scale={[1, 0.8, 1]}>
          <icosahedronGeometry args={[b.r, 1]} />
        </mesh>
      ))}
      <instancedMesh ref={inst} args={[mapleLeafGeo(), MAPLE_LEAVES, 190]} castShadow />
    </group>
  );
}

/* ---------- 竹林 ---------- */

function BambooGroove({ x, z, count = 7 }: { x: number; z: number; count?: number }) {
  const rnd = useMemo(() => {
    const r = seeded(42);
    return Array.from({ length: count }, () => ({
      dx: (r() - 0.5) * 2.4,
      dz: (r() - 0.5) * 2.4,
      h: 2.6 + r() * 1.6,
      s: 0.8 + r() * 0.5,
    }));
  }, [count]);
  return (
    <group position={[x, 0, z]}>
      {rnd.map((b, i) => (
        <group key={i} position={[b.dx, 0, b.dz]} scale={b.s}>
          <mesh position={[0, b.h / 2, 0]} castShadow material={BAMBOO}>
            <cylinderGeometry args={[0.035, 0.045, b.h, 6]} />
          </mesh>
          <mesh position={[0, b.h, 0]} material={BAMBOO}>
            <sphereGeometry args={[0.18, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 景石 ---------- */

function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow material={STONE}>
      <dodecahedronGeometry args={[0.4, 0]} />
    </mesh>
  );
}

/* ---------- 殿前多层石塔（탑돌이 绕塔对象） ---------- */

const PAGODA_WOOD = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.85 });
const PAGODA_ROOF = new THREE.MeshStandardMaterial({ color: 0x3a3f3a, roughness: 0.9 });

function Pagoda({ position }: { position: [number, number, number] }) {
  const tiers = [
    { y: 0.5, w: 1.1, h: 0.58 },
    { y: 1.3, w: 0.86, h: 0.5 },
    { y: 2.0, w: 0.64, h: 0.44 },
  ];
  return (
    <group position={position}>
      {/* 基座 */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow material={STONE}>
        <boxGeometry args={[1.9, 0.36, 1.9]} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y, 0]} castShadow material={PAGODA_WOOD}>
            <boxGeometry args={[t.w, t.h, t.w]} />
          </mesh>
          {/* 挑檐 */}
          <mesh position={[0, t.y + t.h / 2 + 0.06, 0]} castShadow material={PAGODA_ROOF}>
            <boxGeometry args={[t.w + 0.62, 0.1, t.w + 0.62]} />
          </mesh>
        </group>
      ))}
      {/* 塔刹 */}
      <mesh position={[0, 3.2, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.6, roughness: 0.4 })}>
        <cylinderGeometry args={[0.05, 0.08, 0.7, 8]} />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={0xd9b45c} emissive={0xc99a3a} emissiveIntensity={0.3} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ---------- 石灯笼 ---------- */

function StoneLantern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]} castShadow material={STONE}>
        <boxGeometry args={[0.5, 0.24, 0.5]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow material={STONE}>
        <cylinderGeometry args={[0.12, 0.16, 0.8, 8]} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow material={STONE}>
        <boxGeometry args={[0.4, 0.34, 0.4]} />
      </mesh>
      <mesh position={[0, 1.36, 0]} castShadow material={ROOF_EDGE}>
        <coneGeometry args={[0.36, 0.28, 4]} />
      </mesh>
      <mesh position={[0, 1.1, 0.21]}>
        <boxGeometry args={[0.16, 0.18, 0.02]} />
        <meshStandardMaterial color={0xffd9a0} emissive={0xffb45c} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ---------- 院墙 ---------- */

function Wall({ position, rotationY, width, height = 2.2 }: { position: [number, number, number]; rotationY: number; width: number; height?: number }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={WALL_MAT}>
        <boxGeometry args={[width, height, 0.4]} />
      </mesh>
      {/* 墙基 */}
      <mesh position={[0, 0.22, 0]} receiveShadow material={STONE}>
        <boxGeometry args={[width + 0.1, 0.44, 0.52]} />
      </mesh>
      {/* 压顶瓦脊 */}
      <mesh position={[0, height + 0.06, 0]} castShadow material={ROOF_EDGE}>
        <boxGeometry args={[width + 0.3, 0.18, 0.6]} />
      </mesh>
      <mesh position={[0, height + 0.2, 0]} castShadow material={ROOF_EDGE}>
        <boxGeometry args={[width + 0.5, 0.1, 0.78]} />
      </mesh>
    </group>
  );
}


/* ---------- 殿前月台与石阶 ---------- */

function Forecourt() {
  const STONE_TILE = new THREE.MeshStandardMaterial({ color: 0x7d7364, roughness: 0.92 });
  return (
    <group>
      {/* 门前月台 */}
      <mesh position={[0, 0.05, 30.4]} receiveShadow material={STONE_TILE}>
        <boxGeometry args={[14, 0.1, 4.2]} />
      </mesh>
      {/* 三级石阶 */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, -0.06 - i * 0.09, 32.7 + i * 0.55]} receiveShadow material={STONE_TILE}>
          <boxGeometry args={[10 - i * 0.6, 0.18, 0.6]} />
        </mesh>
      ))}
      {/* 月台边石 */}
      <mesh position={[0, 0.1, 32.5]} material={ROOF_EDGE}>
        <boxGeometry args={[14.2, 0.08, 0.24]} />
      </mesh>
    </group>
  );
}

/* ---------- 石板朝圣道 ---------- */

function StonePath() {
  const tex = useMemo(() => {
    const t = makeStoneTexture();
    t.repeat.set(1.2, 0.55);
    return t;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x6c665a,
        map: tex,
        roughness: 0.98,
        // 与庭院地面拉开深度，避免远处出现摩尔纹/水面般的波动
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
      }),
    [tex],
  );
  const slabs = Array.from({ length: 20 }, (_, i) => 33.4 + i * 0.9);
  // 垫底色：石板之间 2cm 的缝原本露出更亮的庭院地面，走动时会形成细亮线（像水面波动）。
  // 这里在石板下方 6mm 铺一条深色垫底，缝隙看起来就是暗色石缝，不再闪烁。
  const backingMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x4e4941, roughness: 1 }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.006, 41.95]} rotation-x={-Math.PI / 2} receiveShadow material={backingMat}>
        <planeGeometry args={[4.6, 18.0]} />
      </mesh>
      {slabs.map(z => (
        <mesh key={z} position={[0, 0.012, z]} rotation-x={-Math.PI / 2} receiveShadow material={mat}>
          <planeGeometry args={[4.6, 0.88]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 石栏杆 ---------- */

function Railing({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const posts = [];
  for (let z = z0; z <= z1; z += 3) posts.push(z);
  return (
    <group>
      {posts.map(z => (
        <group key={z} position={[x, 0, z]}>
          <mesh position={[0, 0.34, 0]} castShadow material={STONE}>
            <boxGeometry args={[0.26, 0.68, 0.26]} />
          </mesh>
          <mesh position={[0, 0.72, 0]} material={STONE}>
            <sphereGeometry args={[0.16, 10, 8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[x, 0.5, (z0 + z1) / 2]} castShadow material={STONE}>
        <boxGeometry args={[0.16, 0.16, z1 - z0]} />
      </mesh>
    </group>
  );
}

/* ---------- 山门（一柱门） ---------- */

function MountainGate({ z }: { z: number }) {
  const gable = new THREE.MeshStandardMaterial({ color: 0x59605a, roughness: 0.9 });
  const plaque = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.7 });
  const gateSign = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 240;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 900, 240);
    g.fillStyle = '#e9cf92';
    g.font = 'bold 108px "Noto Serif KR", "Malgun Gothic", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('민들레 안심당', 450, 128);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }, []);
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.5 });
  return (
    <group position={[0, 0, z]}>
      {[-3.6, 3.6].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.16, 0]} castShadow receiveShadow material={STONE}>
            <cylinderGeometry args={[0.42, 0.48, 0.32, 12]} />
          </mesh>
          <mesh position={[0, 2.15, 0]} castShadow material={WOOD_RED}>
            <cylinderGeometry args={[0.22, 0.26, 3.9, 12]} />
          </mesh>
        </group>
      ))}
      {/* 额枋 */}
      <mesh position={[0, 4.06, 0]} castShadow material={WOOD_RED}>
        <boxGeometry args={[8.6, 0.3, 0.42]} />
      </mesh>
      {/* 斗拱 */}
      {[-2.6, -1.3, 0, 1.3, 2.6].map(x => (
        <mesh key={x} position={[x, 4.32, 0]} castShadow material={WOOD_RED}>
          <boxGeometry args={[0.3, 0.28, 0.6]} />
        </mesh>
      ))}
      {/* 两坡屋面（外高内低） */}
      {[-1, 1].map(sign => (
        <mesh key={sign} position={[0, 4.78, sign * 1.05]} rotation-x={-sign * 0.34} castShadow material={gable}>
          <boxGeometry args={[9.6, 0.18, 2.55]} />
        </mesh>
      ))}
      {/* 瓦垄线条（顺坡），让山门屋顶也是一片片瓦，而不是一块平板 */}
      {[-1, 1].map(sign =>
        [-3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9].map(x => (
          <mesh key={`${sign}-${x}`} position={[x, 4.9, sign * 1.05]} rotation-x={-sign * 0.34} material={ROOF_RIB_SUB}>
            <boxGeometry args={[0.08, 0.1, 2.55]} />
          </mesh>
        ))
      )}
      <mesh position={[0, 5.2, 0]} material={ROOF_EDGE}>
        <boxGeometry args={[10.1, 0.26, 0.42]} />
      </mesh>
      {/* 正脊 */}
      <mesh position={[0, 5.02, 0]} castShadow material={ROOF_EDGE}>
        <boxGeometry args={[10.2, 0.26, 0.5]} />
      </mesh>
      {/* 两侧檐口压条（让屋面有厚度，不像纸片） */}
      {[-1, 1].map(sign => (
        <mesh key={sign} position={[0, 4.6, sign * 2.28]} castShadow material={ROOF_EDGE}>
          <boxGeometry args={[9.8, 0.22, 0.34]} />
        </mesh>
      ))}
      {/* 匾额：민들레 안심당（蒲公英安心堂） */}
      <mesh position={[0, 3.66, 0.26]} material={plaque}>
        <boxGeometry args={[1.78, 0.56, 0.07]} />
      </mesh>
      <mesh position={[0, 3.66, 0.30]} material={gold}>
        <boxGeometry args={[1.86, 0.64, 0.03]} />
      </mesh>
      <mesh position={[0, 3.66, 0.32]} material={plaque}>
        <boxGeometry args={[1.68, 0.46, 0.03]} />
      </mesh>
      <mesh position={[0, 3.66, 0.345]}>
        <planeGeometry args={[1.6, 0.42]} />
        <meshBasicMaterial map={gateSign} transparent />
      </mesh>
    </group>
  );
}

/* ---------- 莲池 ---------- */

function LotusPond({ x, z }: { x: number; z: number }) {
  const water = new THREE.MeshStandardMaterial({ color: 0x27403c, roughness: 0.25, metalness: 0.35 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6b44, roughness: 0.8 });
  const flowers = [[-1.1, 0.6], [0.2, -0.9], [1.2, 0.5], [-0.3, 1.2], [0.9, 1.3]];
  return (
    <group position={[x, 0, z]}>
      {/* 池壁 */}
      <mesh position={[0, 0.1, 0]} receiveShadow material={STONE}>
        <cylinderGeometry args={[3.4, 3.5, 0.36, 28]} />
      </mesh>
      <mesh position={[0, 0.26, 0]} rotation-x={-Math.PI / 2} material={water}>
        <circleGeometry args={[3.1, 28]} />
      </mesh>
      {flowers.map(([fx, fz], i) => (
        <group key={i} position={[fx, 0.28, fz]}>
          <mesh rotation-x={-Math.PI / 2} material={leaf}>
            <circleGeometry args={[0.42, 10]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={new THREE.MeshStandardMaterial({ color: 0xd98cae, roughness: 0.7 })}>
            <sphereGeometry args={[0.14, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- 幢幡 ---------- */

function BannerPole({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.2, 0]} castShadow material={WOOD_DARK}>
        <cylinderGeometry args={[0.07, 0.09, 4.4, 8]} />
      </mesh>
      <mesh position={[0, 4.45, 0]} material={STONE}>
        <sphereGeometry args={[0.12, 8, 6]} />
      </mesh>
      <mesh position={[0.35, 3.2, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: 0xb4442f, roughness: 0.85, side: THREE.DoubleSide })}>
        <planeGeometry args={[0.7, 2.4]} />
      </mesh>
    </group>
  );
}

/* ---------- 远山 ---------- */

function MountainRidge({ z, height, seed, color }: { z: number; height: number; seed: number; color: number }) {
  const profile = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-100, -3);
    for (let x = -100; x <= 100; x += 2) {
      const broad = 0.49 + 0.20 * Math.sin(x * 0.09 + seed) + 0.15 * Math.cos(x * 0.17 - seed);
      const detail = 0.06 * Math.sin(x * 0.32 + seed) + 0.025 * Math.cos(x * 0.72);
      shape.lineTo(x, height * (broad + detail));
    }
    shape.lineTo(100, -3);
    shape.closePath();
    return shape;
  }, [height, seed]);
  return (
    <mesh position={[0, 0, z]}>
      <shapeGeometry args={[profile]} />
      <meshBasicMaterial color={color} side={THREE.DoubleSide} toneMapped={false} fog={false} />
    </mesh>
  );
}

/** 塑像塔位置与绕塔半径（供本地玩家巡游路径读取） */
export const PAGODA_POS: [number, number] = [-8.8, 47.6];

/* ── 供玩家碰撞用的庭院障碍（世界坐标 AABB，半宽 hx/hz）──
   石灯笼、木长椅、莲池、幢幡柱、山门外石灯、石塔都在这里；树在生成后单独登记。 */
const lampSpots: { x: number; z: number }[] = [
  { x: -5.4, z: 34.2 }, { x: 5.4, z: 34.2 },
  { x: -4.3, z: 34.5 }, { x: 4.3, z: 34.5 },
  { x: -4.3, z: 39.5 }, { x: 4.3, z: 39.5 },
  { x: -4.3, z: 44.5 }, { x: 4.3, z: 44.5 },
  { x: -4.3, z: 49.5 }, { x: 4.3, z: 49.5 },
  { x: -6.2, z: 56.5 }, { x: 6.2, z: 56.5 },
];
const benchSpots: { x: number; z: number }[] = [
  { x: -7.2, z: 37.5 }, { x: -7.2, z: 41.5 },
  { x: 7.2, z: 37.5 }, { x: 7.2, z: 41.5 },
  { x: -7.4, z: 43.0 }, { x: 8.6, z: 46.5 },
];

export type BoxObstacle = { x: number; z: number; hx: number; hz: number };

export const exteriorObstacles: BoxObstacle[] = [
  ...lampSpots.map((p) => ({ x: p.x, z: p.z, hx: 0.30, hz: 0.30 })),
  ...benchSpots.map((p) => ({ x: p.x, z: p.z, hx: 0.30, hz: 0.95, bench: true })),
  { x: -11.2, z: 38.5, hx: 2.30, hz: 2.30 },  // 莲池（左）
  { x: 10.4, z: 48.4, hx: 2.20, hz: 2.20 },    // 莲池（右）
  { x: -5.4, z: 40.5, hx: 0.22, hz: 0.22 },    // 幢幡柱
  { x: 5.4, z: 40.5, hx: 0.22, hz: 0.22 },
  { x: PAGODA_POS[0], z: PAGODA_POS[1], hx: 1.55, hz: 1.55 }, // 殿前石塔
];

/** 树干碰撞：树在 렌더 时生成，坐标登记到这里供玩家绕行 */
export const treeObstacles: BoxObstacle[] = [];
export const PAGODA_RADIUS = 2.8;

/* ---------- 灯光（라이트 걸기）：殿前檐下一排挂钩，逐盏点亮 ---------- */

const WISH_COUNT = 12;

function nameTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  // 木牌底：深棕木色，带浅木纹
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, '#5d3a1c');
  grd.addColorStop(0.45, '#4a2d14');
  grd.addColorStop(1, '#3d2410');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = 'rgba(255,222,170,0.10)';
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo(0, 16 + i * 13);
    g.lineTo(512, 11 + i * 13);
    g.stroke();
  }
  // 金色细边
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 5;
  g.strokeRect(4, 4, 504, 120);
  g.fillStyle = '#f7e8c6';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const cut = text.length > 8 ? text.slice(0, 8) + '…' : text;
  let size = 44;
  g.font = `600 ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;
  while (size > 20 && g.measureText(cut).width > 470) {
    size -= 4;
    g.font = `600 ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;
  }
  g.fillText(cut, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function LanternNamePlate({ text }: { text: string }) {
  const tex = useMemo(() => nameTexture(text), [text]);
  return (
    <sprite position={[0, 2.075, 0]} scale={[0.62, 0.155, 1]} renderOrder={2}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function WishLanterns() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const wishes = store.hud.wishes;
  const lampNames = store.hud.lampNames ?? [];
  return (
    <group>
      {/* 灯架横梁：把整排灯笼挂在同一根梁上，避免看起来悬空 */}
      <mesh position={[0, 3.06, 29.0]} castShadow>
        <boxGeometry args={[15.9, 0.09, 0.09]} />
        <meshStandardMaterial color="#6b4526" roughness={0.8} />
      </mesh>
      <mesh position={[-8.03, 1.53, 29.0]} castShadow>
        <boxGeometry args={[0.12, 3.06, 0.12]} />
        <meshStandardMaterial color="#6b4526" roughness={0.8} />
      </mesh>
      <mesh position={[8.03, 1.53, 29.0]} castShadow>
        <boxGeometry args={[0.12, 3.06, 0.12]} />
        <meshStandardMaterial color="#6b4526" roughness={0.8} />
      </mesh>
      {/* 梁下挂钩 */}
      {Array.from({ length: WISH_COUNT }, (_, i) => {
        const x = -7.6 + (i * 15.2) / (WISH_COUNT - 1);
        return (
          <mesh key={`hk${i}`} position={[x, 2.99, 29.0]}>
            <torusGeometry args={[0.05, 0.014, 6, 12]} />
            <meshStandardMaterial color="#b08a3c" roughness={0.6} metalness={0.4} />
          </mesh>
        );
      })}
      {Array.from({ length: WISH_COUNT }, (_, i) => {
        const x = -7.6 + (i * 15.2) / (WISH_COUNT - 1);
        const lit = i < wishes || i < lampNames.length;
        const label = lampNames[i] || '';
        return (
          <group key={i} position={[x, 0, 29.0]}>
            <mesh position={[0, 2.87, 0]} material={TRUNK}>
              <cylinderGeometry args={[0.018, 0.018, 0.40, 6]} />
            </mesh>
            {lit ? (
              <group position={[0, 2.5, 0]}>
                {/* 灯芯：中心亮源 */}
                <mesh>
                  <sphereGeometry args={[0.055, 10, 8]} />
                  <meshBasicMaterial color={0xffe0b0} toneMapped={false} />
                </mesh>
                {/* 纸罩：暖黄椭圆 */}
                <mesh scale={[1, 1.12, 1]} castShadow>
                  <sphereGeometry args={[0.185, 20, 14]} />
                  <meshStandardMaterial
                    color={0xfff3dd}
                    emissive={0xffb058}
                    emissiveIntensity={0.8}
                    roughness={0.6}
                    transparent
                    opacity={0.96}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {/* 竖骨 6 根 */}
                {Array.from({ length: 6 }, (_, k) => {
                  const a = (k / 6) * Math.PI * 2;
                  return (
                    <mesh key={`rb${k}`} position={[Math.cos(a) * 0.176, 0, Math.sin(a) * 0.176]}>
                      <cylinderGeometry args={[0.007, 0.007, 0.34, 5]} />
                      <meshStandardMaterial color={0xc79a5c} roughness={0.75} />
                    </mesh>
                  );
                })}
                {/* 上木盖 */}
                <mesh position={[0, 0.205, 0]}>
                  <cylinderGeometry args={[0.115, 0.115, 0.032, 16]} />
                  <meshStandardMaterial color={0x3f2611} roughness={0.78} />
                </mesh>
                {/* 下木盖 */}
                <mesh position={[0, -0.2, 0]}>
                  <cylinderGeometry args={[0.095, 0.095, 0.03, 16]} />
                  <meshStandardMaterial color={0x3f2611} roughness={0.78} />
                </mesh>
                {/* 底部垂穗 */}
                <mesh position={[0, -0.245, 0]}>
                  <cylinderGeometry args={[0.012, 0.05, 0.07, 10]} />
                  <meshStandardMaterial color={0xb08a3c} metalness={0.5} roughness={0.5} />
                </mesh>
              </group>
            ) : (
              <group position={[0, 2.5, 0]}>
                {/* 未点亮：同款纸灯笼，只是纸面没有光 */}
                <mesh scale={[1, 1.12, 1]}>
                  <sphereGeometry args={[0.185, 20, 14]} />
                  <meshStandardMaterial
                    color={0xe6d9c4}
                    roughness={0.9}
                    transparent
                    opacity={0.92}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh position={[0, 0.205, 0]}>
                  <cylinderGeometry args={[0.115, 0.115, 0.032, 16]} />
                  <meshStandardMaterial color={0x3f2611} roughness={0.78} />
                </mesh>
                <mesh position={[0, -0.2, 0]}>
                  <cylinderGeometry args={[0.095, 0.095, 0.03, 16]} />
                  <meshStandardMaterial color={0x3f2611} roughness={0.78} />
                </mesh>
              </group>
            )}
            {lit && label ? <LanternNamePlate text={label} /> : null}
          </group>
        );
      })}
    </group>
  );
}

export default function Exterior() {
  const stoneTex = useMemo(() => {
    const t = makeStoneTexture();
    t.repeat.set(11, 8);
    return t;
  }, []);
  const stoneTex2 = useMemo(() => {
    // 大尺度柔和石面：只做极淡的深浅斑块，不画细格线，远处不会出现波纹
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#8a8172'; g.fillRect(0, 0, 256, 256);
    const rnd = seeded(51);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 256, y = rnd() * 256, rad = 26 + rnd() * 54;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const light = rnd() > 0.5;
      gr.addColorStop(0, light ? 'rgba(255,246,228,0.10)' : 'rgba(60,50,38,0.10)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.6, 0.8);
    t.anisotropy = 16;
    return t;
  }, []);
  const trees = useMemo(() => {
    const r = seeded(7);
    const list: { kind: 'pine' | 'maple'; x: number; z: number; s: number; c: number }[] = [];
    // 石道两侧成排的枫树（原项目最显眼的前景，红橙金三色交替）
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        list.push({ kind: 'maple', x: side * (6.6 + (i % 2) * 2.2), z: 33.2 + i * 3.4, s: 0.98 + (i % 3) * 0.1, c: (i + (side > 0 ? 2 : 0)) % 6 });
      }
    }
    // 外侧第二层林带
    for (let i = 0; i < 5; i++) {
      for (const side of [-1, 1]) {
        list.push({ kind: 'maple', x: side * (13.2 + (i % 2) * 2.0), z: 32.8 + i * 4.2, s: 1.0 + (i % 2) * 0.16, c: (i + 3) % 6 });
      }
    }
    // 山门内侧只留最外侧一棵，别挡住左侧石塔
    // 左右院外
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      list.push({
        kind: r() > 0.45 ? 'pine' : 'maple',
        x: side * (18.6 + r() * 6),
        z: -12 + r() * 42,
        s: 0.8 + r() * 0.7,
        c: Math.floor(r() * 6),
      });
    }
    // 前方院外
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      list.push({
        kind: r() > 0.5 ? 'pine' : 'maple',
        x: side * (9.5 + r() * 12),
        z: 34.5 + r() * 5,
        s: 0.8 + r() * 0.6,
        c: Math.floor(r() * 6),
      });
    }
    // 山门外的入口前林带：出山门后两侧原本空旷，补一排对称的枫松，
    // 让人从殿里走出来时前面是一条林间古道，而不是一片空地
    const gateRow: { kind: 'pine' | 'maple'; x: number; z: number; s: number; c: number }[] = [
      { kind: 'maple', x: -6.4, z: 53.2, s: 1.0, c: 0 },
      { kind: 'maple', x: 6.6, z: 53.4, s: 0.96, c: 3 },
      { kind: 'pine', x: -9.9, z: 56.0, s: 0.9, c: 0 },
      { kind: 'pine', x: 10.1, z: 56.2, s: 0.94, c: 0 },
      { kind: 'maple', x: -13.6, z: 58.6, s: 1.06, c: 1 },
      { kind: 'maple', x: 13.9, z: 58.3, s: 1.02, c: 4 },
    ];
    list.push(...gateRow);
    // 更远一道背景林带：朝山门外望时，视线尽头是一排林子而不是空地平线
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        list.push({
          kind: i % 2 === 0 ? 'pine' : 'maple',
          x: side * (4.6 + i * 4.1),
          z: 59.6 + (i % 2) * 1.6,
          s: 1.15 + (i % 3) * 0.14,
          c: (i + 2) % 6,
        });
      }
    }

    // 登记树干碰撞（只挡树干，不挡树冠，人可以从树冠下走过）
    treeObstacles.length = 0;
    for (const t of list) {
      treeObstacles.push({ x: t.x, z: t.z, hx: 0.24 * t.s, hz: 0.24 * t.s });
    }
    return list;
  }, []);

  const rocks = useMemo(() => {
    const r = seeded(19);
    return Array.from({ length: 10 }, () => ({
      x: (r() > 0.5 ? 1 : -1) * (17.5 + r() * 5),
      z: -11 + r() * 40,
      s: 0.5 + r() * 0.8,
    }));
  }, []);

  return (
    <group>
      {/* 庭院补光：太阳主光在殿内，穿门望出去不至于全黑 */}
      <hemisphereLight args={[0xcfe6f7, 0x8d7a54, 2.1]} position={[0, 12, 30]} />
      <directionalLight position={[-14, 22, 34]} intensity={1.5} color={0xfff2d2} castShadow={false} />
      <pointLight position={[0, 5.2, 32]} intensity={6.0} distance={30} color={0xffe6bd} />
      <pointLight position={[-9, 4.5, 34]} intensity={2.4} distance={18} color={0xffd9a0} />
      <pointLight position={[9, 4.5, 34]} intensity={2.4} distance={18} color={0xffd9a0} />
      <pointLight position={[0, 6.5, 45]} intensity={3.0} distance={20} color={0xffd9a0} />
      {/* 庭院地面（草地 + 石板底色，略低于殿内木地板避免 z-fighting） */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 20]} receiveShadow>
        <planeGeometry args={[200, 240]} />
        <meshStandardMaterial color={0xb2905f} roughness={1} />
      </mesh>

      {/* 院墙：左右 + 前后（后墙被殿内壁画遮挡，仅作外围封合） */}
      <Wall position={[-23.5, 0, 18]} rotationY={Math.PI / 2} width={68} />
      <Wall position={[23.5, 0, 18]} rotationY={Math.PI / 2} width={68} />
      <Wall position={[-16.5, 0, 51.6]} rotationY={0} width={26} height={1.15} />
      <Wall position={[16.5, 0, 51.6]} rotationY={0} width={26} height={1.15} />
      <Wall position={[0, 0, -15.5]} rotationY={0} width={40} />

      {/* 树木 */}
      {trees.map((t, i) =>
        t.kind === 'pine'
          ? <Pine key={i} position={[t.x, 0, t.z]} scale={t.s} />
          : <Maple key={i} position={[t.x, 0, t.z]} scale={t.s} mat={AUTUMN[t.c]} />
      )}

      {/* 从树林到地平线，山脊颜色逐层变浅。 */}
      <MountainRidge z={80} height={10} seed={2} color={0x76877c} />
      <MountainRidge z={98} height={16} seed={5} color={0x8fa5a4} />
      <MountainRidge z={117} height={23} seed={8} color={0xa7bec3} />

      {/* 山门外石灯笼：入口前一对，给空地一个落点 */}
      <StoneLantern x={-6.2} z={56.5} />
      <StoneLantern x={6.2} z={56.5} />

      {/* 竹林 */}
      <BambooGroove x={-17.9} z={-4} count={8} />
      <BambooGroove x={17.9} z={-6} count={8} />

      {/* 景石 */}
      {rocks.map((r, i) => <Rock key={i} position={[r.x, 0.15, r.z]} scale={r.s} />)}

      {/* 地面草丛：原项目是砂土 + 零星草簇，铺满才不像空场 */}
      {useMemo(() => {
        const r = seeded(23);
        return Array.from({ length: 56 }, () => {
          let x = (r() - 0.5) * 34;
          const z = 30 + r() * 29.5;
          if (Math.abs(x) < 3.4) x += Math.sign(x || 1) * 3.6;   // 让开石道
          return { x, z, s: 0.5 + r() * 0.6 };
        });
      }, []).map((g, i) => (
        <group key={i} position={[g.x, 0, g.z]} scale={g.s}>
          {[0, 1, 2, 3].map(k => (
            <mesh key={k} position={[(k - 1.5) * 0.07, 0.12, (k % 2) * 0.06]} rotation-z={((k % 3) - 1) * 0.35}>
              <coneGeometry args={[0.04, 0.28, 4]} />
              <meshStandardMaterial color={0x7b8a4a} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 门前石灯笼 */}
      <StoneLantern x={-5.4} z={34.2} />
      <StoneLantern x={5.4} z={34.2} />
      {/* 石道两侧的石灯笼（原项目是等距一排） */}
      {[34.5, 39.5, 44.5, 49.5].map(z => (
        <group key={z}>
          <StoneLantern x={-4.3} z={z} />
          <StoneLantern x={4.3} z={z} />
        </group>
      ))}
      {/* 木长椅 */}
      <Bench x={-7.2} z={37.5} rotY={-Math.PI / 2} />
      <Bench x={-7.2} z={41.5} rotY={-Math.PI / 2} />
      <Bench x={7.2} z={37.5} rotY={Math.PI / 2} />
      <Bench x={7.2} z={41.5} rotY={Math.PI / 2} />
      <Bench x={-7.4} z={43.0} rotY={-Math.PI / 2} />
      <Bench x={8.6} z={46.5} rotY={Math.PI / 2} />
      {/* 咖啡亭（CAFE25） */}
      <CafeKiosk x={16.0} z={47.6} />
      {/* 山门内侧的莲花灯笼串 */}
      <LotusLanternString z={44.4} />
      <LotusLanternString z={48.2} y={4.2} span={5.6} count={6} />

      {/* 殿前塑像塔 */}
      <Pagoda position={[PAGODA_POS[0], 0, PAGODA_POS[1]]} />

      {/* 许愿灯排 */}
      <WishLanterns />

      {/* 殿前月台 + 石阶 + 朝圣道 + 栏杆 */}
      {/* 山门外前院地面 */}
      <mesh position={[0, -0.02, 61]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[44, 22]} />
        <meshStandardMaterial map={stoneTex2} color={0x8a8172} roughness={0.95} />
      </mesh>
      {/* 出山门后的石板路 */}
      {[52.6, 54.2, 55.8, 57.4, 59.0, 60.6].map(z => (
        <mesh key={z} position={[0, 0.0, z]} rotation-x={-Math.PI / 2} receiveShadow material={STONE}>
          <planeGeometry args={[4.2, 1.1]} />
        </mesh>
      ))}
      {[-6.2, 6.2].map(x => (
        <group key={x} position={[x, 0, 56.5]}>
          <mesh position={[0, 0.18, 0]} castShadow material={STONE}>
            <cylinderGeometry args={[0.32, 0.38, 0.36, 10]} />
          </mesh>
          <mesh position={[0, 1.0, 0]} castShadow material={STONE}>
            <cylinderGeometry args={[0.16, 0.2, 1.2, 8]} />
          </mesh>
          <mesh position={[0, 1.72, 0]} castShadow>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <meshStandardMaterial color={0x9a8d77} emissive={0xffb562} emissiveIntensity={0.9} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.98, 0]} castShadow material={ROOF_EDGE}>
            <boxGeometry args={[0.66, 0.1, 0.66]} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 2.6, 57]} intensity={3.2} distance={16} color={0xffd9a0} />
      {/* 庭院铺地（青砖石台，覆盖殿门到山门之间） */}
      <mesh position={[0, 0.0, 34.6]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[13, 4.0]} />
        <meshStandardMaterial map={stoneTex} color={0x6f6a5f} roughness={0.98} />
      </mesh>
      <Forecourt />
      <StonePath />


      {/* 山门、莲池、幢幡 */}
      <MountainGate z={51.6} />
      <pointLight position={[0, 4.4, 50.4]} intensity={4.5} distance={14} color={0xffdca8} />
      <pointLight position={[0, 6.2, 51.0]} intensity={2.2} distance={12} color={0xffe2b8} />
      <LotusPond x={-11.2} z={38.5} />
      <LotusPond x={10.4} z={48.4} />
      <BannerPole x={-5.4} z={40.5} />
      <BannerPole x={5.4} z={40.5} />

      {/* 殿后远山 */}
      <MountainRidge z={-37} height={9} seed={1} color={0x758579} />
      <MountainRidge z={-53} height={17} seed={6} color={0x90a6a4} />
      <MountainRidge z={-72} height={24} seed={4} color={0xa7bec3} />
    </group>
  );
}

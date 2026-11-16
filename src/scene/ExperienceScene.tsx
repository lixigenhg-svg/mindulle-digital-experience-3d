/**
 * ExperienceScene.tsx —— 大殿静态场景
 *
 * 暖红木地板 / 壁画后墙 / 侧墙格窗与窗外秋枫 / 木柱与柱础 / 顶棚椽条 /
 * 香案（香炉·烛台·青瓷花瓶）/ 长香案与木鼓钵 / 塑像模型位 / 方形蒲团阵列 / 吊灯 / 灯光阴影。
 * 主塑像、协侍菩萨、小角色均为 GLTF 模型位：模型未到位时用占位体，不伪造高精度造像。
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { store } from '../store';
import { probeModel } from '../assets/probe';
import SculptAvatar from '../avatar/SculptAvatar';
import PhotoStatue from './PhotoStatue';
import MeshStatue from './MeshStatue';
import { PALETTES } from './StatueFigure';
import { CUSHION_ROWS, CUSHION_COLS, HALL_SCALE } from '../config';
import NpcCrowd from './NpcCrowd';
import TeaHouse from './TeaHouse';
import WishWall from './WishWall';
import Offerings from './Offerings';

/* ---------- GLTF 加载失败边界 ---------- */

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * 造像 GLTF 模型位。把正版模型放到 public/assets/models/ 下同名文件即自动启用；
 * 文件缺失 / 加载失败时降级到下方程序化造像，保证塑像位不空置。
 * 模型规格与动画约定见 public/assets/models/README.txt。
 */
export const STATUE_MODEL_URL = 'assets/models/statue.glb';

/** 中央主塑像用哪个：'scan' = 内置扫描模型（默认，可绕视）；'photo' = 上传的立像图方案 */
const CENTER_STATUE: 'scan' | 'photo' | 'mesh' = 'mesh';
/** 横三世塑像两侧：'model' = 你上传的立体造像；'photo' = 抠底立牌（旧方案，保留可切回） */
const TRINITY_STYLE: 'model' | 'photo' = 'model';
export const STATUE_MESH = {
  west: 'assets/models/statue-alt/west.glb',
  north: 'assets/models/statue-alt/north.glb',
  east: 'assets/models/statue-alt/east.glb',
};
export const BODHI_MODEL_URL = 'assets/models/bodhisattva.glb';

/* ---------- 共享材质 ---------- */

const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x2e2318, roughness: 0.9, metalness: 0 });
const WOOD_RED = new THREE.MeshStandardMaterial({ color: 0x5b3624, roughness: 0.65, metalness: 0 });
const ROOF_RIB = new THREE.MeshStandardMaterial({ color: 0x2b3031, roughness: 0.95, metalness: 0 });
const ROOF_EAVE = new THREE.MeshStandardMaterial({ color: 0x4d5455, roughness: 0.85, metalness: 0 });
const ROOF_TILE = (() => {
  // 瓦垄纹理：等距竖向亮/暗条，远看就是一片片瓦
  const c = document.createElement('canvas');
  c.width = 32; c.height = 8;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 32; i += 4) {
    g.fillStyle = '#3b4041'; g.fillRect(i, 0, 4, 8);
    g.fillStyle = '#2a2e2f'; g.fillRect(i + 3, 0, 1, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 1);
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ color: 0x4d5354, roughness: 0.92, metalness: 0, map: t });
})();
const WOOD_TABLE = new THREE.MeshStandardMaterial({ color: 0x3a2718, roughness: 0.55, metalness: 0 });
const STONE = new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 0.95, metalness: 0 });

/* ---------- 地板 ---------- */

function Floor() {
  const tex = useTexture('assets/tex/floor.jpg');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(11, 15);
  tex.anisotropy = 8;
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 8]} receiveShadow>
      <planeGeometry args={[34, 46]} />
      <meshStandardMaterial map={tex} roughness={0.5} metalness={0} color={0x9c8270} />
    </mesh>
  );
}

/* ---------- 壁画后墙 ---------- */

function BackWall() {
  const mural = useTexture('assets/tex/wall.jpg');
  return (
    <group>
      {/* 壁画主体 */}
      <mesh position={[0, 2.1, -10]}>
        <planeGeometry args={[22, 3.6]} />
        <meshStandardMaterial map={mural} roughness={0.88} metalness={0} color={0xac9a88} />
      </mesh>
      {/* 壁画上下木框 */}
      <mesh position={[0, 3.98, -9.96]} material={WOOD_RED}>
        <boxGeometry args={[22.4, 0.22, 0.2]} />
      </mesh>
      <mesh position={[0, 0.22, -9.96]} material={WOOD_RED}>
        <boxGeometry args={[22.4, 0.28, 0.24]} />
      </mesh>
      {/* 两侧墙板 */}
      <mesh position={[-13.4, 2, -10]} material={WOOD_DARK}>
        <planeGeometry args={[5, 4]} />
      </mesh>
      <mesh position={[13.4, 2, -10]} material={WOOD_DARK}>
        <planeGeometry args={[5, 4]} />
      </mesh>
    </group>
  );
}

/* ---------- 侧墙格窗 + 窗外秋枫 ---------- */

/** sign：-1 左墙，+1 右墙 */
function SideWindow({ sign }: { sign: number }) {
  const outside = useTexture('assets/tex/outside.jpg');
  const x = sign * 15.94;
  const rotY = sign > 0 ? -Math.PI / 2 : Math.PI / 2;

  // 格窗棂条
  const barsZ = Array.from({ length: 33 }, (_, i) => -21.1 + i * 1.3);
  const barsY = [1.35, 2.15, 2.95];

  return (
    <group position={[x, 0, 8]} rotation-y={rotY}>
      {/* 窗外秋枫（略靠外，避免与墙打架） */}
      <mesh position={[0, 2.1, -0.06]}>
        <planeGeometry args={[44, 3.4]} />
        <meshStandardMaterial map={outside} emissiveMap={outside} emissive={0xffffff} emissiveIntensity={0.45} roughness={1} />
      </mesh>
      {/* 窗洞上下的墙面留白 */}
      {barsY.map(y => (
        <mesh key={`h${y}`} position={[0, y, 0.02]} material={WOOD_RED}>
          <boxGeometry args={[44, 0.09, 0.12]} />
        </mesh>
      ))}
      {barsZ.map(z => (
        <mesh key={`v${z}`} position={[z, 2.1, 0.02]} material={WOOD_RED}>
          <boxGeometry args={[0.08, 3.4, 0.12]} />
        </mesh>
      ))}
      {/* 上下封边 */}
      <mesh position={[0, 3.92, 0.03]} material={WOOD_RED}>
        <boxGeometry args={[44, 0.24, 0.14]} />
      </mesh>
      <mesh position={[0, 0.3, 0.03]} material={WOOD_RED}>
        <boxGeometry args={[44, 0.6, 0.14]} />
      </mesh>
    </group>
  );
}

/* ---------- 木柱 + 柱础 ---------- */

function Pillars() {
  const xs = [-10.2, 10.2];
  const zs = [-9.4, -2.4, 4.6, 11.6, 18.6, 25.6];
  return (
    <group>
      {xs.map(x =>
        zs.map(z => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            {/* 石柱础 */}
            <mesh position={[0, 0.14, 0]} castShadow receiveShadow material={STONE}>
              <cylinderGeometry args={[0.44, 0.5, 0.28, 16]} />
            </mesh>
            {/* 柱身 */}
            <mesh position={[0, 2.1, 0]} castShadow receiveShadow material={WOOD_RED}>
              <cylinderGeometry args={[0.3, 0.34, 3.9, 16]} />
            </mesh>
            {/* 柱头托木 */}
            <mesh position={[0, 3.98, 0]} material={WOOD_RED}>
              <boxGeometry args={[0.95, 0.16, 0.95]} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

/* ---------- 顶棚 + 横梁 + 椽条 ---------- */

function Roof() {
  const rafters = Array.from({ length: 27 }, (_, i) => -16.2 + i * 1.25);
  return (
    <group>
      <mesh position={[0, 4.1, 8]} rotation-x={Math.PI / 2} material={WOOD_RED}>
        <planeGeometry args={[34, 46]} />
      </mesh>
      {/* 主横梁 */}
      {[-12.5, -8, -4, 0, 4, 8, 12, 16, 20, 24, 28].map(z => (
        <mesh key={z} position={[0, 3.88, z]} material={WOOD_RED}>
          <boxGeometry args={[34, 0.3, 0.34]} />
        </mesh>
      ))}
      {/* 椽条 */}
      {rafters.map(x => (
        <mesh key={x} position={[x, 4.0, 8]} material={WOOD_RED}>
          <boxGeometry args={[0.13, 0.13, 45]} />
        </mesh>
      ))}
      {/* 屋顶：两坡瓦面 + 檐口起翘 + 瓦垄线条 + 正脊（参考原项目屋脊轮廓） */}
      {[-1, 1].map(sign => {
        const mainAng = 0.205;          // 主坡
        const flareAng = 0.108;         // 檐口段（更平，形成反宇曲线）
        const mx = sign * 8.2, my = 5.9;
        const fx = sign * 17.5, fy = 4.22;
        return (
          <group key={sign}>
            <mesh position={[mx, my, 8]} rotation-z={-sign * mainAng} material={ROOF_TILE} castShadow>
              <boxGeometry args={[16.3, 0.2, 47.5]} />
            </mesh>
            <mesh position={[fx, fy, 8]} rotation-z={-sign * flareAng} material={ROOF_TILE} castShadow>
              <boxGeometry args={[5.0, 0.2, 47.5]} />
            </mesh>
            {/* 瓦垄：顺坡的细棱，远看是一片片筒瓦 */}
            {[2.6, 4.4, 6.2, 8.0, 9.8, 11.6, 13.4, 15.2].map(t => {
              const y = 7.36 - Math.tan(mainAng) * t;
              return (
                <mesh key={t} position={[sign * t, y + 0.11, 8]} rotation-z={-sign * mainAng} material={ROOF_RIB}>
                  <boxGeometry args={[0.09, 0.09, 47.5]} />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {/* 正脊：主脊 + 两端鸱尾起翘 */}
      <mesh position={[0, 7.44, 8]} material={ROOF_EAVE} castShadow>
        <boxGeometry args={[0.95, 0.6, 47.5]} />
      </mesh>
      {[-1, 1].map(sign => (
        <mesh key={sign} position={[0, 7.68, 8 + sign * 23.4]} rotation-x={-sign * 0.35} material={ROOF_EAVE} castShadow>
          <boxGeometry args={[0.8, 0.75, 1.2]} />
        </mesh>
      ))}
      {/* 檐口（瓦当收边，比屋面浅一档，边缘才立得住） */}
      {[-18.9, 18.9].map(x => (
        <group key={x}>
          <mesh position={[x, 3.99, 8]} material={ROOF_EAVE} castShadow>
            <boxGeometry args={[0.55, 0.42, 47.6]} />
          </mesh>
          {/* 四角起翘 */}
          {[-1, 1].map(sign => (
            <mesh key={sign} position={[x, 4.2, 8 + sign * 23.2]} rotation-x={-sign * 0.28} material={ROOF_EAVE} castShadow>
              <boxGeometry args={[0.6, 0.34, 1.4]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ---------- 模型位 ---------- */

export interface SlotTint {
  color: number;
  metalness: number;
  roughness: number;
  emissive?: number;
  emissiveIntensity?: number;
}

function Slot({
  url,
  position,
  scale,
  tint,
}: {
  url: string;
  position: [number, number, number];
  scale?: number;
  tint?: SlotTint;
}) {
  // 第二个参数关闭 Draco（不走外网解码器），第三个参数开启 meshopt（原项目 glb 为 EXT_meshopt_compression）
  const gltf = useGLTF(url, false, true);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (tint) {
        const src = mesh.material as THREE.MeshStandardMaterial;
        const mat = new THREE.MeshStandardMaterial({
          map: src?.map ?? null,
          color: tint.color,
          metalness: tint.metalness,
          roughness: tint.roughness,
          emissive: tint.emissive ?? 0x000000,
          emissiveIntensity: tint.emissiveIntensity ?? 0,
          emissiveMap: tint.emissive ? src?.map ?? null : null,
        });
        mesh.material = mat;
      }
    });
    return cloned;
  }, [gltf, tint]);

  return (
    <group position={position} scale={scale ?? 1}>
      <primitive object={scene} />
    </group>
  );
}

function ModelSlot({
  url,
  position,
  scale,
  tint,
  fallback,
}: {
  url: string;
  position: [number, number, number];
  scale?: number;
  tint?: SlotTint;
  fallback: ReactNode;
}) {
  // 先探测模型是否真实存在；未确认 / 不存在时直接渲染降级体，不发起 GLTF 请求
  const [exists, setExists] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    probeModel(url).then(ok => { if (alive) setExists(ok); });
    return () => { alive = false; };
  }, [url]);

  if (exists !== true) return <group position={position} scale={scale ?? 1}>{fallback}</group>;

  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Slot url={url} position={position} scale={scale} tint={tint} />
      </Suspense>
    </Boundary>
  );
}

/* ---------- 塑像与菩萨占位 ---------- */

/**
 * 主塑像降级体：没有 GLTF 时用程序化金色坐塑像补位。
 * 莲座 + 结跏趺坐的身躯 + 定印 + 螺发肉髻 + 背光，保证正塑像位永远不是空龛。
 */
function StatueFallback() {
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd9a94a,
    metalness: 0.86,
    roughness: 0.32,
    emissive: 0x3a2606,
    emissiveIntensity: 0.18
  });
  const goldDark = new THREE.MeshStandardMaterial({
    color: 0xa97a2e,
    metalness: 0.8,
    roughness: 0.42
  });
  const redDot = new THREE.MeshStandardMaterial({ color: 0x7a1f16, roughness: 0.5, emissive: 0x3a0d08, emissiveIntensity: 0.3 });
  const faceDark = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.55 });
  return (
    <group>
      <LotusSeat x={0} y={0} z={0} radius={0.62} />

      <group position={[0, 0.02, 0.12]}>
        {/* 结跏趺坐的盘腿（宽扁莲腿） */}
        <mesh position={[0, 0.38, 0]} scale={[1.0, 0.34, 0.62]} castShadow material={goldDark}>
          <sphereGeometry args={[0.56, 20, 16]} />
        </mesh>
        {/* 双膝外展 */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.42, 0.34, 0.05]} scale={[0.7, 0.32, 0.55]} castShadow material={goldDark}>
            <sphereGeometry args={[0.3, 14, 10]} />
          </mesh>
        ))}
        {/* 身躯（略收窄的袈裟躯干） */}
        <mesh position={[0, 0.92, 0]} scale={[0.62, 0.86, 0.48]} castShadow material={gold}>
          <sphereGeometry args={[0.5, 24, 18]} />
        </mesh>
        {/* 双肩 */}
        <mesh position={[0, 1.3, 0]} scale={[1.0, 0.26, 0.42]} castShadow material={gold}>
          <sphereGeometry args={[0.4, 20, 14]} />
        </mesh>
        {/* 颈 */}
        <mesh position={[0, 1.52, 0]} material={gold}>
          <cylinderGeometry args={[0.13, 0.17, 0.24, 16]} />
        </mesh>
        {/* 塑像头 */}
        <mesh position={[0, 1.84, 0]} scale={[0.9, 1.04, 0.88]} castShadow material={gold}>
          <sphereGeometry args={[0.3, 28, 22]} />
        </mesh>
        {/* 肉髻 */}
        <mesh position={[0, 2.12, 0]} scale={[1, 0.72, 1]} castShadow material={gold}>
          <sphereGeometry args={[0.15, 18, 14]} />
        </mesh>
        {/* 双耳 */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.29, 1.8, 0]} scale={[0.55, 1.6, 0.55]} material={goldDark}>
            <sphereGeometry args={[0.08, 10, 8]} />
          </mesh>
        ))}
        {/* 面部：眉间白毫、双目、鼻 */}
        <mesh position={[0, 1.92, 0.265]} material={redDot}>
          <sphereGeometry args={[0.025, 8, 6]} />
        </mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.1, 1.87, 0.26]} material={faceDark}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
        ))}
        <mesh position={[0, 1.8, 0.28]} material={goldDark}>
          <sphereGeometry args={[0.03, 8, 6]} />
        </mesh>
        {/* 袈裟斜襟：胸前两片交叠 */}
        <mesh position={[-0.1, 1.05, 0.34]} rotation-z={0.42} material={goldDark}>
          <boxGeometry args={[0.16, 0.5, 0.03]} />
        </mesh>
        <mesh position={[0.1, 1.05, 0.345]} rotation-z={-0.42} material={gold}>
          <boxGeometry args={[0.16, 0.5, 0.03]} />
        </mesh>
        {/* 定印：双手叠放在膝上 */}
        <mesh position={[0, 0.72, 0.36]} scale={[0.5, 0.12, 0.32]} material={gold}>
          <sphereGeometry args={[0.3, 16, 12]} />
        </mesh>
        {/* 背光：两圈金环 */}
        <mesh position={[0, 1.84, -0.34]} material={gold}>
          <torusGeometry args={[0.58, 0.045, 10, 44]} />
        </mesh>
        <mesh position={[0, 1.84, -0.4]} material={goldDark}>
          <torusGeometry args={[0.72, 0.025, 8, 48]} />
        </mesh>
        <SoftGlow size={2.5} opacity={0.55} position={[0, 1.3, -0.3]} />
      </group>
    </group>
  );
}

/** 协侍降级体：小莲台 + 金色立像 + 头冠 + 柔光 */
function BodhisattvaFallback() {
  const gold = new THREE.MeshStandardMaterial({ color: 0xcf9f45, metalness: 0.82, roughness: 0.38 });
  const goldDark = new THREE.MeshStandardMaterial({ color: 0xa87f36, metalness: 0.78, roughness: 0.44 });
  const faceDark = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.55 });
  return (
    <group>
      <LotusSeat x={0} y={0} z={0} radius={0.46} />
      <group position={[0, 0.22, 0]}>
        {/* 立姿躯干（袈裟） */}
        <mesh position={[0, 0.72, 0]} scale={[0.62, 1, 0.48]} castShadow material={gold}>
          <sphereGeometry args={[0.34, 18, 14]} />
        </mesh>
        {/* 双臂下垂 */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.34, 0.66, 0]} rotation-z={side * 0.14} material={goldDark}>
            <capsuleGeometry args={[0.07, 0.3, 6, 10]} />
          </mesh>
        ))}
        {/* 颈与头 */}
        <mesh position={[0, 1.12, 0]} material={goldDark}>
          <cylinderGeometry args={[0.09, 0.12, 0.16, 12]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} scale={[0.86, 0.96, 0.84]} castShadow material={gold}>
          <sphereGeometry args={[0.18, 18, 14]} />
        </mesh>
        {/* 面部双目 */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * 0.06, 1.32, 0.15]} material={faceDark}>
            <sphereGeometry args={[0.02, 8, 6]} />
          </mesh>
        ))}
        {/* 头冠（宝冠分层） */}
        <mesh position={[0, 1.5, 0]} scale={[1, 0.62, 1]} material={goldDark}>
          <sphereGeometry args={[0.12, 12, 10]} />
        </mesh>
        <mesh position={[0, 1.6, 0]} material={gold}>
          <coneGeometry args={[0.07, 0.16, 12]} />
        </mesh>
        {/* 背光 */}
        <mesh position={[0, 0.92, -0.2]} material={gold}>
          <torusGeometry args={[0.32, 0.025, 8, 36]} />
        </mesh>
      </group>
      <SoftGlow size={1.4} opacity={0.34} position={[0, 0.72, -0.05]} />
    </group>
  );
}

/* ---------- 香案道具 ---------- */

/** 香炉（향로）：铜钵 + 三炷香 */
/* ---------- 香烟粒子（点燃后循环上升淡出） ---------- */

/* 香烟：始终不断的一缕青烟，改用不受光照影响的材质，任何机位看都是一样的一缕 */
const SMOKE_N = 16;

function IncenseSmoke({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.16 + i / SMOKE_N) % 1;
      const sway = Math.sin(t * 0.9 + i * 1.1) * 0.05 * phase;
      m.position.set(
        position[0] + sway + Math.sin(phase * 6 + i) * 0.03 * phase,
        position[1] + phase * 1.35,
        position[2] + Math.cos(t * 0.7 + i) * 0.03 * phase,
      );
      const r = 0.05 + phase * 0.16;
      m.scale.set(r * 1.15, r, r * 1.15);
      const mm = mats.current[i];
      if (mm) mm.opacity = 0.46 * (1 - phase * 0.85) * Math.min(1, phase * 8);
    });
  });
  return (
    <>
      {Array.from({ length: SMOKE_N }, (_, i) => (
        <mesh key={i} ref={el => { refs.current[i] = el; }} position={position} frustumCulled={false}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial
            color={0xe9e3d8}
            transparent
            opacity={0.2}
            depthWrite={false}
            ref={el => { if (el) mats.current[i] = el as THREE.MeshBasicMaterial; }}
          />
        </mesh>
      ))}
    </>
  );
}

function Burner() {
  const lit = store.hud.litIncense;
  return (
    <group position={[0, 0.575, -5.87]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.12, 0.12, 16]} />
        <meshStandardMaterial color={0x4a3a26} roughness={0.6} metalness={0.3} />
      </mesh>
      {[-0.05, 0, 0.05].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.18, 0]} rotation-z={x * 1.6}>
            <cylinderGeometry args={[0.012, 0.012, 0.34, 6]} />
            <meshStandardMaterial color={0x8a5a3c} roughness={0.8} />
          </mesh>
          {lit && (
            <mesh position={[x, 0.39, 0]}>
              <sphereGeometry args={[0.018, 8, 6]} />
              <meshStandardMaterial color={0xff8a3c} emissive={0xff6a2a} emissiveIntensity={1.4} />
            </mesh>
          )}
        </group>
      ))}
      <IncenseSmoke position={[0, 0.3, 0]} />

    </group>
  );
}

/** 烛台：铜座 + 白烛 + 火苗 */
function Candle({ x }: { x: number }) {
  return (
    <group position={[x, 0.575, -5.87]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.06, 12]} />
        <meshStandardMaterial color={0x8a6d3b} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
        <meshStandardMaterial color={0xf2ead6} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.03, 0.09, 8]} />
        <meshStandardMaterial color={0xffb35c} emissive={0xff8a2a} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/** 青瓷花瓶 + 白花 */
function Vase({ x, z = -7.8 }: { x: number; z?: number }) {
  const flowers: [number, number, number][] = [
    [-0.08, 0.55, 0],
    [0, 0.62, 0.03],
    [0.08, 0.55, -0.02],
  ];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 12]} />
        <meshStandardMaterial color={0x5f8a72} roughness={0.5} />
      </mesh>
      {flowers.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={0xf5f1e6} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** 柔和径向光晕（canvas 生成，Sprite 始终面向相机）——用作壁龛内的暖光，不构成造像 */
function SoftGlow({ size, opacity, position }: { size: number; opacity: number; position: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,232,190,1)');
    grad.addColorStop(0.3, 'rgba(255,205,140,0.62)');
    grad.addColorStop(0.65, 'rgba(250,170,95,0.22)');
    grad.addColorStop(1, 'rgba(240,150,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={tex} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/* ---------- 莲花座（临时金像的底座） ---------- */

function LotusSeat({ x, y, z, radius }: { x: number; y: number; z: number; radius: number }) {
  const petals = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { a, px: Math.cos(a) * radius, pz: Math.sin(a) * radius };
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc99a3f, metalness: 0.75, roughness: 0.38 });
  return (
    <group position={[x, y, z]}>
      {/* 座体 */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.86, radius, radius * 0.34, 20]} />
        <meshStandardMaterial color={0x5c4326} roughness={0.55} metalness={0.2} />
      </mesh>
      {/* 莲瓣一圈 */}
      {petals.map((p, i) => (
        <mesh
          key={i}
          position={[p.px * 0.92, radius * 0.16, p.pz * 0.92]}
          rotation={[0.42, -p.a, 0]}
          scale={[0.5, 1, 0.3]}
          material={gold}
        >
          <sphereGeometry args={[radius * 0.24, 8, 6]} />
        </mesh>
      ))}
      {/* 仰莲上沿 */}
      <mesh position={[0, radius * 0.24, 0]} castShadow material={gold}>
        <cylinderGeometry args={[radius * 0.8, radius * 0.86, radius * 0.1, 20]} />
      </mesh>
    </group>
  );
}

/* ---------- 壁龛框（临时浮雕像的龛位，正式造像到位后可直接去掉） ---------- */

function Niche({ x, z, w, h, d, baseY = 1.0 }: { x: number; z: number; w: number; h: number; d: number; baseY?: number }) {
  const halfW = w / 2;
  return (
    <group position={[x, baseY, z]}>
      {/* 背板 */}
      <mesh position={[0, h / 2, -d * 0.6]}>
        <boxGeometry args={[w, h, 0.08]} />
        <meshStandardMaterial color={0x4a3423} roughness={0.72} emissive={0x6a4526} emissiveIntensity={0.35} />
      </mesh>
      {/* 左右立框 */}
      {[-halfW, halfW].map(sx => (
        <mesh key={sx} position={[sx, h / 2, 0]} castShadow material={WOOD_TABLE}>
          <boxGeometry args={[0.14, h, d]} />
        </mesh>
      ))}
      {/* 顶框 + 底框 */}
      <mesh position={[0, h, 0]} castShadow material={WOOD_TABLE}>
        <boxGeometry args={[w + 0.3, 0.18, d + 0.1]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={WOOD_TABLE}>
        <boxGeometry args={[w + 0.3, 0.12, d + 0.1]} />
      </mesh>
      {/* 檐口 */}
      <mesh position={[0, h + 0.18, 0.06]} castShadow material={WOOD_RED}>
        <boxGeometry args={[w + 0.5, 0.12, d + 0.3]} />
      </mesh>
    </group>
  );
}

function Altar() {
  // 原项目素材只有 statue.glb（无菩萨模型），实测主塑像在位时两侧夹程序化金身反而破功。
  // 因此：真实主塑像加载成功 → 只摆主塑像（对齐原项目）；缺模型 → 主塑像 + 两协侍一起补位。
  const [hasRealStatue, setHasRealStatue] = useState(false);
  useEffect(() => {
    let alive = true;
    probeModel(STATUE_MODEL_URL).then(ok => { if (alive) setHasRealStatue(ok); });
    return () => { alive = false; };
  }, []);

  return (
    <group>
      {/* 塑像高台：抬到 1m，让塑像从香案后立起来，形成仰视层级 */}
      <mesh position={[0, 0.31, -8.77]} castShadow receiveShadow material={WOOD_TABLE}>
        <boxGeometry args={[8.6, 0.62, 1.7]} />
      </mesh>
      {/* 台面木沿 */}
      <mesh position={[0, 0.63, -8.77]} material={WOOD_RED}>
        <boxGeometry args={[8.72, 0.06, 1.65]} />
      </mesh>
      <Burner />
      <Candle x={-2.15} />
      <Candle x={2.15} />
      <Vase x={-3.7} z={-7.4} />
      <Vase x={3.7} z={-7.4} />
      {/* 壁龛建筑（无论有无模型都在） */}
      {/* 壁龛木框已按要求撤掉，造像直接立在台座上（组件保留备用） */}
      {/* 造像：优先 GLTF 正版模型，缺失时降级程序化金色主塑像 + 两侧协侍
          原项目 statue.glb 实测高 1.00m、面朝 +Z、底面在 y=0，放大 1.85 倍后与 1.05m 高壁龛相配 */}
      {CENTER_STATUE === 'mesh' ? (
        <group position={[0, 0, -8.77]} scale={[1 / HALL_SCALE, 1, 1 / HALL_SCALE]}>
          <MeshStatue url={STATUE_MESH.east} height={2.42} position={[0, 0.66, 0]} rotationY={Math.PI} emissive="#4a2a0c" emissiveIntensity={0.12} roughness={0.4} metalness={0.12} tint="#ffffff" />
          <MeshStatue url={STATUE_MESH.west} height={1.58} position={[-4.3, 0, 0.25]} rotationY={-Math.PI / 2} emissive="#12305c" emissiveIntensity={0.09} roughness={0.42} metalness={0.12} tint="#ffffff" />
          <MeshStatue url={STATUE_MESH.north} height={1.58} position={[4.3, 0, 0.25]} rotationY={Math.PI} emissive="#4a2a0c" emissiveIntensity={0.12} roughness={0.4} metalness={0.12} tint="#ffffff" />
        </group>
      ) : CENTER_STATUE === 'scan' ? (
        <ModelSlot url={STATUE_MODEL_URL} position={[0, 1.02, -7.9]} scale={1.85} fallback={<StatueFallback />} />
      ) : (
        <PhotoStatue
          textureUrl="assets/textures/trinity/center.webp"
          height={1.78}
          position={[0, 1.06, -7.9]}
          fallbackPalette={PALETTES.goldAlt}
          fallbackMudra="abhaya"
        />
      )}
      {!hasRealStatue && (
        <ModelSlot url={BODHI_MODEL_URL} position={[-2.3, 1.02, -8.6]} scale={0.9} fallback={<BodhisattvaFallback />} />
      )}
      {!hasRealStatue && (
        <ModelSlot url={BODHI_MODEL_URL} position={[2.3, 1.02, -8.6]} scale={0.9} fallback={<BodhisattvaFallback />} />
      )}
      {/* 横三世塑像：中央用内置 3D 模型，两侧按参考图重建
          两侧分别为蓝衣金身托钵版与通体鎏金定印版，
          站在香案前两侧地面，各自带莲座，朝向略向中庭收拢 */}
      {TRINITY_STYLE === 'model' ? (
        null // 尊像已并入上方的反缩小组，保持原尺寸
      ) : (
        <>
          <PhotoStatue
            textureUrl="assets/textures/trinity/west.webp"
            height={2.5}
            position={[-3.35, 0, -4.55]}
            fallbackPalette={PALETTES.blueGold}
            fallbackMudra="bowl"
          />
          <PhotoStatue
            textureUrl="assets/textures/trinity/east.webp"
            height={2.5}
            position={[3.35, 0, -4.55]}
            fallbackPalette={PALETTES.gold}
            fallbackMudra="dhyana"
          />
        </>
      )}
    </group>
  );
}

/* ---------- 长香案 + 木鼓钵 ---------- */

function LongTable() {
  return (
    <group position={[0, 0, -5.87]}>
      {/* 桌面 */}
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow material={WOOD_TABLE}>
        <boxGeometry args={[8.2, 0.075, 0.66]} />
      </mesh>
      {/* 桌腿 */}
      {[-3.86, 3.86].map(x => (
        <mesh key={x} position={[x, 0.24, 0]} material={WOOD_TABLE}>
          <boxGeometry args={[0.4, 0.48, 0.46]} />
        </mesh>
      ))}
      {/* 木鼓钵 */}
      <group position={[2.9, 0.57, 0]}>
        <mesh castShadow rotation-x={0.15}>
          <cylinderGeometry args={[0.136, 0.087, 0.099, 14]} />
          <meshStandardMaterial color={0x2f2318} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 方形蒲团阵列 ---------- */


function Cushions() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.95, metalness: 0 });
  return (
    <group>
      {CUSHION_ROWS.map(z =>
        CUSHION_COLS.map(x => (
          // 中间过道（|x| < 1.15）留空，坐垫只在过道两侧排
          Math.abs(x) < 1.15 ? null : (
            <mesh key={`${x}-${z}`} position={[x, 0.045, z]} castShadow receiveShadow material={mat}>
              <boxGeometry args={[1.20, 0.1, 1.30]} />
            </mesh>
          )
        ))
      )}
    </group>
  );
}

/* ---------- 吊灯 ---------- */

function LotusLamp({ x, z }: { x: number; z: number }) {
  const petals = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return { a, px: Math.cos(a) * 0.36, pz: Math.sin(a) * 0.36 };
  });
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xd9a35c,
    emissive: 0xffb45c,
    emissiveIntensity: 0.42,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  return (
    <group position={[x, 0, z]}>
      {/* 吊绳 */}
      <mesh position={[0, 3.55, 0]} material={WOOD_DARK}>
        <cylinderGeometry args={[0.014, 0.014, 1.0, 5]} />
      </mesh>
      <group position={[0, 2.92, 0]}>
        {/* 倒锥形灯罩 */}
        <mesh castShadow>
          <cylinderGeometry args={[0.52, 0.16, 0.5, 18, 1, true]} />
          <meshStandardMaterial
            color={0xffe6c0}
            emissive={0xffc27a}
            emissiveIntensity={0.65}
            roughness={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 外沿莲瓣 */}
        {petals.map((p, i) => (
          <mesh
            key={i}
            position={[p.px, 0.34, p.pz]}
            rotation={[0.36, -p.a, 0]}
            scale={[0.62, 1, 0.34]}
            material={petalMat}
          >
            <sphereGeometry args={[0.24, 12, 10]} />
          </mesh>
        ))}
        {/* 灯芯 */}
        <mesh position={[0, -0.18, 0]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color={0xfff4dc} emissive={0xffe0b0} emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 灯光：半球环境 + 主平行光（PCFSoft）+ 香案暖光 + 烛光 ---------- */

function Lights() {
  return (
    <group>
      <hemisphereLight args={[0xfff0d8, 0x6a5a48, 1.25]} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.7}
        color={0xffe2bd}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={26}
        shadow-camera-bottom={-18}
        shadow-camera-far={34}
      />
      {/* 塑像专用照明：正前方上射的柔光，把金身从壁画里剥出来 */}
      <spotLight
        position={[0, 4.2, -2.2]}
        angle={0.72}
        penumbra={0.85}
        intensity={3.2}
        distance={18}
        color={0xffd9a8}
      />
      <pointLight position={[0, 2.7, -6.9]} intensity={2.6} distance={10} color={0xffc070} />
      {/* 台座面光：从两侧上方打在造像上，让鎏金有高光，接近参考图的亮泽 */}
      <pointLight position={[-3.3, 2.5, -6.6]} intensity={1.5} distance={6} color={0xfff0d0} />
      <pointLight position={[3.3, 2.5, -6.6]} intensity={1.5} distance={6} color={0xfff0d0} />
      {/* 药师塑像的冷补光：让蓝衣保持青金石蓝，不被暖光洗成青绿 */}
      <pointLight position={[-3.3, 2.0, -7.6]} intensity={1.1} distance={4.5} color={0xaecbff} />
      {/* 大殿加深后（z 到 30）补三盏中后段暖光，让蒲团、侧墙与顶棚都有光 */}
      <pointLight position={[0, 3.0, 6]} intensity={2.2} distance={16} color={0xffd9a4} />
      <pointLight position={[0, 3.0, 15]} intensity={2.2} distance={16} color={0xffd9a4} />
      <pointLight position={[0, 3.0, 24]} intensity={2.2} distance={16} color={0xffd9a4} />
      <pointLight position={[-11, 2.6, 10]} intensity={1.4} distance={13} color={0xffcf94} />
      <pointLight position={[11, 2.6, 10]} intensity={1.4} distance={13} color={0xffcf94} />
      <pointLight position={[-11, 2.6, 22]} intensity={1.4} distance={13} color={0xffcf94} />
      <pointLight position={[11, 2.6, 22]} intensity={1.4} distance={13} color={0xffcf94} />
    </group>
  );
}

/* ---------- 主道拜毯 ---------- */

function Carpet() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a2f22, roughness: 0.95 });
  return (
    <mesh position={[0, 0.02, 12]} receiveShadow material={mat}>
      <boxGeometry args={[2.1, 0.03, 31]} />
    </mesh>
  );
}

/* ---------- 入口双开木门 ---------- */

function EntranceDoors() {
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.7 });
  return (
    <group position={[0, 0, 28.4]}>
      <mesh position={[-1.8, 1.7, 0]} material={WOOD_RED}>
        <boxGeometry args={[0.24, 3.4, 0.3]} />
      </mesh>
      <mesh position={[1.8, 1.7, 0]} material={WOOD_RED}>
        <boxGeometry args={[0.24, 3.4, 0.3]} />
      </mesh>
      <mesh position={[0, 3.45, 0]} material={WOOD_RED}>
        <boxGeometry args={[3.8, 0.28, 0.3]} />
      </mesh>
      <group position={[-0.9, 0, 0]} rotation-y={0.5}>
        <mesh position={[-0.9, 1.6, 0]} castShadow material={doorMat}>
          <boxGeometry args={[1.8, 3.2, 0.12]} />
        </mesh>
      </group>
      <group position={[0.9, 0, 0]} rotation-y={-0.5}>
        <mesh position={[0.9, 1.6, 0]} castShadow material={doorMat}>
          <boxGeometry args={[1.8, 3.2, 0.12]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 两侧藏经柜 ---------- */

const BOOK_MATS = [0x7a3b2e, 0x3f5a46, 0x8a6d3b, 0x5f4a6e, 0x6e4a2f].map(
  c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })
);

function ScriptureCabinet({ x, z }: { x: number; z: number }) {
  const shelves = [0.5, 1.1, 1.7];
  return (
    <group position={[x, 0, z]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow material={WOOD_TABLE}>
        <boxGeometry args={[1.7, 2.2, 0.5]} />
      </mesh>
      {shelves.map((y, si) => (
        <group key={si}>
          <mesh position={[0, y - 0.28, 0.26]} material={WOOD_TABLE}>
            <boxGeometry args={[1.6, 0.06, 0.05]} />
          </mesh>
          {Array.from({ length: 5 }, (_, bi) => (
            <mesh
              key={bi}
              position={[-0.6 + bi * 0.3, y - 0.12, 0.26]}
              material={BOOK_MATS[(si * 5 + bi) % BOOK_MATS.length]}
            >
              <boxGeometry args={[0.18, 0.26, 0.12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ---------- 钟架（左墙）：撞钟后钟体衰减摆动 ---------- */

function BellStand() {
  const bellRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const at = store.hud.bellAt;
    if (!bellRef.current) return;
    if (!at) { bellRef.current.rotation.x = 0; return; }
    const el = (performance.now() - at) / 1000;
    if (el > 1.4) { bellRef.current.rotation.x = 0; return; }
    bellRef.current.rotation.x = Math.sin(el * 9) * 0.28 * Math.exp(-el * 2.2);
  });

  return (
    <group position={[-13.2, 0, 4.6]}>
      <mesh position={[0, 0.9, 0]} castShadow material={WOOD_TABLE}>
        <boxGeometry args={[1.2, 1.8, 0.5]} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow material={WOOD_RED}>
        <boxGeometry args={[1.3, 0.12, 0.6]} />
      </mesh>
      <group ref={bellRef} position={[0, 1.35, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.32, 0.38, 0.7, 18]} />
          <meshStandardMaterial color={0x9a7a3a} metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.45, 0]} material={WOOD_DARK}>
          <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 鼓架（右墙） ---------- */

function DrumStand() {
  return (
    <group position={[13.2, 0, 4.6]}>
      {[-0.35, 0.35].map(x => (
        <mesh key={x} position={[x, 0.5, 0]} material={WOOD_TABLE}>
          <boxGeometry args={[0.12, 1.0, 0.5]} />
        </mesh>
      ))}
      <mesh position={[0, 1.2, 0]} castShadow rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.5, 0.5, 0.5, 20]} />
        <meshStandardMaterial color={0x6e3b26} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.2, 0.27]} rotation-z={Math.PI / 2} material={new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.8 })}>
        <cylinderGeometry args={[0.46, 0.46, 0.04, 20]} />
      </mesh>
    </group>
  );
}

/* ---------- 体验券木箱（디지털 라이트）：木箱 + 投币口 + 金牌 ---------- */

function DonationBox({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const plate = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2b1a10'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#d8b45c'; g.lineWidth = 8; g.strokeRect(6, 6, 244, 116);
    g.fillStyle = '#ecd08a'; g.font = 'bold 52px serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('라이트', 128, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c1b, roughness: 0.72 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.45, metalness: 0.6 });
  return (
    <group position={position} rotation-y={rotationY}>
      {/* 底座 */}
      <mesh position={[0, 0.06, 0]} castShadow material={gold}>
        <boxGeometry args={[0.86, 0.1, 0.66]} />
      </mesh>
      {/* 箱体 */}
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow material={wood}>
        <boxGeometry args={[0.78, 0.68, 0.6]} />
      </mesh>
      {/* 箱体铜边（上下两道） */}
      {[0.16, 0.76].map(y => (
        <mesh key={y} position={[0, y, 0]} material={gold}>
          <boxGeometry args={[0.82, 0.05, 0.64]} />
        </mesh>
      ))}
      {/* 箱面四角金饰 */}
      {[[-0.36, 0.62], [0.36, 0.62], [-0.36, 0.3], [0.36, 0.3]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.31]} material={gold}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
        </mesh>
      ))}
      {/* 顶盖与投币口 */}
      <mesh position={[0, 0.82, 0]} castShadow material={wood}>
        <boxGeometry args={[0.84, 0.09, 0.66]} />
      </mesh>
      <mesh position={[0, 0.87, 0.02]} material={gold}>
        <boxGeometry args={[0.84, 0.02, 0.66]} />
      </mesh>
      <mesh position={[0, 0.875, 0]} material={new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.9 })}>
        <boxGeometry args={[0.34, 0.03, 0.05]} />
      </mesh>
      {/* 金牌 */}
      <mesh position={[0, 0.46, 0.315]} rotation-x={-0.06} material={gold}>
        <boxGeometry args={[0.5, 0.26, 0.02]} />
      </mesh>
      <mesh position={[0, 0.46, 0.33]} rotation-x={-0.06}>
        <planeGeometry args={[0.46, 0.22]} />
        <meshStandardMaterial map={plate} roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- 壁龛匾额 ---------- */

function Plaque() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = '#3a2718'; g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84);
    g.fillStyle = '#e8c97a'; g.font = 'bold 44px serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('전통 전각', 128, 52);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={[0, 3.35, -7.9]}>
      <planeGeometry args={[1.8, 0.68]} />
      <meshStandardMaterial map={tex} roughness={0.7} />
    </mesh>
  );
}

/* ---------- 殿外正面匾额（韩文） ---------- */

function FrontPlaque() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 150;
    const g = c.getContext('2d')!;
    g.fillStyle = '#241a10'; g.fillRect(0, 0, 512, 150);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 9; g.strokeRect(9, 9, 494, 132);
    g.fillStyle = '#ecd08a'; g.font = 'bold 72px serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('민들레 안심당', 256, 79);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[0, 3.86, 28.86]}>
      <mesh castShadow>
        <boxGeometry args={[3.24, 1.02, 0.07]} />
        <meshStandardMaterial color="#241a10" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[3.0, 0.84]} />
        <meshStandardMaterial map={tex} roughness={0.65} />
      </mesh>
    </group>
  );
}

/* ---------- 龛前幡幔 ---------- */

function Banner({ x }: { x: number }) {
  const cloth = new THREE.MeshStandardMaterial({ color: 0x8a2f2a, roughness: 0.9, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd9a94a, roughness: 0.7 });
  return (
    <group position={[x, 3.28, -7.9]}>
      <mesh material={cloth}>
        <planeGeometry args={[0.42, 1.16]} />
      </mesh>
      <mesh position={[0, 0.05, 0.01]} material={trim}>
        <boxGeometry args={[0.46, 0.08, 0.02]} />
      </mesh>
    </group>
  );
}

/* ---------- 纸灯笼 ---------- */

function PaperLantern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3.9, 0]} material={WOOD_DARK}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 6]} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color={0xffe2c0} emissive={0xffa85c} emissiveIntensity={0.55} roughness={0.7} />
      </mesh>
      {[-0.12, 0, 0.12].map(y => (
        <mesh key={y} position={[0, 3.0 + y, 0]} material={new THREE.MeshStandardMaterial({ color: 0x8a2f2a, roughness: 0.8 })}>
          <torusGeometry args={[0.26, 0.012, 6, 20]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 供果盘 ---------- */

function FruitBowl({ x, z }: { x: number; z: number }) {
  const fruit = [0xd98a3c, 0x7a9a4a, 0xc94f3f];
  return (
    <group position={[x, 0.575, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.12, 0.08, 14]} />
        <meshStandardMaterial color={0x3a2a1c} roughness={0.6} />
      </mesh>
      {[-0.06, 0.06, 0].map((dx, i) => (
        <mesh key={i} position={[dx, 0.12, i === 2 ? 0.06 : 0]} material={new THREE.MeshStandardMaterial({ color: fruit[i], roughness: 0.6 })}>
          <sphereGeometry args={[0.07, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export default function ExperienceScene() {
  // 大殿整体相对缩小：壳体（地/墙/屋顶/柱/台座）绕殿心 (0,0,8) 缩到 0.85，
  // 虚拟人群与体验券木箱保持在原尺度，避免人变小、也让殿和人的比例更贴近原项目。
  const K = HALL_SCALE;
  return (
    <group>
      <group position={[0, 0, 8 * (1 - K)]} scale={[K, 1, K]}>
        <Lights />
        <Floor />
        <BackWall />
        <SideWindow sign={-1} />
        <SideWindow sign={1} />
        <Roof />
        <Pillars />
        <Altar />
        <LongTable />
        <Cushions />
        <LotusLamp x={-6.4} z={-6.2} />
        <LotusLamp x={6.4} z={-6.2} />
        <Carpet />
        <EntranceDoors />
        <ScriptureCabinet x={-14.6} z={-2} />
        <ScriptureCabinet x={14.6} z={-2} />
        <ScriptureCabinet x={-14.6} z={2.4} />
        <ScriptureCabinet x={14.6} z={2.4} />
        <BellStand />
        <DrumStand />
        <Plaque />
        <Banner x={-1.78} />
        <Banner x={1.78} />
        <PaperLantern x={-4.6} z={1.2} />
        <PaperLantern x={4.6} z={1.2} />
        <FruitBowl x={-3.1} z={-5.87} />
        <FruitBowl x={3.1} z={-5.87} />
      </group>
      <FrontPlaque />
      <NpcCrowd />
      <DonationBox position={[4.35, 0, -0.3]} rotationY={-Math.PI / 2} />
      {/* 庭院茶室「안심당」：给访客一个能坐下来停留的地方 */}
      <TeaHouse position={[11.4, 0, 36.6]} rotationY={-0.35} />
      {/* 殿外祈愿壁：把供灯人的姓名与祈愿挂在墙上 */}
      {/* 祈愿壁：殿门左侧、贴着月台左沿（人从庭院走向殿门时，左手边就是它） */}
      <WishWall position={[-8.6, 0, 29.2]} rotationY={Math.PI / 2} />
      {/* 供花 / 供水的实物呈现（长香案上） */}
      <Offerings />
    </group>
  );
}

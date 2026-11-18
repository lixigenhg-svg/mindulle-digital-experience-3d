/**
 * SensoryLayer.tsx —— 沉浸式环境演出（落叶 / 雪 / 雨 + 撞钟光波 + 点香暖光）
 *
 * 纯加法：不新增模型、不贴图、不改几何常量，只在场景里加一层粒子与两处动态光。
 * 粒子始终跟随相机所在位置生成，走到哪跟到哪，不会出现「走到半路没雪了」。
 * 开关由「設定」里的「환경 연출」与「빛 연출」控制，全部可关闭。
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { store } from '../store';
import { playerPos } from '../player/pos';
import { useImmersive, type WeatherMode } from '../immersive';
import { activeAura, usePaid } from '../paid';

/** 粒子数量：雨最多，落叶最少（手机也能跑） */
const COUNT: Record<Exclude<WeatherMode, 'none'>, number> = {
  leaf: 170,
  snow: 130,
  rain: 210,
};

/** 粒子箱体：以相机为心的水平范围（米），垂直 0~9m */
const BOX_XZ = 15;
const BOX_Y = 9;

interface ParticleStyle {
  color: string;
  size: number;
  opacity: number;
  /** 下落速度区间（米/秒） */
  fall: [number, number];
  /** 水平漂移 */
  drift: number;
}

const STYLE: Record<Exclude<WeatherMode, 'none'>, ParticleStyle> = {
  leaf: { color: '#d98a4b', size: 0.17, opacity: 0.92, fall: [0.55, 1.05], drift: 0.5 },
  snow: { color: '#ffffff', size: 0.1, opacity: 0.88, fall: [0.35, 0.7], drift: 0.22 },
  rain: { color: '#b9d3e6', size: 0.055, opacity: 0.55, fall: [7.5, 12.5], drift: 0.35 },
};

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** 现生成粒子贴图：雪花=柔边圆，雨=竖直雨丝，落叶=椭圆叶片。零外部资源。 */
function makeParticleTexture(mode: Exclude<WeatherMode, 'none'>): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  if (mode === 'snow') {
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
  } else if (mode === 'rain') {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.35, 'rgba(230,244,255,0.95)');
    g.addColorStop(0.8, 'rgba(230,244,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(29, 4, 6, 56);
  } else {
    // 叶片：倾斜椭圆 + 中脉，贴图本身是浅色，实际颜色由 material.color 染
    ctx.translate(32, 32);
    ctx.rotate(-0.55);
    const g = ctx.createLinearGradient(-26, 0, 26, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0.6)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,40,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** 环境粒子场（跟随相机） */
function WeatherField({ mode, wind = 1 }: { mode: Exclude<WeatherMode, 'none'>; wind?: number }) {
  const camera = useThree(s => s.camera);
  const pointsRef = useRef<THREE.Points>(null);
  const style = STYLE[mode];
  const n = COUNT[mode];

  // 位置 + 每颗粒子的速度 + 相位（落叶摆动用）
  const data = useMemo(() => {
    const pos = new Float32Array(n * 3);
    const vy = new Float32Array(n);
    const phase = new Float32Array(n);
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (let i = 0; i < n; i += 1) {
      pos[i * 3] = cx + rand(-BOX_XZ, BOX_XZ);
      pos[i * 3 + 1] = rand(0, BOX_Y);
      pos[i * 3 + 2] = cz + rand(-BOX_XZ, BOX_XZ);
      vy[i] = rand(style.fall[0], style.fall[1]);
      phase[i] = rand(0, Math.PI * 2);
    }
    return { pos, vy, phase };
  }, [n, style]);

  const tex = useMemo(() => makeParticleTexture(mode), [mode]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    return g;
  }, [data]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { pos, vy, phase } = data;
    const t = performance.now() * 0.001;
    const cam = camera.position;
    // 殿内不落雨雪：用地板世界范围判断（z≈-6.3~22.3、|x|<10.5），按玩家位置而不是相机
    const indoor = playerPos.z < 22.3 && Math.abs(playerPos.x) < 10.6;
    if (pointsRef.current) pointsRef.current.visible = !indoor;
    const attr = geom.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < n; i += 1) {
      const ix = i * 3;
      pos[ix + 1] -= vy[i] * dt;
      // 水平漂移：落叶按正弦左右摆，雨和雪走同一方向
      if (mode === 'leaf') {
        pos[ix] += Math.sin(t * 1.4 + phase[i]) * 0.9 * dt * wind;
        pos[ix + 2] += Math.cos(t * 0.8 + phase[i]) * 0.35 * dt * wind;
      } else {
        pos[ix] += style.drift * dt * wind;
      }

      // 落地 → 回到顶上
      if (pos[ix + 1] < 0) {
        pos[ix + 1] = BOX_Y;
        pos[ix] = cam.x + rand(-BOX_XZ, BOX_XZ);
        pos[ix + 2] = cam.z + rand(-BOX_XZ, BOX_XZ);
      }
      // 出界 → 拉回相机周围，玩家走动时粒子不丢
      if (pos[ix] < cam.x - BOX_XZ || pos[ix] > cam.x + BOX_XZ || pos[ix + 2] < cam.z - BOX_XZ || pos[ix + 2] > cam.z + BOX_XZ) {
        pos[ix] = cam.x + rand(-BOX_XZ, BOX_XZ);
        pos[ix + 2] = cam.z + rand(-BOX_XZ, BOX_XZ);
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        color={style.color}
        map={tex}
        size={mode === 'rain' ? 0.34 : style.size}
        sizeAttenuation
        transparent
        opacity={style.opacity}
        depthWrite={false}
        alphaTest={0.02}
      />
    </points>
  );
}

/** 撞钟光波：地面上扩散的一圈暖光 */
function BellPulse({ enabled, color = '#ffd9a4' }: { enabled: boolean; color?: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const bellAt = useSyncExternalStore(store.subscribe, () => store.hud.bellAt);
  const startRef = useRef(0);
  const originRef = useRef({ x: 0, z: 0 });
  const camera = useThree(s => s.camera);
  const seenRef = useRef(0);

  useFrame(() => {
    const ring = ringRef.current;
    if (!ring) return;

    // 撞钟时刻变化 → 从当前位置起波
    if (enabled && bellAt > 0 && bellAt !== seenRef.current) {
      seenRef.current = bellAt;
      startRef.current = performance.now();
      originRef.current = { x: camera.position.x, z: camera.position.z };
      ring.visible = true;
    }

    if (!enabled) {
      ring.visible = false;
      return;
    }

    const age = (performance.now() - startRef.current) / 1000;
    const DUR = 2.6;
    if (startRef.current === 0 || age > DUR) {
      ring.visible = false;
      return;
    }
    const k = age / DUR;
    const scale = 0.55 + k * 19;
    ring.position.set(originRef.current.x, 0.05, originRef.current.z);
    ring.scale.set(scale, scale, scale);
    const mat = ring.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.85 * (1 - k) * (1 - k);
  });

  return (
    <mesh ref={ringRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.86, 1, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** 点香之后的暖光：香案处亮起来，并带一点呼吸般的抖动 */
function IncenseGlow({ enabled }: { enabled: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const lit = useSyncExternalStore(store.subscribe, () => store.hud.litIncense);
  const cur = useRef(0);

  useFrame((_, dtRaw) => {
    const light = lightRef.current;
    if (!light) return;
    const dt = Math.min(dtRaw, 0.05);
    const target = enabled && lit ? 1.15 : 0;
    // 平滑上/下，避免瞬间跳亮
    cur.current += (target - cur.current) * Math.min(1, dt * 3.2);
    const flicker = lit ? 1 + Math.sin(performance.now() * 0.0042) * 0.09 : 1;
    light.intensity = cur.current * flicker;
    light.visible = cur.current > 0.02;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 1.5, -0.2]}
      color="#ffb46a"
      intensity={0}
      distance={7.5}
      decay={2}
    />
  );
}

export default function SensoryLayer() {
  const { weather, fx, wind, night } = useImmersive();
  const aura = activeAura(usePaid());

  // 夜间：只压一点画面亮度，不动机位/灯光参数
  useEffect(() => {
    document.documentElement.dataset.mdNight = night ? '1' : '0';
    // 直接写在 canvas 上：部分浏览器对 html[data-*] canvas 选择器不生效
    const cv = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (cv) {
      cv.style.transition = 'filter 1.4s ease';
      cv.style.filter = night ? 'brightness(0.62) saturate(0.72)' : '';
    }
    return () => {
      delete document.documentElement.dataset.mdNight;
      if (cv) cv.style.filter = '';
    };
  }, [night]);

  return (
    <>
      {weather !== 'none' && <WeatherField key={weather} mode={weather} wind={wind} />}
      <BellPulse enabled={fx} color={aura ? aura.wave : '#ffd9a4'} />
      <IncenseGlow enabled={fx} />
    </>
  );
}

import { planWalk } from './walkRoute';
/**
 * LocalPlayer.tsx —— 本地玩家：位移、朝向、第三人称相机、输入（点地移动 / 拖拽旋转 / 双指缩放）
 * 动作状态来自 ActionMachine；位置快照通过 onMove 上交，由 App 按 80ms 节流上报。
 */
import { useEffect, useRef, useSyncExternalStore , useState} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { consumeGyro } from '../immersive';
import * as THREE from 'three';
import { BOUNDS, BOUNDS_Z_MIN, BOUNDS_Z_MAX, CAM, MOVE_SPEED, CUSHION_ROWS, CUSHION_COLS, HALL_SCALE } from '../config';
import { playerPos } from './pos';
import { exteriorObstacles, treeObstacles } from '../scene/Exterior';
import { stick } from './input';
import { sharedAudio } from '../audio';
import { playerMotion } from '../avatar/animState';
import { nearestSeat, type Seat } from './seats';
import type { ActionMachine } from '../actions';
import FigureAvatar from '../avatar/FigureAvatar';
import PaidAura from '../scene/PaidAura';
import RiggedAvatar from '../avatar/RiggedAvatar';
import SculptAvatar from '../avatar/SculptAvatar';
import BoneAvatar from '../avatar/BoneAvatar';
import SkinAvatar from '../avatar/SkinAvatar';

/**
 * 角色用哪个外观：
 *  · 'sculpt' = 你上传的雕刻稿（与殿门迎宾角色同一模型，走路用整体重心模拟）
 *  · 'figure' = 分部件重建版（能真正做合手 / 行礼 / 木鼓 / 数珠）
 *  · 'rigged' = 自动蒙皮实验版（默认不启用）
 */
const AVATAR_STYLE: 'bone' | 'sculpt' | 'figure' | 'rigged' | 'skin' = 'skin';

/** 障碍物（AABB，单位米）：香案、香案、壁龛底座、门柱、殿门迎宾角色 */
const OBSTACLES: { x: number; z: number; hx: number; hz: number }[] = [
  // 香案（原坐标随大殿缩放失效，已并入长香案）
  // { x: 0, z: -6.4, hx: 1.05, hz: 0.34 },
  { x: 0, z: -0.60, hx: 2.55, hz: 0.35 },  // 长香案（世界坐标：大殿缩到 0.62 之后）
  { x: 0, z: -2.05, hx: 2.68, hz: 0.55 },  // 塑像台底座
  { x: -3.0, z: 26.3, hx: 0.40, hz: 0.35 }, // 殿门左角色
  { x: 3.0, z: 26.3, hx: 0.40, hz: 0.35 },  // 殿门右角色
  { x: -2.55, z: 28.4, hx: 0.30, hz: 0.45 },  // 殿门左立柱
  { x: 2.55, z: 28.4, hx: 0.30, hz: 0.45 },   // 殿门右立柱
  { x: -3.6, z: 51.6, hx: 0.36, hz: 0.36 },   // 山门左柱
  { x: 3.6, z: 51.6, hx: 0.36, hz: 0.36 },    // 山门右柱

  // ── 庭院茶室「안심당」（中心 11.4,36.6，绕 y 轴 -0.35 rad）──
  { x: 12.93, z: 39.13, hx: 0.22, hz: 0.22 },
  { x: 8.61, z: 37.55, hx: 0.22, hz: 0.22 },
  { x: 14.19, z: 35.65, hx: 0.22, hz: 0.22 },
  { x: 9.87, z: 34.07, hx: 0.22, hz: 0.22 },
  { x: 11.35, z: 36.74, hx: 0.82, hz: 0.50 },   // 茶桌
  { x: 12.03, z: 34.86, hx: 2.26, hz: 0.88 },     // 后墙
  { x: 9.24, z: 35.81, hx: 0.70, hz: 1.80 },   // 左矮墙
  { x: 13.56, z: 37.39, hx: 0.70, hz: 1.80 },   // 右矮墙

  // ── 殿外祈愿壁（已移到殿门左侧、贴着月台左沿：中心 -9.5,30.2）──
  { x: -8.6, z: 29.2, hx: 0.30, hz: 2.46 },

  // ── 大殿内 12 根立柱（局部 x=±10.2、z 六档 → 世界 = x*0.62, z*0.62+3.04）──
  { x: -6.32, z: -2.79, hx: 0.36, hz: 0.36 },
  { x: 6.32, z: -2.79, hx: 0.36, hz: 0.36 },
  { x: -6.32, z: 1.55, hx: 0.36, hz: 0.36 },
  { x: 6.32, z: 1.55, hx: 0.36, hz: 0.36 },
  { x: -6.32, z: 5.89, hx: 0.36, hz: 0.36 },
  { x: 6.32, z: 5.89, hx: 0.36, hz: 0.36 },
  { x: -6.32, z: 10.23, hx: 0.36, hz: 0.36 },
  { x: 6.32, z: 10.23, hx: 0.36, hz: 0.36 },
  { x: -6.32, z: 14.57, hx: 0.36, hz: 0.36 },
  { x: 6.32, z: 14.57, hx: 0.36, hz: 0.36 },
  { x: -6.32, z: 18.91, hx: 0.36, hz: 0.36 },
  { x: 6.32, z: 18.91, hx: 0.36, hz: 0.36 },

  // ── 壁龛后方禁入区：全殿宽挡住，谁都绕不到塑像背后 ──
  { x: 0, z: -3.60, hx: 6.20, hz: 1.30 },

  // ── 大殿左右侧墙（局部 x=±15.94 → 世界 ±9.88；墙体的窗棂从局部 z=-21.1 到 20.5）──
  { x: -9.88, z: 7.20, hx: 0.30, hz: 8.60 },
  { x: 9.88, z: 7.20, hx: 0.30, hz: 8.60 },

  // ── 经柜（局部 x=±14.6、z=-2 / 2.4，旋转 90° 后长边沿 z）──
  { x: -9.05, z: 1.80, hx: 0.20, hz: 0.55 },
  { x: 9.05, z: 1.80, hx: 0.20, hz: 0.55 },
  { x: -9.05, z: 4.53, hx: 0.20, hz: 0.55 },
  { x: 9.05, z: 4.53, hx: 0.20, hz: 0.55 },

  // ── 钟架（左）/ 鼓架（右）──
  { x: -8.18, z: 5.89, hx: 0.45, hz: 0.45 },
  { x: 8.18, z: 5.89, hx: 0.45, hz: 0.45 },

  // ── 体验券木箱（디지털 라이트）：世界坐标就是场景里的 4.35 / -0.3，不在缩放壳体内 ──
  { x: 4.35, z: -0.30, hx: 0.42, hz: 0.42 },
];
const PLAYER_R = 0.38;

/** 坐垫阵列（与 ExperienceScene 里 cz/uz 一致），用于「找空铺垫坐下」 */
const CUSHION_Y = 0.087;

// 暴露给外部的缩放控制（走近塑像上香时放大，避免相对塑像显得过小）
if (typeof window !== 'undefined') {
  (window as unknown as { __MD_SCALE__?: (k: number) => void }).__MD_SCALE__ = (k: number) => {
    (window as unknown as { __MD_SCALE_K__?: number }).__MD_SCALE_K__ = k;
  };
}
const HALL_K = HALL_SCALE;
const HALL_DZ = 8 * (1 - HALL_SCALE); // 大殿壳体绕殿心 (0,0,8) 缩小后的纵向补偿
/** 坐垫世界坐标：场景里的垫子在缩放壳体内生成，这里换算成同一套世界坐标 */
const cushions = CUSHION_ROWS.flatMap((lz) =>
  CUSHION_COLS.filter((x) => Math.abs(x) >= 1.15).map((x) => ({
    x: x * HALL_K,
    z: lz * HALL_K + HALL_DZ,
  }))
);

/** 找离自己最近、且没被别人占的铺垫 */
export function nearestFreeCushion(pos: THREE.Vector3, taken: { x: number; z: number }[]) {
  let best: { x: number; z: number; d: number } | null = null;
  for (const c of cushions) {
    if (taken.some((t) => Math.hypot(t.x - c.x, t.z - c.z) < 0.9)) continue;
    const d = Math.hypot(c.x - pos.x, c.z - pos.z);
    if (!best || d < best.d) best = { ...c, d };
  }
  return best ?? cushions[0];
}

/** 把落点从障碍物里推出来（按穿透最浅的一侧滑动） */
type Box = { x: number; z: number; hx: number; hz: number };

/** 推出一组 AABB，返回是否发生过穿透 */
function pushOutOf(pos: THREE.Vector3, list: Box[], skipBench = false): boolean {
  let hit = false;
  for (const o of list) {
    if (skipBench && (o as Box & { bench?: boolean }).bench) continue;
    const dx = pos.x - o.x;
    const dz = pos.z - o.z;
    const px = o.hx + PLAYER_R - Math.abs(dx);
    const pz = o.hz + PLAYER_R - Math.abs(dz);
    if (px > 0 && pz > 0) {
      hit = true;
      if (px < pz) pos.x += Math.sign(dx || 1) * px;
      else pos.z += Math.sign(dz || 1) * pz;
    }
  }
  return hit;
}

/** 把落点从障碍物里推出来（按穿透最浅的一侧滑动）：殿内 + 庭院固定物 + 树 */
export function resolveCollision(pos: THREE.Vector3) {
  const bench = !!(window as unknown as { __MD_SEATED_BENCH__?: boolean }).__MD_SEATED_BENCH__;
  for (let iter = 0; iter < 3; iter++) {
    let hit = false;
    hit = pushOutOf(pos, OBSTACLES) || hit;
    hit = pushOutOf(pos, exteriorObstacles, bench) || hit;
    hit = pushOutOf(pos, treeObstacles) || hit;
    if (!hit) break;
  }
  return pos;
}
import NameTag from '../ui/NameTag';
import { store } from '../store';
import { PAGODA_POS, PAGODA_RADIUS } from '../scene/Exterior';

/** 绕塔速度 rad/s（一圈约 12 秒） */
const TOUR_SPEED = (Math.PI * 2) / 12;
/** 巡游结束后回到的出生点 */
const HOME = new THREE.Vector3(0, 0, 4.0);

export interface MoveSnapshot {
  x: number;
  z: number;
  rot: number;
  anim: 'idle' | 'walk';
}

interface LocalPlayerProps {
  name: string;
  color: string;
  machine: ActionMachine;
  onMove: (snap: MoveSnapshot) => void;
  /** 私密金阁：独立出生点、独立边界、不使用大殿碰撞体 */
  privateMode?: boolean;
  spawn?: { x: number; z: number };
}

const keyState: Record<string, boolean> = {};

export default function LocalPlayer({ name, color, machine, onMove, privateMode = false, spawn }: LocalPlayerProps) {
  const gl = useThree(s => s.gl);
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const groupRef = useRef<THREE.Group>(null);
  /** 上次写入 localStorage 的时间（节流用） */
  const lastSave = useRef(0);
  /** 相遇行礼：行礼结束时间 / 下次可再行礼的时间 */
  const greetUntil = useRef(0);
  const greetCool = useRef(0);
  // 坐在什么上面（茶垫 / 长凳 / 蒲团），传给姿态函数决定坐姿细节
  const [seatKindState, setSeatKindState] = useState<'floor' | 'tea' | 'bench'>('floor');
  const seatKindRef = useRef<'floor' | 'tea' | 'bench'>('floor');
  const activeBench = useRef<Seat | null>(null);
  const activeTeaSeat = useRef<Seat | null>(null);
  const floorRef = useRef<THREE.Mesh>(null);

  // 动作状态机是普通类，改 state 不会触发重渲染；订阅后动作切换才能推给模型
  const action = useSyncExternalStore(machine.subscribe, machine.getState);

  // 刷新后回到原来的位置，而不是又从山门外重新走进来
  // 私密金阁不读取大殿的站位；进入时固定在自己的入口
  const savedPos = (() => {
    if (privateMode) return null;
    try {
      const raw = localStorage.getItem('mindulle.pos');
      if (!raw) return null;
      const o = JSON.parse(raw) as {
        x?: number; z?: number; facing?: number;
        yaw?: number; pitch?: number; dist?: number; seat?: string | null;
      };
      if (typeof o.x === 'number' && typeof o.z === 'number' && isFinite(o.x) && isFinite(o.z)) return o;
    } catch { /* 解析失败就按默认出生点 */ }
    return null;
  })();

  const state = useRef({
    // 出生点：山门外，正对山门（多人时左右散开一点，避免叠在一起）
    // 私密金阁：从自己的门内进入，不再走山门
    pos: new THREE.Vector3(
      savedPos ? savedPos.x! : privateMode ? (spawn?.x ?? 0) : (Math.random() - 0.5) * 2.4,
      0,
      savedPos ? savedPos.z! : privateMode ? (spawn?.z ?? 13.4) : 60.5,
    ),
    target: null as THREE.Vector3 | null,
    facing: savedPos?.facing ?? (privateMode ? 0 : 0),
    yaw: savedPos?.yaw ?? (privateMode ? 0 : 0),   // 相机在身后（殿门外侧），镜头正对塑像
    pitch: savedPos?.pitch ?? (typeof innerWidth !== 'undefined' && innerWidth < 768 ? 0.30 : 0.28),
    dist: savedPos?.dist ?? (typeof innerWidth !== 'undefined' && innerWidth < 768 ? 5.4 : 5.0),
    anim: 'idle' as 'idle' | 'walk',
    bob: 0,
    walkPhase: 0,
    speedCur: 0,
    tourOn: false,
    tourAngle: 0,
    tourStart: 0,
    fixCam: null as { p: [number, number, number]; t: [number, number, number] } | null,
    fixSnap: false,
  });

  /** 私密金阁：只在自己的 14×15m 房间里走；公共殿仍走原来的边界与碰撞体 */
  const clampRoom = (p: THREE.Vector3) => {
    if (privateMode) {
      p.x = THREE.MathUtils.clamp(p.x, -6.55, 6.55);
      p.z = THREE.MathUtils.clamp(p.z, 1.35, 14.55);
      return p;
    }
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS, BOUNDS);
    p.z = THREE.MathUtils.clamp(p.z, BOUNDS_Z_MIN, BOUNDS_Z_MAX);
    resolveCollision(p);
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS, BOUNDS);
    p.z = THREE.MathUtils.clamp(p.z, BOUNDS_Z_MIN, BOUNDS_Z_MAX);
    return p;
  };
  /* ---------- 键盘 ---------- */
  const walkTolerance = useRef(0.15);
  const waypoints = useRef<THREE.Vector3[]>([]);
  const setWalkTarget = (goal: THREE.Vector3, tolerance: number) => {
    const s = state.current;
    clampRoom(goal);
    const route = privateMode ? [goal] : planWalk(s.pos, goal,
      [...OBSTACLES, ...exteriorObstacles, ...treeObstacles], PLAYER_R, {
        minX: -BOUNDS, maxX: BOUNDS, minZ: BOUNDS_Z_MIN, maxZ: BOUNDS_Z_MAX,
      });
    const points = route.map(point => new THREE.Vector3(point.x, 0, point.z));
    s.target = points.shift() ?? null;
    waypoints.current = points;
    walkTolerance.current = tolerance;
  };
  const turn = useRef<{ from: number; delta: number; start: number; duration: number } | null>(null);
  // 供外部调用：让玩家自动走到某点（上香等场景使用）
  useEffect(() => {
    (window as any).__MD_WALK__ = (x: number, z: number, tolerance = 0.15) => {
      setWalkTarget(new THREE.Vector3(x, 0, z), tolerance);
    };
    // 运镜：上香特写时把镜头拉近并绕到侧面
    (window as any).__MD_CAM__ = (dist: number, pitch: number, yaw: number) => {
      const s = state.current;
      s.dist = dist;
      s.pitch = pitch;
      if (typeof yaw === 'number') s.yaw = yaw;
    };
    // 定点机位：上香特写用（绝对坐标 + 指定注视点），绕过第三人称跟随
    (window as any).__MD_FIXCAM__ = (p?: [number, number, number], t?: [number, number, number], snap = true) => {
      state.current.fixCam = p && t ? { p, t } : null;
      state.current.fixSnap = snap && !!(p && t);
    };
    // 当前真实位置（落座流程判断“到没到垫子”用）
    (window as any).__MD_POS__ = () => ({ x: state.current.pos.x, z: state.current.pos.z });
    (window as any).__MD_CAMPOS__ = () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z, fov: camera.fov });
    // 让玩家原地转向某个角度（落座时朝向塑像）
    (window as any).__MD_FACE__ = (rot: number, duration = 0) => {
      const s = state.current;
      s.target = null;
      if (duration > 0) {
        const delta = Math.atan2(Math.sin(rot - s.facing), Math.cos(rot - s.facing));
        turn.current = { from: s.facing, delta, start: performance.now(), duration };
      } else {
        turn.current = null;
        s.facing = rot;
      }
    };
    // 碰撞自检：传一个落点，返回被障碍推开后的位置（调试用）
    (window as any).__MD_TEST_PUSH__ = (x: number, z: number) => {
      const v = new THREE.Vector3(x, 0, z);
      resolveCollision(v);
      return { x: v.x, z: v.z };
    };
    // 调试用瞬移（不影响正常玩法）
    (window as any).__MD_TP__ = (x: number, z: number) => {
      const s = state.current;
      s.pos.set(x, s.pos.y, z);
      s.target = null;
      s.walkPhase = 0;
    };
    return () => { delete (window as any).__MD_WALK__; delete (window as any).__MD_TP__; delete (window as any).__MD_FACE__; delete (window as any).__MD_POS__; delete (window as any).__MD_TEST_PUSH__; delete (window as any).__MD_CAM__; delete (window as any).__MD_FIXCAM__; };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keyState[e.code] = true; };
    const up = (e: KeyboardEvent) => { keyState[e.code] = false; };
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, []);

  /* ---------- 指针：点地移动 / 拖拽旋转 / 双指缩放 ---------- */
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let dragMoved = 0;
    let pinchStart = 0;
    let pinchDistStart = 0;

    const groundPoint = (clientX: number, clientY: number): THREE.Vector3 | null => {
      if (!floorRef.current) return null;
      ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(floorRef.current, false);
      if (hits.length > 0) return hits[0].point.clone();
      // 殿外地坪：木地板之外（庭院）直接落到 y=0 平面，点地面也能走过去
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const out = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, out) ? out : null;
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragMoved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchDistStart = state.current.dist;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0) {
          state.current.dist = THREE.MathUtils.clamp(
            pinchDistStart * (pinchStart / d),
            CAM.distMin,
            CAM.distMax
          );
        }
        return;
      }

      dragMoved += Math.abs(dx) + Math.abs(dy);
      if (dragMoved > 6) {
        state.current.yaw -= dx * 0.005;
        state.current.pitch = THREE.MathUtils.clamp(
          state.current.pitch + dy * 0.004,
          CAM.pitchMin,
          CAM.pitchMax
        );
      }
    };

    const onUp = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.delete(e.pointerId);
      if (pointers.size < 2) { pinchStart = 0; pinchDistStart = 0; }
      if (dragMoved <= 6 && pointers.size === 0) {
        const p = groundPoint(e.clientX, e.clientY);
        if (p) setWalkTarget(p, 0.15);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.current.dist = THREE.MathUtils.clamp(
        state.current.dist + e.deltaY * 0.003,
        CAM.distMin,
        CAM.distMax
      );
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl, camera]);

  /* ---------- 每帧：移动、姿态、相机、快照 ---------- */
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const desiredCam = new THREE.Vector3();

  useFrame((_, dtRaw) => {
    // 玩家真实位置：环境层用它判断殿内/殿外，避免殿内落雨雪
    playerPos.x = state.current.pos.x;
    playerPos.z = state.current.pos.z;
    const dt = Math.min(dtRaw, 0.05);
    const s = state.current;
    // 陀螺仪：把手机倾斜量叠到视角上（未开启时返回 null，完全不参与计算）
    const gyro = consumeGyro();
    if (gyro && !s.fixCam) {
      s.yaw += gyro.yaw;
      s.pitch = THREE.MathUtils.clamp(s.pitch + gyro.pitch, CAM.pitchMin, CAM.pitchMax);
    }
    const sitting = machine.state === 'sitting';
    if (!sitting) activeTeaSeat.current = null;
    const nearbySeat = sitting && !activeTeaSeat.current && !activeBench.current
      ? nearestSeat(s.pos.x, s.pos.z) : null;
    if (nearbySeat) {
      if (nearbySeat.kind === 'tea') activeTeaSeat.current = nearbySeat;
      else activeBench.current = nearbySeat;
      s.target = null;
      turn.current = null;
    }
    const lock = nearbySeat ? 'all' : machine.moveLock();

    move.set(0, 0, 0);
    const touring = store.hud.tourActive;

    if (touring) {
      // 绕塔自动巡游：沿塔基圆周行走，面向切线方向，一圈后回出生点
      if (!s.tourOn) {
        s.tourOn = true;
        s.tourAngle = Math.atan2(s.pos.x - PAGODA_POS[0], s.pos.z - PAGODA_POS[1]);
        s.tourStart = s.tourAngle;
      }
      s.tourAngle += dt * TOUR_SPEED;
      s.pos.x = PAGODA_POS[0] + PAGODA_RADIUS * Math.sin(s.tourAngle);
      s.pos.z = PAGODA_POS[1] + PAGODA_RADIUS * Math.cos(s.tourAngle);
      const tx = Math.cos(s.tourAngle);
      const tz = -Math.sin(s.tourAngle);
      const targetRot = Math.atan2(-tx, -tz);
      let diff = targetRot - s.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.facing += diff * Math.min(1, dt * 12);
      s.target = null;
      s.anim = 'walk';
      s.walkPhase += (dt * TOUR_SPEED * PAGODA_RADIUS) / 0.30 * Math.PI;
      if (s.tourAngle - s.tourStart >= Math.PI * 2) {
        store.endTour();
        s.pos.copy(HOME);
        s.facing = 0;
        s.tourOn = false;
      }
    } else {
      s.tourOn = false;
      if (lock === 'all') s.target = null;

      if (lock !== 'all') {
        forward.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
        right.set(-forward.z, 0, forward.x);
        if (keyState['KeyW'] || keyState['ArrowUp']) move.add(forward);
        if (keyState['KeyS'] || keyState['ArrowDown']) move.sub(forward);
        if (keyState['KeyA'] || keyState['ArrowLeft']) move.sub(right);
        if (keyState['KeyD'] || keyState['ArrowRight']) move.add(right);

        // 触屏摇杆
        if (stick.active) {
          move.addScaledVector(forward, stick.up);
          move.addScaledVector(right, stick.right);
        }

        if (move.lengthSq() > 0) {
          s.target = null;
        } else if (s.target) {
          move.subVectors(s.target, s.pos);
          move.y = 0;
          const tolerance = waypoints.current.length ? 0.015 : walkTolerance.current;
          if (move.length() < tolerance) {
            s.target = waypoints.current.shift() ?? null;
            if (s.target) {
              move.subVectors(s.target, s.pos);
              move.y = 0;
            } else {
              move.set(0, 0, 0);
            }
          }
        }
      }
    }

    const moving = move.lengthSq() > 0.0001 || touring;
    if (moving) turn.current = null;
    if (turn.current) {
      const { from, delta, start, duration } = turn.current;
      const progress = Math.min(1, (performance.now() - start) / duration);
      s.facing = from + delta * THREE.MathUtils.smoothstep(progress, 0, 1);
      if (progress === 1) turn.current = null;
    }
    // 速度平滑：起步加速、停步减速，看起来是"走起来/停下来"而不是瞬间平移
    const speedK = (window as unknown as { __MD_SPEED_K__?: number }).__MD_SPEED_K__ ?? 1;
    const wantSpeed = moving ? MOVE_SPEED * speedK : 0;
    s.speedCur += (wantSpeed - s.speedCur) * Math.min(1, dt * 5);
    if (!touring) s.anim = s.speedCur > 0.12 ? 'walk' : 'idle';

    // —— 玩家之间：不能互相穿过，相遇时倾身抱拳行礼再错开 ——
    const peers = [...store.peers.values()];
    let nearPeer = false;
    for (const p of peers) {
      const dx = s.pos.x - p.x;
      const dz = s.pos.z - p.z;
      if (dx * dx + dz * dz < 1.55 * 1.55) { nearPeer = true; break; }
    }
    const nowMs = performance.now();
    if (nearPeer && nowMs > greetCool.current) {
      greetUntil.current = nowMs + 1500;      // 行礼 1.5 秒
      greetCool.current = nowMs + 6000;       // 同一人 6 秒内不再重复行礼
    }
    const greeting = nowMs < greetUntil.current;
    // 互为障碍：把别人的身体推开，谁也别从对方身上穿过去
    for (const p of peers) {
      const dx = s.pos.x - p.x;
      const dz = s.pos.z - p.z;
      const d2 = dx * dx + dz * dz;
      const R2 = 0.52;
      if (d2 < R2 * R2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        s.pos.x = p.x + (dx / d) * R2;
        s.pos.z = p.z + (dz / d) * R2;
      }
    }

    if (moving && !touring && !greeting) {
      move.normalize();
      if (lock !== 'translate') {
        const x = s.pos.x;
        const z = s.pos.z;
        const step = s.target ? Math.min(s.speedCur * dt, Math.hypot(s.target.x - x, s.target.z - z)) : s.speedCur * dt;
        s.pos.addScaledVector(move, step);
        s.pos.x = THREE.MathUtils.clamp(s.pos.x, -BOUNDS, BOUNDS);
        s.pos.z = THREE.MathUtils.clamp(s.pos.z, BOUNDS_Z_MIN, BOUNDS_Z_MAX);
        clampRoom(s.pos);
        const prev = s.walkPhase;
        s.walkPhase += Math.hypot(s.pos.x - x, s.pos.z - z) / 0.30 * Math.PI; // 一个 π = 一步 0.30 m，相位与位移绑定，脚不打滑
        // 每迈出一步（相位跨过 π 的整数倍）响一次脚步
        if (Math.floor(prev / Math.PI) !== Math.floor(s.walkPhase / Math.PI)) {
          sharedAudio.engine?.step(s.pos.z < 31 && s.pos.z > -15);
        }
      }
      const targetRot = Math.atan2(-move.x, -move.z);
      let diff = targetRot - s.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.facing += diff * Math.min(1, dt * 12);
    }

    // 移动打断动作
    if (machine.isActive() && moving) machine.interruptByMove();

    s.bob = moving ? Math.abs(Math.sin(performance.now() * 0.01)) * 0.04 : 0;

    // 把实时动作状态写给 SkinAvatar（每帧生效，不受 React 渲染时机影响）
    playerMotion.motion = s.anim;
    playerMotion.phase = s.walkPhase;
    if (!(window as unknown as { __MD_LOCK__?: boolean }).__MD_LOCK__) {
      playerMotion.action = machine.state === 'sitting' && (activeTeaSeat.current || activeBench.current)
        ? 'sitting' : greeting ? 'greet' : action;
    }
    // 每秒记一次站位，刷新后能回到原处
    if (nowMs - lastSave.current > 1000) {
      lastSave.current = nowMs;
      if (!privateMode) {
        try {
          localStorage.setItem('mindulle.pos', JSON.stringify({
            x: s.pos.x, z: s.pos.z, facing: s.facing,
            yaw: s.yaw, pitch: s.pitch, dist: s.dist,
            // 坐着就把坐具类型记下来，刷新后恢复坐姿而不是站着
            // 用 machine.state 判断（每帧都是最新值），props 里的 action 可能滞后
            seat: (window as unknown as { __MD_SEAT__?: string | null }).__MD_SEAT__ ?? null,
          }));
        } catch { /* 隐私模式忽略 */ }
      }
    }
    // 把自己的位置暴露出去，让别人也能判定相遇（各自本地算，不走服务端）
    (window as unknown as { __MD_SELF__?: { x: number; z: number } }).__MD_SELF__ = {
      x: s.pos.x, z: s.pos.z,
    };

    const kneel = action === 'kowtow' || action === 'bowing' || action === 'wood_hit' || action === 'beads';
    // 行礼、问讯一律面向正前方（-z，台座方向）
    if (action === 'kowtow' || action === 'bowing') {
      let fd = 0 - s.facing;
      while (fd > Math.PI) fd -= Math.PI * 2;
      while (fd < -Math.PI) fd += Math.PI * 2;
      s.facing += fd * Math.min(1, dt * 4);
    }
    let targetY = kneel ? CUSHION_Y : 0;
    if (machine.state === 'sitting') {
      // 坐下时找最近的可坐位置（茶室坐垫 / 庭院长凳），缓慢吸附过去并转向
      const best = activeTeaSeat.current ?? activeBench.current ?? nearestSeat(s.pos.x, s.pos.z);
      const wantKind = best ? best.kind : 'floor';
      if (wantKind !== seatKindRef.current) { seatKindRef.current = wantKind; setSeatKindState(wantKind); }
      if (best) {
        const k = Math.min(1, dt * 7);
        const bench = best.kind === 'bench';
        if (bench) activeBench.current = best;
        const forwardOffset = bench ? 0.16 : 0;
        const rot = best.rot ?? 0;
        s.pos.x += (best.x - Math.sin(rot) * forwardOffset - s.pos.x) * k;
        s.pos.z += (best.z - Math.cos(rot) * forwardOffset - s.pos.z) * k;
        if (best.rot !== undefined) {
          let diff = best.rot - s.facing;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.facing += diff * Math.min(1, dt * 5);
        }
        playerMotion.seatKind = best.kind;
        targetY = bench ? 0 : best.y;
      } else {
        playerMotion.seatKind = 'floor';
        targetY = CUSHION_Y;
      }
    } else {
      const bench = activeBench.current;
      if (bench) {
        activeBench.current = null;
        const facing = bench.rot ?? s.facing;
        const clearance = 0.76;
        s.pos.x = bench.x - Math.sin(facing) * clearance;
        s.pos.z = bench.z - Math.cos(facing) * clearance;
        clampRoom(s.pos);
      }
      playerMotion.seatKind = 'floor';
      if (seatKindRef.current !== 'floor') { seatKindRef.current = 'floor'; setSeatKindState('floor'); }
    }
    // 坐在长凳上时豁免长凳自身碰撞，避免被推离凳面
    (window as unknown as { __MD_SEATED_BENCH__?: boolean }).__MD_SEATED_BENCH__ =
      machine.state === 'sitting' && seatKindRef.current === 'bench';
    // 坐姿类型写到 window，保存记忆时直接读，避免闭包里的旧值
    (window as unknown as { __MD_SEAT__?: string | null }).__MD_SEAT__ =
      machine.state === 'sitting' ? seatKindRef.current : null;
    s.pos.y += (targetY - s.pos.y) * Math.min(1, dt * 6);
    if (groupRef.current) {
      groupRef.current.position.copy(s.pos);
      groupRef.current.rotation.y = s.facing;
      // 上香等近距离场景按需放大：目标值由 __MD_SCALE__(k) 设定
      const wantK = (window as unknown as { __MD_SCALE_K__?: number }).__MD_SCALE_K__ ?? 1;
      const cur = groupRef.current.scale.x;
      const k = cur + (wantK - cur) * Math.min(1, dt * 4);
      groupRef.current.scale.setScalar(k);
    }

    // 第三人称跟随相机（巡游时拉远并抬高俯视，避免贴塔/门遮挡）
    if (s.fixCam) {
      desiredCam.set(s.fixCam.p[0], s.fixCam.p[1], s.fixCam.p[2]);
      if (s.fixSnap) {
        camera.position.copy(desiredCam);   // 切机位时直接切过去，避免长距离滑行
        s.fixSnap = false;
      } else {
        camera.position.lerp(desiredCam, 1 - Math.exp(-16 * dt));
      }
      camera.lookAt(s.fixCam.t[0], s.fixCam.t[1], s.fixCam.t[2]);
      onMove({ x: Number(s.pos.x.toFixed(3)), z: Number(s.pos.z.toFixed(3)), rot: Number(s.facing.toFixed(3)), anim: s.anim });
      return;
    }
    const camDist = touring ? 8.6 : s.dist;
    const camPitch = touring ? 0.55 : s.pitch;
    const cp = Math.cos(camPitch);
    const sp = Math.sin(camPitch);
    desiredCam.set(
      s.pos.x + Math.sin(s.yaw) * cp * camDist,
      s.pos.y + sp * camDist + 1.05,
      s.pos.z + Math.cos(s.yaw) * cp * camDist
    );
    // 相机限位：随 34×46 的大殿边界，走到墙边时相机不能穿出殿外，也不能顶到顶棚
    desiredCam.x = THREE.MathUtils.clamp(desiredCam.x, -21.0, 21.0);
    desiredCam.z = THREE.MathUtils.clamp(desiredCam.z, -12.4, 66.0);
    desiredCam.y = THREE.MathUtils.clamp(desiredCam.y, 1.0, 4.1);
    camera.position.lerp(desiredCam, 1 - Math.exp(-7 * dt));
    camera.lookAt(s.pos.x, s.pos.y + 1.45, s.pos.z);

    onMove({
      x: Number(s.pos.x.toFixed(3)),
      z: Number(s.pos.z.toFixed(3)),
      rot: Number(s.facing.toFixed(3)),
      anim: s.anim,
    });
  });


/** 脚下接地阴影贴图：让角色“踩”在地板上，不再像悬空 */
const contactShadowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  rg.addColorStop(0, 'rgba(0,0,0,0.92)');
  rg.addColorStop(0.42, 'rgba(0,0,0,0.42)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

  return (
    <>
      {/* 隐形地板：仅供点击移动射线检测 */}
      <mesh ref={floorRef} rotation-x={-Math.PI / 2} visible={false}>
        <planeGeometry args={[20, 20]} />
      </mesh>
      <group ref={groupRef}>
        {/* 接地阴影（跟着角色走，压在地板上） */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.016, 0]} renderOrder={2}>
          <planeGeometry args={[0.64, 0.64]} />
          <meshBasicMaterial map={contactShadowTex} transparent depthWrite={false} opacity={0.75} />
        </mesh>
        {AVATAR_STYLE === 'bone' ? (
          <BoneAvatar height={1.42} motion={state.current.anim} action={action} />
        ) : AVATAR_STYLE === 'skin' ? (
          <SkinAvatar height={1.55} motion={state.current.anim} action={action} seatKind={seatKindState} stridePhase={state.current.walkPhase} />
        ) : AVATAR_STYLE === 'sculpt' ? (
          <SculptAvatar height={1.42} motion={state.current.anim} action={action} />
        ) : AVATAR_STYLE === 'figure' ? (
          FigureAvatar({ color, action, anim: state.current.anim, bob: state.current.bob })
        ) : (
          RiggedAvatar({ color, action, anim: state.current.anim, bob: state.current.bob })
        )}
        <NameTag name={name} />
        {!privateMode && <PaidAura />}
      </group>
    </>
  );
}

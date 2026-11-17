/**
 * NpcCrowd.tsx —— 法堂「人气」系统（虚拟角色）
 *
 * 外观统一采用与玩家同一套骨骼模型（SkinAvatar），保证和「我这只角色」长一样。
 *  · 殿内：坐垫上各有节奏地行礼；其中一部分会站起来、走出去、站定合手，再回垫子继续拜。
 *  · 殿外：庭院里游走；撞见真人或彼此撞上时停下合手，再各自错开继续走（不凭空消失）。
 *  · 让位：只有殿内座位保留「真人走近就隐去」，庭院的人不再消失。
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SkinAvatar from '../avatar/SkinAvatar';
import { CUSHION_ROWS, CUSHION_COLS, HALL_SCALE } from '../config';
import { pushOutOfYard } from './yardObstacles';

const HALL_N = 14;
const WALK_N = 6;
const CUSHION_Y = 0.087;
const REVEAL_DIST = 3.2;

/** 庭院游走者共享坐标（彼此合手让路用） */
const walkerPos: { x: number; z: number }[] = Array.from({ length: WALK_N }, () => ({ x: 0, z: 999 }));

/** 殿内座位：从坐垫阵列里均匀挑 14 个，避开通往塑像的中轴走道 */
function seatList() {
  const all: { x: number; z: number }[] = [];
  for (const z of CUSHION_ROWS) {
    for (const x of CUSHION_COLS) {
      if (Math.abs(x) < 1.15) continue;
      const wz = 8 + (z - 8) * HALL_SCALE;
      // 香案与塑像台之前就是禁区，也不许站到殿门外
      if (wz < 2.2 || wz > 18.5) continue;
      all.push({ x: x * HALL_SCALE, z: wz });
    }
  }
  const step = all.length / HALL_N;
  return Array.from({ length: HALL_N }, (_, i) => all[Math.floor(i * step)]);
}

/* ---------- 殿内：行礼 + 起身走动 ---------- */

const DOOR_Z = 19.6;   // 殿门在世界坐标里的 z（走过这里就算出了殿）

function SeatedAvatar({ x, z, i }: { x: number; z: number; i: number }) {
  const ref = useRef<THREE.Group>(null);
  // 三种人：0 = 起身走到走道边合手再回；1 = 沿走道走到殿门、出门消失、过一会儿再从殿门走回来；2 = 一直行礼
  const mode = i % 3;
  const period = 44 + (i % 5) * 6.5;
  const offset = i * 3.71;
  const OUT = 1.3;
  const SPEED_OUT = 1.5;
  const SPEED_IN = 1.9;

  const dSide = Math.abs(x) / SPEED_OUT;                 // 横着挪到中心走道
  const dLane = Math.max(0.6, DOOR_Z - z) / SPEED_OUT;   // 沿走道走到殿门
  const leaveDur = dSide + dLane;
  const enterDur = (Math.abs(x) / SPEED_IN) + (Math.max(0.6, DOOR_Z - z) / SPEED_IN);
  const awayDur = 4 + (i % 4) * 1.8;                     // 在殿外待多久（期间殿内少一个人）
  const seatDur = Math.max(12, period - leaveDur - enterDur - awayDur);

  const [pose, setPose] = useState<{ action: 'kowtow' | 'praying' | 'idle'; motion: 'idle' | 'walk' }>({
    action: 'kowtow',
    motion: 'idle',
  });
  const phase = useRef(i * 0.9);
  const [stride, setStride] = useState(i * 0.9);
  const lastZ = useRef(z);
  const lastX = useRef(x);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;

    const p = (window as any).__MD_POS__ ? (window as any).__MD_POS__() : { x: 0, z: 60 };
    const nearPlayer = Math.hypot(p.x - x, p.z - z) < REVEAL_DIST;
    const cyc = (clock.getElapsedTime() + offset) % period;

    let px = x, pz = z, rot = 0, visible = !nearPlayer;
    let action: 'kowtow' | 'praying' | 'idle' = 'kowtow';
    let motion: 'idle' | 'walk' = 'idle';

    if (mode === 0) {
      // 起身、走到走道边、站定合手、再走回来
      const bowTime = period - 7.0;
      if (cyc >= bowTime) {
        const lc = cyc - bowTime;
        if (lc < 2.0) { pz = z + OUT * (lc / 2.0); rot = Math.PI; action = 'idle'; motion = 'walk'; }
        else if (lc < 4.0) { pz = z + OUT; rot = Math.PI; action = 'praying'; }
        else { pz = z + OUT * Math.max(0, (7.0 - lc) / 3.0); rot = 0; action = 'idle'; motion = 'walk'; }
      }
    } else if (mode === 1) {
      // 走出殿外：先横挪到中心走道，再顺着走道走到殿门，出门就隐去；过一会儿从殿门走回来坐下继续拜
      if (cyc < seatDur) {
        // 坐着行礼
      } else if (cyc < seatDur + leaveDur) {
        const tc = cyc - seatDur;
        if (tc < dSide) {
          const k = tc / dSide;
          px = x * (1 - k); pz = z; rot = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else {
          const k = (tc - dSide) / (leaveDur - dSide);
          px = 0; pz = z + (DOOR_Z - z) * k; rot = Math.PI;
        }
        action = 'idle'; motion = 'walk';
      } else if (cyc < seatDur + leaveDur + awayDur) {
        px = 0; pz = DOOR_Z + 0.4; visible = false;   // 已经出了殿门
      } else {
        const tc = cyc - seatDur - leaveDur - awayDur;
        const k = Math.min(1, tc / enterDur);
        // 从殿门顺着走道走进来，再横着回到自己的垫子
        const side = Math.abs(x) / (Math.abs(x) + Math.max(0.6, DOOR_Z - z));
        if (k < 1 - side) {
          const kk = k / (1 - side);
          px = 0; pz = DOOR_Z - (DOOR_Z - z) * kk; rot = 0;
        } else {
          const kk = (k - (1 - side)) / side;
          px = x * kk; pz = z;   // 从走道挪回自己的垫子
          rot = kk > 0.6 ? 0 : (x > 0 ? -Math.PI / 2 : Math.PI / 2);
        }
        action = 'idle'; motion = 'walk';
        if (k >= 1) { px = x; pz = z; action = 'kowtow'; motion = 'idle'; rot = 0; }
      }
    }

    g.visible = visible;
    if (!visible) return;

    g.position.set(px, CUSHION_Y, pz);
    g.rotation.y = rot;
    if (pose.action !== action || pose.motion !== motion) setPose({ action, motion });

    // 步态相位跟位移走，脚不打滑
    const moved = Math.abs(pz - lastZ.current) + Math.abs(px - lastX.current);
    phase.current += moved * 2.2;
    lastZ.current = pz;
    lastX.current = px;
    if (Math.abs(phase.current - stride) > 0.5) setStride(phase.current);
  });

  return (
    <group ref={ref} position={[x, CUSHION_Y, z]}>
      <SkinAvatar
        height={1.42}
        action={pose.action}
        motion={pose.motion}
        stridePhase={stride}
        live={false}
        timeShift={i * 1.37 + (i % 3) * 0.8}
      />
    </group>
  );
}

/* ---------- 殿外：庭院游走 + 撞见合手 ---------- */

function Walker({ i }: { i: number }) {
  const ref = useRef<THREE.Group>(null);
  const s = useRef({
    r: 7 + ((i * 3.17) % 6),
    a: (i * 2.399) % (Math.PI * 2),
    sp: 0.12 + ((i * 0.37) % 0.12),
    pause: 0,
    cool: 0,
    faceX: 0,
    faceZ: 0,
  });
  const [pose, setPose] = useState<{ action: 'idle' | 'praying'; motion: 'idle' | 'walk' }>({
    action: 'idle',
    motion: 'walk',
  });
  const phase = useRef(i * 1.3);
  const [stride, setStride] = useState(i * 1.3);

  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    const st = s.current;
    const p = (window as any).__MD_POS__ ? (window as any).__MD_POS__() : { x: 0, z: 60 };
    if (st.cool > 0) st.cool -= d;

    // 轨道位置先算出来，再被茶室、祈愿壁、石塔、莲花池、长凳推开 —— 角色绕行而不穿身
    const rawX = Math.cos(st.a) * st.r;
    const rawZ = 40 + Math.sin(st.a) * st.r * 0.7;
    const pushed = pushOutOfYard(rawX, rawZ, 0.28);
    const px = pushed.x;
    const pz = pushed.z;

    // 合手判定：撞见真人 / 撞见另一位角色
    let hit = false;
    let greetX = 0;
    let greetZ = 0;
    if (Math.hypot(px - p.x, pz - p.z) < 1.6) {
      hit = true;
      greetX = p.x;
      greetZ = p.z;
    }
    if (!hit) {
      for (let k = 0; k < WALK_N; k++) {
        if (k === i) continue;
        const o = walkerPos[k];
        if (o.z > 900) continue;
        if (Math.hypot(px - o.x, pz - o.z) < 1.35) {
          hit = true;
          greetX = o.x;
          greetZ = o.z;
          break;
        }
      }
    }

    if (st.pause > 0) {
      st.pause -= d;
      g.position.set(px, 0, pz);
      g.rotation.y = Math.atan2(st.faceX - px, st.faceZ - pz) + Math.PI;
      if (pose.action !== 'praying' || pose.motion !== 'idle') setPose({ action: 'praying', motion: 'idle' });
      if (st.pause <= 0) {
        // 合手之后各自错开半个方位
        st.a += i % 2 === 0 ? 0.6 : -0.6;
        st.cool = 4;
        setPose({ action: 'idle', motion: 'walk' });
      }
      walkerPos[i].x = px;
      walkerPos[i].z = pz;
      return;
    }

    if (hit && st.cool <= 0) {
      st.pause = 1.7;
      st.faceX = greetX;
      st.faceZ = greetZ;
      g.position.set(px, 0, pz);
      g.rotation.y = Math.atan2(greetX - px, greetZ - pz) + Math.PI;
      setPose({ action: 'praying', motion: 'idle' });
      walkerPos[i].x = px;
      walkerPos[i].z = pz;
      return;
    }

    // 行进
    st.a += st.sp * d;
    const ax = Math.cos(st.a) * st.r;
    const az = 40 + Math.sin(st.a) * st.r * 0.7;
    const dx = -Math.sin(st.a) * st.r;
    const dz = Math.cos(st.a) * st.r * 0.7;
    // 行进这一步也要绕障碍：否则它只会在"合手暂停"时才被推开，
    // 正常走路时依旧从茶室、祈愿壁、石塔里穿过去。
    const walkPos = pushOutOfYard(ax, az, 0.30);
    g.position.set(walkPos.x, 0, walkPos.z);
    g.rotation.y = Math.atan2(dx, dz) + Math.PI;
    if (pose.action !== 'idle' || pose.motion !== 'walk') setPose({ action: 'idle', motion: 'walk' });

    const move = Math.hypot(walkPos.x - walkerPos[i].x, walkPos.z - walkerPos[i].z);
    walkerPos[i].x = walkPos.x;
    walkerPos[i].z = walkPos.z;
    phase.current += Math.min(move, 0.5) * 2.4;
    if (Math.abs(phase.current - stride) > 0.5) setStride(phase.current);
  });

  return (
    <group ref={ref} position={[0, 0, 40]}>
      <SkinAvatar height={1.55} action={pose.action} motion={pose.motion} stridePhase={stride} live={false} />
    </group>
  );
}

export default function NpcCrowd() {
  const seats = useMemo(seatList, []);
  return (
    <group>
      {seats.map((s, i) => (
        <SeatedAvatar key={`s${i}`} x={s.x} z={s.z} i={i} />
      ))}
      {Array.from({ length: WALK_N }, (_, i) => (
        <Walker key={`w${i}`} i={i} />
      ))}
    </group>
  );
}

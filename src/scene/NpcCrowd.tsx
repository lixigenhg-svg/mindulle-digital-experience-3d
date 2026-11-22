import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SkinAvatar from '../avatar/SkinAvatar';
import { npcCushions } from '../player/cushions';
import { pushOutOfYard } from './yardObstacles';
import { Encounter, facePoint, npcEncounterPoints, turnToward } from '../avatar/encounter';
import { store } from '../store';

const WALK_N = 6;
const CUSHION_Y = 0.087;
function useNpcEncounter(id: string) {
  const encounter = useRef(new Encounter());
  const departure = useRef(0);
  const phase = useRef(0);
  useEffect(() => () => { npcEncounterPoints.delete(id); }, [id]);

  return (group: THREE.Group, dt: number, yard: boolean) => {
    npcEncounterPoints.set(id, { x: group.position.x, z: group.position.z });
    const self = (window as unknown as { __MD_SELF__?: { x: number; z: number } }).__MD_SELF__;
    const people: { x: number; z: number }[] = [...store.peers.values(), ...npcEncounterPoints.values()];
    if (self) people.push(self);
    const meet = encounter.current;
    const stage = meet.update(group.position, people, departure.current <= 0, dt);
    if (stage === 'leave') departure.current = 0.9;
    if (departure.current > 0) {
      departure.current -= dt;
      const x = group.position.x - Math.sin(group.rotation.y) * 0.65 * dt;
      const z = group.position.z - Math.cos(group.rotation.y) * 0.65 * dt;
      const point = yard ? pushOutOfYard(x, z, 0.30) : { x, z };
      phase.current += Math.hypot(point.x - group.position.x, point.z - group.position.z) * Math.PI / 0.30;
      group.position.x = point.x;
      group.position.z = point.z;
      return { action: 'idle' as const, motion: 'walk' as const, phase: phase.current };
    }
    if (stage === 'none' || !meet.target) return null;
    const facing = facePoint(group.position, meet.target);
    group.rotation.y = turnToward(group.rotation.y, stage === 'turn' ? facing + Math.PI : facing, dt * 7);
    return { action: stage === 'bow' ? 'greet' as const : 'idle' as const, motion: 'idle' as const };
  };
}

/* ---------- 殿内：行礼 + 起身走动 ---------- */

const DOOR_Z = 19.6;   // 殿门在世界坐标里的 z（走过这里就算出了殿）

function SeatedAvatar({ x, z, i }: { x: number; z: number; i: number }) {
  const ref = useRef<THREE.Group>(null);
  const handleEncounter = useNpcEncounter(`hall-${i}`);
  const elapsed = useRef(i * 3.71);
  // 三种人：0 = 起身走到走道边合手再回；1 = 沿走道走到殿门、停留一会儿再走回来；2 = 一直行礼
  const mode = i % 3;
  const period = 44 + (i % 5) * 6.5;
  const OUT = 1.3;
  const SPEED_OUT = 1.5;
  const SPEED_IN = 1.9;

  const dSide = Math.abs(x) / SPEED_OUT;                 // 横着挪到中心走道
  const dLane = Math.max(0.6, DOOR_Z - z) / SPEED_OUT;   // 沿走道走到殿门
  const leaveDur = dSide + dLane;
  const enterDur = (Math.abs(x) / SPEED_IN) + (Math.max(0.6, DOOR_Z - z) / SPEED_IN);
  const awayDur = 4 + (i % 4) * 1.8;                     // 在殿门停留多久
  const seatDur = Math.max(12, period - leaveDur - enterDur - awayDur);

  const [pose, setPose] = useState<{ action: 'kowtow' | 'praying' | 'idle' | 'greet'; motion: 'idle' | 'walk' }>({
    action: 'kowtow',
    motion: 'idle',
  });
  const phase = useRef(i * 0.9);
  const [stride, setStride] = useState(i * 0.9);
  const lastZ = useRef(z);
  const lastX = useRef(x);

  useFrame((_, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const interaction = handleEncounter(g, dt, false);
    if (interaction) {
      if (pose.action !== interaction.action || pose.motion !== interaction.motion) setPose(interaction);
      if (interaction.phase !== undefined) setStride(interaction.phase);
      lastX.current = g.position.x;
      lastZ.current = g.position.z;
      return;
    }
    elapsed.current += dt;
    const cyc = elapsed.current % period;
    let px = x, pz = z, rot = 0;
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
      // 走出殿外：先横挪到中心走道，再顺着走道走到殿门，停在门边；过一会儿从殿门走回来坐下继续拜
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
        px = 0; pz = DOOR_Z; rot = Math.PI; action = 'idle';
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

    const dx = px - g.position.x;
    const dz = pz - g.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.05) {
      action = 'idle';
      motion = 'walk';
      rot = facePoint(g.position, { x: px, z: pz });
    }
    const step = Math.min(1, 1.95 * dt / Math.max(distance, 0.001));
    g.position.x += dx * step;
    g.position.z += dz * step;
    g.rotation.y = turnToward(g.rotation.y, rot, dt * 7);
    if (pose.action !== action || pose.motion !== motion) setPose({ action, motion });

    phase.current += Math.hypot(g.position.z - lastZ.current, g.position.x - lastX.current) * Math.PI / 0.30;
    lastZ.current = g.position.z;
    lastX.current = g.position.x;
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
  const handleEncounter = useNpcEncounter(`yard-${i}`);
  const radius = 7 + ((i * 3.17) % 6);
  const angle = useRef((i * 2.399) % (2 * Math.PI));
  const speed = 0.12 + ((i * 0.37) % 0.12);
  const initial = useMemo(() => pushOutOfYard(Math.cos(angle.current) * radius,
    40 + Math.sin(angle.current) * radius * 0.7, 0.30), [radius]);
  const playback = useRef<{ action: 'idle' | 'greet'; motion: 'idle' | 'walk'; phase: number }>({
    action: 'idle', motion: 'walk', phase: i * 1.3,
  });

  useFrame((_, rawDt) => {
    const group = ref.current;
    if (!group) return;
    const dt = Math.min(0.05, rawDt);
    const pose = playback.current;
    const interaction = handleEncounter(group, dt, true);
    if (interaction) {
      pose.action = interaction.action;
      pose.motion = interaction.motion;
      if (interaction.phase !== undefined) pose.phase = interaction.phase;
      return;
    }
    angle.current += speed * dt;
    const goal = pushOutOfYard(Math.cos(angle.current) * radius,
      40 + Math.sin(angle.current) * radius * 0.7, 0.30);
    const dx = goal.x - group.position.x;
    const dz = goal.z - group.position.z;
    const distance = Math.hypot(dx, dz);
    const step = Math.min(1, 1.8 * dt / Math.max(distance, 0.001));
    if (distance > 0.002) group.rotation.y = turnToward(group.rotation.y,
      facePoint(group.position, goal), dt * 7);
    const x = group.position.x;
    const z = group.position.z;
    const next = pushOutOfYard(x + dx * step, z + dz * step, 0.30);
    group.position.x = next.x;
    group.position.z = next.z;
    pose.action = 'idle';
    pose.motion = distance > 0.002 ? 'walk' : 'idle';
    pose.phase += Math.hypot(next.x - x, next.z - z) * Math.PI / 0.30;
  });

  return (
    <group ref={ref} position={[initial.x, 0, initial.z]}>
      <SkinAvatar height={1.55} playback={playback} live={false} />
    </group>
  );
}

export default function NpcCrowd() {
  return (
    <group>
      {npcCushions.map((s, i) => (
        <SeatedAvatar key={`s${i}`} x={s.x} z={s.z} i={i} />
      ))}
      {Array.from({ length: WALK_N }, (_, i) => (
        <Walker key={`w${i}`} i={i} />
      ))}
    </group>
  );
}

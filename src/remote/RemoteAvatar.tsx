/**
 * RemoteAvatar.tsx —— 单个远端小角色：位置/朝向平滑插值，动作事件回放，一次性动作到时回收。
 * 远端不播音效、不显示法号（零社交）。
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PRAY_MS, type ActionState } from '../actions';
import type { PeerState } from '../store';
import SkinAvatar from '../avatar/SkinAvatar';
import { Encounter, facePoint, npcEncounterPoints, turnToward } from '../avatar/encounter';
import { store } from '../store';
import { readCushionSignal } from '../player/cushions';
import type { Action, Motion } from '../avatar/animState';

const WOODFISH_MS = 700;

export default function RemoteAvatar({ peer }: { peer: PeerState }) {
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(peer.x, 0, peer.z));
  const initial = useRef({ x: peer.x, z: peer.z, rot: peer.rot }).current;
  const playback = useRef<{ action: Action; motion: Motion; phase: number }>({
    action: 'idle', motion: 'idle', phase: 0,
  });
  const state = useRef<ActionState>('idle');
  const until = useRef(0);
  const latest = useRef(peer);
  const encounter = useRef(new Encounter());
  latest.current = peer;

  const replay = (action?: string) => {
    if (!action) return;
    const now = performance.now();
    switch (action) {
      case 'bow_start': state.current = 'bowing'; break;
      case 'bow_stop': state.current = 'idle'; break;
      case 'pray': state.current = 'praying'; until.current = now + PRAY_MS; break;
      case 'beads_start': state.current = 'beads'; break;
      case 'beads_stop': state.current = 'idle'; break;
      case 'wood_hit': state.current = 'wood_hit'; until.current = now + WOODFISH_MS; break;
      default: break;
    }
  };

  useEffect(() => { replay(peer.action); }, [peer.action]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const p = latest.current;
    const claim = readCushionSignal(p.anim);
    const cushionAction = claim?.state === 'k' ? 'kowtow'
      : claim?.state === 'b' ? 'bowing' : claim?.state === 's' ? 'sitting' : undefined;
    target.current.set(p.x, cushionAction ? 0.087 : 0, p.z);
    const group = groupRef.current;
    if (!group) return;
    if (until.current > 0 && performance.now() >= until.current) {
      until.current = 0;
      state.current = 'idle';
    }

    const self = (window as unknown as { __MD_SELF__?: { x: number; z: number } }).__MD_SELF__;
    const people = [...npcEncounterPoints.values(), ...[...store.peers.values()].filter(other => other.id !== p.id)];
    if (self) people.push(self);
    const meet = encounter.current;
    const stage = meet.update(group.position, people, !cushionAction && state.current === 'idle', dt);
    const pose = playback.current;
    if (meet.target && (stage === 'face' || stage === 'bow' || stage === 'turn')) {
      const facing = facePoint(group.position, meet.target);
      group.rotation.y = turnToward(group.rotation.y, stage === 'turn' ? facing + Math.PI : facing, dt * 7);
      pose.action = stage === 'bow' ? 'greet' : 'idle';
      pose.motion = 'idle';
      return;
    }

    const gap = group.position.distanceTo(target.current);
    const step = Math.min(1 - Math.pow(0.001, dt), 1.8 * dt / Math.max(gap, 0.001));
    group.position.lerp(target.current, step);
    group.rotation.y = turnToward(group.rotation.y, p.rot, dt * 7);
    const distance = gap * step;
    pose.phase += distance * Math.PI / 0.30;
    pose.action = cushionAction ?? state.current;
    pose.motion = distance > 0.001 && (p.anim === 'walk' || claim?.state === 'w' || gap > 0.12) ? 'walk' : 'idle';

  });

  return (
    <group ref={groupRef} position={[initial.x, 0, initial.z]} rotation-y={initial.rot}>
      <SkinAvatar height={1.55} playback={playback} live={false} seatKind="floor" />
    </group>
  );
}

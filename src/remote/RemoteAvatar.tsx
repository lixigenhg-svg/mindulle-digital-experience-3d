/**
 * RemoteAvatar.tsx —— 单个远端小角色：位置/朝向平滑插值，动作事件回放，一次性动作到时回收。
 * 远端不播音效、不显示法号（零社交）。
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ActionState } from '../actions';
import type { PeerState } from '../store';
import SkinAvatar from '../avatar/SkinAvatar';

const PRAY_MS = 1500;
const WOODFISH_MS = 700;

export default function RemoteAvatar({ peer }: { peer: PeerState }) {
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(peer.x, 0, peer.z));
  const rot = useRef(peer.rot);
  const state = useRef<ActionState>('idle');
  const until = useRef(0);
  const latest = useRef(peer);
  /** 与本地玩家相遇：自己这边也倾身抱拳，随后让开 */
  const greetUntil = useRef(0);
  const greetCool = useRef(0);
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
    target.current.set(p.x, 0, p.z);
    rot.current = p.rot;

    // 相遇判定：用自己的位置和本地玩家的位置比，各自本地算，不经过服务器
    const self = (window as unknown as { __MD_SELF__?: { x: number; z: number } }).__MD_SELF__;
    const nowMs = performance.now();
    if (self) {
      const dx = p.x - self.x;
      const dz = p.z - self.z;
      if (dx * dx + dz * dz < 1.55 * 1.55 && nowMs > greetCool.current) {
        greetUntil.current = nowMs + 1500;
        greetCool.current = nowMs + 6000;
      }
    }
    const greeting = nowMs < greetUntil.current;

    const group = groupRef.current;
    if (group && !greeting) {
      const alpha = 1 - Math.pow(0.001, dt);
      group.position.lerp(target.current, alpha);

      let diff = rot.current - group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.rotation.y += diff * Math.min(1, dt * 12);
    }

    if (until.current > 0 && performance.now() >= until.current) {
      until.current = 0;
      state.current = 'idle';
    }
  });

  return (
    <group ref={groupRef} position={[peer.x, 0, peer.z]} rotation-y={peer.rot}>
      {/* 所有玩家统一同一个形象：和本人一样的雕刻稿小角色 */}
      <SkinAvatar
        height={1.55}
        motion={latest.current.anim === 'walk' ? 'walk' : 'idle'}
        action={performance.now() < greetUntil.current ? 'greet' : state.current}
        live={false}
        seatKind="floor"
      />
    </group>
  );
}

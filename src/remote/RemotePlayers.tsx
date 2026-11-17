/**
 * RemotePlayers.tsx —— 远端玩家容器：订阅状态仓，按 peer 渲染。
 */
import { useSyncExternalStore } from 'react';
import { store } from '../store';
import RemoteAvatar from './RemoteAvatar';

export default function RemotePlayers() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const peers = [...store.peers.values()];
  return (
    <group>
      {peers.map(p => (
        <RemoteAvatar key={p.id} peer={p} />
      ))}
    </group>
  );
}

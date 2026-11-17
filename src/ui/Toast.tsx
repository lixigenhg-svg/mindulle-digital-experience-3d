/**
 * Toast.tsx —— 轻提示（顶部居中，HUD 下方）
 */
import { useSyncExternalStore } from 'react';
import { store } from '../store';

export default function Toast() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const msg = store.hud.toast;
  if (!msg) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-4">
      <div className="rounded-full bg-black/60 px-4 py-2 text-sm text-white/90 backdrop-blur-md">
        {msg}
      </div>
    </div>
  );
}

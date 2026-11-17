/**
 * ServerModal.tsx —— 서버 선택（服务器 / 房间选择）
 *
 * 纯前端选择占位：把所选区域 / 房间写入 URL 参数，刷新后由 net 按新房间重连。
 * 真实多服后端上线前，OFFLINE 单人模式下仅更新本地标签，不发起连接。
 */
import { useState, useSyncExternalStore } from 'react';
import { store } from '../store';
import { REGIONS, ROOMS, parseRoom, applyRoom, OFFLINE } from '../config';

export default function ServerModal() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const open = store.hud.serverOpen;
  const current = parseRoom();
  const [region, setRegion] = useState(current.region);
  const [room, setRoom] = useState(current.room);

  if (!open) return null;

  const apply = () => {
    applyRoom(region, room);
    store.setServerOpen(false);
    if (OFFLINE) {
      store.toast('싱글 모드 · 멀티 서버는 준비 중입니다');
      return;
    }
    location.reload();
  };

  return (
    <div data-testid="server-modal" className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#2b2118] p-5 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">서버 선택</h2>
          
        </div>
        <p className="mb-4 text-xs text-white/60">같은 방의 참여자와 함께 체험 공간에 머뭅니다</p>

        {/* 区域 */}
        <div className="mb-3">
          <div className="mb-1.5 text-xs text-white/55">지역</div>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map(r => (
              <button
                key={r.id}
                type="button"
                data-testid={`server-region-${r.id}`}
                onClick={() => setRegion(r.id)}
                className={`rounded-2xl px-3 py-2.5 text-left transition ${
                  region === r.id ? 'bg-white/20 text-amber-100' : 'bg-white/8 text-white/85 hover:bg-white/15'
                }`}
              >
                <div className="text-sm font-medium">{r.label}</div>
                
              </button>
            ))}
          </div>
        </div>

        {/* 房间 */}
        <div className="mb-4">
          <div className="mb-1.5 text-xs text-white/55">방</div>
          <div className="flex flex-col gap-2">
            {ROOMS.map(r => (
              <button
                key={r.id}
                type="button"
                data-testid={`server-room-${r.id}`}
                onClick={() => setRoom(r.id)}
                className={`rounded-2xl px-4 py-2.5 text-left transition ${
                  room === r.id ? 'bg-white/20 text-amber-100' : 'bg-white/8 text-white/85 hover:bg-white/15'
                }`}
              >
                <span className="text-[15px] font-medium">{r.label}</span>
                <span className="ml-2 text-xs text-white/55">{r.id}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => store.setServerOpen(false)}
            className="flex-1 rounded-full bg-white/10 py-2.5 text-sm text-white/90 transition hover:bg-white/15"
          >
            닫기
          </button>
          <button
            type="button"
            data-testid="server-apply"
            onClick={apply}
            className="flex-1 rounded-full bg-amber-200/90 py-2.5 text-sm font-medium text-[#2b2118] transition hover:bg-amber-100"
          >
            입장하기
          </button>
        </div>
      </div>
    </div>
  );
}

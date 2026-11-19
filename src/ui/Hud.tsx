/**
 * Hud.tsx —— 顶部 HUD：左胶囊（返回/地图/房间名/人数），右胶囊（米饭碗/声音/设置），
 * 右侧「배경음 켜기」椭圆开关。深色半透明磨砂。
 */
import { useSyncExternalStore } from 'react';
import { store } from '../store';

interface HudProps {
  onToggleSound: () => void;
  onToggleListen: () => void;
  onExit: () => void;
  onScreenshot: () => void;
}

function readRoom(): { roomId: string; room: string; privateRoom: boolean } {
  const parts = store.hud.roomId.split(':');
  const room = parts[1] ?? parts[0] ?? '01';
  const queryRoom = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') || '' : '';
  return { roomId: store.hud.roomId, room, privateRoom: room.startsWith('pri-') || queryRoom.startsWith('pri-') };
}

export default function Hud({ onToggleSound, onToggleListen, onExit, onScreenshot }: HudProps) {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const status = store.hud.status;
  const muted = store.hud.muted;
  const chanting = store.hud.chanting;
  const beads = store.hud.beads;
  const { roomId, room, privateRoom } = readRoom();

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-3 pt-3">
      <div className="flex items-start justify-between gap-2">
        {/* 左胶囊：返回 / 地图 / 房间名 / 人数 */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-2 backdrop-blur-md">
          <button
            type="button"
            aria-label="입구로 돌아가기"
            data-testid="exit-button"
            onClick={onExit}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="지도"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6c-2-1.5-5-2-8-2v13c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2Z" />
              <path d="M12 6v13" />
            </svg>
          </button>
          <button
            type="button"
            data-testid="server-button"
            onClick={privateRoom ? undefined : () => store.setServerOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white whitespace-nowrap transition hover:bg-white/10 rounded-full px-1.5 py-0.5"
            aria-label={privateRoom ? '프라이빗 금각' : '서버 선택'}
          >
            {privateRoom ? '프라이빗 금각' : `민들레 4D 체험관 ${room}`}
            {!privateRoom && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className="ml-1 text-[13px] font-normal text-white/80">
              {privateRoom ? `${store.hud.count}명 · 무제한` : `${store.hud.count}/${store.hud.capacity}`}
            </span>
            {roomId && <span className="sr-only">{roomId}</span>}
          </button>
        </div>

        {/* 右胶囊：米饭碗 / 声音 / 设置 */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-2 backdrop-blur-md">
          <span className="flex h-8 w-8 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 12h16a8 8 0 0 1-16 0Z" fill="#9fc7d8" />
              <ellipse cx="12" cy="11" rx="5" ry="1.7" fill="#f5f1e6" />
            </svg>
          </span>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={muted ? '음소거 해제' : '음소거'}
            data-testid="sound-toggle"
            aria-pressed={!muted}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={onScreenshot}
            aria-label="화면 저장"
            data-testid="screenshot-button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="설정"
            data-testid="settings-button"
            onClick={() => store.setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 8h10M18 8h2M4 16h2M10 16h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="16" cy="8" r="2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="8" cy="16" r="2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 배경음 켜기 + 프리미엄 진입 */}
      <div className="pointer-events-auto flex justify-end gap-2">
        {!privateRoom && (
          <button
            type="button"
            data-testid="open-premium"
            onClick={() => {
              try { sessionStorage.setItem('mindulle.premiumFocus', '1'); } catch { /* ignore */ }
              store.setSettingsOpen(true);
            }}
            className="rounded-full border border-amber-200/40 bg-amber-100/12 px-4 py-2 text-sm text-amber-100 backdrop-blur-md transition hover:bg-amber-100/20"
          >
            프리미엄
          </button>
        )}
        <button
          type="button"
          onClick={onToggleListen}
          className={`rounded-full px-4 py-2 text-sm backdrop-blur-md transition ${
            chanting ? 'bg-amber-100/25 text-amber-100' : 'bg-black/45 text-white/90 hover:bg-black/60'
          }`}
        >
          배경음 켜기
          
        </button>
      </div>

      {!privateRoom && (
        <div className="hud-beads" data-testid="hud-beads">
          <span className="hud-beads-label">108 구슬</span>
          <strong>{beads}</strong>
          <span className="hud-beads-total">/ 108</span>
        </div>
      )}

      {status && !privateRoom && (
        <div className="self-start rounded-full bg-black/35 px-3 py-1 text-xs text-white/85 backdrop-blur-sm">{status}</div>
      )}
    </div>
  );
}

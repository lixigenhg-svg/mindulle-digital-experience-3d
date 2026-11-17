/**
 * SettingsModal.tsx —— 설정 / 设置 面板
 *
 * 对齐「내가 듣는 소리」的音量设计：环境音、背景音、效果音三路音量各自独立可调，
 * 拖动即生效并写入 localStorage；下方附音源署名与操作说明。
 */
import FooterNotice from './FooterNotice';
import { useEffect, useSyncExternalStore, useState } from 'react';
import { store } from '../store';
import type { AudioBus, AudioEngine } from '../audio';

const ROWS: { bus: AudioBus; ko: string; zh: string; desc: string }[] = [
  { bus: 'ambient', ko: '환경음', zh: '', desc: '바람과 새소리' },
  { bus: 'chant', ko: '배경음', zh: '', desc: '듣고 싶을 때 나에게만' },
  { bus: 'sfx', ko: '효과음', zh: '', desc: '종소리 · 구슬 · 나무북' },
];

export default function SettingsModal({ engine }: { engine: AudioEngine | null }) {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const open = store.hud.settingsOpen;

  // 滑块受控：引擎是唯一真值来源，面板打开时同步一次，拖动时就地更新
  const [volumes, setVolumes] = useState<Record<AudioBus, number>>({ ambient: 0.35, chant: 0.26, sfx: 0.6 });
  useEffect(() => {
    if (!open || !engine) return;
    setVolumes({
      ambient: engine.getVolume('ambient'),
      chant: engine.getVolume('chant'),
      sfx: engine.getVolume('sfx'),
    });
  }, [open, engine]);

  if (!open) return null;

  const close = () => store.setSettingsOpen(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="설정 닫기"
        onClick={close}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="설정"
        data-testid="settings-modal"
        className="relative z-10 max-h-[86vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#171b14]/95 px-5 py-5 text-white shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">설정</h2>
            <p className="mt-1 text-xs text-white/55">내가 듣는 소리</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {ROWS.map(row => {
            const percent = Math.round((volumes[row.bus] ?? 0) * 100);
            return (
              <div key={row.bus} className="rounded-2xl bg-white/6 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    {row.ko}
                  </span>
                  <span className="text-xs tabular-nums text-amber-100/90" data-testid={`settings-value-${row.bus}`}>
                    {percent}%
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/45">{row.desc}</p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={percent}
                  disabled={!engine}
                  aria-label={`${row.ko} 음량`}
                  data-testid={`settings-slider-${row.bus}`}
                  onChange={e => {
                    const next = Number(e.target.value) / 100;
                    setVolumes(v => ({ ...v, [row.bus]: next }));
                    engine?.setVolume(row.bus, next);
                  }}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-amber-200
                             [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-100"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-1.5 rounded-2xl bg-white/4 px-4 py-3 text-[11px] leading-relaxed text-white/55">
          <p className="text-white/70">음원 정보</p>
          <p>음원 · 김용배 · 공유마당 · CC BY 4.0</p>
          <p>타악 음원 · 김용배 · 공유마당 · CC BY 4.0</p>
          <p>3D 모형 · 국립중앙박물관 · 공공누리 제1유형</p>
        </div>

        <div className="mt-3 space-y-1 rounded-2xl bg-white/4 px-4 py-3 text-[11px] leading-relaxed text-white/55">
          <p className="text-white/70">조작 방법</p>
          <p>바닥 클릭 · WASD · 방향키로 이동</p>
          <p>드래그로 둘러보기 · 휠로 확대/축소</p>
          <p>1 · E · Space 예 갖추기 / 2 구슬 / 3 손 모으기 / 5 나무북</p>
        </div>

        <FooterNotice compact />
      </div>
    </div>
  );
}

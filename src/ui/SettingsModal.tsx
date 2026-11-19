/**
 * SettingsModal.tsx —— 설정 / 设置 面板
 *
 * 对齐「내가 듣는 소리」的音量设计：环境音、背景音、效果音三路音量各自独立可调，
 * 拖动即生效并写入 localStorage；下方附音源署名与操作说明。
 */
import FooterNotice from './FooterNotice';
import { useEffect, useRef, useSyncExternalStore, useState } from 'react';
import { store } from '../store';
import type { AudioBus, AudioEngine } from '../audio';
import { getGyroDebug, haptic, requestGyro, setImmersive, useImmersive, type WeatherMode } from '../immersive';
import { fetchLiveWeather } from '../liveWeather';
import {
  AURAS,
  currentRoom,
  isPrivateEntitled,
  isUnlocked,
  nightMinutesLeft,
  redeemCode,
  setAura,
  setLotus,
  startNightPass,
  usePaid
} from '../paid';
import { createPrivateRoom } from '../privateRoom';

/** 环境演出档位，文案固定为韩文（日文层另行翻译） */
const WEATHERS: { id: WeatherMode; label: string }[] = [
  { id: 'none', label: '없음' },
  { id: 'leaf', label: '낙엽' },
  { id: 'snow', label: '눈' },
  { id: 'rain', label: '비' },
];

const ROWS: { bus: AudioBus; ko: string; zh: string; desc: string }[] = [
  { bus: 'ambient', ko: '환경음', zh: '', desc: '바람과 새소리' },
  { bus: 'chant', ko: '배경음', zh: '', desc: '듣고 싶을 때 나에게만' },
  { bus: 'sfx', ko: '효과음', zh: '', desc: '종소리 · 구슬 · 나무북' },
];

export default function SettingsModal({ engine }: { engine: AudioEngine | null }) {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const open = store.hud.settingsOpen;
  // Hook 必须在任何提前 return 之前调用，否则面板一开一合就会触发 React #310
  const imm = useImmersive();
  const [weatherBusy, setWeatherBusy] = useState(false);
  const paid = usePaid();
  const [codeInput, setCodeInput] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [roomLink, setRoomLink] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [roomBusy, setRoomBusy] = useState(false);
  // 陀螺仪只在有传感器的手机上有意义：桌面浏览器即使有接口也读不到姿态
  const premiumRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    let focus = false;
    try { focus = sessionStorage.getItem('mindulle.premiumFocus') === '1'; } catch { /* ignore */ }
    if (!focus) return;
    try { sessionStorage.removeItem('mindulle.premiumFocus'); } catch { /* ignore */ }
    const timer = window.setTimeout(() => {
      const el = premiumRef.current;
      if (!el) return;
      // 找到真正可滚动的祖先容器，直接改 scrollTop（部分内联预览里 scrollIntoView 不生效）
      let sc: HTMLElement | null = el.parentElement;
      while (sc) {
        const oy = getComputedStyle(sc).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && sc.scrollHeight > sc.clientHeight + 4) break;
        sc = sc.parentElement;
      }
      if (sc) sc.scrollTop = el.offsetTop - sc.offsetTop - 12;
      else el.scrollIntoView({ block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [open]);

  const [gyroDbg, setGyroDbg] = useState<{ events: number; alpha: number | null; beta: number | null } | null>(null);
  useEffect(() => {
    setGyroDbg(null);
    if (!open || !imm.gyro) return;
    const timer = window.setInterval(() => {
      const d = getGyroDebug();
      setGyroDbg({ events: d.events, alpha: d.alpha, beta: d.beta });
    }, 600);
    return () => window.clearInterval(timer);
  }, [open, imm.gyro]);

  const gyroAvailable = typeof window !== 'undefined'
    && 'DeviceOrientationEvent' in window
    && window.matchMedia('(pointer: coarse)').matches;

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

        {/* 몰입 설정：触感 / 陀螺仪 / 光影 / 环境演出 */}
        <div className="mt-4 rounded-2xl bg-white/6 px-4 py-3" data-testid="settings-immersive">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">몰입 설정</p>
            <p className="text-[11px] text-white/40">몸으로 느끼는 연출</p>
          </div>

          <button
            type="button"
            aria-pressed={imm.haptic}
            data-testid="toggle-haptic"
            onClick={() => {
              const next = !imm.haptic;
              setImmersive({ haptic: next });
              if (next) haptic('double');
            }}
            className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-2.5 text-left transition hover:bg-white/8"
          >
            <span>
              <span className="block text-[13px] text-white/85">진동 (촉감)</span>
              <span className="mt-0.5 block text-[11px] text-white/45">향·종·나무북에서 손에 느껴집니다</span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                imm.haptic ? 'bg-amber-200/90' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-[#171b14] transition-all ${
                  imm.haptic ? 'left-6' : 'left-1'
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            aria-pressed={imm.gyro}
            data-testid="toggle-gyro"
            disabled={!gyroAvailable}
            onClick={async () => {
              const next = !imm.gyro;
              if (next) {
                const ok = await requestGyro();
                if (!ok) {
                  store.toast('이 기기에서는 자이로 시점을 쓸 수 없습니다');
                  return;
                }
              }
              setImmersive({ gyro: next });
            }}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-2.5 text-left transition hover:bg-white/8 disabled:opacity-55"
          >
            <span>
              <span className="block text-[13px] text-white/85">자이로 시점</span>
              <span className={`mt-0.5 block text-[11px] ${gyroAvailable ? 'text-white/45' : 'text-white/30'}`}>
                {!gyroAvailable
                  ? '휴대폰에서만 사용할 수 있습니다'
                  : imm.gyro
                    ? gyroDbg && gyroDbg.events > 0
                      ? `작동 중 · α ${Math.round(gyroDbg.alpha ?? 0)}° · 몸을 좌우로 돌려 보세요`
                      : '센서 신호를 기다리는 중… (https · 권한 허용 확인)'
                    : '휴대폰을 좌우로 돌리면 시점이 따라 움직입니다'}
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                imm.gyro ? 'bg-amber-200/90' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-[#171b14] transition-all ${
                  imm.gyro ? 'left-6' : 'left-1'
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            aria-pressed={imm.fx}
            data-testid="toggle-fx"
            onClick={() => setImmersive({ fx: !imm.fx })}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-2.5 text-left transition hover:bg-white/8"
          >
            <span>
              <span className="block text-[13px] text-white/85">빛 연출</span>
              <span className="mt-0.5 block text-[11px] text-white/45">종소리 광파·향 불빛</span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                imm.fx ? 'bg-amber-200/90' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-[#171b14] transition-all ${
                  imm.fx ? 'left-6' : 'left-1'
                }`}
              />
            </span>
          </button>

          {/* 실시간 날씨 연동：按所在地区与实时天气自动切换演出 */}
          <button
            type="button"
            aria-pressed={imm.autoWeather}
            data-testid="toggle-autoweather"
            onClick={async () => {
              if (imm.autoWeather) {
                setImmersive({ autoWeather: false, liveLabel: '' });
                return;
              }
              setWeatherBusy(true);
              try {
                const live = await fetchLiveWeather();
                setImmersive({
                  autoWeather: true,
                  weather: live.mode,
                  wind: live.wind,
                  night: live.night,
                  liveLabel: live.label,
                });
              } catch {
                store.toast('날씨 정보를 불러오지 못했습니다');
              } finally {
                setWeatherBusy(false);
              }
            }}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-2.5 text-left transition hover:bg-white/8"
          >
            <span>
              <span className="block text-[13px] text-white/85">
                {weatherBusy ? '실시간 날씨 확인 중…' : '실시간 날씨 연동'}
              </span>
              <span className="mt-0.5 block text-[11px] text-white/45">
                {imm.autoWeather && imm.liveLabel ? imm.liveLabel : '지금 있는 곳의 날씨에 맞춰 연출이 바뀝니다'}
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                imm.autoWeather ? 'bg-amber-200/90' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-[#171b14] transition-all ${
                  imm.autoWeather ? 'left-6' : 'left-1'
                }`}
              />
            </span>
          </button>

          <div className="mt-2 rounded-xl bg-white/4 px-3 py-2.5" data-testid="weather-options">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-white/85">환경 연출</span>
              <span className="text-[11px] text-white/45">낙엽 · 눈 · 비</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {WEATHERS.map(w => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={imm.weather === w.id}
                  data-testid={`weather-${w.id}`}
                  onClick={() => setImmersive({ weather: w.id, autoWeather: false })}
                  className={`flex-1 rounded-full px-0 py-1.5 text-[12px] transition ${
                    imm.weather === w.id
                      ? 'bg-amber-100/90 text-[#171b14] font-semibold'
                      : 'bg-white/10 text-white/70 hover:bg-white/16'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div ref={premiumRef} className="mt-4 rounded-2xl bg-white/6 px-4 py-3" data-testid="settings-premium">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">프리미엄 체험</p>
            <p className="text-[11px] text-white/40">코드 · 광휘 · 야간</p>
          </div>

          <div className="mt-2.5 rounded-xl bg-white/4 px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-white/85">체험 코드</span>
              <span className="text-[11px] text-white/45">
                {isUnlocked(paid) ? '확인됨' : '6자리'}
              </span>
            </div>
            {isUnlocked(paid) ? (
              <p className="mt-1.5 text-[12px] text-amber-100/85" data-testid="paid-code-status">
                {paid.code.slice(0, 3)}-{paid.code.slice(3)}
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  data-testid="paid-code-input"
                  className="min-w-0 flex-1 rounded-lg bg-black/35 px-3 py-1.5 text-[13px] tracking-[0.18em] text-white/90 outline-none placeholder:text-white/25"
                />
                <button
                  type="button"
                  data-testid="paid-code-submit"
                  onClick={async () => {
                    if (codeBusy) return;
                    setCodeBusy(true);
                    try {
                      const r = await redeemCode(codeInput);
                      store.toast(r.message);
                      if (r.ok) setCodeInput('');
                    } finally {
                      setCodeBusy(false);
                    }
                  }}
                  className="shrink-0 rounded-lg bg-amber-100/90 px-3 py-1.5 text-[12px] font-semibold text-[#171b14] disabled:opacity-60"
                  disabled={codeBusy}
                >
                  {codeBusy ? '확인 중…' : '등록'}
                </button>
              </div>
            )}
            {!isUnlocked(paid) && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                결제 후 문자로 받은 6자리 코드를 입력해 주세요.
              </p>
            )}
          </div>

          <div className={`mt-2 rounded-xl bg-white/4 px-3 py-2.5 ${isUnlocked(paid) ? '' : 'opacity-60'}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-white/85">광휘 색</span>
              <span className="text-[11px] text-white/45">나만의 빛</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5" data-testid="aura-options">
              {AURAS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  disabled={!isUnlocked(paid)}
                  data-testid={`aura-${a.id}`}
                  aria-pressed={paid.aura === a.id}
                  onClick={() => setAura(a.id)}
                  className={`flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] transition ${
                    paid.aura === a.id ? 'bg-white/16 text-white' : 'bg-white/8 text-white/60'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!isUnlocked(paid)}
            data-testid="toggle-lotus"
            aria-pressed={paid.lotus}
            onClick={() => setLotus(!paid.lotus)}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-2.5 text-left transition hover:bg-white/8 disabled:opacity-60"
          >
            <span>
              <span className="block text-[13px] text-white/85">연꽃 발광</span>
              <span className="mt-0.5 block text-[11px] text-white/45">발밑에 은은한 빛 고리가 돕니다</span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                paid.lotus ? 'bg-amber-200/90' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-[#171b14] transition-all ${
                  paid.lotus ? 'left-6' : 'left-1'
                }`}
              />
            </span>
          </button>

          <div className="mt-2 rounded-xl bg-white/4 px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-white/85">야간 30분 이용권</span>
              <span className="text-[11px] text-white/45" data-testid="night-left">
                {nightMinutesLeft(paid) > 0 ? `${nightMinutesLeft(paid)}분 남음` : '미사용'}
              </span>
            </div>
            <button
              type="button"
              data-testid="start-night"
              disabled={!isUnlocked(paid) || nightMinutesLeft(paid) > 0}
              onClick={() => {
                startNightPass();
                store.toast('야간 30분을 시작합니다');
              }}
              className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-[12px] text-white/80 transition hover:bg-white/16 disabled:opacity-50"
            >
              지금 시작
            </button>
          </div>

          <div className="mt-2 rounded-xl bg-white/4 px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-white/85">프라이빗 금각</span>
              <span className="text-[11px] text-white/45">현재 {currentRoom()}</span>
            </div>
            {!isPrivateEntitled(paid) ? (
              <>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
                  사랑하는 이에게 · 10,000원 선물 전용<br />
                  한 달 동안 나만의 금각과 초대 키가 열립니다.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    store.setDonationOpen(true);
                  }}
                  className="mt-2 w-full rounded-lg border border-amber-200/25 bg-amber-200/10 py-1.5 text-[12px] text-amber-100/90 transition hover:bg-amber-200/16"
                >
                  10,000원 선물 안내 보기
                </button>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
                  6자리 초대 키를 받은 사람만 들어올 수 있습니다.<br />
                  방 인원은 제한하지 않습니다.
                </p>
                <button
                  type="button"
                  data-testid="make-room"
                  disabled={roomBusy}
                  onClick={async () => {
                    setRoomBusy(true);
                    try {
                      const made = await createPrivateRoom();
                      setRoomLink(made.url);
                      setRoomKey(made.key);
                      try {
                        await navigator.clipboard.writeText(`${made.url}\n초대 키: ${made.key}`);
                        store.toast('초대 링크와 키를 복사했습니다');
                      } catch {
                        store.toast('금각을 만들었습니다');
                      }
                    } catch (e) {
                      store.toast(e instanceof Error ? e.message : '금각을 만들지 못했습니다');
                    } finally {
                      setRoomBusy(false);
                    }
                  }}
                  className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-[12px] text-white/80 transition hover:bg-white/16 disabled:opacity-50"
                >
                  {roomBusy ? '금각을 준비하는 중…' : '나만의 금각 만들기'}
                </button>
                {roomLink && (
                  <div className="mt-2 space-y-1.5" data-testid="room-link">
                    <p className="break-all text-[10px] leading-relaxed text-amber-100/70">{roomLink}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/45">초대 키</span>
                      <span className="rounded-md border border-amber-200/30 bg-black/30 px-2 py-0.5 font-mono text-[13px] tracking-[0.2em] text-amber-100">
                        {roomKey}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/40">
                      링크에는 키가 들어가지 않습니다. 링크와 키를 따로 보내 주세요.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
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

/**
 * PrivateRoomUI.tsx —— 프라이빗 금각 房内专属操作
 *
 * 不沿用公共大殿的供灯/绕塔/大众愿墙；这里只做：
 *  다실（茶席）、장명등（长明灯）、서원（私密愿笺）、분위기（氛围）、초대（链接+密钥）、기념（截图）
 */
import { useEffect, useMemo, useState } from 'react';
import { store } from '../store';
import { buildPrivateUrl } from '../privateRoom';
import type { PrivateMood } from '../scene/PrivateSalon';

interface Props {
  room: string;
  inviteKey: string;
  mood: PrivateMood;
  setMood: (m: PrivateMood) => void;
  lampLit: boolean;
  setLampLit: (v: boolean) => void;
  tea: number;
  setTea: (v: number) => void;
  onScreenshot: () => void;
}

const MOOD_LABEL: Record<PrivateMood, string> = {
  gold: '금빛',
  moon: '월백',
  crimson: '진홍',
};

const MOOD_NEXT: Record<PrivateMood, PrivateMood> = {
  gold: 'moon',
  moon: 'crimson',
  crimson: 'gold',
};

function panelStyle(): React.CSSProperties {
  return {
    background: 'linear-gradient(180deg, rgba(24,16,10,0.96), rgba(12,8,5,0.98))',
    border: '1px solid rgba(214,178,94,0.28)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.48)',
  };
}

export default function PrivateRoomUI({
  room, inviteKey, mood, setMood, lampLit, setLampLit, tea, setTea, onScreenshot,
}: Props) {
  const [modal, setModal] = useState<'tea' | 'wish' | 'invite' | null>(null);
  const [wish, setWish] = useState('');
  const [copied, setCopied] = useState('');
  const wishKey = useMemo(() => `mindulle.private.wish.${room}`, [room]);

  useEffect(() => {
    try { setWish(localStorage.getItem(wishKey) || ''); } catch { /* 忽略 */ }
  }, [wishKey]);

  const saveWish = () => {
    try { localStorage.setItem(wishKey, wish.slice(0, 180)); } catch { /* 忽略 */ }
    store.toast('서원을 금각에 남겼습니다');
    setModal(null);
  };

  const inviteText = `${buildPrivateUrl(room)}\n초대 키: ${inviteKey}`;
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      store.toast('복사했습니다');
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      store.toast('복사하지 못했습니다. 길게 눌러 복사해 주세요');
    }
  };

  const teaStep = tea === 0
    ? { label: '차 따르기', next: 1, text: '금각의 다실에서 차를 따릅니다.' }
    : tea === 1
      ? { label: '한 잔 들기', next: 2, text: '찻향이 올라옵니다.' }
      : tea === 2
        ? { label: '차 마시기', next: 3, text: '한 잔의 여유를 가집니다.' }
        : { label: '다시 따르기', next: 0, text: '찻잔을 정리합니다.' };

  return (
    <>
      {/* 底部专属操作条 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-[560px] items-stretch gap-1.5 rounded-2xl border border-amber-200/20 bg-black/55 p-1.5 backdrop-blur-md">
          {[
            { id: 'tea', label: '다실' },
            { id: 'lamp', label: '장명등' },
            { id: 'wish', label: '서원' },
            { id: 'mood', label: '분위기' },
            { id: 'invite', label: '초대' },
            { id: 'photo', label: '기념' },
          ].map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'tea') setModal('tea');
                else if (item.id === 'lamp') {
                  setLampLit(!lampLit);
                  store.toast(lampLit ? '장명등을 껐습니다' : '장명등에 불을 켰습니다');
                } else if (item.id === 'wish') setModal('wish');
                else if (item.id === 'mood') {
                  const next = MOOD_NEXT[mood];
                  setMood(next);
                  store.toast(`분위기 · ${MOOD_LABEL[next]}`);
                } else if (item.id === 'invite') setModal('invite');
                else onScreenshot();
              }}
              className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-[11px] transition ${
                idx === 0
                  ? 'border border-amber-200/30 bg-amber-200/10 text-amber-100'
                  : 'text-white/70 hover:bg-white/8'
              }`}
              style={{ letterSpacing: '0.02em' }}
            >
              <span className="block whitespace-nowrap text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 px-4 pb-5 backdrop-blur-sm sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setModal(null)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-[430px] rounded-2xl p-5 text-white/80" style={panelStyle()}>
            {modal === 'tea' && (
              <>
                <p className="text-[10px] tracking-[0.26em] text-amber-100/45">다실</p>
                <h2 className="mt-1 text-[19px] text-[#f4e6c8]">금각의 다실</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-white/50">
                  공용 다실과 달리, 이 방의 차석은 초대한 사람과 함께 쓰는 자리입니다.<br />
                  {teaStep.text}
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="flex h-16 w-16 flex-col items-center justify-center rounded-full border"
                      style={{
                        borderColor: tea > i ? 'rgba(214,178,94,0.5)' : 'rgba(255,255,255,0.08)',
                        background: tea > i ? 'rgba(214,178,94,0.10)' : 'rgba(255,255,255,0.025)',
                      }}
                    >
                      <span className="text-[16px] text-amber-100/85">{['물', '차', '잔'][i]}</span>
                      <span className="mt-1 text-[9px] text-white/35">{['물', '차', '찻잔'][i]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-[13px] text-white/60"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTea(teaStep.next);
                      store.toast(teaStep.text);
                    }}
                    className="h-11 flex-[1.4] rounded-xl border border-amber-200/35 bg-gradient-to-b from-[#d9b96a] to-[#b58b3f] text-[13px] font-semibold text-[#1a1206]"
                  >
                    {teaStep.label}
                  </button>
                </div>
              </>
            )}

            {modal === 'wish' && (
              <>
                <p className="text-[10px] tracking-[0.26em] text-amber-100/45">서원</p>
                <h2 className="mt-1 text-[19px] text-[#f4e6c8]">서원 남기기</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-white/50">
                  이 글은 이 금각에만 남습니다. 공용 기원벽에는 올라가지 않습니다.
                </p>
                <textarea
                  value={wish}
                  onChange={e => setWish(e.target.value.slice(0, 180))}
                  rows={4}
                  placeholder="예: 가족의 건강을 빕니다"
                  className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-[13px] leading-relaxed text-[#f4e6c8] outline-none placeholder:text-white/25 focus:border-amber-200/45"
                />
                <div className="mt-1 text-right text-[10px] text-white/30">{wish.length}/180</div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-[13px] text-white/60"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={saveWish}
                    className="h-11 flex-[1.4] rounded-xl border border-amber-200/35 bg-gradient-to-b from-[#d9b96a] to-[#b58b3f] text-[13px] font-semibold text-[#1a1206]"
                  >
                    금각에 남기기
                  </button>
                </div>
              </>
            )}

            {modal === 'invite' && (
              <>
                <p className="text-[10px] tracking-[0.26em] text-amber-100/45">초대</p>
                <h2 className="mt-1 text-[19px] text-[#f4e6c8]">초대하기</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-white/50">
                  링크와 키를 따로 보내 주세요. 링크만으로는 들어올 수 없습니다.
                </p>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="break-all text-[10px] leading-relaxed text-amber-100/60">
                    {buildPrivateUrl(room)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-white/40">초대 키</span>
                    <span className="font-mono text-[15px] tracking-[0.28em] text-amber-100">{inviteKey}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(buildPrivateUrl(room), 'link')}
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-[12px] text-white/65"
                  >
                    {copied === 'link' ? '복사됨' : '링크 복사'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copy(inviteKey, 'key')}
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-[12px] text-white/65"
                  >
                    {copied === 'key' ? '복사됨' : '키 복사'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copy(inviteText, 'both')}
                    className="h-11 flex-1 rounded-xl border border-amber-200/30 bg-amber-200/10 text-[12px] text-amber-100"
                  >
                    {copied === 'both' ? '복사됨' : '둘 다 복사'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/5 text-[12px] text-white/55"
                >
                  닫기
                </button>
                <p className="mt-3 text-[10px] leading-relaxed text-white/30">
                  이 방은 인원 제한이 없습니다. 초대한 사람은 언제든 들어올 수 있습니다.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

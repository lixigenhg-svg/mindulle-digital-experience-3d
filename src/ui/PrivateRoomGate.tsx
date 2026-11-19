/**
 * PrivateRoomGate.tsx —— 프라이빗 금각 进房密钥门
 *
 * 链接只带房号；这里收 6 位密钥，向服务端校验通过后才渲染私密场景。
 * 不把密钥写进 URL，也不在本地假放行。
 */
import { useEffect, useRef, useState } from 'react';
import { verifyPrivateRoom } from '../privateRoom';

interface Props {
  room: string;
  onEnter: (key: string) => void;
  initialError?: string;
}

export default function PrivateRoomGate({ room, onEnter, initialError = '' }: Props) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const enter = async () => {
    if (busy) return;
    const clean = key.replace(/[^0-9]/g, '').slice(0, 6);
    if (clean.length !== 6) { setError('6자리 초대 키를 입력해 주세요.'); return; }
    setBusy(true);
    setError('');
    const res = await verifyPrivateRoom(room, clean);
    setBusy(false);
    if (!res.ok) { setError(res.msg); return; }
    onEnter(clean);
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0b0806] px-5">
      {/* 黑漆底 + 金线光晕；不用图片，纯 CSS 保证加载快 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 44% at 50% 12%, rgba(214,178,94,0.20), transparent 70%),' +
            'radial-gradient(46% 38% at 88% 90%, rgba(110,31,40,0.22), transparent 72%),' +
            'linear-gradient(180deg, #0b0806 0%, #120d09 52%, #070504 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-4 rounded-[2px] border"
        style={{ borderColor: 'rgba(214,178,94,0.22)' }}
      />
      <div
        className="pointer-events-none absolute inset-6 rounded-[2px] border"
        style={{ borderColor: 'rgba(214,178,94,0.10)' }}
      />

      <div className="relative z-10 w-full max-w-[420px] text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/25 bg-amber-200/5">
          <span className="text-[22px] text-amber-200/90">금</span>
        </div>

        <p className="text-[11px] tracking-[0.28em] text-amber-100/45">프라이빗 금각</p>
        <h1 className="mt-2 text-[27px] font-semibold tracking-[0.06em] text-[#f4e6c8]">
          프라이빗 금각
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-white/50">
          초대받은 분만 들어올 수 있는 공간입니다.<br />
          초대 키 6자리를 입력해 주세요.
        </p>

        <div className="mt-6 text-left">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
            <span>초대 키</span>
            <span className="font-mono tracking-[0.12em] text-amber-100/55">{room}</span>
          </div>
          <input
            ref={inputRef}
            value={key}
            onChange={e => {
              setKey(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
              if (error) setError('');
            }}
            onKeyDown={e => { if (e.key === 'Enter') void enter(); }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="초대 키 6자리"
            className="h-14 w-full rounded-xl border border-amber-200/20 bg-black/35 text-center font-mono text-[26px] tracking-[0.38em] text-[#f4e6c8] outline-none placeholder:text-white/16 focus:border-amber-200/55"
          />
          {error && <p className="mt-2 text-[11px] text-rose-300/90">{error}</p>}
        </div>

        <button
          type="button"
          onClick={() => void enter()}
          disabled={busy}
          className="mt-4 h-12 w-full rounded-xl border border-amber-200/35 bg-gradient-to-b from-[#d9b96a] to-[#b58b3f] text-[14px] font-semibold tracking-[0.08em] text-[#1a1206] transition active:scale-[0.99] disabled:opacity-55"
        >
          {busy ? '키를 확인하는 중…' : '금각 열기'}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-white/35">
          링크만으로는 들어올 수 없습니다. 보내주신 초대 키를 입력해 주세요.<br />
          키가 맞지 않으면 방장에게 새 키를 요청하세요.
        </p>
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('room');
            url.searchParams.delete('instance');
            window.location.href = url.toString();
          }}
          className="mt-4 text-[11px] text-white/35 underline decoration-white/20 underline-offset-4"
        >
          공용 체험관으로 돌아가기
        </button>
      </div>
    </div>
  );
}

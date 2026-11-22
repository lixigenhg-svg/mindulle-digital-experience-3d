import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const RainTeaScene = lazy(() => import('../scene/RainTeaScene'));
const endpoint = import.meta.env.VITE_RAIN_TEA_API?.replace(/\/$/, '');

type Access = { available: boolean; entitled: boolean; priceWon?: number };

function rainSound() {
  const context = new AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.34;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2300;
  source.connect(filter).connect(context.destination);
  source.start();
  void context.resume().catch(() => {});
  return context;
}

export default function RainTea({ onClose }: { onClose: () => void }) {
  const [access, setAccess] = useState<Access>();
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    if (endpoint) {
      fetch(`${endpoint}/access`, { credentials: 'include', cache: 'no-store', signal: abort.signal })
        .then(async response => {
          if (!response.ok) throw new Error();
          const result: Access = await response.json();
          setAccess(result);
        })
        .catch(() => { if (!abort.signal.aborted) setError('이용권 정보를 불러오지 못했습니다.'); });
    }
    return () => {
      abort.abort();
      if (audio.current) void audio.current.close();
    };
  }, []);

  async function buy() {
    if (!endpoint || !access?.available || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${endpoint}/checkout`, { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error();
      const { checkoutUrl } = await response.json();
      const url = new URL(checkoutUrl);
      if (url.protocol !== 'https:') throw new Error();
      window.location.assign(url);
    } catch {
      setError('결제 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setLoading(false);
    }
  }

  function toggleSound() {
    if (audio.current) {
      void audio.current.close();
      audio.current = undefined;
      setSound(false);
    } else {
      try {
        audio.current = rainSound();
        setSound(true);
      } catch {
        setError('이 기기에서 빗소리를 재생할 수 없습니다.');
      }
    }
  }

  return createPortal(
    <dialog ref={dialog} aria-labelledby="rain-tea-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-[#101726] text-white">
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <RainTeaScene key={entered ? 'inside' : 'preview'} purchased={entered && access?.entitled === true} />
        </Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101726] via-transparent to-[#101726]/70" />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5">
        <h2 id="rain-tea-title" className="text-lg font-medium text-amber-100">빗소리 찻자리</h2>
        <button type="button" onClick={onClose} className="rounded-full bg-black/55 px-4 py-2">돌아가기</button>
      </header>
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 text-center">
        {!entered && <p>처마 밖으로 내리는 비를 바라보며 따뜻한 차 한 잔을 마셔 보세요.</p>}
        {error && <p role="status">{error}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" aria-pressed={sound} onClick={toggleSound} className="rounded-full bg-white/15 px-4 py-2">빗소리 {sound ? '끄기' : '듣기'}</button>
          {!entered && access?.entitled === true && (
            <button type="button" onClick={() => setEntered(true)} className="rounded-full bg-amber-200 px-4 py-2 text-stone-900">찻자리 입장</button>
          )}
          {!entered && access?.entitled === false && access.available && Number.isSafeInteger(access.priceWon) && access.priceWon! > 0 && (
            <button type="button" disabled={loading} onClick={() => void buy()} className="rounded-full bg-amber-200 px-4 py-2 text-stone-900">
              {loading ? '결제 페이지 여는 중' : `이용권 구매 · ₩${access.priceWon!.toLocaleString('ko-KR')}`}
            </button>
          )}
          {!entered && (!endpoint || access?.available === false) && !access?.entitled && <p>이용권 판매 준비 중입니다.</p>}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

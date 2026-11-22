import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { rainTeaRequest, rainTeaEndpoint as endpoint, rememberRainTeaToken } from '../api/rainTea';

const RainTeaScene = lazy(() => import('../scene/RainTeaScene'));

type Subscription = { autoRenew: boolean; status: string; nextBillingAt: string | null; priceWon: number };
type Checkout = { checkoutUrl: string; memberToken?: string; alreadyEntitled?: boolean };
type Access = { available: boolean; entitled: boolean; priceWon?: number };
const invitePattern = /^[A-Za-z0-9_-]{22,128}$/;

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

export default function RainTea({ invite, onClose }: { invite?: string; onClose: () => void }) {
  const [access, setAccess] = useState<Access>();
  const [subscription, setSubscription] = useState<Subscription>();
  const [canceling, setCanceling] = useState(false);
  const [notice, setNotice] = useState('');
  const [roomsEnabled, setRoomsEnabled] = useState(false);
  const [entered, setEntered] = useState(false);
  const [windowView, setWindowView] = useState(false);
  const [snowy, setSnowy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(false);
  const [room, setRoom] = useState<string>();
  const [shareUrl, setShareUrl] = useState('');
  const [guestPresent, setGuestPresent] = useState(false);
  const [inviting, setInviting] = useState(false);
  const audio = useRef<AudioContext>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    if (endpoint && invite) {
      fetch(`${endpoint}/rooms/${invite}/join`, { method: 'POST', credentials: 'include', signal: abort.signal })
        .then(response => {
          if (!response.ok) throw new Error();
          if (abort.signal.aborted) return;
          setRoom(invite);
          setEntered(true);
        })
        .catch(() => { if (!abort.signal.aborted) setError('초대가 만료되었거나 찻자리가 가득 찼습니다.'); });
    } else {
      rainTeaRequest<Access & { roomsEnabled?: boolean }>('/access', { signal: abort.signal })
        .then(result => {
          setAccess(result);
          setRoomsEnabled(result.roomsEnabled === true);
        })
        .catch(() => { if (!abort.signal.aborted) setError('이용권 정보를 불러오지 못했습니다.'); });
    }
    return () => {
      abort.abort();
      if (audio.current) void audio.current.close();
    };
  }, [invite]);

  useEffect(() => {
    if (!endpoint || !room) return;
    const abort = new AbortController();
    const address = `${endpoint}/rooms/${room}/presence`;
    async function renewPresence() {
      try {
        const response = await fetch(address, { method: 'POST', credentials: 'include', signal: abort.signal });
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (abort.signal.aborted) return;
          setRoom(undefined);
          setShareUrl('');
          setGuestPresent(false);
          if (invite) setEntered(false);
          setError('찻자리 초대가 종료되었습니다.');
          return;
        }
        if (!response.ok) throw new Error();
        const state = await response.json();
        if (!abort.signal.aborted) setGuestPresent(state.companionPresent === true);
      } catch {
        if (!abort.signal.aborted) setGuestPresent(false);
      }
    }
    void renewPresence();
    const timer = window.setInterval(() => void renewPresence(), 4000);
    return () => {
      abort.abort();
      window.clearInterval(timer);
    };
  }, [invite, room]);

  async function inviteFriend() {
    if (!endpoint || access?.entitled !== true || inviting) return;
    setInviting(true);
    setError('');
    try {
      let code = room;
      if (!code) {
        const response = await fetch(`${endpoint}/rooms`, { method: 'POST', credentials: 'include' });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (typeof result.invite !== 'string' || !invitePattern.test(result.invite)) throw new Error();
        code = result.invite as string;
        setRoom(code);
      }
      setShareUrl(new URL(`/#rain-tea=${code}`, window.location.origin).href);
    } catch {
      setError('초대 링크를 만들 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setInviting(false);
    }
  }

  useEffect(() => {
    if (!access || invite) return;
    const abort = new AbortController();
    rainTeaRequest<Subscription>('/subscription', { signal: abort.signal })
      .then(setSubscription)
      .catch(() => { if (!abort.signal.aborted) setError('자동결제 정보를 불러오지 못했습니다.'); });
    return () => abort.abort();
  }, [access, invite]);

  async function cancelRenewal() {
    if (canceling || !subscription?.autoRenew) return;
    if (!window.confirm('자동결제를 해지하시겠어요? 이미 결제한 이용 기간은 그대로 유지됩니다.')) return;
    setCanceling(true);
    setError('');
    try {
      const result = await rainTeaRequest<{ ok: boolean; autoRenew: boolean; status: string; entitled: boolean }>(
        '/cancel', { method: 'POST' },
      );
      if (result.ok !== true || result.autoRenew !== false) throw new Error();
      setSubscription({ ...subscription, autoRenew: false, status: result.status, nextBillingAt: null });
      setAccess(previous => previous && { ...previous, entitled: result.entitled });
      setNotice('자동결제가 해지되었습니다. 남은 이용 기간은 계속 이용할 수 있습니다.');
    } catch {
      setError('자동결제를 해지하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCanceling(false);
    }
  }

  async function buy() {
    if (!endpoint || !access?.available || loading) return;
    setLoading(true);
    setError('');
    try {
      const order = await rainTeaRequest<Checkout>('/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: 'https://3d.mindulle.kr/' }),
      });
      rememberRainTeaToken(order.memberToken);
      if (order.alreadyEntitled === true) {
        setAccess(await rainTeaRequest<Access>('/access'));
        setLoading(false);
        return;
      }
      const url = new URL(order.checkoutUrl);
      if (url.origin !== 'https://mindulle.kr' || !url.pathname.startsWith('/tea/pay/')) throw new Error();
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
          <RainTeaScene key={entered ? 'inside' : 'preview'} purchased={entered && (access?.entitled === true || Boolean(invite && room))} guestPresent={guestPresent} windowView={windowView} snowy={snowy} />
        </Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101726] via-transparent to-[#101726]/70" />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5">
        <h2 id="rain-tea-title" className="text-lg font-medium text-amber-100">빗소리 찻자리</h2>
        <button type="button" onClick={onClose} className="rounded-full bg-black/55 px-4 py-2">돌아가기</button>
      </header>
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 text-center">
        {!entered && <p>{snowy ? '처마 밖으로 내리는 눈을 바라보며 따뜻한 차 한 잔을 마셔 보세요.' : '처마 밖으로 내리는 비를 바라보며 따뜻한 차 한 잔을 마셔 보세요.'}</p>}
        {error && <p role="status">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!entered && subscription?.autoRenew && subscription.nextBillingAt && (
          <p className="text-sm">다음 자동결제 · {new Date(subscription.nextBillingAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} · {subscription.priceWon.toLocaleString('ko-KR')}원</p>
        )}
        {entered && room && <p aria-live="polite">{guestPresent ? '함께 차를 마시고 있어요' : '친구를 기다리는 중'}</p>}
        {entered && shareUrl && <input aria-label="친구 초대 링크" value={shareUrl} readOnly
          onFocus={event => event.currentTarget.select()}
          className="w-full max-w-md rounded-lg bg-slate-800 px-3 py-2 text-sm" />}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" aria-pressed={snowy} onClick={() => {
            if (!snowy && audio.current) toggleSound();
            setSnowy(value => !value);
          }} className="rounded-full bg-white/15 px-4 py-2">{snowy ? '비 보기' : '눈 보기'}</button>
          {!snowy && <button type="button" aria-pressed={sound} onClick={toggleSound} className="rounded-full bg-white/15 px-4 py-2">빗소리 {sound ? '끄기' : '듣기'}</button>}
          {entered && (
            <button type="button" onClick={() => setWindowView(view => !view)}
              className="rounded-full bg-white/15 px-4 py-2">
              {windowView ? '찻상 보기' : '창밖 보기'}
            </button>
          )}
          {entered && roomsEnabled && access?.entitled === true && (
            <button type="button" disabled={inviting} onClick={() => {
              if (!shareUrl) void inviteFriend();
              else if (navigator.clipboard) void navigator.clipboard.writeText(shareUrl).catch(() => setError('링크를 선택해 복사해 주세요.'));
            }} className="rounded-full bg-amber-200 px-4 py-2 text-stone-900">
              {shareUrl ? '초대 링크 복사' : '친구 초대'}
            </button>
          )}
          {!entered && subscription?.autoRenew && (
            <button type="button" disabled={canceling} onClick={() => void cancelRenewal()}
              className="rounded-full bg-white/15 px-4 py-2">자동결제 해지</button>
          )}
          {!entered && access?.entitled === true && (
            <button type="button" onClick={() => setEntered(true)} className="rounded-full bg-amber-200 px-4 py-2 text-stone-900">찻자리 입장</button>
          )}
          {!entered && access?.entitled === false && access.available && Number.isSafeInteger(access.priceWon) && access.priceWon! > 0 && (
            <button type="button" disabled={loading} onClick={() => void buy()} className="rounded-full bg-amber-200 px-4 py-2 text-stone-900">
              {loading ? '결제 페이지 여는 중' : `3개월 자동결제 · ${access.priceWon!.toLocaleString('ko-KR')}원`}
            </button>
          )}
          {!entered && (!endpoint || access?.available === false) && !access?.entitled && <p>이용권 판매 준비 중입니다.</p>}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

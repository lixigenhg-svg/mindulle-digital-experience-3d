import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { rainTeaRequest, rainTeaEndpoint as endpoint, rememberRainTeaToken, getRainTeaToken } from '../api/rainTea';

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
  const [guideOpen, setGuideOpen] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [pairKey, setPairKey] = useState('');
  const [recoveryEnabled, setRecoveryEnabled] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recovering, setRecovering] = useState(false);
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
  const [guestKey] = useState(() => invite ? crypto.randomUUID() : '');
  const guestBody = guestKey ? JSON.stringify({ guestKey }) : undefined;
  const [inviting, setInviting] = useState(false);
  const audio = useRef<AudioContext>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    if (endpoint && invite) {
      fetch(`${endpoint}/rooms/${invite}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: guestBody, signal: abort.signal })
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
  }, [invite, guestBody]);

  useEffect(() => {
    if (!endpoint || !room) return;
    const abort = new AbortController();
    const address = `${endpoint}/rooms/${room}/presence`;
    async function renewPresence() {
      try {
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (!guestBody) {
          const token = getRainTeaToken();
          if (token) headers.set('Authorization', `Bearer ${token}`);
        }
        const response = await fetch(address, {
          method: 'POST', headers, body: guestBody, credentials: 'include', signal: abort.signal,
        });
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
  }, [invite, room, guestBody]);

  async function inviteFriend() {
    if (!endpoint || access?.entitled !== true || inviting) return;
    setInviting(true);
    setError('');
    try {
      let code = room;
      if (!code) {
        const result = await rainTeaRequest<{ invite: string }>('/rooms', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
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

  useEffect(() => {
    if (invite) return;
    const controller = new AbortController();
    rainTeaRequest<{ enabled: boolean; pairing?: boolean }>('/recovery', { signal: controller.signal })
      .then(result => { setRecoveryEnabled(result.enabled === true); setPairing(result.pairing === true); })
      .catch(() => {});
    return () => controller.abort();
  }, [invite]);

  function pairRequest<T>(action: string, body: object, signal?: AbortSignal) {
    return rainTeaRequest<T>(`/recovery/pair/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
    });
  }

  useEffect(() => {
    if (!recoveryOpen || !pairKey) return;
    const controller = new AbortController();
    let timer: number | undefined;
    async function poll() {
      try {
        const result = await pairRequest<{ memberToken?: string }>('status', { key: pairKey }, controller.signal);
        if (controller.signal.aborted) return;
        if (!result.memberToken) {
          timer = window.setTimeout(poll, 2000);
          return;
        }
        rememberRainTeaToken(result.memberToken);
        const restored = await rainTeaRequest<Access & { roomsEnabled?: boolean }>('/access', { signal: controller.signal });
        if (!restored.entitled) throw new Error();
        setAccess(restored);
        setRoomsEnabled(restored.roomsEnabled === true);
        setPairKey('');
        setRecoveryCode('');
        setRecoveryOpen(false);
      } catch {
        if (!controller.signal.aborted) {
          setPairKey('');
          setRecoveryCode('');
          setRecoveryOpen(false);
          setError('연결이 끝났습니다. 복구를 다시 시작해 주세요.');
        }
      }
    }
    void poll();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [recoveryOpen, pairKey]);

  async function startPairing() {
    setRecovering(true);
    setError('');
    try {
      const result = await pairRequest<{ key: string; code: string }>('start', {});
      setPairKey(result.key);
      setRecoveryCode(result.code);
      setRecoveryOpen(true);
    } catch {
      setError('연결 코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setRecovering(false);
    }
  }

  async function recoverTicket() {
    if (recovering) return;
    const issue = access?.entitled === true;
    const code = recoveryCode.trim();
    if ((pairing && !/^\d{6}$/.test(code)) || (!pairing && !issue && !/^[A-Za-z0-9_-]{22}$/.test(code))) {
      setError('복구 코드를 확인해 주세요.');
      return;
    }
    setRecovering(true);
    setError('');
    try {
      if (pairing) {
        if (!issue || !window.confirm('이 코드가 본인의 휴대전화에 표시된 코드인지 확인해 주세요. 이용권을 이 기기에 연결할까요?')) return;
        await pairRequest('approve', { code });
        setRecoveryCode('');
        setRecoveryOpen(false);
        setNotice('휴대전화 연결을 승인했습니다.');
        return;
      }
      const result = await rainTeaRequest<{ code?: string; memberToken?: string }>(
        issue ? '/recovery/issue' : '/recovery/redeem',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(issue ? {} : { code }) },
      );
      if (issue && result.code) {
        setRecoveryCode(result.code);
        setRecoveryOpen(true);
      } else if (!issue && result.memberToken) {
        rememberRainTeaToken(result.memberToken);
        const restored = await rainTeaRequest<Access & { roomsEnabled?: boolean }>('/access');
        if (!restored.entitled) throw new Error();
        setAccess(restored);
        setRoomsEnabled(restored.roomsEnabled === true);
        setRecoveryCode('');
        setRecoveryOpen(false);
      } else {
        throw new Error();
      }
    } catch {
      setError(issue ? '복구 코드를 만들지 못했습니다.' : '유효한 복구 코드가 아닙니다. 새 코드를 받아 주세요.');
    } finally {
      setRecovering(false);
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
      onCancel={event => { event.preventDefault(); if (guideOpen) setGuideOpen(false); else onClose(); }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-[#101726] text-white">
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <RainTeaScene key={entered ? 'inside' : 'preview'} purchased={entered && (access?.entitled === true || Boolean(invite && room))} guestPresent={guestPresent} windowView={windowView} snowy={snowy} />
        </Suspense>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101726] via-transparent to-[#101726]/70" />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5">
        <h2 id="rain-tea-title" className="text-lg font-medium text-amber-100">빗소리 찻자리</h2>
        <div className="flex gap-2">
          <button type="button" aria-expanded={guideOpen} aria-controls="rain-tea-guide"
            onClick={() => setGuideOpen(open => !open)} className="rounded-full bg-black/55 px-3 py-2 text-sm">
            이용 안내
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-black/55 px-3 py-2 text-sm">돌아가기</button>
        </div>
      </header>
      <section id="rain-tea-guide" hidden={!guideOpen} aria-label="빗소리 찻자리 이용 안내"
        className="absolute inset-x-3 top-20 z-10 mx-auto max-h-[calc(100dvh-6rem)] max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-5 text-sm leading-relaxed shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-amber-100">빗소리 찻자리 이용 안내</h3>
          <button type="button" onClick={() => setGuideOpen(false)} className="rounded-full bg-white/10 px-3 py-1">안내 닫기</button>
        </div>
        <h4 className="font-semibold text-amber-100">내 휴대전화에서 이용하기</h4>
        <ol className="mb-4 list-decimal space-y-1 pl-5">
          <li>휴대전화에서 3D 사이트를 열고 찻자리 미리보기의 「구매한 이용권 복구」를 눌러 6자리 코드를 확인하세요.</li>
          <li>결제한 기기에서 「다른 기기에서 이용하기」를 눌러 코드를 입력하고 「연결 승인」을 누르세요.</li>
          <li>휴대전화에 「찻자리 입장」이 표시되면 다시 결제하지 않고 들어갈 수 있어요.</li>
        </ol>
        <h4 className="font-semibold text-amber-100">친구와 함께 차 마시기</h4>
        <p>찻자리에 입장한 뒤 「친구 초대」를 누르고 「초대 링크 복사」로 링크를 한 명에게 보내세요. 친구는 링크를 열면 무료로 입장할 수 있어요.</p>
      </section>
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 text-center">
        {!entered && <p>{snowy ? '처마 밖으로 내리는 눈을 바라보며 따뜻한 차 한 잔을 마셔 보세요.' : '처마 밖으로 내리는 비를 바라보며 따뜻한 차 한 잔을 마셔 보세요.'}</p>}
        {error && <p role="status">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!entered && subscription?.autoRenew && subscription.nextBillingAt && (
          <p className="text-sm">다음 자동결제 · {new Date(subscription.nextBillingAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} · {subscription.priceWon.toLocaleString('ko-KR')}원</p>
        )}
        {recoveryEnabled && recoveryOpen && (
          <div className="mx-auto max-w-md space-y-2 rounded-xl bg-slate-900/95 p-3">
            <p>{pairing ? (access?.entitled ? '휴대전화에 표시된 6자리 코드를 입력해 주세요.' : '결제한 기기에서 이 코드를 입력해 주세요. 코드는 5분 동안 유효합니다.') : access?.entitled ? '복구 코드는 5분 동안 한 번만 사용할 수 있습니다.' : '결제한 기기에서 받은 복구 코드를 입력해 주세요.'}</p>
            <p className="text-xs text-slate-300">내 기기에 이용권을 연결하는 코드입니다.</p>
            <input aria-label="이용권 복구 코드" value={recoveryCode} readOnly={pairing ? !access?.entitled : access?.entitled === true}
              inputMode={pairing ? 'numeric' : 'text'} maxLength={pairing ? 6 : 22}
              autoComplete="off" autoCapitalize="none" spellCheck={false}
              onFocus={event => { if (event.currentTarget.readOnly) event.currentTarget.select(); }}
              onChange={event => setRecoveryCode(pairing ? event.target.value.replace(/[^0-9]/g, '') : event.target.value)}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-center" />
            {pairing ? (access?.entitled && <button type="button" disabled={recovering} onClick={() => void recoverTicket()}>연결 승인</button>) : access?.entitled
              ? <button type="button" onClick={() => void navigator.clipboard?.writeText(recoveryCode).catch(() => setError('코드를 선택해 복사해 주세요.'))}>코드 복사</button>
              : <button type="button" disabled={recovering} onClick={() => void recoverTicket()}>이용권 복구</button>}
          </div>
        )}
        {entered && room && <p aria-live="polite">{guestPresent ? '함께 차를 마시고 있어요' : '친구를 기다리는 중'}</p>}
        {entered && shareUrl && <div className="space-y-1">
          <p className="text-xs text-slate-300">함께 차를 마실 친구 한 명에게 이 링크를 보내세요.</p>
          <input aria-label="친구 초대 링크" value={shareUrl} readOnly
          onFocus={event => event.currentTarget.select()}
          className="w-full max-w-md rounded-lg bg-slate-800 px-3 py-2 text-sm" />
        </div>}
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
          {recoveryEnabled && !invite && access && (
            <button type="button" disabled={recovering || loading} onClick={() => {
              if (pairing) {
                if (recoveryOpen) { setRecoveryOpen(false); setPairKey(''); setRecoveryCode(''); }
                else if (access.entitled) setRecoveryOpen(true);
                else void startPairing();
              } else if (access.entitled && !recoveryOpen) void recoverTicket();
              else setRecoveryOpen(open => !open);
            }} className="rounded-full bg-white/15 px-4 py-2">
              {recoveryOpen ? '복구 닫기' : access.entitled ? '다른 기기에서 이용하기' : '구매한 이용권 복구'}
            </button>
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

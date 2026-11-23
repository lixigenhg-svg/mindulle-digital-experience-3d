import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearOwnerToken,
  getOwnerToken,
  petApi,
  PetApiError,
  loadMemorialPhoto,
  setOwnerToken,
} from './api';
import { RainbowMemorialScene } from './RainbowMemorialScene';
import './memorial.css';

const MAX_PHOTOS = 5;

const STATUS = {
  awaiting_payment: { label: '결제 대기', tone: 'muted' },
  preview: { label: '미리보기', tone: 'preview' },
  active: { label: '이용 중', tone: 'active' },
  canceled: { label: '해지 예정', tone: 'canceled' },
  past_due: { label: '갱신 결제 실패', tone: 'danger' },
  payment_failed: { label: '결제 중단', tone: 'danger' },
  expired: { label: '기간 만료', tone: 'muted' },
  deleted: { label: '삭제됨', tone: 'muted' },
};

function won(value) {
  return `₩${Number(value || 0).toLocaleString('ko-KR')}`;
}

function dateText(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'long',
      timeZone: 'Asia/Seoul',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

async function fileToJpegDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f7f1e6';
    context.fillRect(0, 0, width, height);
    context.drawImage(img, 0, 0, width, height);
    for (const quality of [0.82, 0.68, 0.5]) {
      const jpeg = canvas.toDataURL('image/jpeg', quality);
      if (jpeg.startsWith('data:image/jpeg;base64,') && jpeg.length <= 1_330_000) return jpeg;
    }
    throw new Error('사진 용량이 너무 큽니다. 다른 사진을 선택해 주세요.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function memorialName(name) {
  return String(name || '').trim().replace(/\s*的\s*纪念室$/u, '의 추모관');
}

function ErrorText({ error }) {
  if (!error) return null;
  const text = error instanceof Error ? error.message : String(error);
  return <p className="mdl-memorial-error">{text}</p>;
}

function RoomThumbnail({ url }) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let objectUrl;
    loadMemorialPhoto(url, { signal: controller.signal }).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setImage({ url, objectUrl });
    }).catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return image && image.url === url
    ? <img src={image.objectUrl} alt="" onError={() => setImage(null)} />
    : <span>+</span>;
}

function useRoomPhotos(room) {
  const [loaded, setLoaded] = useState(null);
  const photoKey = JSON.stringify(room?.ownerAccess ? room.photos : []);
  useEffect(() => {
    const controller = new AbortController();
    const urls = [];
    Promise.allSettled(JSON.parse(photoKey).map(async photo => {
      const blob = await loadMemorialPhoto(photo.url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return { ...photo, url };
    })).then(results => {
      if (!controller.signal.aborted) {
        setLoaded({ key: photoKey, photos: results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []) });
      }
    });
    return () => {
      controller.abort();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoKey]);
  return loaded?.key === photoKey ? loaded.photos : [];
}

export function RainbowMemorialDialog({ open, onClose, initialRoomId = '' }) {
  const returnRoomId = useRef(initialRoomId);
  const guide = useRef(null);
  const [config, setConfig] = useState(null);
  const [phase, setPhase] = useState('login'); // login | rooms
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const loadedPhotos = useRoomPhotos(selected);
  const [creating, setCreating] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPhotos, setNewPhotos] = useState([]);
  const newNameInput = useRef(null);
  useEffect(() => { if (creating) newNameInput.current?.focus(); }, [creating]);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef(null);
  const [upgradeRoom, setUpgradeRoom] = useState(null);
  const upgradeDialog = useRef(null);
  useEffect(() => {
    if (upgradeRoom && upgradeRoom === selected?.id && upgradeDialog.current && !upgradeDialog.current.open) {
      upgradeDialog.current.showModal();
    }
  }, [upgradeRoom, selected?.id]);
  const newPhotoInput = useRef(null);

  const isLoggedIn = Boolean(getOwnerToken());

  const refreshRooms = useCallback(async ({ preserveError = false } = {}) => {
    try {
      const data = await petApi.listRooms();
      const nextRooms = data?.rooms || [];
      setRooms(nextRooms);
      const returnedRoom = returnRoomId.current && nextRooms.find(room => room.publicId === returnRoomId.current);
      if (returnedRoom) returnRoomId.current = '';
      setSelected((current) => {
        if (returnedRoom) return returnedRoom;
        if (!current) return current;
        return nextRooms.find((room) => room.id === current.id) || current;
      });
      setPhase('rooms');
      if (!preserveError) setError(null);
      return nextRooms;
    } catch (err) {
      if (err instanceof PetApiError && err.status === 401) {
        clearOwnerToken();
        setPhase('login');
        setSelected(null);
        setRooms([]);
      } else {
        setError(err);
      }
      return [];
    }
  }, []);

  const refreshSelected = useCallback(async (publicId) => {
    if (!publicId) return;
    try {
      const data = await petApi.getRoom(publicId);
      if (data?.room) setSelected(data.room);
    } catch (err) {
      if (err instanceof PetApiError && err.status === 403) {
        // 预览过期/宽限期结束：保留列表里的摘要，让主人仍能看到“重新开通”
        return;
      }
      setError(err);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotice('');
    petApi.config().then(setConfig).catch(setError);
    refreshRooms();
  }, [open, refreshRooms]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(() => {
      if (getOwnerToken()) refreshRooms();
      if (selected?.publicId) refreshSelected(selected.publicId);
    }, 20000);
    const onFocus = () => {
      if (getOwnerToken()) refreshRooms();
      if (selected?.publicId) refreshSelected(selected.publicId);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [open, selected?.publicId, refreshRooms, refreshSelected]);

  const sendCode = async () => {
    const digits = normalizePhone(phone);
    if (!/^010\d{8}$/.test(digits)) {
      setError(new Error('010으로 시작하는 휴대폰 번호를 입력해 주세요.'));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      const data = await petApi.sendCode(digits);
      setPhone(digits);
      setCooldown(Number(data?.cooldown || 60));
      setNotice('인증번호를 보냈습니다. 3분 안에 입력해 주세요.');
    } catch (err) {
      setError(err);
      if (err?.payload?.retryAfter) setCooldown(Number(err.payload.retryAfter));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const verify = async () => {
    const digits = normalizePhone(phone);
    const value = normalizePhone(code).slice(0, 6);
    if (!/^010\d{8}$/.test(digits) || value.length !== 6) {
      setError(new Error('휴대폰 번호와 6자리 인증번호를 확인해 주세요.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await petApi.verify(digits, value);
      setOwnerToken(data.ownerToken);
      setCode('');
      setNotice('');
      setPhase('rooms');
      const nextRooms = await refreshRooms();
      setCreating(nextRooms.length === 0);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const createRoom = async () => {
    if (!newPetName.trim() || !newMessage.trim()) {
      setError(new Error('아이의 이름과 남기고 싶은 말을 적어 주세요.'));
      return;
    }
    if (creating !== 'paid' && !newPhotos.length) {
      setError(new Error('사진을 한 장 이상 선택해 주세요.'));
      return;
    }
    setBusy(true);
    setError(null);
    let createdRoom;
    try {
      const images = [];
      for (const file of creating === 'paid' ? [] : newPhotos) images.push(await fileToJpegDataUrl(file));
      const data = await petApi.createRoom({
        petName: memorialName(newPetName),
        message: newMessage.trim(),
        paid: creating === 'paid',
      });
      createdRoom = data.room;
      for (const image of images) await petApi.addPhoto(createdRoom.id, image);
      setNotice(creating === 'paid' ? '결제 후 사진을 올리고 가족과 함께 볼 수 있어요.' : '사진을 올리고 미리보기 추모관을 만들었습니다.');
    } catch (err) {
      if (createdRoom) {
        setError(new Error('추모관은 만들어졌지만 일부 사진을 올리지 못했습니다. 사진 목록에서 다시 올려 주세요.'));
      } else {
        setError(err);
      }
    } finally {
      if (createdRoom) {
        setNewPetName('');
        setNewMessage('');
        setNewPhotos([]);
        setSelected(createdRoom);
        setCreating(false);
        await refreshSelected(createdRoom.publicId);
        await refreshRooms({ preserveError: true });
      }
      setBusy(false);
    }
  };

  const openRoom = async (room) => {
    setSelected(room);
    setCreating(false);
    setError(null);
    setNotice('');
    if (room?.publicId) await refreshSelected(room.publicId);
  };

  const uploadPhotos = async (fileList) => {
    if (!selected) return;
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    const limit = selected.maxPhotos || MAX_PHOTOS;
    if (selected.photos.length + files.length > limit) {
      if (selected.status === 'preview') setUpgradeRoom(selected.id);
      else setError(new Error(`사진은 최대 ${limit}장까지 올릴 수 있습니다. 사진을 지운 뒤 다시 시도해 주세요.`));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const dataUrl = await fileToJpegDataUrl(file);
        await petApi.addPhoto(selected.id, dataUrl);
      }
      await refreshRooms();
      await refreshSelected(selected.publicId);
      setNotice(`${files.length}장을 올렸습니다.`);
    } catch (err) {
      await refreshRooms({ preserveError: true });
      setError(err);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async (photoId) => {
    if (!selected) return;
    if (!window.confirm('이 사진을 삭제할까요? 삭제 후 다시 올릴 수 있습니다.')) return;
    setBusy(true);
    setError(null);
    try {
      await petApi.deletePhoto(selected.id, photoId);
      await refreshSelected(selected.publicId);
      await refreshRooms();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const startCheckout = async () => {
    if (!selected) return;
    if (selected.status !== 'awaiting_payment' && selected.photos.length < 1) {
      setError(new Error('사진을 한 장 이상 올려 주세요.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await petApi.checkout(selected.id);
      const url = new URL(data.checkoutUrl);
      if (url.origin !== 'https://mindulle.kr' || !url.pathname.startsWith('/pet/pay/')) throw new Error('결제 주소를 확인할 수 없습니다.');
      window.location.assign(url);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    if (!selected) return;
    if (!window.confirm('자동 갱신을 해지할까요? 이미 결제한 기간이 끝날 때까지 추모관은 계속 열려 있습니다.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await petApi.cancel(selected.id);
      await refreshSelected(selected.publicId);
      await refreshRooms();
      setNotice('자동 갱신을 해지했습니다. 결제한 기간까지는 계속 열려 있습니다.');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const deleteRoom = async () => {
    if (!selected) return;
    if (!window.confirm('추모관을 삭제하면 사진과 글이 모두 삭제됩니다. 정말 삭제할까요?')) return;
    setBusy(true);
    setError(null);
    try {
      await petApi.deleteRoom(selected.id);
      setSelected(null);
      await refreshRooms();
      setNotice('추모관을 삭제했습니다.');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!selected?.shareUrl) return;
    const text = `${memorialName(selected.petName)}의 무지개다리 추모관`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url: selected.shareUrl });
        return;
      }
      await navigator.clipboard.writeText(selected.shareUrl);
      setNotice('가족 공유 링크를 복사했습니다.');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(new Error('공유 링크를 복사하지 못했습니다. 아래 링크를 직접 복사해 주세요.'));
    }
  };

  const logout = () => {
    clearOwnerToken();
    setSelected(null);
    setRooms([]);
    setPhase('login');
    setNotice('');
    setError(null);
  };

  const statusInfo = selected ? STATUS[selected.status] || STATUS.preview : null;
  const canSeeScene = Boolean(selected && (selected.ownerAccess || selected.familyAccess) && loadedPhotos.length > 0);
  const canEdit = Boolean(selected && selected.ownerAccess && selected.status !== 'expired');
  const checkoutEnabled = config?.available && config?.photoUpgradeEnabled === true;
  const awaitingPayment = selected?.status === 'awaiting_payment';
  const pendingRoom = rooms.find(room => room.status === 'awaiting_payment');
  const showPay = Boolean(config?.additionalRoomsEnabled && awaitingPayment) || Boolean(checkoutEnabled && selected && ['preview', 'past_due', 'payment_failed', 'expired'].includes(selected.status));
  const showShare = Boolean(selected && selected.shareEnabled && selected.shareUrl);

  if (!open) return null;

  return (
    <div className="mdl-memorial-backdrop" role="dialog" aria-modal="true" aria-label="무지개다리 추모관">
      <div className="mdl-memorial-dialog">
        <header className="mdl-memorial-head">
          <div>
            <p className="mdl-memorial-kicker">안심당 · 추모</p>
            <h2>무지개다리 추모관</h2>
            <p className="mdl-memorial-sub">한 아이, 한 방. 사진과 편지를 남기고 가족과 나누는 곳.</p>
            <a href="/?memorial=lulu" className="mt-2 inline-block text-sm text-amber-100 underline underline-offset-4">루루의 공개 추모관 보기</a>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => guide.current?.showModal()}
              className="whitespace-nowrap rounded-full bg-white/10 px-3 py-2 text-sm">이용 안내</button>
          <button type="button" className="mdl-memorial-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
          </div>
        </header>
        <dialog ref={guide} aria-labelledby="memorial-guide-title"
          className="m-auto max-h-[85dvh] w-[92vw] max-w-lg overflow-y-auto rounded-2xl bg-slate-900 p-5 text-sm leading-relaxed text-white backdrop:bg-black/75">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 id="memorial-guide-title" className="text-base font-semibold text-amber-100">추모관 이용 안내</h3>
            <button type="button" autoFocus onClick={() => guide.current?.close()}
              className="shrink-0 rounded-full bg-white/10 px-3 py-2">안내 닫기</button>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-amber-100">무료 추모관 만들기</dt>
              <dd>휴대전화 번호당 무료 추모관은 한 곳, 사진은 5장까지 보관할 수 있어요. 무료 추모관은 로그인한 본인만 볼 수 있어요.</dd>
            </div>
            <div>
              <dt className="font-semibold text-amber-100">사진 추가하고 크게 보기</dt>
              <dd>기존 추모관을 선택하고 아래로 내려 「사진 추가」를 누르세요. 액자를 누르면 사진을 크게 볼 수 있고, 「이전」「다음」 버튼이나 좌우로 밀어서 다른 사진을 볼 수 있어요.</dd>
            </div>
            <div>
              <dt className="font-semibold text-amber-100">업그레이드와 가족 공유</dt>
              <dd>여섯 번째 사진을 추가하면 업그레이드 안내가 열려요. 결제 후 사진을 최대 20장까지 보관하고 가족에게 공유 링크를 보낼 수 있어요. 이용료는 연 {won(config?.priceWon || 9900)}이며 매년 자동 결제돼요.</dd>
            </div>
            {config?.additionalRoomsEnabled && <div>
              <dt className="font-semibold text-amber-100">다른 아이의 추모관 만들기</dt>
              <dd>다른 아이의 이름으로 새 추모관을 열 수 있어요. 한 곳당 연 {won(config?.priceWon || 9900)}이며 결제 후 사진 최대 20장과 가족 공유를 이용할 수 있어요.</dd>
            </div>}
            <div>
              <dt className="font-semibold text-amber-100">추모관 삭제하기</dt>
              <dd>삭제할 추모관을 선택한 뒤 맨 아래의 「추모관 삭제」를 누르세요. 방 이름을 확인한 뒤 삭제를 승인하세요. 사진과 글도 함께 삭제되며 복구할 수 없어요.</dd>
            </div>
          </dl>
        </dialog>


        {phase === 'login' ? (
          <section className="mdl-memorial-login">
            <div className="mdl-memorial-login-copy">
              <h3>휴대폰으로 관리하기</h3>
              <p>
                추모관은 휴대폰 인증으로 관리합니다. 가족에게 보내는 공유 링크는 로그인 없이 열립니다.
              </p>
              <ul>
                <li>한 마리당 한 방, 사진 최대 5장</li>
                <li>먼저 무료로 미리보기</li>
                <li>결제 후 가족 공유 링크가 열립니다</li>
              </ul>
            </div>
            <div className="mdl-memorial-auth">
              <label>
                <span>휴대폰 번호</span>
                <div className="mdl-memorial-phone-row">
                  <input
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(event) => setPhone(normalizePhone(event.target.value).slice(0, 11))}
                  />
                  <button type="button" onClick={sendCode} disabled={busy || cooldown > 0}>
                    {cooldown > 0 ? `${cooldown}초` : '인증번호 받기'}
                  </button>
                </div>
              </label>
              <label>
                <span>인증번호 6자리</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(normalizePhone(event.target.value).slice(0, 6))}
                />
              </label>
              <button type="button" className="mdl-memorial-primary" onClick={verify} disabled={busy}>
                인증하고 들어가기
              </button>
              <ErrorText error={error} />
              {notice ? <p className="mdl-memorial-notice">{notice}</p> : null}
            </div>
          </section>
        ) : (
          <div className="mdl-memorial-body">
            <aside className="mdl-memorial-side">
              <div className="mdl-memorial-side-head">
                <strong>내 추모관</strong>
                <button type="button" onClick={logout}>로그아웃</button>
              </div>

              <div className="mdl-memorial-room-list">
                {rooms.map((room) => (
                  <button
                    type="button"
                    key={room.id}
                    className={`mdl-memorial-room-card ${selected?.id === room.id ? 'is-active' : ''}`}
                    onClick={() => openRoom(room)}
                  >
                    <span className="mdl-memorial-room-thumb">
                      <RoomThumbnail key={room.coverPhotoUrl} url={room.ownerAccess ? room.coverPhotoUrl : undefined} />
                    </span>
                    <span className="mdl-memorial-room-meta">
                      <strong>{memorialName(room.petName)}</strong>
                      <small>{STATUS[room.status]?.label || room.status} · 사진 {room.photos.length}장</small>
                    </span>
                  </button>
                ))}
              </div>

              <button type="button" className="mdl-memorial-new" disabled={busy} onClick={() => { setCreating(true); newNameInput.current?.focus(); }}>
                + 무료 추모관 만들기
              </button>
              {config?.additionalRoomsEnabled && (
                <button type="button" className="mdl-memorial-new" disabled={busy}
                  onClick={() => pendingRoom ? openRoom(pendingRoom) : setCreating('paid')}>
                  {pendingRoom ? '결제 대기 중인 추모관 열기' : '+ 다른 아이의 추모관 만들기'}
                </button>
              )}
              <p className="mdl-memorial-fine">
                한 마리당 한 방 · 연 {won(config?.priceWon || 9900)} · 사진 최대 {config?.maxPhotos || MAX_PHOTOS}장
              </p>
            </aside>

            <main className="mdl-memorial-main">
              {creating ? (
                <section className="mdl-memorial-create">
                  <h3>{creating === 'paid' ? '다른 아이의 추모관 만들기' : '무료 추모관 만들기'}</h3>
                  {creating === 'paid'
                    ? <p>연 {won(config?.priceWon || 9900)} · 결제 후 사진 최대 20장과 가족 공유를 이용할 수 있어요.</p>
                    : <p>휴대전화 번호당 무료 추모관은 한 곳까지 만들 수 있어요. 아이의 이름과 남기고 싶은 말을 적고 사진을 선택해 주세요.</p>}
                  <label>
                    <span>아이의 이름</span>
                    <input
                      ref={newNameInput}
                      maxLength={20}
                      placeholder="예: 초롱이"
                      value={newPetName}
                      onChange={(event) => setNewPetName(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>남기고 싶은 말</span>
                    <textarea
                      rows={5}
                      maxLength={500}
                      placeholder="우리 곁에 오래 머물러 줘서 고마워."
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                    />
                  </label>
                  {creating !== 'paid' && <div className="mdl-memorial-actions">
                    <button type="button" disabled={busy} onClick={() => newPhotoInput.current?.click()}>
                      사진 선택 (1~5장)
                    </button>
                    <input ref={newPhotoInput} type="file" accept="image/*" multiple hidden disabled={busy} onChange={event => {
                      const files = Array.from(event.currentTarget.files || []);
                      const invalid = files.length > MAX_PHOTOS || files.some(file => !file.type.startsWith('image/'));
                      setNewPhotos(invalid ? [] : files);
                      setError(invalid ? new Error('이미지 파일을 최대 5장까지 선택해 주세요.') : null);
                      if (invalid) event.currentTarget.value = '';
                    }} />
                    <span aria-live="polite">{newPhotos.length ? `${newPhotos.length}장 선택됨` : '선택한 사진 없음'}</span>
                  </div>}
                  <div className="mdl-memorial-actions">
                    <button type="button" className="mdl-memorial-primary" onClick={createRoom} disabled={busy}>
                      {busy ? '추모관을 만들고 있습니다…' : creating === 'paid' ? '추모관 만들고 결제 안내 보기' : '무료 미리보기 만들기'}
                    </button>
                    <button type="button" onClick={() => setCreating(false)} disabled={busy}>
                      취소
                    </button>
                  </div>
                  <ErrorText error={error} />
                </section>
              ) : !selected ? (
                <section className="mdl-memorial-empty-state">
                  <h3>사랑하는 아이를 기억하는 방</h3>
                  <p>왼쪽에서 추모관을 고르거나 새 추모관을 만들어 주세요.</p>
                  <p className="mdl-memorial-fine">
                    결제 전에는 무료 미리보기로 사진과 글을 확인할 수 있습니다.
                  </p>
                </section>
              ) : (
                <section className="mdl-memorial-workspace">
                  <div className="mdl-memorial-title-row">
                    <div>
                      <p className="mdl-memorial-kicker">무지개다리 추모관</p>
                      <h3>{memorialName(selected.petName)}</h3>
                    </div>
                    <span className={`mdl-memorial-status is-${statusInfo?.tone || 'muted'}`}>
                      {statusInfo?.label || selected.status}
                    </span>
                  </div>

                  {selected.status === 'preview' ? (
                    <div className="mdl-memorial-banner is-preview">
                      <strong>지금은 무료 미리보기입니다.</strong>
                      <span>결제하면 가족 공유 링크가 열리고, 1년 동안 추모관을 보관합니다.</span>
                    </div>
                  ) : null}

                  {['past_due', 'payment_failed'].includes(selected.status) ? (
                    <div className="mdl-memorial-banner is-danger">
                      <strong>갱신 결제가 실패했습니다.</strong>
                      <span>
                        가족 공유가 잠시 멈췄습니다. {selected.graceUntil ? `${dateText(selected.graceUntil)}까지` : '30일 안에'} 사진을 내려받거나 다시 결제할 수 있습니다.
                      </span>
                    </div>
                  ) : null}

                  {selected.status === 'expired' ? (
                    <div className="mdl-memorial-banner is-muted">
                      <strong>이용 기간이 끝났습니다.</strong>
                      <span>다시 결제하면 새 기간으로 추모관을 열 수 있습니다.</span>
                    </div>
                  ) : null}

                  {selected.status === 'canceled' ? (
                    <div className="mdl-memorial-banner is-muted">
                      <strong>자동 갱신이 해지되었습니다.</strong>
                      <span>{dateText(selected.expiresAt)}까지 가족 공유가 유지됩니다.</span>
                    </div>
                  ) : null}

                  {canSeeScene ? (
                    <RainbowMemorialScene room={{ ...selected, petName: memorialName(selected.petName), photos: loadedPhotos }} />
                  ) : (
                    <div className="mdl-memorial-scene-empty">
                      {awaitingPayment ? '결제를 마치면 사진을 올릴 수 있어요.' : selected.photos.length === 0
                        ? <div className="mdl-memorial-actions" style={{ flexDirection: 'column', alignItems: 'center' }}>
                            <span>사진을 올리면 이곳에 액자가 나타납니다.</span>
                            {canEdit && (
                              <button type="button" className="mdl-memorial-primary" disabled={busy}
                                onClick={() => fileInputRef.current?.click()}>
                                {busy ? '사진을 올리고 있습니다…' : '사진 올리기'}
                              </button>
                            )}
                            <ErrorText error={error} />
                          </div>
                        : '지금은 추모관이 공개되지 않았습니다. 다시 결제하거나 기간을 확인해 주세요.'}
                    </div>
                  )}

                  <div className="mdl-memorial-message">
                    <span>남긴 말</span>
                    <p>{selected.message}</p>
                  </div>

                  <div className="mdl-memorial-photos">
                    {upgradeRoom === selected.id && (
                      <dialog ref={upgradeDialog} onClose={() => setUpgradeRoom(null)} aria-label="사진 보관 한도 안내"
                        className="m-auto w-[92vw] max-w-md space-y-3 rounded-xl bg-slate-900 p-5 text-white backdrop:bg-black/70">
                        <strong>무료 미리보기는 사진 5장까지</strong>
                        <p>연 {won(config?.priceWon || 9900)}에 사진을 최대 20장까지 보관하고 가족과 공유할 수 있어요. 매년 자동 결제되며 언제든 자동 갱신을 해지할 수 있어요.</p>
                        {!checkoutEnabled && <p role="status">지금은 결제를 준비 중입니다. 기존 사진은 그대로 보관됩니다.</p>}
                        <ErrorText error={error} />
                        <div className="mdl-memorial-actions">
                          <button type="button" onClick={() => upgradeDialog.current?.close()}>닫기</button>
                          {checkoutEnabled && <button type="button" disabled={busy} onClick={startCheckout}>업그레이드 결제</button>}
                        </div>
                      </dialog>
                    )}
                    <div className="mdl-memorial-photos-head">
                      <strong>사진 {selected.photos.length} / {selected.maxPhotos || MAX_PHOTOS}</strong>
                      {canEdit ? (
                        <>
                          <button type="button" onClick={() => {
                            const limit = selected.maxPhotos || MAX_PHOTOS;
                            if (selected.photos.length < limit) fileInputRef.current?.click();
                            else if (selected.status === 'preview') setUpgradeRoom(selected.id);
                            else setError(new Error(`사진은 최대 ${limit}장까지 올릴 수 있습니다. 기존 사진을 먼저 지워 주세요.`));
                          }} disabled={busy}>
                            사진 추가
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(event) => uploadPhotos(event.target.files)}
                          />
                        </>
                      ) : null}
                    </div>
                    <div className="mdl-memorial-photo-grid">
                      {selected.photos.map((photo) => (
                        <div className="mdl-memorial-photo" key={photo.id}>
                          {loadedPhotos.find(item => item.id === photo.id) && <img src={loadedPhotos.find(item => item.id === photo.id).url} alt={`${memorialName(selected.petName)} 사진`} />}
                          {canEdit ? (
                            <button type="button" onClick={() => removePhoto(photo.id)} disabled={busy} aria-label="사진 삭제">
                              ×
                            </button>
                          ) : null}
                          {selected.ownerAccess ? (
                            <a href={loadedPhotos.find(item => item.id === photo.id)?.url} download="memorial.jpg">
                              내려받기
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selected.status === 'preview' && !showPay && (
                    <p className="mdl-memorial-note">현재 미리보기만 이용할 수 있습니다.</p>
                  )}
                  {showPay ? (
                    <div className="mdl-memorial-paybox">
                      <div>
                        <strong>연 {won(config?.priceWon || selected.priceWon || 9900)}</strong>
                        <p>매년 자동 결제 · 언제든 자동 갱신 해지 가능</p>
                        <small>
                          이번 결제 {won(config?.priceWon || selected.priceWon || 9900)} · 다음 결제일은 결제 후 1년 뒤입니다.
                        </small>
                      </div>
                      <button type="button" className="mdl-memorial-primary" onClick={startCheckout} disabled={busy || (!awaitingPayment && selected.photos.length < 1)}>
                        {awaitingPayment ? '결제하고 이 추모관 열기' : selected.status === 'preview' ? '이 추모관 업그레이드' : '다시 결제하기'}
                      </button>
                      <p className="mdl-memorial-fine">
                        {awaitingPayment ? '이 추모관에만 적용되며, 결제 후 사진 최대 20장과 가족 공유를 이용할 수 있어요.' : '결제 후 이 추모관의 사진 보관 한도가 20장으로 늘어나고 가족 공유 링크가 열립니다.'}
                      </p>
                    </div>
                  ) : null}

                  {showShare ? (
                    <div className="mdl-memorial-share">
                      <div>
                        <strong>가족 공유 링크</strong>
                        <p>가족은 로그인 없이 이 링크로 추모관을 볼 수 있습니다.</p>
                      </div>
                      <div className="mdl-memorial-share-row">
                        <input readOnly value={selected.shareUrl} onFocus={(event) => event.target.select()} />
                        <button type="button" onClick={share} disabled={busy}>공유</button>
                      </div>
                    </div>
                  ) : null}

                  {['active', 'canceled', 'past_due', 'payment_failed'].includes(selected.status) && selected.nextBillingAt ? (
                    <div className="mdl-memorial-sub-row">
                      <span>다음 결제일: {dateText(selected.nextBillingAt)}</span>
                      {selected.autoRenew ? (
                        <button type="button" onClick={cancelSubscription} disabled={busy}>
                          자동 갱신 해지
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mdl-memorial-danger-row">
                    {canEdit ? (
                      <button type="button" className="mdl-memorial-danger" onClick={deleteRoom} disabled={busy}>
                        추모관 삭제
                      </button>
                    ) : null}
                  </div>

                  <ErrorText error={error} />
                  {notice ? <p className="mdl-memorial-notice">{notice}</p> : null}
                </section>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export default RainbowMemorialDialog;

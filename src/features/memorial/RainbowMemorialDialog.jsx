import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MemorialCanvas } from './RainbowMemorialScene.jsx';
import {
  MemorialApiError,
  clearSavedMemorial,
  compressPhoto,
  createMemorial,
  deleteMemorial,
  getMemorial,
  loadSavedMemorial,
  saveMemorial
} from './api.js';

function formatError(error) {
  if (error instanceof MemorialApiError && error.status === 404) return '추모관 저장 서비스가 아직 연결되지 않았습니다.';
  if (error instanceof MemorialApiError) return error.message;
  return '잠시 후 다시 시도해 주세요.';
}

export default function RainbowMemorialDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [memorial, setMemorial] = useState(null);
  const [ownerToken, setOwnerToken] = useState('');
  const [petName, setPetName] = useState('');
  const [message, setMessage] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const element = dialogRef.current;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('loading');
    setLoadError('');

    const saved = loadSavedMemorial();
    if (!saved) {
      setPhase('form');
      return () => { cancelled = true; };
    }

    getMemorial(saved.publicId)
      .then(({ memorial: loaded }) => {
        if (cancelled) return;
        setMemorial(loaded);
        setOwnerToken(saved.ownerToken);
        setPhase('inside');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof MemorialApiError && err.status === 404) {
          clearSavedMemorial();
          setPhase('form');
          return;
        }
        setLoadError('저장된 추모관을 불러오지 못했습니다.');
        setPhase('loadError');
      });

    return () => { cancelled = true; };
  }, [open, loadAttempt]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  function close() {
    if (busy) return;
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose?.();
  }

  function pickPhoto(file) {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  }

  async function submit(event) {
    event?.preventDefault();
    if (busy) return;
    if (!petName.trim()) {
      setError('아이의 이름을 적어 주세요.');
      return;
    }
    if (!photoFile) {
      setError('사진 한 장을 올려 주세요.');
      return;
    }

    setBusy(true);
    setError('');
    setLoadError('');
    try {
      const imageDataUrl = await compressPhoto(photoFile);
      const response = await createMemorial({
        petName: petName.trim().slice(0, 20),
        message: message.trim().slice(0, 500),
        imageDataUrl
      });
      saveMemorial({ publicId: response.memorial.publicId, ownerToken: response.ownerToken });
      setOwnerToken(response.ownerToken);
      setMemorial(response.memorial);
      setPhase('inside');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!memorial) return;
    const url = memorial.shareUrl || `https://mindulle.kr/pet/${memorial.publicId}`;
    const payload = {
      title: `${memorial.petName} · 무지개다리 추모관`,
      text: String(memorial.message || '').slice(0, 80),
      url
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast('추모 페이지 링크를 복사했습니다.');
    } catch (err) {
      if (err?.name !== 'AbortError') setToast('링크를 복사하지 못했습니다.');
    }
  }

  async function remove() {
    if (!memorial || !ownerToken) return;
    if (!window.confirm('추모관을 지우면 사진과 남긴 말이 함께 사라집니다. 지울까요?')) return;

    setBusy(true);
    setError('');
    try {
      await deleteMemorial(memorial.publicId, ownerToken);
      clearSavedMemorial();
      setMemorial(null);
      setOwnerToken('');
      setPetName('');
      setMessage('');
      setPhotoFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview('');
      setPhase('form');
      setToast('추모관을 지웠습니다.');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-screen max-h-none w-screen max-w-none overflow-hidden bg-[#14110e] p-0 text-stone-100"
      aria-labelledby="memorial-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="relative h-full w-full overflow-hidden">
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-5 py-4">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-stone-400">민들레 안심당</p>
            <h2 id="memorial-title" className="mt-1 text-lg font-medium text-amber-100">무지개다리 추모관</h2>
          </div>
          <button type="button" onClick={close} className="rounded-full bg-black/50 px-4 py-2 text-sm text-stone-200">
            돌아가기
          </button>
        </header>

        {phase === 'loading' ? (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">
            추모관을 불러오는 중입니다.
          </div>
        ) : null}

        {phase === 'loadError' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
            <p role="alert">{loadError}</p>
            <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}
              className="rounded-full bg-white/10 px-5 py-3">다시 시도하기</button>
          </div>
        )}

        {phase === 'form' ? (
          <div className="h-full overflow-y-auto px-5 pb-28 pt-24">
            <form onSubmit={submit} className="mx-auto max-w-xl space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm leading-6 text-stone-300">
                  사진 한 장과 이름, 남기고 싶은 말을 적어 주세요.
                  <br />
                  추모관은 나만의 공간으로 열리고, 링크를 가족에게 보낼 수 있습니다.
                </p>
                {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm text-stone-300">아이의 사진</span>
                <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-stone-700 bg-stone-900">
                  {preview ? (
                    <img src={preview} alt="추모 사진 미리보기" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm text-stone-500">사진을 선택해 주세요</span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => pickPhoto(event.target.files?.[0])}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-stone-300">아이의 이름</span>
                <input
                  value={petName}
                  maxLength={20}
                  onChange={(event) => setPetName(event.target.value)}
                  placeholder="예: 보리"
                  className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-base outline-none focus:border-amber-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-stone-300">남기고 싶은 말</span>
                <textarea
                  value={message}
                  maxLength={500}
                  rows={7}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="함께한 시간, 하고 싶었던 말을 적어 주세요."
                  className="w-full resize-none rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-base leading-7 outline-none focus:border-amber-500"
                />
                <span className="mt-1 block text-right text-xs text-stone-500">{message.length} / 500</span>
              </label>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}

              <button type="button" disabled={!preview || !petName.trim() || busy}
                onClick={() => { setError(''); setPhase('preview'); }}
                className="w-full rounded-full bg-white/10 px-6 py-3 disabled:opacity-40">
                추모관 미리보기
              </button>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-amber-200 px-6 py-4 text-base font-medium text-stone-900 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? '추모관을 여는 중입니다...' : '추모관 열기'}
              </button>

              <p className="text-center text-xs leading-5 text-stone-500">
                사진은 서버에 저장되며, 추모관을 지우면 사진과 남긴 말이 함께 삭제됩니다.
              </p>
            </form>
          </div>
        ) : null}

        {phase === 'preview' && (
          <>
            <MemorialCanvas memorial={{ photoUrl: preview, petName: petName.trim(), message }} />
            <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-black/75 p-5 text-center">
              <p>미리보기 · 사진은 아직 저장되지 않았습니다.</p>
              {error && <p role="alert" className="text-rose-300">{error}</p>}
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" disabled={busy} onClick={() => setPhase('form')}
                  className="rounded-full bg-white/10 px-5 py-3">수정하기</button>
                <button type="button" disabled={busy} onClick={() => void submit()}
                  className="rounded-full bg-amber-200 px-5 py-3 text-stone-900">
                  {busy ? '저장 중입니다…' : '추모관 열기'}
                </button>
              </div>
            </div>
          </>
        )}

        {phase === 'inside' && memorial ? (
          <>
            <MemorialCanvas memorial={memorial} onShare={share} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-6 pt-16">
              <div className="pointer-events-auto mx-auto max-w-md text-center">
                <p className="text-[10px] tracking-[0.22em] text-amber-200/70">무지개다리 추모관</p>
                <h3 className="mt-2 text-xl font-medium text-amber-50">{memorial.petName}</h3>
                <p className="mt-2 max-h-[3.4rem] overflow-hidden text-sm leading-6 text-stone-300">
                  {String(memorial.message || '').slice(0, 90)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={share} className="rounded-full bg-amber-200 px-5 py-3 text-sm font-medium text-stone-900">
                    가족에게 공유하기
                  </button>
                  <button type="button" onClick={remove} disabled={busy} className="rounded-full bg-white/10 px-5 py-3 text-sm text-stone-300 disabled:opacity-50">
                    추모관 지우기
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-stone-400">사진을 눌러도 공유할 수 있습니다.</p>
              </div>
            </div>
            {error ? (
              <p className="absolute inset-x-5 bottom-32 z-40 text-center text-sm text-rose-300">{error}</p>
            ) : null}
          </>
        ) : null}

        {toast ? (
          <div className="absolute inset-x-5 top-20 z-50 mx-auto max-w-md rounded-xl bg-stone-800/95 px-4 py-3 text-center text-sm text-stone-100">
            {toast}
          </div>
        ) : null}
      </div>
    </dialog>,
    document.body
  );
}

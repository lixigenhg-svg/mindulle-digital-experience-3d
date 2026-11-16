/**
 * WishModal.tsx —— 라이트 체험券弹窗
 *
 * 两条路：
 *   · 라이트 체험권—— 填 표시 이름 + 이용 금액，跳到 care/donate.php?lamp=1 完成
 *     Toss 绑卡/扣款；支付成功后名字会写进 pgy_lamps，并在庭院灯排上挂出名牌。
 *   · 무료 소원 등 —— 原有的免费许愿灯，文字只落本地，不涉支付。
 */
import { useState, useSyncExternalStore } from 'react';
import { store } from '../store';
import { submitWish, MAX_WISHES } from '../api/wishes';
import { offeringDonateUrl, OFFERINGS, type OfferingKind } from '../api/lamps';

const TIERS = [1000, 3000, 5000, 10000];
const KIND_LABEL: Record<OfferingKind, string> = { lamp: '라이트', flower: '디지털 꽃', water: '디지털 물' };
const KIND_SUB: Record<OfferingKind, string> = { lamp: '등을 밝힙니다', flower: '꽃을 올립니다', water: '맑은 물을 올립니다' };

export default function WishModal() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const open = store.hud.wishOpen;
  const lampNames = store.hud.lampNames ?? [];
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState(3000);
  const [kind, setKind] = useState<OfferingKind>('lamp');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submitFree = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { list, remote } = await submitWish(text);
      store.setWishes(list);
      setText('');
      store.toast(
        remote
          ? `라이트 ${list.length}개를 걸었습니다`
          : `라이트 ${list.length}개를 걸었습니다`
      );
      store.setWishOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const submitPaid = () => {
    const nm = name.trim();
    if (nm === '') {
      store.toast('이름을 입력해 주세요');
      return;
    }
    window.open(offeringDonateUrl(kind, nm, text.trim(), tier), '_blank', 'noopener');
    store.setWishOpen(false);
  };

  const wishes = store.hud.wishTexts;

  return (
    <div data-testid="wish-modal" className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#2b2118] p-5 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {KIND_LABEL[kind]} 체험권
          </h2>
          <span className="text-xs text-white/60">라이트 {lampNames.length}/12</span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-white/60">
          {KIND_SUB[kind]} 이름을 남겨 주세요. 구매하시면 7일간 이 공간에 이름이 표시됩니다.
        </p>

        {lampNames.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {lampNames.slice(0, 8).map((n, i) => (
              <span key={i} className="rounded-full bg-amber-200/15 px-2.5 py-1 text-[11px] text-amber-100/90">
                {n}
              </span>
            ))}
          </div>
        )}

        <label className="mb-1.5 block text-xs text-white/70">체험 종류</label>
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {OFFERINGS.map(o => (
            <button
              key={o.kind}
              type="button"
              data-testid={`offering-${o.kind}`}
              onClick={() => {
                setKind(o.kind);
                setTier(o.tiers[0]);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 transition ${
                kind === o.kind
                  ? 'bg-amber-200/90 text-[#2b2118]'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              <span className="text-[13px] font-semibold">{o.label}</span>
              <span className={`text-[10.5px] ${kind === o.kind ? 'text-[#5a4020]' : 'text-white/50'}`}>
                {o.min.toLocaleString()}원부터
              </span>
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs text-white/70">올릴 이름</label>
        <input
          data-testid="lamp-name"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 20))}
          placeholder="예: 김영희"
          className="mb-3 w-full rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:bg-white/20"
        />

        <label className="mb-1 block text-xs text-white/70">표시 문구 (선택)</label>
        <textarea
          data-testid="wish-input"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={80}
          rows={2}
          placeholder="예: 가족의 건강을 빌며"
          className="w-full resize-none rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:bg-white/20"
        />

        <label className="mb-1.5 mt-3 block text-xs text-white/70">이용 금액</label>
        <div className="grid grid-cols-4 gap-1.5">
          {(OFFERINGS.find(o => o.kind === kind)?.tiers ?? TIERS).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setTier(v)}
              className={`rounded-xl py-2 text-[12.5px] font-medium transition ${
                tier === v
                  ? 'bg-amber-200/90 text-[#2b2118]'
                  : 'bg-white/10 text-white/80 hover:bg-white/12'
              }`}
            >
              {v.toLocaleString()}원
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => store.setWishOpen(false)}
            className="flex-1 rounded-full bg-white/10 py-2.5 text-sm text-white/90 transition hover:bg-white/15"
          >
            닫기
          </button>
          <button
            type="button"
            data-testid="lamp-pay"
            onClick={submitPaid}
            className="flex-1 rounded-full bg-[#ff7a00] py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff8c1a]"
          >
            {kind === 'lamp' ? '등 밝히기' : kind === 'flower' ? '꽃 올리기' : '물 올리기'}
          </button>
        </div>

        {kind === 'lamp' && (
        <button
          type="button"
          data-testid="wish-submit"
          onClick={submitFree}
          disabled={busy}
          className="mt-2 w-full rounded-full bg-white/5 py-2 text-xs text-white/60 transition hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? '저장 중…' : `무료로 소원 등 걸기 (${wishes.length}/${MAX_WISHES})`}
        </button>
        )}

        {wishes.length > 0 && (
          <div className="mt-3 flex max-h-20 flex-col gap-1.5 overflow-y-auto">
            {wishes.slice(0, 6).map((w, i) => (
              <div key={i} className="rounded-xl bg-white/5 px-3 py-1.5 text-xs text-white/75">
                {w || '（무소유）'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

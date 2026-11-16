/**
 * DonationModal.tsx —— 数字灯体验券面板（数字内容商品，非捐赠）
 *
 * 商品档位：무소유(自由金额) / 풀소유(体验券) / 선물용(送人)。
 * 本轮不接真实扣款：选档位后调用 api/payment 的预留接口，未配置网关时返回 pending。
 * 接入韩国支付（Toss Payments / 계좌이체）时只需替换 api/payment.ts，本面板无需改动。
 */
import { useState, useSyncExternalStore } from 'react';
import { store } from '../store';
import { DONATION_TIERS, createDonation } from '../api/payment';

function formatWon(amount: number): string {
  if (amount <= 0) return '자유';
  return `${amount.toLocaleString('ko-KR')}원`;
}

export default function DonationModal() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const open = store.hud.donationOpen;
  const [tierId, setTierId] = useState(DONATION_TIERS[0].id);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (busy) return;
    const tier = DONATION_TIERS.find(t => t.id === tierId) ?? DONATION_TIERS[0];
    setBusy(true);
    try {
      const result = await createDonation({ tierId: tier.id, amount: tier.amount });
      if (result.status === 'ok' && result.paymentUrl) {
        // 接入网关后：跳转支付页
        location.href = result.paymentUrl;
      } else {
        store.toast(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#2b2118] p-5 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">디지털 라이트 이용권</h2>
          
        </div>
        <p className="mb-4 text-xs text-white/60">이 공간은 가상 체험 공간입니다. 이용권은 결제일로부터 7일간 유효합니다.</p>

        <div className="flex flex-col gap-2.5">
          {DONATION_TIERS.map(t => (
            <button
              key={t.id}
              type="button"
              data-testid={`donation-tier-${t.id}`}
              onClick={() => setTierId(t.id)}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                tierId === t.id ? 'bg-white/20' : 'bg-white/8 hover:bg-white/15'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-medium text-white">{t.ko}</span>
                <span className="text-xs text-amber-100/90">{formatWon(t.amount)}</span>
              </div>
              <div className="mt-0.5 text-xs text-white/55">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* 供养金用途说明 */}
        <div className="mt-4 rounded-2xl border border-white/15 bg-white/6 px-4 py-3 text-left">
          <div className="mb-1.5 text-[13px] font-medium text-amber-100/90">
            이용료는 이렇게 사용됩니다 
          </div>
          <ul className="space-y-[7px] text-[11.5px] leading-relaxed text-white/65">
            <li>
              <div>콘텐츠 제작·운영 비용</div>
              
            </li>
            <li>
              <div>서버 운영 비용</div>
              
            </li>
            <li>
              <div>유지보수 비용</div>
              
            </li>
          </ul>
          <div className="mt-2 text-[11px] text-white/40">
            카드 결제 후 현금영수증 또는 세금계산서가 발급됩니다
            
          </div>
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => store.setDonationOpen(false)}
            className="flex-1 rounded-full bg-white/10 py-2.5 text-sm text-white/90 transition hover:bg-white/15"
          >
            닫기
          </button>
          <button
            type="button"
            data-testid="donation-submit"
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-full bg-amber-200/90 py-2.5 text-sm font-medium text-[#2b2118] transition hover:bg-amber-100 disabled:opacity-50"
          >
            {busy ? '처리 중…' : '구매하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

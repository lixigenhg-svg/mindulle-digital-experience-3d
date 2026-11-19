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
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (busy) return;
    const tier = DONATION_TIERS.find(t => t.id === tierId) ?? DONATION_TIERS[0];
    if (tier.amount <= 0) {
      store.toast('무소유는 무료 체험입니다. 결제 없이 둘러보세요.');
      return;
    }
    const rphone = recipient.replace(/[^0-9]/g, '');
    if (tier.id === 'love' && rphone !== '' && (rphone.length < 10 || rphone.length > 11)) {
      store.toast('받는 분 휴대폰 번호를 정확히 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const result = await createDonation({
        tierId: tier.id,
        amount: tier.amount,
        cycle: tier.id === 'pulsoyu' ? 'monthly' : 'once',
        gift: tier.id === 'love',
        rphone,
        premium: true
      });
      if (result.status === 'ok' && result.paymentUrl) {
        if (result.paymentFields) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = result.paymentUrl;
          for (const [name, value] of Object.entries(result.paymentFields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.append(input);
          }
          document.body.append(form);
          try {
            form.submit();
          } finally {
            form.remove();
          }
        } else {
          location.assign(result.paymentUrl);
        }
      } else {
        store.toast(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#2b2118] p-5 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">디지털 라이트 이용권</h2>
          
        </div>
        <p className="mb-4 text-xs text-white/60">이 공간은 가상 체험 공간입니다. 이용권은 결제일로부터 1개월간 유효하며, 풀소유는 매월 자동 갱신됩니다. 사랑하는 이에게는 프라이빗 금각과 6자리 초대 키가 함께 열립니다.</p>

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

        {tierId === 'love' && (
          <div className="mt-4">
            <label className="mb-1 block text-[11.5px] text-white/60" htmlFor="gift-phone">
              받는 분 휴대폰 번호 (선택)
            </label>
            <input
              id="gift-phone"
              data-testid="gift-phone"
              type="tel"
              inputMode="numeric"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="010-0000-0000"
              className="pointer-events-auto w-full rounded-xl border border-white/20 bg-[#17120e] px-3 py-2.5 text-sm text-white caret-white placeholder:text-white/40 focus:border-amber-200/60 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              입력하면 인증번호가 친구에게 발송되고, 결제자에게는 선물 완료 알림만 발송됩니다. 비워 두면 결제자 번호로 발송됩니다.
            </p>
            <div className="mt-2 rounded-xl border border-amber-200/20 bg-amber-200/6 px-3 py-2 text-[11px] leading-relaxed text-amber-100/65">
              선물받은 분은 인증번호로 프리미엄을 열고, 4D 설정 &gt; 프라이빗 금각에서 초대 키를 만들 수 있습니다.
            </div>
          </div>
        )}

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

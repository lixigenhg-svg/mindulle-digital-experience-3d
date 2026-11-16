/**
 * api/payment.ts —— 라이트 체험권 支付预留层（数字内容商品）
 *
 * 现状：仅整理下单接口形状与档位金额，不发起任何真实支付请求。
 * 后续接入韩国支付（Toss Payments / 계좌이체）时：
 *   1. 配置 `VITE_PAYMENT_GATEWAY` 与商户密钥（后端签发，前端不存密钥）；
 *   2. 在 `requestPayment` 内调用网关下单，拿到跳转/回调地址；
 *   3. 支付成功回调后再上报购买记录。
 * 前端只负责选档位、收集信息、调接口；扣款与对账在服务端完成。
 */

export interface DonationTier {
  id: string;
  ko: string;
  zh: string;
  desc: string;
  /** 展示参考金额（韩元），仅作界面提示，不代表真实扣款 */
  amount: number;
}

export const DONATION_TIERS: DonationTier[] = [
  { id: 'musoyu', ko: '무소유', zh: '', desc: '원하는 만큼 자유롭게 체험할 수 있어요', amount: 0 },
  { id: 'pulsoyu', ko: '풀소유', zh: '', desc: '이용 후 7일간 이 공간에 이름이 표시됩니다', amount: 1000 },
  { id: 'love', ko: '사랑하는 이에게', zh: '', desc: '소중한 사람에게 마음을 전하는 체험', amount: 10000 },
];

export interface DonationRequest {
  tierId: string;
  amount: number;
  message?: string;
}

export interface DonationResult {
  /** pending = 通道未接入，仅记录意向；ok = 已下单；failed = 下单失败 */
  status: 'pending' | 'ok' | 'failed';
  /** 接入网关后返回的支付跳转地址或订单号 */
  paymentUrl?: string;
  orderId?: string;
  message: string;
}

const ENV = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const GATEWAY = ENV.VITE_PAYMENT_GATEWAY || '';

/**
 * 提交供养意向。
 * 未配置网关时返回 pending（占位），不跳转、不扣款。
 */
export async function createDonation(req: DonationRequest): Promise<DonationResult> {
  // 未另建收单网关时，统一走 민들레 안심堂 供养支付页（已接通 Toss 绑卡+订阅）
  if (!GATEWAY) {
    const base = 'https://mindulle.kr/care/donate.php';
    const q = req.amount > 0 ? `?amount=${req.amount}` : '';
    return {
      status: 'ok',
      paymentUrl: `${base}${q}`,
      message: '이용권 결제 페이지로 이동합니다',
    };
  }

  try {
    // TODO(接入韩国支付): 向后端申请一个支付订单，由后端调用 Toss Payments 签发
    // const res = await fetch(`${GATEWAY}/api/payments`, { method: 'POST', body: JSON.stringify(req) });
    // const data = await res.json();
    // return { status: 'ok', paymentUrl: data.paymentUrl, orderId: data.orderId, message: '' };
    return { status: 'pending', message: '결제 채널 준비 중입니다' };
  } catch {
    return { status: 'failed', message: '결제 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

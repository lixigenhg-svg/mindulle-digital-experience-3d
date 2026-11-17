/**
 * FooterNotice.tsx —— 事业者标示与身份声明（合规用）
 *
 * 依韩国《电子商交易法》第 13 条标示义务，在线销售页面须显示事业者信息；
 * 另加一行说明，明确本站非法人寺院官方渠道、非募捐。
 * 文案为纯韩文，不出现中文。
 */
export default function FooterNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl bg-white/5 px-4 py-3 text-[10px] leading-relaxed text-white/45 ${
        compact ? 'mt-3' : 'mt-4'
      }`}
    >
      <p className="mb-1 text-white/70">사업자 정보</p>
      <p>민들레 안심케어 · 대표 LI XIGEN · 사업자등록번호 118-08-71419</p>
      <p>통신판매업신고 제 2026-인천부평-0406 호</p>
      <p>인천광역시 부평구 충선로203번길 16, 501호 705호 (삼산동)</p>
      <p>Tel 010-2906-1731 · lixigenhg@naver.com</p>
      <p className="mt-1.5 text-white/55">
        본 사이트는 종교법인의 공식 채널이 아니며, 개인사업자가 운영하는 가상 체험형
        디지털 콘텐츠입니다. 결제는 이용권 구매이며, 대가 없이 받는 금전이 아닙니다.
      </p>
      <p className="mt-1.5">
        <a href="./terms.html" className="text-amber-100/80 underline-offset-2 hover:underline">
          이용약관
        </a>
        <span className="mx-1">·</span>
        <a href="./privacy.html" className="text-amber-100/80 underline-offset-2 hover:underline">
          개인정보처리방침
        </a>
      </p>
    </div>
  );
}

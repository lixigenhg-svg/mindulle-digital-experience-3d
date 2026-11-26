const LOGO = 'assets/intro-logo.png';
import FooterNotice from './FooterNotice';
import { TOTAL_BEADS } from '../mala';

const BEADS = Array.from({ length: TOTAL_BEADS }, (_, i) => i);

interface IntroProps {
  onEnter: () => void;
  onToggleSound: () => void;
  muted: boolean;
}

export default function Intro({ onEnter, onToggleSound, muted }: IntroProps) {
  return (
    <main className="intro" data-testid="intro">
      <div className="intro-sky" aria-hidden="true" />
      <div className="intro-ridge intro-ridge-far" aria-hidden="true">
        <svg viewBox="0 0 1440 420" preserveAspectRatio="none">
          <path d="M0 320 L170 210 L300 285 L470 150 L620 265 L790 175 L960 280 L1130 190 L1290 270 L1440 210 L1440 420 L0 420 Z" />
        </svg>
      </div>
      <div className="intro-ridge intro-ridge-near" aria-hidden="true">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0 250 L180 170 L320 240 L500 120 L680 230 L860 165 L1040 245 L1210 180 L1440 250 L1440 320 L0 320 Z" />
        </svg>
      </div>
      <div className="intro-mist" aria-hidden="true" />

      <header className="intro-top">
        <span className="intro-mark">MINDULLE</span>
        <span className="intro-location">DIGITAL EXPERIENCE · 대한민국</span>
      </header>

      <section className="intro-center">
        <div className="intro-halo" aria-hidden="true">
          <img className="intro-logo" src={LOGO} alt="" />
          {BEADS.map(i => (
            <span
              key={i}
              className={`intro-halo-dot ${i === 0 ? 'is-mark' : ''}`}
              style={{ transform: `rotate(${i * (360 / TOTAL_BEADS)}deg) translateY(calc(var(--halo-r) * -1))` }}
            />
          ))}
        </div>

        <p className="intro-eyebrow">전통 공간을 걷는 디지털 체험</p>
        <h1 className="intro-title intro-title-name">민들레 4D 체험관</h1>
        <p className="intro-subtitle">빛과 소리로 만나는 전통 공간</p>
        <p className="intro-copy">
          빛을 켜고, 둘러보고,
          <br />
          빛과 소리로 머무는 4D 몰입 공간.
        </p>

        <a href="/?memorial=lulu"
          className="relative z-10 mt-3 inline-flex rounded-full border border-amber-100/30 bg-black/30 px-4 py-2 text-sm text-amber-100 hover:bg-black/50">
          루루의 공개 추모관 보기
        </a>

        <div className="intro-actions">
          <button type="button" className="intro-enter" data-testid="enter-button" onClick={onEnter}>
            4D 체험 시작
            
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h15M13 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            className="intro-sound"
            data-testid="intro-sound"
            aria-pressed={!muted}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            onClick={onToggleSound}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              {muted ? (
                <path d="M17 9l5 6M22 9l-5 6" />
              ) : (
                <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12" />
              )}
            </svg>
            {muted ? '소리 꺼짐' : '소리 켜짐'}
          </button>
        </div>

        <FooterNotice />
      </section>

      <footer className="intro-foot">
        <span>손 모으기</span>
        <span>예 갖추기</span>
        <span>108 구슬</span>
        <span>나무북</span>
        <a href="./guide.html">체험관 이용 안내</a>
        <p>잠시 머무는 4D 몰입 공간 · MINDULLE</p>
      </footer>
    </main>
  );
}

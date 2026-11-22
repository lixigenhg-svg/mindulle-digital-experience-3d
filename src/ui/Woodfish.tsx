import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  onStrike: () => void;
  onClose: () => void;
}

export default function Woodfish({ onStrike, onClose }: Props) {
  const [automatic, setAutomatic] = useState(false);
  const [strike, setStrike] = useState(0);
  const soundTimer = useRef<number>();
  const hit = useCallback(() => {
    window.clearTimeout(soundTimer.current);
    setStrike(value => value + 1);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onStrike();
    } else {
      soundTimer.current = window.setTimeout(onStrike, 164);
    }
  }, [onStrike]);
  useEffect(() => () => window.clearTimeout(soundTimer.current), []);
  useEffect(() => {
    if (!automatic) return;
    const timer = window.setInterval(hit, 1350);
    return () => window.clearInterval(timer);
  }, [automatic, hit]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div className="mala-backdrop" role="dialog" aria-modal="true" aria-label="목어" data-testid="woodfish-dialog">
      <div className="mala-panel woodfish-panel">
        <header className="mala-head">
          <div>
            <h2>목어</h2>
            <p className="mala-desc">목어를 눌러 소리를 내보세요.</p>
          </div>
          <button type="button" className="mala-close" aria-label="닫기" onClick={onClose}>×</button>
        </header>
        <button type="button" className="woodfish-strike" aria-label="목어 치기" onClick={hit}>
          <span className="woodfish-art">
            <img src="assets/ritual/woodfish.webp" alt="나무 목어" draggable={false} />
            <img key={strike} className={strike ? 'woodfish-mallet woodfish-struck' : 'woodfish-mallet'}
              src="assets/ritual/woodfish-mallet.webp" alt="" draggable={false} />
          </span>
        </button>
        <footer className="woodfish-controls">
          <button type="button" className="mala-step" aria-pressed={automatic}
            onClick={() => setAutomatic(value => !value)}>
            {automatic ? '자동 재생 정지' : '자동 재생'}
          </button>
          <button type="button" className="mala-reset" onClick={onClose}>닫기</button>
        </footer>
      </div>
    </div>
  );
}

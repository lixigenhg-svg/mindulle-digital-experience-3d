import { useEffect, useState } from 'react';

interface Props {
  onStrike: () => void;
  onClose: () => void;
}

export default function Woodfish({ onStrike, onClose }: Props) {
  const [automatic, setAutomatic] = useState(false);
  const [strike, setStrike] = useState(0);
  useEffect(() => {
    if (!automatic) return;
    const timer = window.setInterval(() => {
      onStrike();
      setStrike(value => value + 1);
    }, 1150);
    return () => window.clearInterval(timer);
  }, [automatic, onStrike]);
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
        <button type="button" className="woodfish-strike" aria-label="목어 치기" onClick={() => {
          onStrike();
          setStrike(value => value + 1);
        }}>
          <img key={strike} className={strike ? 'woodfish-struck' : undefined}
            src="assets/ritual/woodfish.webp" alt="나무 목어와 채" draggable={false} />
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

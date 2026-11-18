import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  MALA_STEP_DEGREES,
  TOTAL_BEADS,
  advanceMala,
  angleFromPoint,
  shortestAngleDelta
} from '../mala';

const C = 160;
const R = 124;

interface MalaWheelProps {
  open: boolean;
  beads: number;
  laps: number;
  onTurn: (turned: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function MalaWheel({ open, beads, laps, onTurn, onReset, onClose }: MalaWheelProps) {
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastAngle = useRef<number | null>(null);
  const accumulator = useRef(0);

  const dots = useMemo(() => Array.from({ length: TOTAL_BEADS }, (_, i) => i), []);
  const remaining = beads === 0 ? TOTAL_BEADS : TOTAL_BEADS - beads;

  if (!open) return null;

  const pointerAngle = (event: ReactPointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return angleFromPoint(
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2)
    );
  };

  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    lastAngle.current = pointerAngle(event);
    accumulator.current = 0;
    setDragging(true);
  };

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || lastAngle.current === null) return;
    const angle = pointerAngle(event);
    if (angle === null) return;
    const delta = shortestAngleDelta(lastAngle.current, angle);
    lastAngle.current = angle;
    const result = advanceMala(accumulator.current, delta);
    accumulator.current = result.accumulator;
    if (result.turned > 0) onTurn(result.direction * result.turned);
  };

  const up = (event: ReactPointerEvent<SVGSVGElement>) => {
    setDragging(false);
    lastAngle.current = null;
    accumulator.current = 0;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 指针捕获已由浏览器释放
    }
  };

  return (
    <div className="mala-backdrop" data-testid="mala-dialog" role="dialog" aria-modal="true" aria-label="108 구슬">
      <div className="mala-panel" onClick={event => event.stopPropagation()}>
        <header className="mala-head">
          <div>
            <p className="mala-kicker">PRAYER BEADS</p>
            <h2>108 구슬</h2>
            <p className="mala-desc">천천히, 시계 방향으로 한 알씩 굴려보세요</p>
          </div>
          <button type="button" className="mala-close" data-testid="mala-close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="mala-wheel">
          <svg
            ref={svgRef}
            data-testid="mala-svg"
            viewBox="0 0 320 320"
            className={dragging ? 'is-dragging' : ''}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={() => setDragging(false)}
          >
            {/* 立体珠串用到的渐变：珠面高光、珠体阴影、串绳、中心辉光 */}
            <defs>
              <radialGradient id="mala-bead-dim" cx="34%" cy="28%" r="76%">
                <stop offset="0%" stopColor="#9a8149" />
                <stop offset="42%" stopColor="#6b5527" />
                <stop offset="100%" stopColor="#241c0c" />
              </radialGradient>
              <radialGradient id="mala-bead-lit" cx="34%" cy="26%" r="78%">
                <stop offset="0%" stopColor="#fffbf2" />
                <stop offset="26%" stopColor="#f3d494" />
                <stop offset="66%" stopColor="#cf9a4d" />
                <stop offset="100%" stopColor="#6a4718" />
              </radialGradient>
              <linearGradient id="mala-thread" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(201,163,92,0.08)" />
                <stop offset="48%" stopColor="rgba(222,185,120,0.46)" />
                <stop offset="100%" stopColor="rgba(201,163,92,0.10)" />
              </linearGradient>
              <radialGradient id="mala-center-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(226,189,118,0.14)" />
                <stop offset="62%" stopColor="rgba(226,189,118,0.045)" />
                <stop offset="100%" stopColor="rgba(226,189,118,0)" />
              </radialGradient>
            </defs>

            {/* 串绳：带明暗的环，看上去像一根有厚度的绳 */}
            <circle cx={C} cy={C} r={R} fill="none" stroke="url(#mala-thread)" strokeWidth={2.4} />
            <circle cx={C} cy={C} r={R - 0.9} fill="none" stroke="rgba(255,238,205,0.16)" strokeWidth={0.7} />
            <circle cx={C} cy={C} r={104} className="mala-inner-track" />
            <circle cx={C} cy={C} r={112} fill="url(#mala-center-glow)" />

            {/* 108 颗珠子：越靠前（画面下方）越大越亮，靠后缩小压暗，形成纵深 */}
            {dots
              .map(i => {
                const angle = i * MALA_STEP_DEGREES;
                const rad = (angle * Math.PI) / 180;
                const bx = C + R * Math.sin(rad);
                const by = C - R * Math.cos(rad);
                // 0 = 最远（顶部），1 = 最近（底部）
                const depth = (by - (C - R)) / (2 * R);
                const reached = i < beads;
                const r = (reached ? 3.3 : 2.6) * (0.78 + 0.5 * depth);
                return { i, bx, by, depth, reached, r };
              })
              // 远的先画、近的后画，重叠处才有前后关系
              .sort((a, b) => a.by - b.by)
              .map(b => (
                <g key={b.i}>
                  <circle
                    cx={b.bx}
                    cy={b.by}
                    r={b.r}
                    className={b.reached ? 'mala-dot is-lit' : 'mala-dot'}
                    fill={b.reached ? 'url(#mala-bead-lit)' : 'url(#mala-bead-dim)'}
                    opacity={b.reached ? 1 : 0.62 + 0.38 * b.depth}
                  />
                  {/* 高光：固定落在左上，珠子才像球而不是圆点 */}
                  <circle
                    cx={b.bx - b.r * 0.33}
                    cy={b.by - b.r * 0.38}
                    r={b.r * 0.27}
                    fill="rgba(255,250,236,0.72)"
                    opacity={0.35 + 0.5 * b.depth}
                  />
                  {/* 底部反光：让珠体下半部有环境光，不发黑 */}
                  <circle
                    cx={b.bx + b.r * 0.2}
                    cy={b.by + b.r * 0.42}
                    r={b.r * 0.22}
                    fill="rgba(255,214,150,0.22)"
                  />
                </g>
              ))}
            <g transform={`rotate(${beads * MALA_STEP_DEGREES} ${C} ${C})`} className="mala-marker">
              <path d={`M ${C} ${C - R - 10} l -6 -9 h 12 z`} />
            </g>
            <text x={C} y={154} textAnchor="middle" className="mala-count" data-testid="bead-count">
              {beads}
            </text>
            <text x={C} y={178} textAnchor="middle" className="mala-total">/ 108</text>
            <text x={C} y={203} textAnchor="middle" className="mala-remain">
              {laps > 0 && beads === 0 ? '한 바퀴를 마쳤습니다' : `${remaining} 알 남음`}
            </text>
          </svg>
        </div>

        <footer className="mala-foot">
          <div>
            <p className="mala-hint">한 알마다 마음이 조금씩 가벼워집니다.</p>
            {laps > 0 && <p className="mala-lap">완주 {laps} 바퀴</p>}
          </div>
          <div className="mala-actions">
            <button type="button" className="mala-reset" data-testid="mala-reset" onClick={onReset}>
              초기화
            </button>
            <button type="button" className="mala-step" data-testid="mala-step" onClick={() => onTurn(1)}>
              한 알 굴리기
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

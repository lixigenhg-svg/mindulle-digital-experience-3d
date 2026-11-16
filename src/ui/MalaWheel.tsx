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
            <circle cx={C} cy={C} r={R} className="mala-track" />
            <circle cx={C} cy={C} r={104} className="mala-inner-track" />
            {dots.map(i => {
              const angle = i * MALA_STEP_DEGREES;
              const reached = i < beads;
              return (
                <circle
                  key={i}
                  cx={C}
                  cy={C - R}
                  r={reached ? 3.2 : 2.5}
                  className={reached ? 'mala-dot is-lit' : 'mala-dot'}
                  transform={`rotate(${angle} ${C} ${C})`}
                />
              );
            })}
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

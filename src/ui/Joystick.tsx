import { useEffect, useRef, useState } from 'react';
import { stick, resetStick } from '../player/input';

const R = 46;

export default function Joystick() {
  const pad = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);

  useEffect(() => () => resetStick(), []);

  const move = (e: PointerEvent) => {
    const el = pad.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    const mag = Math.min(1, len / R);
    if (mag > 0.16 && len > 0) {
      stick.up = -(dy / Math.max(len, 1)) * mag;
      stick.right = (dx / Math.max(len, 1)) * mag;
      stick.active = true;
    } else {
      resetStick();
    }
  };

  return (
    <div
      ref={pad}
      className="joystick"
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setOn(true);
        move(e.nativeEvent);
      }}
      onPointerMove={e => {
        if (on) move(e.nativeEvent);
      }}
      onPointerUp={() => {
        setOn(false);
        setKnob({ x: 0, y: 0 });
        resetStick();
      }}
      onPointerCancel={() => {
        setOn(false);
        setKnob({ x: 0, y: 0 });
        resetStick();
      }}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

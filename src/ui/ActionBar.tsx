/**
 * ActionBar.tsx —— 底部动作栏：손 모으기 / 예 갖추기 / 나무북 / 구슬。
 * 上方两个大胶囊入口：향 올리기（上香）、체험 안내（体验券说明）。
 * UI 标注对齐原版只用韩文；中文释义见 README。
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { ActionMachine, ActionState } from '../actions';
import { store } from '../store';

interface ActionBarProps {
  machine: ActionMachine;
  onOpenMala: () => void;
  onOpenWoodfish: () => void;
  onTour: () => void;
  onBell: () => void;
  onWish: () => void;
  onIncense: () => void;
  onSit?: () => void;
  onKowtow?: () => void;
  onBow?: () => void;
  onOffer?: () => void;
}

type Kind = 'pray' | 'bow' | 'beads' | 'wood_hit' | 'sit' | 'kowtow' | 'offer';

const ACTIVE_MAP: Record<Kind, ActionState> = {
  pray: 'praying',
  bow: 'bowing',
  beads: 'beads',
  wood_hit: 'wood_hit',
  sit: 'sitting',
  kowtow: 'kowtow',
  offer: 'offering',
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS: Record<Kind, ReactNode> = {
  pray: (
    <Icon>
      <path d="M12 21v-7" />
      <path d="M12 14c-2 0-3.5-1.5-3.5-3.5C8.5 8.5 10 7 12 7s3.5 1.5 3.5 3.5C15.5 12.5 14 14 12 14Z" />
    </Icon>
  ),
  bow: (
    <Icon>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 8v4l-3 5M12 12l3 5" />
    </Icon>
  ),
  wood_hit: (
    <Icon>
      <ellipse cx="12" cy="13" rx="7" ry="4.5" />
      <path d="M12 8.5V5M9 13h6" />
    </Icon>
  ),
  beads: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
      <circle cx="6" cy="12" r="1.4" />
    </Icon>
  ),
  sit: (
    <Icon>
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8v3M9 17h6M9.5 11l-2.5 4M14.5 11l2.5 4" />
    </Icon>
  ),
  offer: (
    <Icon>
      <path d="M12 20V9" />
      <path d="M12 9c-2.2 0-4-1.6-4-3.6 0-1.4 1.1-2.6 2.5-2.9" />
      <path d="M12 9c2.2 0 4-1.6 4-3.6 0-1.4-1.1-2.6-2.5-2.9" />
      <path d="M8 20h8" />
      <path d="M6 16c3 1 9 1 12 0" />
    </Icon>
  ),
  kowtow: (
    <Icon>
      <circle cx="8" cy="9" r="2" />
      <path d="M10 11h5l3 6M15 17h5" />
    </Icon>
  ),
};

const LABELS: Record<Kind, { ko: string; zh: string }> = {
  pray: { ko: '손 모으기', zh: '' },
  bow: { ko: '예 갖추기', zh: '' },
  wood_hit: { ko: '목어', zh: '' },
  beads: { ko: '구슬', zh: '' },
  sit: { ko: '좌선', zh: '' },
  kowtow: { ko: '삼배', zh: '' },
  offer: { ko: '체험', zh: '' },
};

export default function ActionBar({ machine, onOpenMala, onOpenWoodfish, onTour, onBell, onWish, onIncense, onSit, onKowtow, onBow, onOffer }: ActionBarProps) {
  const [state, setState] = useState<ActionState>(machine.state);
  const [visible, setVisible] = useState(true);

  // 平时隐藏：4 秒无操作自动淡出，触摸屏幕任意处再浮现
  useEffect(() => {
    let timer = 0 as any;
    const arm = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), 4000);
    };
    arm();
    window.addEventListener('pointerdown', arm, true);
    window.addEventListener('wheel', arm, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', arm, true);
      window.removeEventListener('wheel', arm);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setState(machine.state), 100);
    return () => window.clearInterval(t);
  }, [machine]);

  const tap = (kind: Kind) => {
    if (kind === 'pray') machine.pray();
    else if (kind === 'bow') (onBow ? onBow() : machine.toggleBow());
    else if (kind === 'beads') onOpenMala();
    else if (kind === 'wood_hit') onOpenWoodfish();
    else if (kind === 'sit') (onSit ? onSit() : machine.toggleSit());
    else if (kind === 'kowtow') (onKowtow ? onKowtow() : machine.kowtow());
    else if (kind === 'offer') (onOffer ? onOffer() : machine.offer());
  };

  const renderButton = (kind: Kind) => {
    const active = state === ACTIVE_MAP[kind];
    return (
      <button
        key={kind}
        type="button"
        data-testid={`action-${kind}`}
        aria-label={LABELS[kind].ko}
        aria-pressed={active}
        className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 transition ${
          active ? 'bg-white/20 text-amber-100' : 'text-white/90 hover:bg-white/10'
        }`}
        onPointerDown={e => {
          e.preventDefault();
          e.stopPropagation();
          tap(kind);
        }}
        onPointerUp={e => e.preventDefault()}
        onClick={e => {
          if (kind === 'wood_hit' && e.detail === 0) onOpenWoodfish();
        }}
        onContextMenu={e => e.preventDefault()}
      >
        {ICONS[kind]}
        <span className="text-[12px] leading-tight">{LABELS[kind].ko}</span>
        
      </button>
    );
  };

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 px-3 pb-4 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
    >
      {/* 场景入口：불 켜기 / 라이트 체험권 / 종 치기 / 메시지 월 / 탑 돌기 */}
      <div className="pointer-events-auto flex w-full max-w-[520px] flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          data-testid="action-incense"
          onClick={onIncense}
          className="flex flex-1 basis-[45%] items-center justify-center gap-2 rounded-full bg-black/45 px-4 py-3 text-[15px] text-white/90 backdrop-blur-md transition hover:bg-black/60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21v-9" />
            <path d="M12 12c0-2 1.5-2.5 1.5-4.5" />
            <path d="M8 21h8" />
          </svg>
          향 올리기
          
        </button>
        <button
          type="button"
          data-testid="action-offer"
          onClick={() => (onOffer ? onOffer() : machine.offer())}
          className="flex flex-1 basis-[45%] items-center justify-center gap-2 rounded-full bg-black/45 px-4 py-3 text-[15px] text-white/90 backdrop-blur-md transition hover:bg-black/60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V9" />
            <path d="M12 9c-2.2 0-4-1.6-4-3.6 0-1.4 1.1-2.6 2.5-2.9" />
            <path d="M12 9c2.2 0 4-1.6 4-3.6 0-1.4-1.1-2.6-2.5-2.9" />
            <path d="M6 16c3 1 9 1 12 0" />
          </svg>
          라이트 체험하기
        </button>
        <button
          type="button"
          data-testid="action-donation"
          onClick={() => store.setDonationOpen(true)}
          className="flex flex-1 basis-[45%] items-center justify-center gap-2 rounded-full bg-black/45 px-4 py-3 text-[15px] text-white/90 backdrop-blur-md transition hover:bg-black/60"
        >
          체험 안내
        </button>
        <button
          type="button"
          data-testid="action-bell"
          onClick={onBell}
          className="flex flex-1 basis-[30%] items-center justify-center gap-2 rounded-full bg-black/45 px-3 py-2.5 text-[14px] text-white/90 backdrop-blur-md transition hover:bg-black/60"
        >
          범종 치기
          
        </button>
        <button
          type="button"
          data-testid="action-wish"
          onClick={onWish}
          className="flex flex-1 basis-[30%] items-center justify-center gap-2 rounded-full bg-black/45 px-3 py-2.5 text-[14px] text-white/90 backdrop-blur-md transition hover:bg-black/60"
        >
          라이트 걸기
          
        </button>
        <button
          type="button"
          data-testid="action-tour"
          onClick={onTour}
          className="flex flex-1 basis-[30%] items-center justify-center gap-2 rounded-full bg-black/45 px-3 py-2.5 text-[14px] text-white/90 backdrop-blur-md transition hover:bg-black/60"
        >
          탑돌이
          
        </button>
      </div>

      {/* 主动作栏 */}
      <div className="pointer-events-auto flex w-full max-w-[520px] items-center gap-1 rounded-[28px] bg-black/40 px-2 py-2 backdrop-blur-md">
        {renderButton('pray')}
        {renderButton('bow')}
        {renderButton('wood_hit')}
        {renderButton('beads')}
      </div>
    </div>
  );
}

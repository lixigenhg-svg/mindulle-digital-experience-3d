/**
 * App.tsx —— 装配：入口页、3D 场景、本地玩家、远端容器、网络、音频、动作机、108 珠串与 DOM HUD。
 * 网络事件写状态仓；UI 与 3D 组件从仓读取。
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';
import type { WebGLRenderer } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import ExperienceScene from './scene/ExperienceScene';
import Exterior from './scene/Exterior';
import Environment from './scene/Environment';
import SensoryLayer from './scene/SensoryLayer';
import * as THREE from 'three';
import LocalPlayer, { type MoveSnapshot } from './player/LocalPlayer';
import { isInTeaHouse, nearestSeat } from './player/seats';
import { cushionTaken, nearestFreeCushion, overlappingClaim, type Cushion } from './player/cushions';
import RemotePlayers from './remote/RemotePlayers';
import Hud from './ui/Hud';
import ActionBar from './ui/ActionBar';
import Intro from './ui/Intro';
import { fetchLamps } from './api/lamps';
import MalaWheel from './ui/MalaWheel';
import Woodfish from './ui/Woodfish';
import RainTea from './ui/RainTea';
import { consumeRainTeaReturn } from './api/rainTea';
import DonationModal from './ui/DonationModal';
import ServerModal from './ui/ServerModal';
import SettingsModal from './ui/SettingsModal';
import WishModal from './ui/WishModal';
import Toast from './ui/Toast';
import PrivateRoomGate from './ui/PrivateRoomGate';
import PrivateRoomUI from './ui/PrivateRoomUI';
import PrivateSalon, { type PrivateMood } from './scene/PrivateSalon';
import { ActionMachine } from './actions';
import { playerMotion } from './avatar/animState';
import { AudioEngine, sharedAudio } from './audio';
import { Net } from './net';
import { makeIdentity } from './names';
import { bumpInstance, parseRoom, MOVE_SEND_INTERVAL, INCENSE_BURNER_Z, MOVE_SPEED, INCENSE_DURATION_MS, INCENSE_INSERT_DURATION_MS, INCENSE_RELEASE } from './config';
import { store } from './store';
import { haptic } from './immersive';
import { expireNightPass, expirePremium, refreshPremium } from './paid';
import { forgetPrivateEntry, getPrivateEntry, isPrivateRoom, rememberPrivateEntry } from './privateRoom';

const paidMemorialRoom = (() => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  if (url.searchParams.get('pet') !== 'paid') return '';
  const room = url.searchParams.get('room') || '';
  for (const key of ['pet', 'room', 'token']) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url);
  return room;
})();

const RainbowMemorialDialog = lazy(() => import('./features/memorial/RainbowMemorialDialog.jsx'));

const IS_MOBILE =
  typeof matchMedia !== 'undefined' && (matchMedia('(pointer:coarse)').matches || innerWidth < 768);

/** 自动化环境使用软件光栅，关闭阴影并降到 1x DPR，避免无头渲染拖慢验收；真实设备保留完整画质。 */
const IS_HEADLESS = typeof navigator !== 'undefined' && Boolean(navigator.webdriver);

function SceneProbe({ onFrame }: { onFrame: () => void }) {
  useFrame(onFrame);
  return null;
}

function StatsBridge({
  framesRef,
  statsRef,
  glRef
}: {
  framesRef: MutableRefObject<number>;
  statsRef: MutableRefObject<{ fps: number; triangles: number; drawCalls: number }>;
  glRef: MutableRefObject<WebGLRenderer | null>;
}) {
  const gl = useThree(s => s.gl);
  glRef.current = gl;
  // 프리미엄 야간 이용권：到期自动收回夜间亮度（每 30 秒检查一次）
  useEffect(() => {
    const id = window.setInterval(() => {
      expireNightPass();
      expirePremium();
    }, 30000);
    expireNightPass();
    expirePremium();
    // 打开时查一次订阅；之后每 6 小时刷新，月度续费自动延长
    void refreshPremium();
    const sub = window.setInterval(() => void refreshPremium(), 30 * 60 * 1000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(sub);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      statsRef.current = {
        fps: framesRef.current,
        triangles: Math.round(gl.info.render.triangles),
        drawCalls: Math.round(gl.info.render.calls)
      };
      framesRef.current = 0;
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gl, framesRef, statsRef]);
  return null;
}

/**
 * 首屏加载提示 —— 只加一层提示，不参与任何 3D 绘制。
 * 模型下载期间显示百分比，场景就绪（__MD_TP__ 可用）后自动消失。
 */
function SceneLoading() {
  // 进度条用 CSS 动画（合成线程推进），主线程在编译着色器时也不会卡住不动。
  // 只往前、不回跳；到 90% 停住，等场景真正就绪后整块消失。
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-3 rounded-2xl px-6 py-5"
        style={{ background: 'rgba(20,22,17,0.72)', backdropFilter: 'blur(2px)' }}
      >
        <span className="text-[13px] tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.86)' }}>
          장면을 준비하는 중
        </span>
        <div className="h-[3px] w-[148px] overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.16)' }}>
          <div
            className="md-load-bar h-full w-full rounded-full"
            style={{ background: '#e8c887' }}
          />
        </div>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          잠시만 기다려 주세요
        </span>
      </div>
    </div>
  );
}

function ExperienceApp({ privateKey = '', onPrivateDenied }: {
  privateKey?: string;
  onPrivateDenied?: (msg: string) => void;
}) {
  // 本地玩家的法号固定为「민들레 안심」（蒲公英安心）
  const identity = useMemo(() => ({ ...makeIdentity(), name: '민들레 안심' }), []);
  const room = useMemo(parseRoom, []);
  const isPrivate = isPrivateRoom(room.room);

  const audioRef = useRef<AudioEngine | null>(null);
  if (!audioRef.current) audioRef.current = new AudioEngine();
  sharedAudio.engine = audioRef.current;

  const netRef = useRef<Net | null>(null);
  const machineRef = useRef<ActionMachine | null>(null);
  if (!machineRef.current) {
    machineRef.current = new ActionMachine(ev => {
      // 供养是新加的本机动作，服务端动作白名单里没有它；在这里拦住不发给服务器，
      // 免得服务器收到不认识的事件（服务端代码一个字都不用动）。
      if (ev !== 'offer') netRef.current?.sendAction(ev);
      audioRef.current?.trigger(ev);
      // 沉浸式触感：动作与声音同步震一下（桌面浏览器自动忽略）
      if (ev === 'wood_hit') haptic('strong');
      else if (ev === 'offer') haptic('double');
      else if (ev === 'pray' || ev === 'bow_start' || ev === 'sit_start' || ev === 'incense') haptic('soft');
      else if (ev === 'beads_start') haptic('tick');
    });
  }
  const machine = machineRef.current;
  const act = useSyncExternalStore(machine.subscribe, machine.getState);
  const moveRef = useRef<MoveSnapshot | null>(null);
  const selfId = useRef<string>();
  const cushionClaim = useRef<{ pad: Cushion; active: boolean; retry?: () => void } | null>(null);
  const cushionFlowId = useRef(0);
  const lastBead = useRef(0);

  // 刷新页面不应该退回封面：进过一次就记住，下次直接进场景
  const [entered, setEntered] = useState(() => {
    if (isPrivate) return true;
    try { return localStorage.getItem('mindulle.entered') === '1'; } catch { return false; }
  });
  // 私密金阁：房内专属状态
  const [privateMood, setPrivateMood] = useState<PrivateMood>('gold');
  const [privateLamp, setPrivateLamp] = useState(true);
  const [privateTea, setPrivateTea] = useState(0);
  // 是否在大殿内（决定动作条与功能性按钮是否出现）
  const [insideHall, setInsideHall] = useState(true);
  // 站在茶室坐垫 / 庭院长凳旁边时，殿外也浮出「坐下」按钮
  const [seatNear, setSeatNear] = useState<'tea' | 'bench' | null>(null);
  const [malaOpen, setMalaOpen] = useState(false);
  const [woodfishOpen, setWoodfishOpen] = useState(false);
  const [rainTeaInvite, setRainTeaInvite] = useState(() =>
    /^#rain-tea=([A-Za-z0-9_-]{22,128})$/.exec(location.hash)?.[1]);
  const [rainTeaOpen, setRainTeaOpen] = useState(() => !isPrivate && Boolean(rainTeaInvite));
  const [inTeaHouse, setInTeaHouse] = useState(false);
  const [memorialOpen, setMemorialOpen] = useState(Boolean(paidMemorialRoom));
  useEffect(() => {
    if (!isPrivate && consumeRainTeaReturn()) setRainTeaOpen(true);
  }, [isPrivate]);

  function closeRainTea() {
    setRainTeaOpen(false);
    if (rainTeaInvite) {
      history.replaceState(history.state, '', location.pathname + location.search);
      setRainTeaInvite(undefined);
    }
  }
  const strikeWoodfish = useCallback(() => machine.wood_hit(), [machine]);
  const [ready, setReady] = useState(false);
  // 场景是否真正可玩（模型与贴图就绪后调试钩子才出现），用于收起加载提示
  const [sceneReady, setSceneReady] = useState(false);

  const framesRef = useRef(0);
  const statsRef = useRef({ fps: 0, triangles: 0, drawCalls: 0 });
  const glRef = useRef<WebGLRenderer | null>(null);

  const beads = useSyncExternalStore(store.subscribe, () => store.hud.beads);
  const laps = useSyncExternalStore(store.subscribe, () => store.hud.beadLaps);
  const muted = useSyncExternalStore(store.subscribe, () => store.hud.muted);

  // 初始静音态与音频引擎（localStorage 持久化）对齐
  useEffect(() => {
    store.setMuted(audioRef.current?.muted ?? false);
  }, []);

  /* ---------- 디지털 라이트：已购买的灯（名字从 서버 拉取） ---------- */
  useEffect(() => {
    let alive = true;
    // 演示版（VITE_DEMO=1）不连服务器，用几条示例供养数据，方便直接看三处新功能
    if (import.meta.env.VITE_DEMO === '1') {
      store.setLampRecords([
        { name: '이희건', message: '가족의 건강과 평안을 빌며', date: '2026-11-15 14:20:26', type: 'lamp' },
        { name: '김영희', message: '어머니의 극락왕생을 빌며', date: '2026-11-10 09:11:02', type: 'lamp' },
        { name: '박보살', message: '아이의 무병장수를 빌며', date: '2026-11-08 18:40:00', type: 'lamp' },
        { name: '정미숙', message: '가족 모두 평안하기를', date: '2026-11-02 08:30:00', type: 'flower' },
        { name: '한상우', message: '부모님 건강하시기를', date: '2026-10-30 07:20:00', type: 'water' },
      ]);
      return () => { alive = false; };
    }
    fetchLamps().then(list => {
      if (alive) store.setLampRecords(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- 多人连接 ---------- */
  useEffect(() => {
    const net = new Net(room, identity, {
      onJoined: (id, roomId, capacity, count, peers) => {
        selfId.current = id;
        store.setJoined(roomId, capacity, count, peers);
      },
      onPeerJoin: p => store.addPeer(p),
      onPeerLeave: id => store.removePeer(id),
      onPeerMove: (id, x, z, rot, anim) => store.movePeer(id, x, z, rot, anim),
      onPeersBatch: items => store.movePeersBatch(items),
      onPeerAction: (id, action) => store.peerAction(id, action),
      onStatus: t => store.setStatus(t),
      onRoomFull: () => {
        bumpInstance(room);
        store.toast('방이 가득 차 다른 방으로 이동합니다');
      },
      onPrivateDenied: msg => {
        store.toast(msg);
        onPrivateDenied?.(msg);
      },
    }, privateKey);
    netRef.current = net;
    net.connect();
    return () => {
      net.destroy();
      netRef.current = null;
    };
  }, [room, identity, privateKey, onPrivateDenied]);

  /* ---------- 音频解锁 + 空闲预加载 ---------- */
  useEffect(() => {
    const unlock = () => audioRef.current?.unlock();
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
    const idle: (cb: () => void) => void = window.requestIdleCallback
      ? cb => window.requestIdleCallback(cb)
      : cb => window.setTimeout(cb, 1000);
    const h = idle(() => void audioRef.current?.preload());
    return () => {
      removeEventListener('pointerdown', unlock);
      removeEventListener('keydown', unlock);
    };
  }, []);

  /* ---------- 场景就绪探测（只读，不参与场景逻辑） ---------- */
  useEffect(() => {
    if (sceneReady) return;
    const probe = () => {
      const hook = (window as { __MD_TP__?: unknown }).__MD_TP__;
      if (typeof hook === 'function') {
        setSceneReady(true);
        return true;
      }
      return false;
    };
    if (probe()) return;
    const timer = window.setInterval(() => {
      if (probe()) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [sceneReady]);

  /* ---------- 移动上报（80ms 节流） ---------- */
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = moveRef.current;
      if (!s) return;
      const claim = cushionClaim.current;
      const state = machine.state;
      const occupied = state === 'kowtow' ? 'k' : state === 'bowing' ? 'b' : state === 'sitting' ? 's' : null;
      if (claim?.active && !occupied) cushionClaim.current = null;
      if (claim?.active && occupied && selfId.current &&
        overlappingClaim(claim.pad, store.peers.values(), selfId.current)) {
        cushionClaim.current = null;
        machine.interruptByMove();
        claim.retry?.();
      }
      const current = cushionClaim.current;
      const anim = current ? `p${current.active ? occupied : s.anim === 'walk' ? 'w' : 'i'}:${current.pad.id}` : s.anim;
      netRef.current?.sendMove(s.x, s.z, s.rot, anim);
    }, MOVE_SEND_INTERVAL);
    return () => window.clearInterval(t);
  }, []);

  /* ---------- 动作机回收 + 数珠节拍音（400ms 一次） ---------- */
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = performance.now();
      machine.update(now);
      if (machine.state === 'beads' && now - lastBead.current >= 400) {
        lastBead.current = now;
        audioRef.current?.beadTick();
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [machine]);

  /* ---------- 自动化测试观测接口 ---------- */
  useEffect(() => {
    const snapshot = () => {
      const canvas = glRef.current?.domElement;
      return {
        entered,
        state: machine.state,
        beads: store.hud.beads,
        laps: store.hud.beadLaps,
        muted: store.hud.muted,
        malaOpen,
        tourActive: store.hud.tourActive,
        bellAt: store.hud.bellAt,
        litIncense: store.hud.litIncense,
        wishes: store.hud.wishes,
        wishTexts: store.hud.wishTexts,
        audio: {
          ready: audioRef.current?.isReady() ?? false,
          chanting: audioRef.current?.isListening() ?? false,
          volumes: audioRef.current ? { ...audioRef.current.volumes } : null,
        },
        player: moveRef.current,
        peers: [...store.peers.values()].map(p => ({ id: p.id, name: p.name, x: p.x, z: p.z })),
        action: machine.state,
        scene: {
          ready,
          fps: statsRef.current.fps,
          triangles: statsRef.current.triangles,
          drawCalls: statsRef.current.drawCalls,
          canvas: { width: canvas?.width ?? 0, height: canvas?.height ?? 0 }
        }
      };
    };
    (window as unknown as Record<string, unknown>).__MD__ = {
      getSnapshot: snapshot,
      play: (action: 'PRAY' | 'BOW' | 'WOODFISH' | 'BEADS' | 'IDLE') => {
        if (action === 'PRAY') machine.pray();
        else if (action === 'BOW') machine.toggleBow();
        else if (action === 'WOODFISH') machine.wood_hit();
        else if (action === 'BEADS') machine.setBeadsHold(true);
        else machine.interruptByMove();
      },
      openMala: () => setMalaOpen(true),
      closeMala: () => setMalaOpen(false),
      addBeads: (n: number) => store.addBeads(n),
      resetBeads: () => store.resetBeads(),
      enter: () => {
        setEntered(true);
        try { localStorage.setItem('mindulle.entered', '1'); } catch { /* 隐私模式忽略 */ }
      },
      exit: () => {
        setEntered(false);
        try {
          localStorage.removeItem('mindulle.entered');
          localStorage.removeItem('mindulle.pos');
        } catch { /* 忽略 */ }
      },
      /** 调试：直接进入坐/拜流程 */
      sitNow: () => onSit(),
      kowtowNow: () => onKowtow(),
      bowNow: () => onBow(),
      incenseNow: () => onIncense(),
      /** 调试：直接把动作塞给角色（绕开动作机计时） */
      force: (a: 'idle' | 'kowtow' | 'sitting') => {
        const w = window as unknown as { __MD_LOCK__?: boolean };
        w.__MD_LOCK__ = a !== 'idle';
        playerMotion.action = a;
      },
    };
  }, [entered, machine, malaOpen, ready]);

  const onToggleSound = () => {
    const next = audioRef.current!.toggleMuted();
    store.setMuted(next);
    if (next) store.setChanting(false);
  };

  const onToggleListen = () => {
    const on = audioRef.current!.toggleListen();
    store.setChanting(on);
  };

  const openMala = () => {
    setMalaOpen(true);
    machine.setBeadsHold(true);
  };

  const closeMala = () => {
    setMalaOpen(false);
    machine.setBeadsHold(false);
  };

  const turnBeads = (turned: number) => {
    if (!turned) return;
    store.addBeads(turned);
    audioRef.current?.beadTick();
    haptic('tick');
  };

  // 刷新回来：如果上次是坐着的，自动把这个姿势接上，不用再点一次
  useEffect(() => {
    if (!entered) return;
    let sitting = false;
    try { sitting = localStorage.getItem('mindulle.seat') === '1'; } catch { /* 忽略 */ }
    if (!sitting) return;
    const id = window.setTimeout(() => {
      if (machine.state !== 'sitting') machine.toggleSit();
    }, 900);
    return () => window.clearTimeout(id);
  }, [entered, machine]);

  // 记住"当前是不是坐着"：动作机一换状态就写，刷新后能接回坐姿
  useEffect(() => {
    const write = () => {
      try {
        localStorage.setItem('mindulle.seat', machine.state === 'sitting' ? '1' : '');
      } catch { /* 忽略 */ }
    };
    write();
    const unsub = machine.subscribe(write);
    return unsub;
  }, [machine]);

  const exitExperience = () => {
    closeMala();
    if (isPrivate) {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      url.searchParams.delete('instance');
      window.location.href = url.toString();
      return;
    }
    setEntered(false);
    // 主动退出：清掉记忆，下次回来重新从封面进
    try {
      localStorage.removeItem('mindulle.entered');
      localStorage.removeItem('mindulle.pos');
      localStorage.removeItem('mindulle.seat');
    } catch { /* 忽略 */ }
  };

  /** 从封面进入：记住已进入，刷新后不再回到封面 */
  const enterExperience = () => {
    setEntered(true);
    try { localStorage.setItem('mindulle.entered', '1'); } catch { /* 隐私模式忽略 */ }
  };

  const onIncense = () => {
    const P = { x: 0, z: INCENSE_BURNER_Z + 0.76 };
    const walk = (window as unknown as { __MD_WALK__?: (x: number, z: number, tolerance?: number) => void }).__MD_WALK__;
    const face = (window as unknown as { __MD_FACE__?: (r: number, duration?: number) => void }).__MD_FACE__;
    const pos = (window as unknown as { __MD_POS__?: () => { x: number; z: number } }).__MD_POS__;
    const cam = (window as unknown as { __MD_CAM__?: (d: number, p: number, y: number) => void }).__MD_CAM__;
    const fix = (window as unknown as {
      __MD_FIXCAM__?: (p?: [number, number, number], t?: [number, number, number], snap?: boolean) => void;
    }).__MD_FIXCAM__;
    const start = pos?.();
    const dist = start ? Math.hypot(start.x - P.x, start.z - P.z) : 0;
    const budget = 5000 + (dist / MOVE_SPEED) * 1500;
    walk?.(P.x, P.z, 0.025);
    const scale = (window as unknown as { __MD_SCALE__?: (k: number) => void }).__MD_SCALE__;
    scale?.(1.15);   // 走近塑像时按设计比例把人放大，别显小
    const t0 = performance.now();
    const arrive = () => {
      const now = pos?.();
      const d = now ? Math.hypot(now.x - P.x, now.z - P.z) : 0;
      if (d < 0.04) {
        // 从侧前方远看，整个上香过程保持同一构图
        face?.(0);   // 实测 face(0) 就是面朝塑像（-z），别再改成别的角度
        fix?.([5.70, 2.25, P.z - 2.55], [0, 0.95, P.z - 0.35], false);
        window.setTimeout(() => {
          face?.(0);                           // 到位后再锁一次朝向（行走会把人转向通道）
          machineRef.current?.incense(INCENSE_DURATION_MS);   // 插香、站直、合掌行礼
          audioRef.current?.trigger('pray');
        }, 500);
        window.setTimeout(() => {
          store.lightIncense();                // 插香：香头点亮、青烟升起
          store.toast('향을 올렸습니다');
          haptic('double');
        }, 500 + INCENSE_INSERT_DURATION_MS * INCENSE_RELEASE);
        window.setTimeout(() => {
          fix?.();
          scale?.(1);
          cam?.(4.6, 0.30, 0);
          seatFlow(() => machineRef.current?.kowtow(), true);
        }, 500 + INCENSE_DURATION_MS + 850);
        return;
      }
      if (performance.now() - t0 > budget) {
        scale?.(1);
        return;
      }
      window.setTimeout(arrive, 100);
    };
    window.setTimeout(arrive, 300);
  };
  const seatFlow = (start: () => void, slowTurn = false) => {
    const flow = ++cushionFlowId.current;
    const excluded = new Set<number>();
    const api = window as unknown as {
      __MD_WALK__?: (x: number, z: number, tolerance?: number) => void;
      __MD_POS__?: () => { x: number; z: number };
      __MD_FACE__?: (angle: number, duration?: number) => void;
    };
    const choose = () => {
      if (flow !== cushionFlowId.current) return;
      const current = api.__MD_POS__?.() ?? moveRef.current;
      const pad = current && nearestFreeCushion(current, [...store.peers.values()], excluded);
      if (!pad || !current) {
        cushionClaim.current = null;
        store.toast('빈 방석이 없습니다');
        return;
      }
      cushionClaim.current = { pad, active: false };
      const busy = () => cushionTaken(pad, store.peers.values(), selfId.current, true);
      const retry = () => {
        excluded.add(pad.id);
        choose();
      };
      const turnTime = slowTurn ? 1500 : 0;
      if (turnTime) api.__MD_FACE__?.(Math.atan2(current.x - pad.x, current.z - pad.z), turnTime);
      window.setTimeout(() => {
        if (flow !== cushionFlowId.current) return;
        if (busy()) { retry(); return; }
        api.__MD_WALK__?.(pad.x, pad.z, 0.035);
        const deadline = performance.now() + 7000 + Math.hypot(current.x - pad.x, current.z - pad.z) / MOVE_SPEED * 2000;
        const wait = () => {
          if (flow !== cushionFlowId.current) return;
          if (busy()) { retry(); return; }
          const pos = api.__MD_POS__?.();
          if (pos && Math.hypot(pos.x - pad.x, pos.z - pad.z) < 0.05) {
            api.__MD_FACE__?.(0, slowTurn ? 1350 : 350);
            window.setTimeout(() => {
              if (flow !== cushionFlowId.current) return;
              if (busy()) { retry(); return; }
              cushionClaim.current = { pad, active: true, retry };
              start();
            }, slowTurn ? 1450 : 450);
          } else if (performance.now() < deadline) {
            window.setTimeout(wait, 120);
          } else {
            cushionClaim.current = null;
          }
        };
        window.setTimeout(wait, 120);
      }, turnTime ? turnTime + 50 : 0);
    };
    choose();
  };

  const onSit = () => {
    if (machine.state === 'sitting') { machine.toggleSit(); return; }
    // 站在茶室坐垫或庭院长凳旁边时，就地坐下（由 LocalPlayer 吸附到垫/凳上）；
    // 只有站在空地上才走去殿内找空坐垫。
    const pos = moveRef.current;
    if (pos && nearestSeat(pos.x, pos.z, 1.8)) { machine.toggleSit(); return; }
    seatFlow(() => machine.toggleSit());
  };

  const onKowtow = () => {
    seatFlow(() => machine.kowtow());
  };

  /** 行礼：先去空垫、站上面朝塑像跪下，再俯身（不是站着鞠躬） */
  const onBow = () => {
    if (machine.state === 'bowing') { machine.toggleBow(); return; }
    seatFlow(() => machine.toggleBow());
  };

  const onBell = () => {
    store.ringBell();
    audioRef.current?.bell();
    haptic('strong');
  };

  const onWish = () => {
    store.setWishOpen(true);
  };

  const onTour = () => {
    if (store.hud.tourActive) return;
    store.startTour();
    store.toast('탑을 돕니다');
  };

  const onScreenshot = () => {
    const canvas = glRef.current?.domElement as HTMLCanvasElement | undefined;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindulle-care.png';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      store.toast('사진을 저장했습니다');
    }, 'image/png');
  };

  return (
    <div className="relative h-full w-full">
      <Canvas
        frameloop={rainTeaOpen || memorialOpen ? 'never' : 'always'}
        shadows={!IS_HEADLESS}
        dpr={IS_HEADLESS ? 0.6 : [1, IS_MOBILE ? 1 : 1.5]}
        camera={{ fov: 58, near: 0.1, far: 100, position: [0, 2.2, 5.6] }}
        gl={{ antialias: !IS_MOBILE, toneMappingExposure: 1.32, preserveDrawingBuffer: true }}
        onCreated={(state) => {
          (window as any).__SCENE__ = state.scene;
          setReady(true);
        }}
      >
        <color attach="background" args={[isPrivate ? '#0b0806' : '#8fc0dd']} />
        <fog attach="fog" args={isPrivate ? ['#0b0806', 10, 30] : ['#b9cbd4', 30, 150]} />
        {!isPrivate && <Environment intensity={0.55} />}
        {isPrivate ? (
          <PrivateSalon mood={privateMood} lampLit={privateLamp} tea={privateTea} />
        ) : (
          <>
            <ExperienceScene />
            <Exterior />
          </>
        )}
        <SensoryLayer />
        <LocalPlayer
          name={identity.name}
          color={identity.color}
          machine={machine}
          privateMode={isPrivate}
          spawn={isPrivate ? { x: 0, z: 13.4 } : undefined}
          onMove={s => {
            moveRef.current = s;
            const inside = isPrivate ? true : s.z < 30.6;
            setInsideHall(prev => (prev === inside ? prev : inside));
            const seat = isPrivate ? null : nearestSeat(s.x, s.z, 1.8);
            const k = seat ? seat.kind : null;
            setSeatNear(prev => (prev === k ? prev : k));
            setInTeaHouse(!isPrivate && isInTeaHouse(s.x, s.z));
          }}
        />
        <RemotePlayers />
        <SceneProbe onFrame={() => { framesRef.current += 1; }} />
        <StatsBridge framesRef={framesRef} statsRef={statsRef} glRef={glRef} />
      </Canvas>

      {entered && !sceneReady && <SceneLoading />}

      {!entered && (
        <Intro onEnter={enterExperience} onToggleSound={onToggleSound} muted={muted} />
      )}

      {entered && (
        <>
          <Hud onToggleSound={onToggleSound} onToggleListen={onToggleListen} onExit={exitExperience} onScreenshot={onScreenshot} />
          <p className="scene-hint">화면을 눌러 이동 · 드래그로 시점 회전</p>
          {!insideHall && (seatNear || inTeaHouse) && !rainTeaOpen && !memorialOpen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-2 px-3 sm:bottom-12">
              {seatNear && (
                <button type="button" data-testid="seat-button" onClick={onSit}
                  className="pointer-events-auto rounded-full bg-black/70 px-6 py-3 text-[15px] text-amber-100 shadow-lg backdrop-blur-md hover:bg-black/80">
                  {act === 'sitting' ? '일어서기' : seatNear === 'tea' ? '앉아서 차 마시기' : '앉기'}
                </button>
              )}
              {inTeaHouse && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => setRainTeaOpen(true)}
                    className="pointer-events-auto rounded-full bg-slate-900/85 px-4 py-3 text-sm text-amber-100 shadow-lg">
                    빗소리 찻자리 미리보기
                  </button>
                  <button type="button" onClick={() => setMemorialOpen(true)}
                    className="pointer-events-auto rounded-full bg-slate-900/85 px-4 py-3 text-sm text-amber-100 shadow-lg">
                    무지개다리 추모관
                  </button>
                </div>
              )}
            </div>
          )}
          {!isPrivate && insideHall && <ActionBar
            machine={machine}
            onOpenMala={openMala}
            onOpenWoodfish={() => setWoodfishOpen(true)}
            onTour={onTour}
            onBell={onBell}
            onWish={onWish}
            onIncense={onIncense}
            onSit={onSit}
            onKowtow={onKowtow}
            onBow={onBow}
            onOffer={() => { machine.offer(); store.setDonationOpen(true); }}
          />}
          {isPrivate && entered && (
            <PrivateRoomUI
              room={room.room}
              inviteKey={privateKey}
              mood={privateMood}
              setMood={setPrivateMood}
              lampLit={privateLamp}
              setLampLit={setPrivateLamp}
              tea={privateTea}
              setTea={setPrivateTea}
              onScreenshot={onScreenshot}
            />
          )}
          {woodfishOpen && <Woodfish onStrike={strikeWoodfish} onClose={() => setWoodfishOpen(false)} />}
          <MalaWheel
            open={malaOpen}
            beads={beads}
            laps={laps}
            onTurn={turnBeads}
            onReset={() => store.resetBeads()}
            onClose={closeMala}
          />
        </>
      )}

      {rainTeaOpen && <RainTea invite={rainTeaInvite} onClose={closeRainTea} />}
      {memorialOpen && <Suspense fallback={null}><RainbowMemorialDialog open initialRoomId={paidMemorialRoom} onClose={() => setMemorialOpen(false)} /></Suspense>}
      <DonationModal />
      <ServerModal />
      <SettingsModal engine={audioRef.current} />
      <WishModal />
      <Toast />
    </div>
  );
}

/**
 * 入口壳：私密房先过密钥门；公共殿直接进原体验。
 * 密钥只放 sessionStorage，URL 永远只有房号。
 */
export default function App() {
  const room = useMemo(parseRoom, []);
  const privateRoom = isPrivateRoom(room.room);
  const [key, setKey] = useState(() => (privateRoom ? getPrivateEntry(room.room) : ''));
  const [gateError, setGateError] = useState('');
  const denied = useCallback((msg: string) => {
    forgetPrivateEntry(room.room);
    setKey('');
    setGateError(msg);
  }, [room.room]);

  if (privateRoom && !key) {
    return (
      <PrivateRoomGate
        room={room.room}
        initialError={gateError}
        onEnter={k => {
          rememberPrivateEntry(room.room, k);
          setGateError('');
          setKey(k);
        }}
      />
    );
  }

  return <ExperienceApp privateKey={privateRoom ? key : ''} onPrivateDenied={denied} />;
}

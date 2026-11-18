/**
 * App.tsx —— 装配：入口页、3D 场景、本地玩家、远端容器、网络、音频、动作机、108 珠串与 DOM HUD。
 * 网络事件写状态仓；UI 与 3D 组件从仓读取。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';
import type { WebGLRenderer } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import ExperienceScene from './scene/ExperienceScene';
import Exterior from './scene/Exterior';
import Environment from './scene/Environment';
import SensoryLayer from './scene/SensoryLayer';
import * as THREE from 'three';
import LocalPlayer, { type MoveSnapshot, nearestFreeCushion } from './player/LocalPlayer';
import { nearestSeat } from './player/seats';
import RemotePlayers from './remote/RemotePlayers';
import Hud from './ui/Hud';
import ActionBar from './ui/ActionBar';
import Intro from './ui/Intro';
import { fetchLamps } from './api/lamps';
import MalaWheel from './ui/MalaWheel';
import DonationModal from './ui/DonationModal';
import ServerModal from './ui/ServerModal';
import SettingsModal from './ui/SettingsModal';
import WishModal from './ui/WishModal';
import Toast from './ui/Toast';
import { ActionMachine } from './actions';
import { playerMotion } from './avatar/animState';
import { AudioEngine, sharedAudio } from './audio';
import { Net } from './net';
import { makeIdentity } from './names';
import { bumpInstance, parseRoom, MOVE_SEND_INTERVAL } from './config';
import { store } from './store';
import { haptic } from './immersive';
import { expireNightPass } from './paid';

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
    const id = window.setInterval(() => expireNightPass(), 30000);
    expireNightPass();
    return () => window.clearInterval(id);
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

export default function App() {
  // 本地玩家的法号固定为「민들레 안심」（蒲公英安心）
  const identity = useMemo(() => ({ ...makeIdentity(), name: '민들레 안심' }), []);
  const room = useMemo(parseRoom, []);

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
  const lastBead = useRef(0);

  // 刷新页面不应该退回封面：进过一次就记住，下次直接进场景
  const [entered, setEntered] = useState(() => {
    try { return localStorage.getItem('mindulle.entered') === '1'; } catch { return false; }
  });
  // 是否在大殿内（决定动作条与功能性按钮是否出现）
  const [insideHall, setInsideHall] = useState(true);
  // 站在茶室坐垫 / 庭院长凳旁边时，殿外也浮出「坐下」按钮
  const [seatNear, setSeatNear] = useState<'tea' | 'bench' | null>(null);
  const [malaOpen, setMalaOpen] = useState(false);
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
      onJoined: (_selfId, roomId, capacity, count, peers) =>
        store.setJoined(roomId, capacity, count, peers),
      onPeerJoin: p => store.addPeer(p),
      onPeerLeave: id => store.removePeer(id),
      onPeerMove: (id, x, z, rot, anim) => store.movePeer(id, x, z, rot, anim),
      onPeersBatch: items => store.movePeersBatch(items),
      onPeerAction: (id, action) => store.peerAction(id, action),
      onStatus: t => store.setStatus(t),
      onRoomFull: () => {
        bumpInstance(room);
        store.toast('방이 가득 차 다른 방으로 이동합니다');
      }
    });
    netRef.current = net;
    net.connect();
    return () => {
      net.destroy();
      netRef.current = null;
    };
  }, [room, identity]);

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
      if (s) netRef.current?.sendMove(s.x, s.z, s.rot, s.anim);
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
    // 参照原项目：走到香案前站定 → 镜头拉近到侧面 → 点香、插香、合手 → 找空垫坐下行礼
    // 香案（长香案）现在在 z≈-0.6，人站到它前面 0.9m 的位置
    const P = { x: 0, z: 0.55 };
    const walk = (window as unknown as { __MD_WALK__?: (x: number, z: number) => void }).__MD_WALK__;
    const face = (window as unknown as { __MD_FACE__?: (r: number) => void }).__MD_FACE__;
    const pos = (window as unknown as { __MD_POS__?: () => { x: number; z: number } }).__MD_POS__;
    const cam = (window as unknown as { __MD_CAM__?: (d: number, p: number, y: number) => void }).__MD_CAM__;
    const fix = (window as unknown as {
      __MD_FIXCAM__?: (p?: [number, number, number], t?: [number, number, number]) => void;
    }).__MD_FIXCAM__;
    // 快速走过去（不是瞬移）：临时把移动速度提到 3.6 倍，到案前再恢复
    (window as unknown as { __MD_SPEED_K__?: number }).__MD_SPEED_K__ = 6.0;
    const start0 = pos?.();
    const dist = start0 ? Math.hypot(start0.x - P.x, start0.z - P.z) : 0;
    const budget = Math.min(16000, 1200 + dist * 260);   // 按距离给时间，跑得快也留足余量
    walk?.(P.x, P.z);
    const scale = (window as unknown as { __MD_SCALE__?: (k: number) => void }).__MD_SCALE__;
    scale?.(1.15);   // 走近塑像时按设计比例把人放大，别显小
    const t0 = performance.now();
    const arrive = () => {
      const now = pos?.();
      const d = now ? Math.hypot(now.x - P.x, now.z - P.z) : 0;
      if (d < 0.35 || performance.now() - t0 > budget) {
        (window as unknown as { __MD_SPEED_K__?: number }).__MD_SPEED_K__ = 1;
        // 面朝香案，镜头贴近并从侧面看动作
        face?.(0);   // 实测 face(0) 就是面朝塑像（-z），别再改成别的角度
        cam?.(2.3, 0.28, -1.30);
        fix?.([1.80, 1.55, P.z + 3.25], [0.05, 1.00, -0.35]);   // 侧后机位：角色 + 香案 + 香炉青烟同框
        window.setTimeout(() => {
          face?.(0);                           // 到位后再锁一次朝向（行走会把人转向通道）
          machineRef.current?.incense(6400);   // 挺直站立→前倾→双手插香→直身，慢慢做完
          audioRef.current?.trigger('pray');
        }, 500);
        window.setTimeout(() => {
          store.lightIncense();                // 插香：香头点亮、青烟升起
          store.toast('향을 올렸습니다');
          haptic('double');
        }, 3800);
        window.setTimeout(() => {
          cam?.(2.0, 0.20, -1.35);
          fix?.([1.55, 1.45, P.z + 2.55], [0.05, 0.95, -0.40]);   // 推近：看清把香插进香炉
        }, 3400);
        window.setTimeout(() => {
          machineRef.current?.pray();
        }, 7000);
        window.setTimeout(() => {
          fix?.();                              // 解除定点机位
          scale?.(1.0);                         // 上香结束恢复常态大小
          cam?.(4.6, 0.30, 0);                 // 回到身后视角
          seatFlow(() => machineRef.current?.toggleBow());   // 找空垫、面朝塑像、跪下俯身
        }, 9000);
        return;
      }
      window.setTimeout(arrive, 200);
    };
    window.setTimeout(arrive, 300);
  };

  /** 坐下 / 行礼：先在坐垫阵列里找一块没人占的，走过去，站定后再由动作机接管 */
  const seatFlow = (start: (c: { x: number; z: number }) => void) => {
    const p = moveRef.current ?? { x: 0, z: 4, rot: 0, anim: 'idle' as const };
    const c = nearestFreeCushion(new THREE.Vector3(p.x, 0, p.z), []);
    const walk = (window as unknown as { __MD_WALK__?: (x: number, z: number) => void }).__MD_WALK__;
    const tp = (window as unknown as { __MD_TP__?: (x: number, z: number) => void }).__MD_TP__;
    // 离得太远就先走到垫子附近，别让玩家等太久（也避免还没到就坐下）
    if (Math.hypot(p.x - c.x, p.z - c.z) > 9) tp?.(c.x, c.z + 2.6);
    walk?.(c.x, c.z);
    // 等真正走到空垫前（最多 14 秒），到了再坐/拜
    const t0 = performance.now();
    const tick = () => {
      const now = (window as unknown as { __MD_POS__?: () => { x: number; z: number } }).__MD_POS__?.() ?? moveRef.current;
      const d = now ? Math.hypot(now.x - c.x, now.z - c.z) : 999;
      // 走到垫子跟前（或最多等 4.5 秒）就精确站到垫面正中，再坐下/俯身
      if (d < 0.85 || performance.now() - t0 > 4500) {
        (window as unknown as { __MD_TP__?: (x: number, z: number) => void }).__MD_TP__?.(c.x, c.z);
        // 面朝主塑像（台座在世界 z≈-2.05），保证行礼方向朝着塑像而不是侧向
        (window as unknown as { __MD_FACE__?: (r: number) => void }).__MD_FACE__?.(
          Math.atan2(-c.x, c.z + 2.05),
        );
        window.setTimeout(() => start(c), 380);
        return;
      }
      window.setTimeout(tick, 140);
    };
    window.setTimeout(tick, 180);
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
        shadows={!IS_HEADLESS}
        dpr={IS_HEADLESS ? 0.6 : [1, IS_MOBILE ? 1 : 1.5]}
        camera={{ fov: 58, near: 0.1, far: 100, position: [0, 2.2, 5.6] }}
        gl={{ antialias: !IS_MOBILE, toneMappingExposure: 1.32, preserveDrawingBuffer: true }}
        onCreated={(state) => {
          (window as any).__SCENE__ = state.scene;
          setReady(true);
        }}
      >
        <color attach="background" args={['#8fc0dd']} />
        <fog attach="fog" args={['#b9cbd4', 30, 150]} />
        <Environment intensity={0.55} />
        <ExperienceScene />
        <Exterior />
        <SensoryLayer />
        <LocalPlayer
          name={identity.name}
          color={identity.color}
          machine={machine}
          onMove={s => {
            moveRef.current = s;
            const inside = s.z < 30.6;
            setInsideHall(prev => (prev === inside ? prev : inside));
            const seat = nearestSeat(s.x, s.z, 1.8);
            const k = seat ? seat.kind : null;
            setSeatNear(prev => (prev === k ? prev : k));
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
          {!insideHall && seatNear && (
            <button
              type="button"
              data-testid="seat-button"
              onClick={onSit}
              className="pointer-events-auto absolute bottom-[110px] left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/55 px-6 py-3 text-[15px] text-amber-100 shadow-lg backdrop-blur-md transition hover:bg-black/70"
            >
              {act === 'sitting' ? '일어서기' : seatNear === 'tea' ? '앉아서 차 마시기' : '여기서 쉬어가기'}
            </button>
          )}
          {insideHall && <ActionBar
            machine={machine}
            onOpenMala={openMala}
            onTour={onTour}
            onBell={onBell}
            onWish={onWish}
            onIncense={onIncense}
            onSit={onSit}
            onKowtow={onKowtow}
            onBow={onBow}
          />}
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

      <DonationModal />
      <ServerModal />
      <SettingsModal engine={audioRef.current} />
      <WishModal />
      <Toast />
    </div>
  );
}

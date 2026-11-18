/**
 * immersive.ts —— 沉浸式 4D 感官层（设置 + 触感 + 陀螺仪）
 *
 * 这一层只做「加法」：
 *   1. 触感：上香、撞钟、撞木鼓、合手、转珠时让手机震一下（Vibration API）
 *   2. 陀螺仪：手机倾斜即转视角（DeviceOrientation，需用户手势授权）
 *   3. 环境：落叶 / 雪 / 雨（由 scene/SensoryLayer.tsx 读取）
 *   4. 光影：撞钟的光波、点香后的暖光（同上）
 *
 * 全部可在「設定」里单独关闭；默认全部只读本地，不写服务器。
 */

import { useSyncExternalStore } from 'react';

export type WeatherMode = 'none' | 'leaf' | 'snow' | 'rain';

export interface ImmersiveState {
  /** 触感震动 */
  haptic: boolean;
  /** 陀螺仪转视角 */
  gyro: boolean;
  /** 环境演出：无 / 落叶 / 雪 / 雨 */
  weather: WeatherMode;
  /** 光影演出：撞钟光波、点香暖光 */
  fx: boolean;
  /** 是否按所在地实时天气自动切换环境演出 */
  autoWeather: boolean;
  /** 风力系数（自动天气写入，手动模式固定 1） */
  wind: number;
  /** 夜间：只压一点画面亮度，不动机位与灯光参数 */
  night: boolean;
  /** 设置面板显示的一行天气说明 */
  liveLabel: string;
}

const LS_KEY = 'mindulle.immersive';

const DEFAULTS: ImmersiveState = {
  // 默认打开触感与光影：手机用户一进殿就能感觉到反馈
  haptic: true,
  // 陀螺仪默认关闭：需要系统授权，且部分用户会晕，交给用户自己开
  gyro: false,
  // 默认落叶：与场景季节一致，又不影响远景能见度
  weather: 'leaf',
  fx: true,
  // 需要定位授权与联网，默认关闭，由用户在设置里主动开启
  autoWeather: false,
  wind: 1,
  night: false,
  liveLabel: '',
};

function read(): ImmersiveState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw) as Partial<ImmersiveState>;
    const w = o.weather;
    return {
      haptic: typeof o.haptic === 'boolean' ? o.haptic : DEFAULTS.haptic,
      gyro: typeof o.gyro === 'boolean' ? o.gyro : DEFAULTS.gyro,
      weather: w === 'none' || w === 'leaf' || w === 'snow' || w === 'rain' ? w : DEFAULTS.weather,
      fx: typeof o.fx === 'boolean' ? o.fx : DEFAULTS.fx,
      autoWeather: typeof o.autoWeather === 'boolean' ? o.autoWeather : DEFAULTS.autoWeather,
      wind: typeof o.wind === 'number' && Number.isFinite(o.wind) ? o.wind : DEFAULTS.wind,
      night: typeof o.night === 'boolean' ? o.night : DEFAULTS.night,
      liveLabel: typeof o.liveLabel === 'string' ? o.liveLabel : DEFAULTS.liveLabel,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let current: ImmersiveState = read();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(l => l());
}

export function getImmersive(): ImmersiveState {
  return current;
}

/** 自动天气结果写回（由设置面板调用） */
export function applyLiveWeather(patch: {
  weather: WeatherMode;
  wind: number;
  night: boolean;
  liveLabel: string;
}): void {
  setImmersive(patch);
}

export function setImmersive(patch: Partial<ImmersiveState>): void {
  const next = { ...current, ...patch };
  current = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* 隐私模式忽略 */
  }
  // 陀螺仪开关切换时同步监听的启停
  if (patch.gyro !== undefined) {
    if (next.gyro) startGyro();
    else stopGyro();
  }
  emit();
}

/** 组件里订阅（设置面板与场景都要拿到最新值） */
export function useImmersive(): ImmersiveState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getImmersive,
    getImmersive
  );
}

/* ------------------------------------------------------------------ */
/* 1. 触感：手机震动                                                    */
/* ------------------------------------------------------------------ */

/** 上次震动时间，避免转珠时每个珠都震（手机会像蜂鸣器一样） */
let lastHapticAt = 0;
const HAPTIC_MIN_GAP = 110;

type HapticKind = 'tick' | 'soft' | 'double' | 'strong';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 12,
  soft: 26,
  double: [18, 90, 22],
  strong: [40, 70, 60],
};

/**
 * 触发一次触感。
 * 不支持的设备（桌面、部分 Android 浏览器）静默跳过，不抛错。
 */
export function haptic(kind: HapticKind = 'soft'): void {
  if (!current.haptic) return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  const now = performance.now();
  // tick 才做节流，其他一次性动作不受限
  if (kind === 'tick' && now - lastHapticAt < HAPTIC_MIN_GAP) return;
  lastHapticAt = now;
  try {
    nav.vibrate(PATTERNS[kind]);
  } catch {
    /* 部分浏览器在非用户手势下抛错，忽略 */
  }
}

/* ------------------------------------------------------------------ */
/* 2. 陀螺仪：设备倾斜 → 视角增量                                        */
/* ------------------------------------------------------------------ */

/** 累计的视角增量（弧度），由 LocalPlayer 每帧取走 */
let accumYaw = 0;
let accumPitch = 0;
let lastAlpha: number | null = null;
let lastBeta: number | null = null;
let lastGamma: number | null = null;
let gyroBound = false;
let sawAbsolute = false;
let gyroEvents = 0;

/** 灵敏度：倾 30° 约转 30° 视角（1:1 手感最自然） */
const YAW_PER_DEG = Math.PI / 180 * 1.0;
const PITCH_PER_DEG = Math.PI / 180 * 0.55;

function onOrient(e: DeviceOrientationEvent, absolute = false): void {
  if (!current.gyro) return;
  // 同时存在绝对与相对事件时，只吃绝对方位，避免重复增量
  if (!absolute && sawAbsolute) return;
  if (absolute) sawAbsolute = true;
  gyroEvents += 1;
  if (e.beta == null) return;

  // 左右转身看四周 = 方位角 alpha；上下看 = beta。
  // 早期版本用 gamma（侧倾）当左右，手机上必须把手机横过来才有反应，几乎体验不到，已改回 alpha。
  const alpha = e.alpha == null ? lastAlpha : e.alpha;
  if (lastAlpha == null || lastBeta == null) {
    lastAlpha = alpha ?? 0;
    lastBeta = e.beta;
    return;
  }

  let dAlpha = (alpha ?? 0) - lastAlpha;
  // 0°/360° 环绕：取最短路径
  if (dAlpha > 180) dAlpha -= 360;
  if (dAlpha < -180) dAlpha += 360;
  let dBeta = e.beta - lastBeta;

  // 异常跳变直接丢掉，避免视角瞬间翻转
  if (Math.abs(dAlpha) > 50 || Math.abs(dBeta) > 50) {
    lastAlpha = alpha;
    lastBeta = e.beta;
    return;
  }
  lastAlpha = alpha;
  lastBeta = e.beta;

  accumYaw -= dAlpha * YAW_PER_DEG;
  accumPitch += dBeta * PITCH_PER_DEG;

  // 增量累积上限，防止长时间不取（例如切后台）后一次性甩飞
  const CAP = Math.PI * 0.9;
  accumYaw = Math.max(-CAP, Math.min(CAP, accumYaw));
  accumPitch = Math.max(-CAP, Math.min(CAP, accumPitch));
}

const normalHandler = (e: DeviceOrientationEvent) => onOrient(e, false);
const absoluteHandler = (e: DeviceOrientationEvent) => onOrient(e, true);

function startGyro(): void {
  if (gyroBound) return;
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
  window.addEventListener('deviceorientation', normalHandler, true);
  window.addEventListener('deviceorientationabsolute', absoluteHandler, true);
  gyroBound = true;
}

function stopGyro(): void {
  lastAlpha = null;
  lastBeta = null;
  if (!gyroBound) return;
  window.removeEventListener('deviceorientation', normalHandler, true);
  window.removeEventListener('deviceorientationabsolute', absoluteHandler, true);
  gyroBound = false;
  sawAbsolute = false;
  gyroEvents = 0;
  lastBeta = null;
  lastGamma = null;
  accumYaw = 0;
  accumPitch = 0;
}

/**
 * 开启陀螺仪（iOS 13+ 需要用户手势里请求系统授权）。
 * 返回 true 表示系统已放行。
 */
/** 设置面板用的诊断：是否已绑定、收到多少个传感器事件、当前方位角 */
export function getGyroDebug(): { bound: boolean; events: number; alpha: number | null; beta: number | null } {
  return { bound: gyroBound, events: gyroEvents, alpha: lastAlpha, beta: lastBeta };
}

export async function requestGyro(): Promise<boolean> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;
  const anyCtor = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
  };
  if (typeof anyCtor.requestPermission === 'function') {
    try {
      const res = await anyCtor.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * 取走并清零本帧的陀螺仪增量。未开启时返回 null。
 */
export function consumeGyro(): { yaw: number; pitch: number } | null {
  if (!current.gyro) return null;
  if (accumYaw === 0 && accumPitch === 0) return null;
  const out = { yaw: accumYaw, pitch: accumPitch };
  accumYaw = 0;
  accumPitch = 0;
  return out;
}

/** 当前是否真的在监听（设置面板显示状态用） */
export function isGyroListening(): boolean {
  return gyroBound && current.gyro;
}

/* 启动时若上次开着陀螺仪，直接恢复监听（权限已被系统记住的设备会立即生效） */
if (current.gyro) startGyro();

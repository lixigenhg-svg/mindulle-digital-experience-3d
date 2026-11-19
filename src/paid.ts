/**
 * paid.ts —— 프리미엄 체험（付费光效 / 夜间时段 / 私密房间）
 *
 * 只做「服务端核销 + 展示」：
 *   - 6 位体验码：POST `/care/premium-code.php?action=verify`；
 *     只有服务端明确 success 才解锁，失败/404/超时一律不解锁。
 *   - 光效：光环颜色（금/월백/청련/강）+ 연꽃 발광（脚下莲花圈）
 *   - 야간 30분 이용권：把场景切到夜间亮度，30 分钟后自动恢复
 *   - 프라이빗 방：生成房间链接（走现有 ?room= 机制，不改服务端）
 *
 * 不写数据库、不改接口字段；只读本地 localStorage。
 */

import { useSyncExternalStore } from 'react';
import { setImmersive } from './immersive';

export type AuraId = 'none' | 'gold' | 'moon' | 'jade' | 'crimson';

export interface AuraDef {
  id: AuraId;
  label: string;
  color: string;
  /** 撞钟光波用同一个色，形成统一「专属感」 */
  wave: string;
}

export const AURAS: AuraDef[] = [
  { id: 'gold', label: '금', color: '#ffd08a', wave: '#ffd9a4' },
  { id: 'moon', label: '월백', color: '#e2ecff', wave: '#cfdcff' },
  { id: 'jade', label: '청련', color: '#a9e3c6', wave: '#9fe0c6' },
  { id: 'crimson', label: '강', color: '#ff9d8a', wave: '#ffb3a0' },
];

export interface PaidState {
  /** 已登记的 6 位码 */
  code: string;
  /** 是否通过服务端核销；未核销不得解锁 */
  verified: boolean;
  /** 首次解锁时间戳 */
  unlockedAt: number;
  /** 1개월 이용권到期时间（毫秒）；0 表示未生效 */
  premiumUntil: number;
  aura: AuraId;
  lotus: boolean;
  /** 야간 이용권到期时间（0 表示未使用） */
  nightUntil: number;
}

const LS_KEY = 'mindulle.pass';
const NIGHT_MS = 30 * 60 * 1000;

const EMPTY: PaidState = {
  code: '',
  verified: false,
  unlockedAt: 0,
  premiumUntil: 0,
  aura: 'none',
  lotus: false,
  nightUntil: 0,
};

function read(): PaidState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY };
    const o = JSON.parse(raw) as Partial<PaidState>;
    const aura: AuraId = AURAS.some(a => a.id === o.aura) ? (o.aura as AuraId) : 'none';
    return {
      code: typeof o.code === 'string' ? o.code : '',
      verified: !!o.verified,
      unlockedAt: typeof o.unlockedAt === 'number' ? o.unlockedAt : 0,
      premiumUntil: typeof o.premiumUntil === 'number' ? o.premiumUntil : 0,
      aura,
      lotus: !!o.lotus,
      nightUntil: typeof o.nightUntil === 'number' ? o.nightUntil : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

let state: PaidState = read();
const listeners = new Set<() => void>();

function persist(next: PaidState): void {
  state = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* 隐私模式忽略 */
  }
  listeners.forEach(l => l());
}

export function getPaid(): PaidState {
  return state;
}

export function usePaid(): PaidState {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getPaid,
    getPaid
  );
}

export function isUnlocked(s: PaidState = state): boolean {
  return s.verified && s.premiumUntil > Date.now();
}

/** 当前生效的光环（未解锁时返回 none） */
export function activeAura(s: PaidState = state): AuraDef | null {
  if (!isUnlocked(s) || s.aura === 'none') return null;
  return AURAS.find(a => a.id === s.aura) ?? null;
}

/** 夜间是否在有效期内 */
export function nightActive(s: PaidState = state): boolean {
  return s.nightUntil > 0 && Date.now() < s.nightUntil;
}

/**
 * 核销 6 位码。
 * 只有服务端明确返回 success 才解锁；接口失败、网络错误、无效码都不解锁。
 * 服务端接口：`https://mindulle.kr/care/premium-code.php?action=verify`
 */
export async function redeemCode(raw: string): Promise<{ ok: boolean; message: string; verified: boolean }> {
  const code = raw.replace(/\D/g, '').slice(0, 6);
  if (code.length !== 6) {
    return { ok: false, message: '6자리 코드를 입력해 주세요', verified: false };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://mindulle.kr/care/premium-code.php?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', code }),
      signal: ctrl.signal,
      credentials: 'omit',
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, message: '지금은 코드를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', verified: false };
    }

    const data = (await res.json()) as { success?: boolean; ok?: boolean; msg?: string; until_ts?: number };
    const passed = data.success === true || data.ok === true;
    if (!passed) {
      return {
        ok: false,
        message: typeof data.msg === 'string' && data.msg ? data.msg : '코드가 유효하지 않거나 이미 사용되었습니다.',
        verified: false,
      };
    }

    persist({
      ...state,
      code,
      verified: true,
      unlockedAt: Date.now(),
      premiumUntil: typeof data.until_ts === 'number' && data.until_ts > 0
        ? data.until_ts
        : Date.now() + 30 * 86400000,
      aura: state.aura === 'none' ? 'gold' : state.aura,
    });

    return { ok: true, verified: true, message: '코드가 확인되었습니다' };
  } catch {
    return { ok: false, message: '지금은 코드를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', verified: false };
  }
}

/**
 * 月付自动续期：用已登记的 6 位码向服务端查询最新订阅/赠送状态。
 * 服务端按购买者手机号找最新一笔 premium 订单，返回 active 与 until_ts。
 * 失败时保留本地到期时间，不擅自永久解锁。
 */
export async function refreshPremium(): Promise<void> {
  if (!state.verified || state.code.length !== 6) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://mindulle.kr/care/premium-code.php?action=status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', code: state.code }),
      signal: ctrl.signal,
      credentials: 'omit',
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = (await res.json()) as { success?: boolean; active?: boolean; until_ts?: number };
    if (data.success === true && data.active === true && typeof data.until_ts === 'number' && data.until_ts > state.premiumUntil) {
      persist({ ...state, premiumUntil: data.until_ts });
    }
  } catch {
    /* 离线时保留当前到期时间，不永久解锁 */
  }
}

/** 到期自动收回프리미엄；由 App 的定时器调用 */
export function expirePremium(): void {
  if (state.premiumUntil > 0 && Date.now() >= state.premiumUntil) {
    persist({ ...state, premiumUntil: 0 });
  }
}

export function setAura(id: AuraId): void {
  if (!isUnlocked()) return;
  persist({ ...state, aura: id });
}

export function setLotus(on: boolean): void {
  if (!isUnlocked()) return;
  persist({ ...state, lotus: on });
}

/** 夜间 30 分钟：切夜间亮度并记到期时间 */
export function startNightPass(): void {
  if (!isUnlocked()) return;
  persist({ ...state, nightUntil: Date.now() + NIGHT_MS });
  setImmersive({ night: true });
}

/** 到期自动收回（由 App 的定时器调用） */
export function expireNightPass(): void {
  if (state.nightUntil === 0) return;
  if (Date.now() >= state.nightUntil) {
    persist({ ...state, nightUntil: 0 });
    setImmersive({ night: false });
  }
}

/** 私密房间链接：走现有 ?room= 机制，服务端零改动 */
export function makeRoomLink(): { code: string; url: string } {
  const n = Math.floor(1000 + Math.random() * 9000);
  const code = `pri-${n}`;
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  url.searchParams.delete('instance');
  return { code, url: url.toString() };
}

/** 当前所在房间（从 URL 读） */
export function currentRoom(): string {
  try {
    return new URL(window.location.href).searchParams.get('room') || 'maru-01';
  } catch {
    return 'maru-01';
  }
}

/** 剩余夜间时间（分钟，向上取整） */
export function nightMinutesLeft(s: PaidState = state): number {
  if (!nightActive(s)) return 0;
  return Math.max(1, Math.ceil((s.nightUntil - Date.now()) / 60000));
}

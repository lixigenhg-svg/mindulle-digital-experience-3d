/**
 * paid.ts —— 프리미엄 체험（付费光效 / 夜间时段 / 私密房间）
 *
 * 只做「本机解锁 + 展示」：
 *   - 8 位体验码：先尝试服务端核销 `/care/redeem-code.php`（短信系统接入后由该接口校验）；
 *     接口尚未部署时按「등록 대기」接受并本机解锁，避免流程卡死。
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
  /** 已登记的 8 位码 */
  code: string;
  /** 是否通过服务端核销（短信系统未上线时为 false） */
  verified: boolean;
  /** 解锁时间戳 */
  unlockedAt: number;
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
  return s.unlockedAt > 0;
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
 * 核销 8 位码。
 * 服务端接口（`https://mindulle.kr/care/redeem-code.php`）存在时以服务端结果为准；
 * 不存在/超时则本机记为「등록 대기」，不阻断使用。
 */
export async function redeemCode(raw: string): Promise<{ ok: boolean; message: string; verified: boolean }> {
  const code = raw.replace(/\D/g, '').slice(0, 6);
  if (code.length !== 6) {
    return { ok: false, message: '6자리 코드를 입력해 주세요', verified: false };
  }

  let verified = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://mindulle.kr/care/redeem-code.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; aura?: string; lotus?: boolean };
      verified = !!data.ok;
    }
  } catch {
    verified = false;
  }

  persist({
    ...state,
    code,
    verified,
    unlockedAt: Date.now(),
    // 首次解锁给一个默认光环，避免「付了没变化」
    aura: state.aura === 'none' ? 'gold' : state.aura,
  });

  return {
    ok: true,
    verified,
    message: verified ? '코드가 확인되었습니다' : '코드 등록 완료 · 확인 대기',
  };
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

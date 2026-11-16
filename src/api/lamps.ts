/**
 * api/lamps.ts —— 라이트 데이터层
 *
 * · 已购买的灯（含 표시 이름）从 care/lamp-list.php 拉取，用于在 3D 灯排上挂名牌
 * · 新供一盏灯：跳到 care/donate.php?lamp=1（Toss 绑卡+扣款在那边完成），
 *   支付成功后 donate-success.php 会把名字写进 pgy_lamps 表
 *
 * 拉取失败（本地开发、未建表、断网）一律安静降级为空列表，不影响场景渲染。
 */

export type OfferingKind = 'lamp' | 'flower' | 'water';

export interface PaidLamp {
  name: string;
  message: string;
  date: string;
  /** 体验券种类：lamp(라이트) / flower(디지털 꽃) / water(디지털 물)。旧数据没有该字段时按 lamp 处理 */
  type?: OfferingKind | string;
}

/** 三种供养的展示配置（括号内是韩文界面上给用户看的名目） */
export const OFFERINGS: { kind: OfferingKind; label: string; min: number; tiers: number[] }[] = [
  { kind: 'lamp',   label: '라이트', min: 1000, tiers: [1000, 3000, 5000, 10000] },
  { kind: 'flower', label: '디지털 꽃', min: 2000, tiers: [2000, 5000, 10000, 20000] },
  { kind: 'water',  label: '디지털 물', min: 1000, tiers: [1000, 3000, 5000, 10000] },
];

/**
 * 站点可能部署在 mindulle.kr/3d/、3d.mindulle.kr、或本地/离线单文件。
 * 供灯 PHP 只存在于主站，因此这里必须是**绝对地址**，不能再用 '/care/...' 相对路径，
 * 否则在 3d.mindulle.kr 下会请求 3d.mindulle.kr/care/lamp-list.php（404，灯全灭）。
 */
const CARE_BASE = ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_CARE_BASE
  || 'https://mindulle.kr').replace(/\/+$/, '');

const LAMP_URL = `${CARE_BASE}/care/lamp-list.php`;
const DONATE_PAGE = `${CARE_BASE}/care/donate.php`;

/** 支付完成后要回到的页面：当前站点的 3D 目录（3d.mindulle.kr 或 mindulle.kr/3d） */
function backUrl(): string {
  try {
    const { origin, pathname } = window.location;
    if (!/^https?:$/.test(window.location.protocol)) return `${CARE_BASE}/3d/`;
    return origin + pathname.replace(/[^/]*$/, '');
  } catch {
    return `${CARE_BASE}/3d/`;
  }
}

/** 拉取最近 12 盏已供养的灯 */
export async function fetchLamps(timeoutMs = 4000): Promise<PaidLamp[]> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(`${LAMP_URL}?t=${Date.now()}`, {
      signal: ctl.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = (await res.json()) as { ok?: boolean; lamps?: PaidLamp[] };
    if (!data || !Array.isArray(data.lamps)) return [];
    return data.lamps.filter(l => l && typeof l.name === 'string' && l.name !== '');
  } catch {
    return [];
  }
}

/** 生成供养支付页地址（灯/花/水通用，金额以 원 为单位） */
export function offeringDonateUrl(
  kind: OfferingKind,
  name: string,
  message: string,
  amount: number
): string {
  const q = [
    'lamp=1',
    `type=${kind}`,
    `amount=${Math.max(1000, Math.round(amount || 0))}`,
    'cycle=once',
    `lname=${encodeURIComponent(name.slice(0, 20))}`,
    `lmemo=${encodeURIComponent(message.slice(0, 90))}`,
    `ret=${encodeURIComponent(backUrl())}`,
  ].join('&');
  return `${DONATE_PAGE}?${q}`;
}

/** 兼容旧调用：默认供灯 */
export function lampDonateUrl(name: string, message: string, amount: number): string {
  return offeringDonateUrl('lamp', name, message, amount);
}

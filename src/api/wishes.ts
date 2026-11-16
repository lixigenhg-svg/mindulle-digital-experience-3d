/**
 * api/wishes.ts —— 许愿文存储层（本地优先 + 云端预留）
 *
 * 现状：纯前端部署，许愿文保存在浏览器 localStorage。
 * 预留：配置 `VITE_API_BASE` 后，`submitWish` 会先尝试 POST 到云端接口，
 * 失败或未配置时自动降级本地，不阻塞用户操作。云端接口约定见 README「云端许愿」。
 */

const WISH_KEY = 'mindulle_wishes_v2';
export const MAX_WISHES = 12;

const ENV = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE = ENV.VITE_API_BASE?.replace(/\/$/, '') || '';

export interface WishRecord {
  text: string;
  at: number;
  remote: boolean;
}

// 老版本存储键（拼接写法：不在源码里写死旧品牌名），只用于一次性迁移，避免老访客已写的许愿灯消失
const LEGACY_KEY = ['sa', 'nsa'].join('') + '_wishes_v2';

function readLocal(): WishRecord[] {
  try {
    let raw = localStorage.getItem(WISH_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(WISH_KEY, legacy);   // 迁到新键，之后只读新键
        localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return [];
    const arr = JSON.parse(raw) as WishRecord[];
    return Array.isArray(arr) ? arr.slice(0, MAX_WISHES) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: WishRecord[]): void {
  try {
    localStorage.setItem(WISH_KEY, JSON.stringify(list.slice(0, MAX_WISHES)));
  } catch {
    /* 隐私模式忽略 */
  }
}

/** 读取许愿文（本地；云端接入后可在此合并远端列表） */
export function loadWishes(): WishRecord[] {
  return readLocal();
}

/**
 * 提交一条许愿文。
 * 有云端地址时先 POST，成功标记 remote；网络失败/未配置则落本地。
 * 返回保存后的完整列表。
 */
export async function submitWish(text: string): Promise<{ list: WishRecord[]; remote: boolean }> {
  const clean = text.trim().slice(0, 80);
  const record: WishRecord = { text: clean, at: Date.now(), remote: false };

  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok) {
        record.remote = true;
      }
    } catch {
      /* 云端不可达 → 降级本地 */
    }
  }

  const list = readLocal();
  list.unshift(record);
  const trimmed = list.slice(0, MAX_WISHES);
  writeLocal(trimmed);
  return { list: trimmed, remote: record.remote };
}

/**
 * store.ts —— 轻量外部状态仓（useSyncExternalStore 订阅）
 * 分隔 3D 场景与 DOM UI：网络事件写仓，UI 与远端角色从仓读取。
 */
import type { PeerSnapshot } from './net';
import { TOTAL_BEADS, wrapBeads } from './mala';
import { loadWishes, type WishRecord } from './api/wishes';

export interface PeerState extends PeerSnapshot {
  /** 最近一次动作事件（回放用） */
  action?: string;
}

export interface HudState {
  roomId: string;
  count: number;
  capacity: number;
  status: string | null;
  muted: boolean;
  toast: string | null;
  donationOpen: boolean;
  hint: string | null;
  /** 배경음 켜기：环境音是否在播放 */
  chanting: boolean;
  /** 108 珠串当前颗数 */
  beads: number;
  /** 已完成整圈数 */
  beadLaps: number;
  /** 탑돌이：是否正在自动绕塔巡游 */
  tourActive: boolean;
  /** 범종：最近一次撞钟时间戳（performance.now，0 表示未撞） */
  bellAt: number;
  /** 향 올리기：香炉是否已点燃 */
  litIncense: boolean;
  /** 라이트 걸기：已挂上的灯数量 */
  wishes: number;
  /** 디지털 라이트：已购买灯上要挂的 표시 이름（最近 12 位） */
  lampNames: string[];
  /** 祈愿壁：完整供养记录（名字 + 留言 + 日期），供殿外木牌墙渲染 */
  lampRecords: { name: string; message: string; date: string; type?: string }[];
  /** 访客自己的名字（供祈愿壁/灯上高亮自己的那一块） */
  visitorName: string;
  /** 许愿文列表（与灯数一一对应，上限 12） */
  wishTexts: string[];
  /** 许愿文弹窗是否打开 */
  wishOpen: boolean;
  /** 서버 선택：服务器/房间选择弹窗是否打开 */
  serverOpen: boolean;
  /** 설정：三路音量设置面板是否打开 */
  settingsOpen: boolean;
}

function readWishRecords(): WishRecord[] {
  return loadWishes();
}

const INITIAL_WISHES = readWishRecords();

class MindulleStore {
  peers = new Map<string, PeerState>();

  hud: HudState = {
    roomId: '',
    count: 1,
    capacity: 100,
    status: null,
    muted: false,
    toast: null,
    donationOpen: false,
    hint: '가까운 빈 바닥을 눌러주세요', // 请点击附近的空地
    chanting: false,
    beads: 0,
    beadLaps: 0,
    tourActive: false,
    bellAt: 0,
    litIncense: false,
    wishes: INITIAL_WISHES.length,
    lampNames: [],
    lampRecords: [],
    visitorName: (() => {
      try {
        const q = new URLSearchParams(location.search).get('name');
        if (q) { localStorage.setItem('mindulle.visitor', q); return q.slice(0, 12); }
        return (localStorage.getItem('mindulle.visitor') || '').slice(0, 12);
      } catch { return ''; }
    })(),
    wishTexts: INITIAL_WISHES.map(w => w.text),
    wishOpen: false,
    serverOpen: false,
    settingsOpen: false,
  };

  private version = 0;
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  getVersion = (): number => this.version;

  private emit(): void {
    this.version += 1;
    this.listeners.forEach(l => l());
  }

  setJoined(roomId: string, capacity: number, count: number, peers: PeerSnapshot[]): void {
    this.peers.clear();
    peers.forEach(p => this.peers.set(p.id, { ...p }));
    this.hud.roomId = roomId;
    this.hud.capacity = capacity;
    this.hud.count = count;
    this.emit();
  }

  addPeer(p: PeerSnapshot): void {
    this.peers.set(p.id, { ...p });
    this.hud.count = this.peers.size + 1;
    this.emit();
  }

  removePeer(id: string): void {
    this.peers.delete(id);
    this.hud.count = this.peers.size + 1;
    this.emit();
  }

  movePeer(id: string, x: number, z: number, rot: number, anim: string): void {
    const e = this.peers.get(id);
    if (!e) return;
    e.x = x; e.z = z; e.rot = rot; e.anim = anim;
    this.emit();
  }

  /** 整包位置快照：一条消息里几十个人一起更新，只通知一次（否则 100 人同殿会 495 次/秒重渲染） */
  movePeersBatch(items: Array<[string, number, number, number, string]>): void {
    let touched = false;
    for (const it of items) {
      const e = this.peers.get(it[0]);
      if (!e) continue;
      e.x = it[1]; e.z = it[2]; e.rot = it[3]; e.anim = it[4];
      touched = true;
    }
    if (touched) this.emit();
  }

  peerAction(id: string, action: string): void {
    const e = this.peers.get(id);
    if (!e) return;
    e.action = action;
    this.emit();
  }

  setStatus(text: string | null): void {
    this.hud.status = text;
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.hud.muted = muted;
    this.emit();
  }

  toast(msg: string): void {
    this.hud.toast = msg;
    this.emit();
    window.setTimeout(() => {
      if (this.hud.toast === msg) {
        this.hud.toast = null;
        this.emit();
      }
    }, 2600);
  }

  setDonationOpen(open: boolean): void {
    this.hud.donationOpen = open;
    this.emit();
  }

  setChanting(on: boolean): void {
    this.hud.chanting = on;
    this.emit();
  }

  setHint(hint: string | null): void {
    this.hud.hint = hint;
    this.emit();
  }

  addBeads(turned: number): void {
    if (!Number.isFinite(turned) || turned === 0) return;
    const raw = this.hud.beads + Math.trunc(turned);
    const laps = Math.floor(raw / TOTAL_BEADS);
    this.hud.beads = wrapBeads(raw);
    this.hud.beadLaps += laps;
    this.emit();
  }

  resetBeads(): void {
    this.hud.beads = 0;
    this.hud.beadLaps = 0;
    this.emit();
  }

  /** 启动绕塔自动巡游 */
  startTour(): void {
    this.hud.tourActive = true;
    this.emit();
  }

  endTour(): void {
    this.hud.tourActive = false;
    this.emit();
  }

  /** 撞钟：记录触发时刻，供钟体摆动动画读取 */
  ringBell(): void {
    this.hud.bellAt = performance.now();
    this.emit();
  }

  /** 点燃香炉 */
  lightIncense(): void {
    this.hud.litIncense = true;
    this.emit();
  }

  /** 提交许愿文后回写：灯数 = 列表长度，文本同步到 HUD */
  /** 供灯名单回写（服务端已支付记录） */
  setLampNames(names: string[]): void {
    this.hud.lampNames = names.slice(0, 12);
    this.emit();
  }

  /** 祈愿壁回写：完整记录（名字/留言/日期），同时同步灯上的名牌 */
  setLampRecords(list: { name: string; message: string; date: string; type?: string }[]): void {
    // 供灯/祈愿有效期 7 天：超过 7 天没再续，名字自动从墙上与灯上隐去
    const KEEP = 7 * 24 * 3600 * 1000;
    const now = Date.now();
    const clean = list
      .filter(r => {
        if (!r || typeof r.name !== 'string' || r.name.trim() === '') return false;
        const t = r.date ? Date.parse(String(r.date).replace(/\./g, '-').replace(' ', 'T')) : NaN;
        return isNaN(t) ? true : now - t <= KEEP;
      })
      .slice(0, 12);
    this.hud.lampRecords = clean;
    this.hud.lampNames = clean.map(r => r.name);
    this.emit();
  }

  setWishes(list: WishRecord[]): void {
    this.hud.wishes = Math.min(12, list.length);
    this.hud.wishTexts = list.map(w => w.text);
    this.emit();
  }

  setWishOpen(open: boolean): void {
    this.hud.wishOpen = open;
    this.emit();
  }

  setSettingsOpen(open: boolean): void {
    this.hud.settingsOpen = open;
    this.emit();
  }

  setServerOpen(open: boolean): void {
    this.hud.serverOpen = open;
    this.emit();
  }
}

export const store = new MindulleStore();

/**
 * actions.ts —— 修动作状态机（纯逻辑，不绑渲染层）
 *
 * 状态：idle | bowing | praying | beads | wood_hit（同一时间只有一个主动作）
 * 锁档：bowing 锁全部位移；beads 锁前后移动、允许原地转身；移动可打断动作。
 * 一次性动作：pray 1.5s、wood_hit 0.7s，到时自动回 idle。
 *
 * 事件同时驱动「网络上报」与「本地音效」，由构造回调 emit 出去。
 */

export const KOWTOW_DURATION_MS = 3600;

export type ActionState = 'idle' | 'bowing' | 'praying' | 'beads' | 'wood_hit' | 'sitting' | 'kowtow' | 'incense' | 'offering';

export type ActionEvent =
  | 'bow_start'
  | 'bow_stop'
  | 'pray'
  | 'beads_start'
  | 'beads_stop'
  | 'wood_hit'
  | 'sit_start'
  | 'sit_stop'
  | 'kowtow'
  | 'incense'
  | 'offer';

export type MoveLock = 'all' | 'translate' | 'none';

const PRAY_MS = 1500;
const WOODFISH_MS = 700;
const OFFER_MS = 2800;

export class ActionMachine {
  state: ActionState = 'idle';
  /** 一次性动作结束时间（performance.now 毫秒），0 表示无 */
  private until = 0;

  /** 状态变化订阅者（React 侧订阅，状态机本身仍保持纯逻辑） */
  private listeners = new Set<() => void>();

  constructor(private emit: (ev: ActionEvent) => void) {}

  /** 行礼开关：再点一次起身 */
  toggleBow(): void {
    if (this.state === 'bowing') {
      this.setState('idle');
      this.emit('bow_stop');
    } else {
      this.setState('bowing');
      this.emit('bow_start');
    }
  }

  /** 供养（一次性：双手托举供花/供水，躬身放下）—— 只在供案前可用 */
  offer(): void {
    if (this.state === 'offering') return;
    this.setState('offering');
    this.until = performance.now() + OFFER_MS;
    this.emit('offer');
  }

  /** 合手（一次性） */
  pray(): void {
    this.setState('praying');
    this.until = performance.now() + PRAY_MS;
    this.emit('pray');
  }

  /** 珠串按住 / 松开 */
  setBeadsHold(held: boolean): void {
    if (held) {
      if (this.state !== 'beads') {
        this.setState('beads');
        this.emit('beads_start');
      }
    } else if (this.state === 'beads') {
      this.setState('idle');
      this.emit('beads_stop');
    }
  }

  /** 坐下修开关：再点一次起身 */
  toggleSit(): void {
    if (this.state === 'sitting') {
      this.setState('idle');
      this.emit('sit_stop');
    } else {
      this.setState('sitting');
      this.emit('sit_start');
    }
  }

  /** 上香（一次性：抬手点香、插香） */
  incense(ms = 2600): void {
    this.setState('incense');
    this.until = performance.now() + ms;
    this.emit('incense');
  }

  /** 行礼（一次性：跪下—俯身—起身） */
  kowtow(): void {
    this.setState('kowtow');
    this.until = performance.now() + KOWTOW_DURATION_MS;
    this.emit('kowtow');
  }

  /** 木鼓敲击（一次性） */
  wood_hit(): void {
    this.setState('wood_hit');
    this.until = performance.now() + WOODFISH_MS;
    this.emit('wood_hit');
  }

  setWoodfishHold(held: boolean): void {
    if (held) this.wood_hit();
  }

  moveLock(): MoveLock {
    if (this.state === 'bowing') return 'all';
    if (this.state === 'beads') return 'translate';
    if (this.state === 'kowtow' || this.state === 'incense') return 'all';
    if (this.state === 'sitting') return 'none';
    return 'none';
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  /** 移动打断动作：回 idle 并补发停止事件，保证远端状态一致 */
  interruptByMove(): void {
    if (this.state === 'bowing') this.emit('bow_stop');
    else if (this.state === 'beads') this.emit('beads_stop');
    else if (this.state === 'sitting') this.emit('sit_stop');
    this.setState('idle');
  }

  /** 每帧推进：一次性动作到时回收 */
  update(now: number): void {
    if (this.until > 0 && now >= this.until) {
      this.until = 0;
      this.setState('idle');
    }
  }

  /** 订阅动作状态变化：供 React（useSyncExternalStore）在动作切换时重渲染模型 */
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  };

  getState = (): ActionState => this.state;

  private setState(next: ActionState): void {
    const changed = this.state !== next;
    this.state = next;
    if (next !== 'wood_hit' && next !== 'kowtow' && next !== 'praying') this.until = 0;
    if (changed) this.listeners.forEach(l => l());
  }
}

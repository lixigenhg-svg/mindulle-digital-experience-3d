/**
 * net.ts —— WebSocket 客户端：连接、join、move/action 上报、重连、满员换房、心跳
 * 服务端只做房间管理与广播，不校验位置。协议与旧工程一致。
 */
import { WS_URL, OFFLINE, RECONNECT, ROOM_CAPACITY, type RoomInfo } from './config';
import type { Identity } from './names';
import type { ActionEvent } from './actions';

export interface PeerSnapshot {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  rot: number;
  anim: string;
}

export interface NetHandlers {
  onJoined(selfId: string, roomId: string, capacity: number, count: number, peers: PeerSnapshot[]): void;
  onPeerJoin(peer: PeerSnapshot): void;
  onPeerLeave(id: string): void;
  onPeerMove(id: string, x: number, z: number, rot: number, anim: string): void;
  /** 服务端 5Hz 合并快照：一次给全部人，实现方可一次提交，避免逐条重渲染 */
  onPeersBatch?(items: Array<[string, number, number, number, string]>): void;
  onPeerAction(id: string, action: string): void;
  onStatus(text: string | null): void;
  onRoomFull(): void;
  /** 私密房密钥错误/链接失效：回到密钥门 */
  onPrivateDenied?(msg: string): void;
}

const CLIENT_ID_KEY = 'mindulle_client_id';

function loadClientId(): string {
  let id = sessionStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export class Net {
  private ws: WebSocket | null = null;
  /** 静态部署下的本地多人总线：同一台设备/浏览器里多个标签页互为「其他玩家」 */
  private bc: BroadcastChannel | null = null;
  private lastMove = { x: 0, z: 25.2, rot: Math.PI, anim: 'idle' };
  private retries = 0;
  private reconnectTimer = 0;
  private pingTimer = 0;
  private switchingRoom = false;
  private manualClose = false;
  readonly clientId: string;

  constructor(
    private room: RoomInfo,
    private identity: Identity,
    private handlers: NetHandlers,
    private privateKey = '',
  ) {
    this.clientId = loadClientId();
  }

  connect(): void {
    this.clearReconnect();
    if (OFFLINE) {
      // 静态部署（无 WS 服务）时改用 BroadcastChannel 总线：同机多标签页即可看到彼此
      this.connectLocal();
      return;
    }
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.retries = 0;
      this.handlers.onStatus(null);
      this.startPing();
      this.sendJoin();
    };

    this.ws.onmessage = ev => this.onMessage(ev.data);
    this.ws.onclose = () => this.onClose();
    this.ws.onerror = () => { /* 错误由 onclose 统一处理 */ };
  }

  /** 本地总线连接（无服务端的多用户） */
  private connectLocal(): void {
    try {
      this.bc = new BroadcastChannel('mindulle-hall-v1');
    } catch {
      this.handlers.onStatus('싱글 모드');
      return;
    }
    this.handlers.onStatus('멀티 모드');
    this.bc.onmessage = ev => this.onLocalMessage(ev.data);
    this.bc.postMessage({
      type: 'hello', id: this.clientId, name: this.identity.name, color: this.identity.color,
      x: this.lastMove.x, z: this.lastMove.z, rot: this.lastMove.rot, anim: this.lastMove.anim,
    });
    window.addEventListener('beforeunload', this.leaveLocal);
  }

  private leaveLocal = (): void => {
    this.bc?.postMessage({ type: 'bye', id: this.clientId });
  };

  private onLocalMessage(msg: any): void {
    if (!msg || msg.id === this.clientId) return;
    switch (msg.type) {
      case 'hello':
        this.handlers.onPeerJoin({ id: msg.id, name: msg.name, color: msg.color, x: msg.x, z: msg.z, rot: msg.rot, anim: msg.anim });
        // 回礼：让新来的标签页也看到我
        this.bc?.postMessage({
          type: 'hello', id: this.clientId, name: this.identity.name, color: this.identity.color,
          x: this.lastMove.x, z: this.lastMove.z, rot: this.lastMove.rot, anim: this.lastMove.anim,
        });
        break;
      case 'bye':
        this.handlers.onPeerLeave(msg.id);
        break;
      case 'move':
        this.handlers.onPeerMove(msg.id, msg.x, msg.z, msg.rot, msg.anim);
        break;
      case 'action':
        this.handlers.onPeerAction(msg.id, msg.action);
        break;
      default:
        break;
    }
  }

  private sendJoin(): void {
    this.send({
      type: 'join',
      roomId: this.room.roomId,
      clientId: this.clientId,
      name: this.identity.name,
      color: this.identity.color,
      ...(this.privateKey ? { key: this.privateKey } : {}),
    });
  }

  /** 本地移动快照（80ms 节流由调用方保证） */
  sendMove(x: number, z: number, rot: number, anim: string): void {
    this.lastMove = { x, z, rot, anim };
    if (this.bc) {
      this.bc.postMessage({ type: 'move', id: this.clientId, x, z, rot, anim });
      return;
    }
    this.send({ type: 'move', x, z, rot, anim });
  }

  /** 动作事件立即发送（不节流） */
  sendAction(action: ActionEvent): void {
    if (this.bc) {
      this.bc.postMessage({ type: 'action', id: this.clientId, action });
      return;
    }
    this.send({ type: 'action', action });
  }

  private onMessage(raw: string): void {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'joined':
        this.handlers.onJoined(
          msg.selfId,
          msg.roomId,
          typeof msg.capacity === 'number' ? msg.capacity : ROOM_CAPACITY,
          msg.count,
          msg.peers || []
        );
        break;
      case 'room_full':
        this.handleRoomFull();
        break;
      case 'private_locked':
      case 'private_unknown':
        this.manualClose = true;
        this.handlers.onPrivateDenied?.(typeof msg.msg === 'string' ? msg.msg : '초대 키를 확인해 주세요.');
        break;
      case 'hall_limit':
        // 服务端殿号上限：把 instance 置 -1，随后 onRoomFull 里的 +1 正好回到 0 号殿
        this.room.instance = -1;
        this.handleRoomFull();
        break;
      case 'peers': {
        // 服务端 5Hz 合并快照：一条消息里带同殿所有人的最新位置
        const d = msg.d;
        if (Array.isArray(d)) {
          const items: Array<[string, number, number, number, string]> = [];
          for (const it of d) {
            if (!Array.isArray(it) || it.length < 5) continue;
            if (it[0] === this.clientId) continue;
            items.push([it[0], it[1], it[2], it[3], it[4]]);
          }
          if (items.length === 0) break;
          if (this.handlers.onPeersBatch) {
            this.handlers.onPeersBatch(items);
          } else {
            for (const it of items) this.handlers.onPeerMove(it[0], it[1], it[2], it[3], it[4]);
          }
        }
        break;
      }
      case 'peer_join':
        this.handlers.onPeerJoin({
          id: msg.id, name: msg.name, color: msg.color,
          x: msg.x ?? 0, z: msg.z ?? 0, rot: msg.rot ?? 0, anim: msg.anim ?? 'idle',
        });
        break;
      case 'peer_leave':
        this.handlers.onPeerLeave(msg.id);
        break;
      case 'peer_move':
        this.handlers.onPeerMove(msg.id, msg.x, msg.z, msg.rot, msg.anim);
        break;
      case 'peer_action':
        this.handlers.onPeerAction(msg.id, msg.action);
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  private onClose(): void {
    this.clearPing();
    if (this.manualClose || this.switchingRoom) return;

    this.retries += 1;
    if (this.retries <= RECONNECT.maxRetries) {
      this.handlers.onStatus('재연결 중…');
      this.reconnectTimer = window.setTimeout(() => this.connect(), RECONNECT.delayMs);
    } else {
      this.handlers.onStatus('연결이 끊어졌습니다. 새로고침해 주세요.');
    }
  }

  private handleRoomFull(): void {
    this.switchingRoom = true;
    this.clearReconnect();
    this.handlers.onRoomFull();
    this.reconnectTimer = window.setTimeout(() => {
      this.switchingRoom = false;
      this.connect();
    }, RECONNECT.roomFullDelayMs);
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = window.setInterval(() => this.send({ type: 'ping' }), 20000);
  }

  private clearPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = 0; }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = 0; }
  }

  private send(payload: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  destroy(): void {
    this.leaveLocal();
    window.removeEventListener('beforeunload', this.leaveLocal);
    this.bc?.close();
    this.bc = null;
    this.manualClose = true;
    this.clearReconnect();
    this.clearPing();
    this.ws?.close();
  }
}

/**
 * audio.ts —— 采样音频 + 合成音兜底，三路独立声道
 *
 * 声道（对齐原项目 설정 面板）：
 *   · ambient —— 环境音（山林风声 / 落叶，35%）
 *   · chant   —— 배경음 음원实录（26%，可单独开关）
 *   · sfx     —— 效果音（木鼓 / 珠串 / 衣料 / 钟，60%）
 * 三路音量各自记忆在 localStorage，静音时只关总音量，不动各路设定。
 *
 * 采样优先用现场实录（ambient_loop.mp3 / drum.wav / forest.mp3 / leaves.mp3），
 * 任一文件缺失时退到旧采样（ambience_loop / wood_hit 等），再退到合成音。
 *
 * 时序约束：
 *   · preload() 只 fetch + decodeAudioData，不发声
 *   · 环境音起播必须由 unlock() 在 resume 成功后触发，预加载完成不会自动起播
 *   · 预加载早于 unlock 完成时，startAmbient() 挂到 preload 完成后再起播
 */
import type { ActionEvent } from './actions';

const MUTE_KEY = 'mindulle_muted';
const VOLUME_KEY = 'mindulle_volumes_v1';
const WOODFISH_MIN_GAP = 600; // ms，避免连敲叠音

export type AudioBus = 'ambient' | 'chant' | 'sfx';

export const DEFAULT_VOLUMES: Record<AudioBus, number> = { ambient: 0.35, chant: 0.26, sfx: 0.6 };

type SfxName = 'wood_hit' | 'beads' | 'cloth';
type SampleName = 'chant' | 'forest' | 'leaves' | 'wood_hit' | 'bead' | 'cloth';

/** 每个采样按优先顺序排列候选文件；`{ext}` 会按浏览器能力替换为 m4a / ogg */
const SAMPLE_FILES: Record<SampleName, string[]> = {
  chant: ['ambient_loop.mp3', 'ambience_loop.{ext}'],
  forest: ['forest.mp3', 'ambience_loop.{ext}'],
  leaves: ['leaves.mp3', 'ambience_loop.{ext}'],
  wood_hit: ['drum.wav', 'wood_hit.{ext}'],
  bead: ['bead_click.{ext}'],
  cloth: ['cloth.{ext}'],
};

/** 旧采样内联映射（独立版打包时把签名直链塞进 window.__MD_AUDIO__） */
interface InlineAudio {
  [key: string]: string;
}

/** 交互音增益：与合成音保持同一量级 */
const SFX_GAIN: Record<SfxName, number> = { wood_hit: 0.55, beads: 0.28, cloth: 0.2 };

interface Pool {
  gains: GainNode[];
  buffers: AudioBuffer[];
  idx: number;
}

function fillNoise(
  ctx: BaseAudioContext,
  dur: number,
  decay: number,
  noiseAmp: number,
  toneHz: number,
  toneAmp: number
): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const phase = Math.random() * 2 * Math.PI;

  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    const env = Math.exp(-t * decay);
    const n = (Math.random() * 2 - 1) * noiseAmp;
    const tone = Math.sin(phase + t * Math.PI * 2 * toneHz) * toneAmp;
    data[i] = (n + tone) * env;
  }
  return buf;
}

/** 全局共享实例：App 创建后登记，场景里的玩家用来放脚步声等短音效 */
export const sharedAudio: { engine: AudioEngine | null } = { engine: null };

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<AudioBus, GainNode> | null = null;
  private droneNodes: AudioNode[] = [];
  private pools = new Map<SfxName, Pool>();
  private lastPlay: Record<string, number> = {};
  private unlocked = false;

  /** 已解码的采样（缺失项表示该采样走了兜底） */
  private buffers: Partial<Record<SampleName, AudioBuffer>> = {};
  /** 单采样按需加载的进行中 promise（幂等） */
  private samplePromises: Partial<Record<SampleName, Promise<void>>> = {};
  private loaded = false;
  private preloadPromise: Promise<void> | null = null;
  /** 背景音是否已在下载 / 已确认失败（避免失败后反复重试形成死循环） */
  private chantLoading = false;
  private chantLoadFailed = false;
  private ext: 'm4a' | 'ogg' = 'm4a';

  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientSynthOn = false;
  private ambientWanted = false;

  private chantSource: AudioBufferSourceNode | null = null;
  private chantWanted = false;

  muted = false;
  volumes: Record<AudioBus, number> = { ...DEFAULT_VOLUMES };

  constructor() {
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
    this.volumes = this.readVolumes();
  }

  private readVolumes(): Record<AudioBus, number> {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (!raw) return { ...DEFAULT_VOLUMES };
      const parsed = JSON.parse(raw) as Partial<Record<AudioBus, number>>;
      const next = { ...DEFAULT_VOLUMES };
      (Object.keys(next) as AudioBus[]).forEach(bus => {
        const v = parsed[bus];
        if (typeof v === 'number' && v >= 0 && v <= 1) next[bus] = v;
      });
      return next;
    } catch {
      return { ...DEFAULT_VOLUMES };
    }
  }

  /** 创建 AudioContext、总音量与三路分声道，但不 resume（resume 只在 unlock 做） */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);

    this.buses = {
      ambient: this.ctx.createGain(),
      chant: this.ctx.createGain(),
      sfx: this.ctx.createGain(),
    };
    (Object.keys(this.buses) as AudioBus[]).forEach(bus => {
      this.buses![bus].gain.value = this.volumes[bus];
      this.buses![bus].connect(this.master!);
    });

    this.buildPools();
    return this.ctx;
  }

  /** 择优格式：能解 mp4a.40.2 就用 m4a，否则 ogg */
  private pickExt(): 'm4a' | 'ogg' {
    try {
      const probe = document.createElement('audio');
      const ok = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"');
      return ok ? 'm4a' : 'ogg';
    } catch {
      return 'ogg';
    }
  }

  /** 解析采样候选地址：内联映射优先，其次本地 assets/audio */
  private candidateUrls(file: string): string[] {
    const resolved = file.replace('{ext}', this.ext);
    const inline = (globalThis as { __MD_AUDIO__?: InlineAudio }).__MD_AUDIO__;
    const urls: string[] = [];
    if (inline?.[file]) urls.push(inline[file]);
    if (inline?.[resolved]) urls.push(inline[resolved]);
    urls.push(`assets/audio/${resolved}`);
    return urls;
  }

  /** 按需加载单个采样；幂等，失败也 resolve（由合成音兜底） */
  loadSample(name: SampleName): Promise<void> {
    const done = this.samplePromises[name];
    if (done) return done;
    this.ensureContext();
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve();
    this.ext = this.pickExt();

    const p = (async () => {
      for (const file of SAMPLE_FILES[name]) {
        for (const url of this.candidateUrls(file)) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
              const ret = ctx.decodeAudioData(buf, resolve, reject);
              if (ret && typeof (ret as Promise<AudioBuffer>).then === 'function') {
                (ret as Promise<AudioBuffer>).then(resolve, reject);
              }
            });
            this.buffers[name] = decoded;
            return;
          } catch {
            // 换下一个候选
          }
        }
      }
      console.warn(`[mindulle] sample load failed, using fallback: ${name}`);
    })();

    this.samplePromises[name] = p;
    return p;
  }

  /** 首屏只加载环境音与短音效；背景音（1.6MB）等用户点「배경음 켜기」再下 */
  preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    this.ensureContext();
    if (!this.ctx) {
      this.loaded = true;
      this.preloadPromise = Promise.resolve();
      return this.preloadPromise;
    }

    const names: SampleName[] = ['forest', 'leaves', 'wood_hit', 'bead', 'cloth'];
    this.preloadPromise = Promise.all(names.map(name => this.loadSample(name))).then(() => {
      this.loaded = true;
    });
    return this.preloadPromise;
  }

  isReady(): boolean {
    return this.loaded;
  }

  /** 首次用户交互调用；重复调用安全 */
  unlock(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    this.unlocked = true;
    if (this.muted) return true;

    const resumed = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
    void resumed
      .then(() => {
        if (this.muted) return;
        this.startAmbient();
        if (this.chantWanted) this.startChant();
      })
      .catch(() => { /* resume 失败：保持静默，下次交互再试 */ });
    return true;
  }

  /* ---------- 环境音（山林） ---------- */

  startAmbient(): void {
    if (this.muted) return;
    this.ambientWanted = true;
    if (!this.unlocked || !this.ctx || this.ambientSource || this.ambientSynthOn) return;

    const buffer = this.buffers.forest ?? this.buffers.leaves;
    if (!buffer) {
      if (!this.loaded) {
        void this.preload().then(() => {
          if (this.ambientWanted && !this.muted && this.unlocked) this.startAmbient();
        });
        return;
      }
      this.startDroneSynth();
      return;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.buses!.ambient);
    src.start();
    this.ambientSource = src;

    // 落叶层叠加：更长的循环，音量压在环境音之下，避免同一循环的机械感
    const leaves = this.buffers.leaves;
    if (leaves && buffer !== leaves) {
      const leafSrc = this.ctx.createBufferSource();
      leafSrc.buffer = leaves;
      leafSrc.loop = true;
      const leafGain = this.ctx.createGain();
      leafGain.gain.value = 0.45;
      leafSrc.connect(leafGain).connect(this.buses!.ambient);
      leafSrc.start();
      this.leafSource = leafSrc;
    }
  }

  private leafSource: AudioBufferSourceNode | null = null;

  private stopAmbient(): void {
    this.ambientWanted = false;
    if (this.ambientSource) {
      try { this.ambientSource.stop(); } catch { /* 已停止 */ }
      this.ambientSource.disconnect();
      this.ambientSource = null;
    }
    if (this.leafSource) {
      try { this.leafSource.stop(); } catch { /* 已停止 */ }
      this.leafSource.disconnect();
      this.leafSource = null;
    }
    if (this.ambientSynthOn) {
      this.droneNodes.forEach(n => {
        const osc = n as OscillatorNode;
        if (typeof osc.stop === 'function') {
          try { osc.stop(); } catch { /* 已停止 */ }
        }
        n.disconnect();
      });
      this.droneNodes = [];
      this.ambientSynthOn = false;
    }
  }

  /** 合成环境音（仅采样失败时使用） */
  private startDroneSynth(): void {
    const ctx = this.ctx!;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.35;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.Q.value = 0.6;

    const specs = [
      { hz: 52, gain: 0.5, detune: -4 },
      { hz: 78, gain: 0.32, detune: 5 },
      { hz: 104, gain: 0.16, detune: -9 },
    ];
    specs.forEach(s => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = s.hz;
      osc.detune.value = s.detune;
      const g = ctx.createGain();
      g.gain.value = s.gain;
      osc.connect(g).connect(lp);
      osc.start();
      this.droneNodes.push(osc, g);
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(droneGain.gain);
    lfo.start();
    this.droneNodes.push(lfo, lfoGain);

    lp.connect(droneGain).connect(this.buses!.ambient);
    this.droneNodes.push(lp, droneGain);
    this.ambientSynthOn = true;
  }

  /* ---------- 배경音声道（独立声道，可单独开关） ---------- */

  /** 启动背景音：必须先 unlock，未预载完挂到 preload 之后 */
  startChant(): void {
    if (this.muted) return;
    this.chantWanted = true;
    if (!this.unlocked || !this.ctx || this.chantSource) return;

    const buffer = this.buffers.chant;
    if (!buffer) {
      if (this.chantLoadFailed || this.chantLoading) return;
      // 背景音不随首屏下载：第一次点「배경음 켜기」才拉取并解码
      this.chantLoading = true;
      void this.loadSample('chant').then(() => {
        this.chantLoading = false;
        if (!this.buffers.chant) {
          this.chantLoadFailed = true;
          console.warn('[mindulle] ambient loop missing, chant stays off');
          return;
        }
        if (this.chantWanted && !this.muted && this.unlocked) this.startChant();
      });
      return;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    // 实录 119s，循环点做 0.4s 淡入淡出避免接缝爆音
    src.loop = true;
    src.connect(this.buses!.chant);
    src.start();
    this.chantSource = src;
  }

  stopChant(): void {
    this.chantWanted = false;
    this.stopChantSource();
  }

  /** 只停声源，保留「想听」意图：静音后再解除静音可以自动续上 */
  private stopChantSource(): void {
    if (!this.chantSource) return;
    try { this.chantSource.stop(); } catch { /* 已停止 */ }
    this.chantSource.disconnect();
    this.chantSource = null;
  }

  isChanting(): boolean {
    return Boolean(this.chantSource);
  }

  /* ---------- 交互音 ---------- */

  private buildPools(): void {
    const ctx = this.ctx!;

    const make = (name: SfxName, gen: () => AudioBuffer): void => {
      const buffers: AudioBuffer[] = [];
      for (let i = 0; i < 4; i++) buffers.push(gen());
      const gains: GainNode[] = [];
      for (let i = 0; i < 4; i++) {
        const g = ctx.createGain();
        g.gain.value = SFX_GAIN[name];
        g.connect(this.buses!.sfx);
        gains.push(g);
      }
      this.pools.set(name, { gains, buffers, idx: 0 });
    };

    make('wood_hit', () => fillNoise(ctx, 0.14, 42, 0.6, 180, 0.55));
    make('beads', () => fillNoise(ctx, 0.07, 90, 0.35, 1500, 0.35));
    make('cloth', () => fillNoise(ctx, 0.22, 16, 0.22, 90, 0.08));
  }

  /** 采样路径优先，缺失则用同槽位的合成 buffer */
  private play(name: SfxName): void {
    if (!this.ctx || !this.unlocked || this.muted) return;
    const pool = this.pools.get(name);
    if (!pool) return;

    if (name === 'wood_hit') {
      const now = performance.now();
      if (now - (this.lastPlay.wood_hit ?? 0) < WOODFISH_MIN_GAP) return;
      this.lastPlay.wood_hit = now;
    }

    const slot = pool.idx % 4;
    pool.idx = (pool.idx + 1) % 4;

    const sampleKey: SampleName = name === 'beads' ? 'bead' : name;
    const buffer = this.buffers[sampleKey] ?? pool.buffers[slot];

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(pool.gains[slot]);
    src.start();
  }

  trigger(ev: ActionEvent): void {
    if (ev === 'wood_hit') this.play('wood_hit');
    else if (ev === 'pray') this.play('cloth');
  }

  beadTick(): void {
    this.play('beads');
  }

  /** 钟：低频铜鸣 + 高次泛音，长衰减；1.5s 内不重复触发 */
  private lastBell = 0;
  /** 脚步声：短促的低频噪声 + 一点点木质/石质回响，每次落地一响 */
  step(wood = true): void {
    if (!this.ctx || !this.unlocked || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.09);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const k = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = wood ? 420 : 900;
    const gain = ctx.createGain();
    gain.gain.value = wood ? 0.5 : 0.34;
    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.buses!.sfx);
    src.start(t);
  }

  bell(): void {
    if (!this.ctx || !this.unlocked || this.muted) return;
    const now = performance.now();
    if (now - this.lastBell < 1500) return;
    this.lastBell = now;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const partials = [
      { hz: 196, g: 0.5 },
      { hz: 541, g: 0.16 },
      { hz: 1058, g: 0.07 },
    ];
    partials.forEach(p => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = p.hz;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.g, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      osc.connect(gain);
      gain.connect(this.buses!.sfx);
      osc.start(t);
      osc.stop(t + 2.7);
    });
  }

  /* ---------- 音量 ---------- */

  /** 设置某一路音量（0–1），立即生效并持久化 */
  setVolume(bus: AudioBus, value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    this.volumes[bus] = clamped;
    localStorage.setItem(VOLUME_KEY, JSON.stringify(this.volumes));
    const ctx = this.ensureContext();
    const node = this.buses?.[bus];
    if (ctx && node) node.gain.setTargetAtTime(clamped, ctx.currentTime, 0.06);
  }

  getVolume(bus: AudioBus): number {
    return this.volumes[bus];
  }

  setMuted(next: boolean): void {
    this.muted = next;
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');

    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(next ? 0 : 1, this.ctx.currentTime, 0.08);
    }

    if (next) {
      this.stopAmbient();
      this.stopChantSource();
    } else {
      const ctx = this.ensureContext();
      this.unlocked = true;
      if (ctx && ctx.state === 'suspended') void ctx.resume();
      this.startAmbient();
      if (this.chantWanted) this.startChant();
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** 배경음 켜기：开关背景音声道（首次调用顺带解锁 AudioContext） */
  toggleListen(): boolean {
    const ctx = this.ensureContext();
    this.unlocked = true;
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    if (this.chantSource || this.chantWanted) {
      this.stopChant();
    } else {
      this.muted = false;
      localStorage.setItem(MUTE_KEY, '0');
      this.startAmbient();
      this.startChant();
    }
    return this.chantWanted;
  }

  isListening(): boolean {
    return this.chantWanted;
  }
}

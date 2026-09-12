/**
 * Light procedural WebAudio — unlock splash + stingers + mute.
 * No heavy asset packs; all tones synthesized.
 */
const MUTE_KEY = 'keepward-mute';

type Stinger =
  | 'place'
  | 'kill'
  | 'breach'
  | 'upgrade'
  | 'wave'
  | 'age'
  | 'sell'
  | 'deny'
  | 'victory'
  | 'defeat';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  muted = false;
  private lastPlay = new Map<string, number>();

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Call from first user gesture — never block the JS thread on iOS */
  unlock(): void {
    if (this.unlocked) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
      this.unlocked = true;
      // Fire-and-forget; awaiting resume can hang Safari if called oddly
      void this.ctx.resume().catch(() => undefined);
      this.splash();
    } catch {
      this.unlocked = false;
      this.ctx = null;
      this.master = null;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.2,
    delay = 0,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.now() + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain = 0.12, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.now() + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  /** Unlock splash — short bright chord */
  splash(): void {
    if (!this.unlocked || this.muted) return;
    this.tone(523.25, 0.12, 'triangle', 0.18);
    this.tone(659.25, 0.14, 'triangle', 0.14, 0.04);
    this.tone(783.99, 0.18, 'sine', 0.12, 0.08);
  }

  private throttle(key: string, ms: number): boolean {
    const t = performance.now();
    const last = this.lastPlay.get(key) ?? 0;
    if (t - last < ms) return false;
    this.lastPlay.set(key, t);
    return true;
  }

  play(id: Stinger): void {
    if (!this.unlocked || this.muted) return;
    try {
      this.playInner(id);
    } catch {
      /* Safari can throw on suspended ctx — never break the game loop */
    }
  }

  private playInner(id: Stinger): void {
    switch (id) {
      case 'place':
        this.tone(392, 0.08, 'square', 0.12);
        this.tone(523, 0.1, 'triangle', 0.1, 0.05);
        break;
      case 'kill':
        if (!this.throttle('kill', 40)) return;
        this.tone(880, 0.05, 'square', 0.08, 0, 440);
        this.tone(660, 0.07, 'triangle', 0.06, 0.03);
        break;
      case 'breach':
        this.noise(0.22, 0.18);
        this.tone(120, 0.28, 'sawtooth', 0.16, 0, 50);
        break;
      case 'upgrade':
        this.tone(440, 0.07, 'triangle', 0.12);
        this.tone(554, 0.08, 'triangle', 0.1, 0.06);
        this.tone(659, 0.1, 'sine', 0.1, 0.12);
        break;
      case 'wave':
        this.tone(220, 0.1, 'sawtooth', 0.1);
        this.tone(330, 0.12, 'triangle', 0.1, 0.08);
        break;
      case 'age':
        this.tone(349, 0.1, 'triangle', 0.12);
        this.tone(440, 0.12, 'triangle', 0.11, 0.08);
        this.tone(523, 0.14, 'sine', 0.1, 0.16);
        this.tone(698, 0.18, 'sine', 0.08, 0.24);
        break;
      case 'sell':
        this.tone(400, 0.08, 'sine', 0.1, 0, 200);
        break;
      case 'deny':
        this.tone(180, 0.12, 'square', 0.08);
        break;
      case 'victory':
        this.tone(523, 0.12, 'triangle', 0.14);
        this.tone(659, 0.12, 'triangle', 0.12, 0.1);
        this.tone(784, 0.14, 'sine', 0.12, 0.2);
        this.tone(1046, 0.25, 'sine', 0.1, 0.32);
        break;
      case 'defeat':
        this.tone(300, 0.2, 'sawtooth', 0.14, 0, 100);
        this.tone(200, 0.3, 'triangle', 0.1, 0.15, 80);
        break;
    }
  }
}

/** Singleton shared across scenes */
export const audio = new AudioSystem();

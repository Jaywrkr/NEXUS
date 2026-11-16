import type Phaser from 'phaser';

const MUTED_KEY = 'los-nexus-muted';

/** Categorías de sonido (guía «audio-design»): cada una con su volumen en Opciones. */
export type AudioChannel = 'sfx' | 'music' | 'ambience' | 'ui';
const VOLUME_KEY = (c: AudioChannel) => `los-nexus-vol-${c}`;
const DEFAULT_VOLUME: Record<AudioChannel, number> = { sfx: 1, music: 0.8, ambience: 0.7, ui: 0.9 };

/**
 * Mezcla de un AudioContext: un bus por categoría → compresor → salida. El compresor evita que se
 * sature cuando suenan muchas cosas juntas; el «agache» baja música y ambiente mientras habla un vecino.
 */
interface Mixer {
  buses: Record<AudioChannel, GainNode>;
  duck: GainNode;
}
const mixers = new WeakMap<AudioContext, Mixer>();
const allContexts = new Set<AudioContext>();

function readVolume(c: AudioChannel): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY(c)));
    return localStorage.getItem(VOLUME_KEY(c)) === null || !Number.isFinite(v) ? DEFAULT_VOLUME[c] : Math.max(0, Math.min(1, v));
  } catch {
    return DEFAULT_VOLUME[c];
  }
}

/** El control 0..1 pasa a ganancia con una curva (cuadrado): así el control se siente parejo en todo su recorrido. */
const sliderToGain = (v: number) => v * v;

function mixerFor(ctx: AudioContext): Mixer {
  let m = mixers.get(ctx);
  if (m) return m;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.25;
  comp.connect(ctx.destination);
  const duck = ctx.createGain();
  duck.connect(comp);
  const buses = {} as Record<AudioChannel, GainNode>;
  for (const c of ['sfx', 'music', 'ambience', 'ui'] as AudioChannel[]) {
    const g = ctx.createGain();
    g.gain.value = sliderToGain(readVolume(c));
    // Música y ambiente pasan por el «agache»; efectos e interfaz van directo al compresor
    g.connect(c === 'music' || c === 'ambience' ? duck : comp);
    buses[c] = g;
  }
  m = { buses, duck };
  mixers.set(ctx, m);
  allContexts.add(ctx);
  return m;
}

/**
 * Sonidos cortos generados por código (osciladores Web Audio),
 * sin depender de archivos de audio externos.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private disposed = false;
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
  /** A qué categoría van los sonidos de este AudioSystem. */
  channel: AudioChannel = 'sfx';

  constructor(scene?: Phaser.Scene) {
    scene?.events.once('shutdown', () => this.dispose());
  }

  dispose(): void {
    this.disposed = true;
    for (const voice of this.voices) {
      try { voice.oscillator.stop(); } catch { /* Already ended. */ }
      voice.oscillator.disconnect(); voice.gain.disconnect();
    }
    this.voices.clear();
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close().catch(() => {});
    this.ctx = null;
  }

  static isMuted(): boolean {
    return localStorage.getItem(MUTED_KEY) === 'true';
  }

  static setMuted(muted: boolean): void {
    localStorage.setItem(MUTED_KEY, String(muted));
  }

  /** Volumen de una categoría (0..1, como lo muestra el control de Opciones). */
  static volume(c: AudioChannel): number {
    return readVolume(c);
  }

  static setVolume(c: AudioChannel, v: number): void {
    const x = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem(VOLUME_KEY(c), String(x));
    } catch {
      // sin almacenamiento: vale solo por esta vez
    }
    for (const ctx of allContexts) {
      const m = mixers.get(ctx);
      if (m && ctx.state !== 'closed') m.buses[c].gain.setTargetAtTime(sliderToGain(x), ctx.currentTime, 0.03);
    }
  }

  /** Agacha música y ambiente (mientras habla un vecino) o los vuelve a subir, sin tocar los volúmenes elegidos. */
  static duck(on: boolean): void {
    for (const ctx of allContexts) {
      const m = mixers.get(ctx);
      if (m && ctx.state !== 'closed') m.duck.gain.setTargetAtTime(on ? 0.4 : 1, ctx.currentTime, on ? 0.08 : 0.35);
    }
  }

  /** Salida de este AudioSystem (el bus de su categoría). */
  private out(ctx: AudioContext): AudioNode {
    // Si no se puede armar la mezcla (navegador viejo, audio simulado), el sonido va directo a la salida
    try {
      return mixerFor(ctx).buses[this.channel];
    } catch {
      return ctx.destination;
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, startDelay: number, duration: number, type: OscillatorType = 'sine', gain = 0.15): void {
    if (this.disposed || AudioSystem.isMuted()) return;
    // Audio availability must never interrupt a connection or its saved state.
    let ctx: AudioContext;
    try { ctx = this.getContext(); } catch { return; }
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    // Los efectos que se repiten suenan un poquito distinto cada vez (variación chica: no desafina melodías)
    const vary = this.channel === 'sfx';
    oscillator.frequency.value = vary ? freq * (1 + (Math.random() - 0.5) * 0.012) : freq;
    if (vary) gain *= 0.9 + Math.random() * 0.2;

    const startTime = ctx.currentTime + startDelay;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    const voice = { oscillator, gain: gainNode };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect(); gainNode.disconnect(); this.voices.delete(voice);
    };
    oscillator.connect(gainNode);
    gainNode.connect(this.out(ctx));

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  /** Nota suelta para efectos de los objetos 3D (bocina, campanita, canto...). */
  tone(freq: number, delay: number, duration: number, type: OscillatorType = 'sine', gain = 0.12): void {
    this.playTone(freq, delay, duration, type, gain);
  }

  /** Ruido corto filtrado (salpicón, soplido, motor). */
  noise(delay: number, duration: number, gain = 0.12, lowpass = 1800): void {
    if (this.disposed || AudioSystem.isMuted()) return;
    let ctx: AudioContext;
    try { ctx = this.getContext(); } catch { return; }
    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.channel === 'sfx' ? lowpass * (0.92 + Math.random() * 0.16) : lowpass;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.out(ctx));
    src.onended = () => { src.disconnect(); filter.disconnect(); g.disconnect(); };
    src.start(ctx.currentTime + delay);
  }

  /** Conexión correcta: dos notas ascendentes. */
  playSuccess(): void {
    this.playTone(520, 0, 0.12, 'sine');
    this.playTone(780, 0.1, 0.18, 'sine');
  }

  /** Conexión incorrecta: tono corto y suave, sin castigo. */
  playError(): void {
    this.playTone(220, 0, 0.16, 'triangle', 0.1);
  }

  /** Fragmento recolectado: pequeño arpegio. */
  playCollect(): void {
    this.playTone(660, 0, 0.1, 'sine');
    this.playTone(880, 0.08, 0.1, 'sine');
    this.playTone(1100, 0.16, 0.2, 'sine');
  }
}

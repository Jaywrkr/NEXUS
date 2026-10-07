import type Phaser from 'phaser';

const MUTED_KEY = 'los-nexus-muted';

/**
 * Sonidos cortos generados por código (osciladores Web Audio),
 * sin depender de archivos de audio externos.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private disposed = false;
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();

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
    oscillator.frequency.value = freq;

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
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
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

import type { AudioSystem } from '../../systems/AudioSystem';

/*
 * La canción de la ciudad (PLAN_MAESTRO.md, «en todas las fases»): cada distrito que revive suma un
 * instrumento. Todo con tonos de Web Audio (sin archivos). Al volver la Gran Chispa suena completa.
 *   Centro → campanitas (melodía) · Skatepark → batería · Parque → órgano de feria
 *   Estación → bajo de tren · Cerro → flauta · Puerto → bocina del barco
 */

export type Instrument = 'centro' | 'skatepark' | 'parque' | 'estacion' | 'cerro' | 'puerto';
export const INSTRUMENTS: Instrument[] = ['centro', 'skatepark', 'parque', 'estacion', 'cerro', 'puerto'];
export const INSTRUMENT_NAMES: Record<Instrument, string> = {
  centro: '🔔 campanitas',
  skatepark: '🥁 batería',
  parque: '🎹 órgano de feria',
  estacion: '🚂 bajo de tren',
  cerro: '🪈 flauta',
  puerto: '📯 bocina',
};

const BEAT = 0.25; // segundos por corchea (120 bpm)
// Do mayor: notas en Hz
const N: Record<string, number> = {
  C3: 130.8, G2: 98, A2: 110, F2: 87.3, E3: 164.8, G3: 196, A3: 220, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784,
};
// 16 corcheas por vuelta; 0 = silencio
const MELODY = ['E4', 'G4', 'A4', 'G4', 'C5', 0, 'A4', 'G4', 'E4', 'G4', 'A4', 'C5', 'D5', 0, 'C5', 0];
const FLUTE = [0, 0, 'E5', 0, 0, 0, 'G5', 0, 0, 0, 'E5', 'D5', 'C5', 0, 0, 0];
const BASS = ['C3', 0, 'G2', 0, 'A2', 0, 'E3', 0, 'F2', 0, 'C3', 0, 'G2', 0, 'G3', 0];
const CHORDS: [number, string[]][] = [
  [0, ['C4', 'E4', 'G4']],
  [4, ['A3', 'C4', 'E4']],
  [8, ['F4', 'A4', 'C5']],
  [12, ['G3', 'D4', 'G4']],
];

export class CitySong {
  private readonly audio: AudioSystem;

  constructor(audio: AudioSystem) {
    this.audio = audio;
  }

  /** Toca `loops` vueltas con los instrumentos dados. Devuelve cuánto dura (s). */
  play(layers: Instrument[], loops = 2): number {
    const has = (i: Instrument) => layers.includes(i);
    const a = this.audio;
    for (let l = 0; l < loops; l += 1) {
      const t0 = l * 16 * BEAT;
      for (let i = 0; i < 16; i += 1) {
        const t = t0 + i * BEAT;
        const m = MELODY[i];
        if (has('centro') && m) a.tone(N[m], t, BEAT * 0.9, 'triangle', 0.07);
        const f = FLUTE[i];
        if (has('cerro') && f) a.tone(N[f], t, BEAT * 1.8, 'sine', 0.05);
        const b = BASS[i];
        if (has('estacion') && b) a.tone(N[b], t, BEAT * 0.8, 'sawtooth', 0.035);
        if (has('skatepark')) {
          if (i % 4 === 0) a.tone(70, t, 0.12, 'sine', 0.12);
          if (i % 4 === 2) a.noise(t, 0.08, 0.06, 4200);
          a.noise(t, 0.03, 0.02, 9000);
        }
      }
      if (has('parque')) for (const [at, chord] of CHORDS) for (const n of chord) a.tone(N[n], t0 + at * BEAT, BEAT * 3.6, 'square', 0.012);
      if (has('puerto')) {
        a.tone(N.C3, t0, BEAT * 3, 'sawtooth', 0.025);
        a.tone(N.G3, t0 + 8 * BEAT, BEAT * 3, 'sawtooth', 0.025);
      }
    }
    return loops * 16 * BEAT;
  }
}

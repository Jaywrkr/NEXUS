import { AudioSystem } from '../../systems/AudioSystem';

/*
 * Opciones del jugador (menú ⚙️ Opciones). Se guardan aparte del progreso: "Nueva partida" no las borra.
 * Efectos suaves usa la misma clave que la 2D y, si nunca se eligió, sigue a prefers-reduced-motion.
 */

const KEYS = {
  vibe: 'los-nexus-vibration',
  calm: 'los-nexus-reduced-effects',
  big: 'los-nexus-big-buttons',
  view: 'los-nexus-3d-view',
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: la opción vale solo por esta vez
  }
}

export const Settings = {
  get sound(): boolean {
    return !AudioSystem.isMuted();
  },
  set sound(on: boolean) {
    AudioSystem.setMuted(!on);
  },

  get vibration(): boolean {
    return read(KEYS.vibe) !== 'false';
  },
  set vibration(on: boolean) {
    write(KEYS.vibe, String(on));
  },

  /** Efectos suaves: menos destellos, sacudidas y animaciones. */
  get calm(): boolean {
    const v = read(KEYS.calm);
    if (v === 'true' || v === 'false') return v === 'true';
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  set calm(on: boolean) {
    write(KEYS.calm, String(on));
    document.body.classList.toggle('calm', on);
  },

  get bigButtons(): boolean {
    return read(KEYS.big) === 'true';
  },
  set bigButtons(on: boolean) {
    write(KEYS.big, String(on));
    document.body.classList.toggle('big-buttons', on);
  },

  /** Cámara detrás del Nexus (si no, isométrica). */
  get chase(): boolean {
    return read(KEYS.view) === 'chase';
  },

  /** Aplica las opciones guardadas al cargar. */
  apply(): void {
    document.body.classList.toggle('calm', this.calm);
    document.body.classList.toggle('big-buttons', this.bigButtons);
  },
};

/** Vibración corta del celular, si está activada en Opciones. */
export function vibrate(pattern: number | number[]): void {
  if (!Settings.vibration || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // algunos navegadores no la permiten
  }
}

/** Destello de pantalla completa (se omite con efectos suaves). */
export function flashScreen(ms = 250): void {
  if (Settings.calm) return;
  const flash = document.getElementById('flash');
  flash?.classList.add('on');
  window.setTimeout(() => flash?.classList.remove('on'), ms);
}

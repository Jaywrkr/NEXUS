import { clamp, isTouch } from './util';

/**
 * Entrada unificada: teclado (WASD/flechas, E tocar, Espacio saltar, B bailar, V) + joystick táctil y botones HTML.
 * `move` está en coordenadas de pantalla: x a la derecha, y hacia arriba, magnitud 0..1.
 */
export class Input {
  private readonly keys = new Set<string>();
  private readonly stick = { id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
  private interactQueued = false;
  private viewQueued = false;
  private jumpQueued = false;
  private danceQueued = false;
  private voltQueued = false;
  readonly touch = isTouch();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Enter') this.interactQueued = true;
      if (e.code === 'Space') this.jumpQueued = true;
      if (e.code === 'KeyB') this.danceQueued = true;
      if (e.code === 'KeyV') this.viewQueued = true;
      if (e.code === 'KeyQ') this.voltQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    this.setupStick();
  }

  private setupStick(): void {
    const zone = document.getElementById('stickZone');
    const base = document.getElementById('stickBase');
    const knob = document.getElementById('stickKnob');
    if (!zone || !base || !knob) return;

    zone.addEventListener('pointerdown', (e) => {
      this.stick.id = e.pointerId;
      const r = zone.getBoundingClientRect();
      this.stick.ox = e.clientX;
      this.stick.oy = e.clientY;
      base.style.left = `${e.clientX - r.left}px`;
      base.style.top = `${e.clientY - r.top}px`;
      try {
        zone.setPointerCapture(e.pointerId);
      } catch {
        // algunos navegadores no permiten capturar; el joystick igual funciona dentro de la zona
      }
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.ox;
      let dy = e.clientY - this.stick.oy;
      const len = Math.hypot(dx, dy);
      const max = 50;
      if (len > max) {
        dx *= max / len;
        dy *= max / len;
      }
      this.stick.dx = dx / max;
      this.stick.dy = dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.id = -1;
      this.stick.dx = this.stick.dy = 0;
      knob.style.transform = '';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  has(code: string): boolean {
    return this.keys.has(code);
  }

  get move(): { x: number; y: number } {
    let x = (this.has('KeyD') || this.has('ArrowRight') ? 1 : 0) - (this.has('KeyA') || this.has('ArrowLeft') ? 1 : 0);
    let y = (this.has('KeyW') || this.has('ArrowUp') ? 1 : 0) - (this.has('KeyS') || this.has('ArrowDown') ? 1 : 0);
    if (this.stick.id !== -1) {
      x = this.stick.dx;
      y = -this.stick.dy;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  queueInteract(): void {
    this.interactQueued = true;
  }

  queueVolt(): void {
    this.voltQueued = true;
  }

  consumeVolt(): boolean {
    const v = this.voltQueued;
    this.voltQueued = false;
    return v;
  }

  queueView(): void {
    this.viewQueued = true;
  }

  queueJump(): void {
    this.jumpQueued = true;
  }

  queueDance(): void {
    this.danceQueued = true;
  }

  consumeJump(): boolean {
    const v = this.jumpQueued;
    this.jumpQueued = false;
    return v;
  }

  consumeDance(): boolean {
    const v = this.danceQueued;
    this.danceQueued = false;
    return v;
  }

  consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  consumeView(): boolean {
    const v = this.viewQueued;
    this.viewQueued = false;
    return v;
  }

  /** Descarta pulsaciones pendientes (al cambiar de modo, para que no "se filtren"). */
  flush(): void {
    this.interactQueued = false;
    this.viewQueued = false;
    this.jumpQueued = false;
    this.danceQueued = false;
  }
}

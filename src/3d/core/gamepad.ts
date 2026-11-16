/*
 * Joystick de consola (guías «input-systems» y «game-ui-ux»). Se lee una vez por cuadro con la Gamepad API
 * (mapeo estándar: Xbox, PlayStation, Switch Pro y la mayoría de los genéricos).
 *
 * - Jugando: la palanca izquierda (o la cruceta) mueve al Nexus, con zona muerta CIRCULAR (no por eje: así
 *   las diagonales no se recortan). Los botones simulan las teclas que el juego ya entiende, así título,
 *   museo, menús y atajos funcionan sin código aparte: A = saltar (Espacio), X = tocar (E), B = bailar (B),
 *   Y = Mundo Voltio (Q), RB/LB = vista (V), RT = correr, Start = menú (Esc), Select = mapa (M).
 * - Con un menú o ventana abierta: palanca o cruceta mueven el foco entre los botones visibles, A elige y
 *   B vuelve (Esc). Siempre queda un botón enfocado.
 * - El cuerpo de la página lleva la clase `pad` mientras se usa el joystick (los botones muestran ⒶⓍ).
 */

const DEADZONE = 0.2;

const BUTTON_KEYS: Record<number, string> = {
  0: 'Space', // A / ✕
  2: 'KeyE', // X / □
  1: 'KeyB', // B / ○
  3: 'KeyQ', // Y / △
  4: 'KeyV', // LB
  5: 'KeyV', // RB
  9: 'Escape', // Start
  8: 'KeyM', // Select / Back
  7: 'ShiftLeft', // RT: correr
};

const UP = 12;
const DOWN = 13;
const LEFT = 14;
const RIGHT = 15;

function key(type: 'keydown' | 'keyup', code: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code, bubbles: true }));
}

function visible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

export class GamepadInput {
  private prev: boolean[] = [];
  /** Teclas que el joystick dejó apretadas (para soltarlas si se abre un menú). */
  private readonly held = new Set<string>();
  private navCooldown = 0;
  private lastMoveY = 0;
  /** Movimiento de la palanca (pantalla: x derecha, y arriba), 0 si no hay joystick. */
  move = { x: 0, y: 0 };
  connected = false;

  constructor() {
    // Si se vuelve al teclado o a la pantalla táctil, los botones dejan de mostrar las letras del joystick
    const back = (e: Event) => {
      if (e.isTrusted) document.body.classList.remove('pad');
    };
    window.addEventListener('keydown', back);
    window.addEventListener('pointerdown', back);
  }

  /** Hay un menú o ventana abierta: el joystick navega en vez de jugar. */
  private uiOpen(): HTMLElement | null {
    const sheets = [...document.querySelectorAll<HTMLElement>('.sheet')].filter(visible);
    if (sheets.length) return sheets[sheets.length - 1];
    const title = document.getElementById('title');
    if (title && visible(title)) return title;
    return null;
  }

  private focusables(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => !(el as HTMLButtonElement).disabled && !el.closest('[hidden]') && visible(el),
    );
  }

  private moveFocus(root: HTMLElement, dir: 1 | -1): void {
    const list = this.focusables(root);
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLElement);
    const next = i < 0 ? list[0] : list[(i + dir + list.length) % list.length];
    next.focus({ preventScroll: false });
    next.scrollIntoView?.({ block: 'nearest' });
  }

  update(dt: number): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected && p.mapping === 'standard') ?? [...pads].find((p) => p && p.connected) ?? null;
    this.connected = Boolean(pad);
    if (!pad) {
      this.move = { x: 0, y: 0 };
      return;
    }
    const pressed = pad.buttons.map((b) => b.pressed || b.value > 0.5);
    const down = (i: number) => pressed[i] && !this.prev[i];
    const up = (i: number) => !pressed[i] && this.prev[i];

    // Palanca con zona muerta circular (y reescalada: justo al salir de la zona empieza en 0)
    let x = pad.axes[0] ?? 0;
    let y = -(pad.axes[1] ?? 0);
    const len = Math.hypot(x, y);
    if (len < DEADZONE) {
      x = 0;
      y = 0;
    } else {
      const k = Math.min(1, (len - DEADZONE) / (1 - DEADZONE)) / len;
      x *= k;
      y *= k;
    }
    if (pressed[RIGHT]) x = 1;
    if (pressed[LEFT]) x = -1;
    if (pressed[UP]) y = 1;
    if (pressed[DOWN]) y = -1;

    if (pressed.some(Boolean) || len > DEADZONE) document.body.classList.add('pad');

    const ui = this.uiOpen();
    if (ui) {
      // Navegar el menú: siempre hay algo enfocado; A elige, B vuelve
      this.move = { x: 0, y: 0 };
      for (const code of this.held) key('keyup', code);
      this.held.clear();
      if (!ui.contains(document.activeElement)) this.focusables(ui)[0]?.focus();
      this.navCooldown -= dt;
      const dirY = y > 0.5 ? -1 : y < -0.5 ? 1 : 0;
      const dirX = x > 0.5 ? 1 : x < -0.5 ? -1 : 0;
      const dir = dirY || dirX;
      if (dir && (this.navCooldown <= 0 || Math.sign(this.lastMoveY) !== dir)) {
        const el = document.activeElement as HTMLInputElement | null;
        if (dirX && el?.type === 'range') {
          el.value = String(Number(el.value) + dirX * Number(el.step || 5));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else this.moveFocus(ui, dir as 1 | -1);
        this.navCooldown = 0.22;
      }
      this.lastMoveY = dir;
      if (down(0)) {
        const el = document.activeElement as HTMLInputElement | null;
        if (el && el.type === 'checkbox') {
          el.checked = !el.checked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else el?.click();
      }
      if (down(1) || down(9)) key('keydown', 'Escape');
      if (down(8)) key('keydown', 'KeyM');
    } else {
      this.move = { x, y };
      for (const [i, code] of Object.entries(BUTTON_KEYS)) {
        const n = Number(i);
        if (down(n)) {
          key('keydown', code);
          this.held.add(code);
        }
        if (up(n) && this.held.has(code)) {
          key('keyup', code);
          this.held.delete(code);
        }
      }
    }
    this.prev = pressed;
  }
}

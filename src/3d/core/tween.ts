/** Tweens mínimos (reemplazo de los tweens de Phaser): `tween(seg, t => ...)`, se avanzan desde el loop. */

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

interface Tween {
  t: number;
  duration: number;
  delay: number;
  fn: (k: number) => void;
  easing: (t: number) => number;
  done?: () => void;
}

const active: Tween[] = [];

export function tween(
  duration: number,
  fn: (k: number) => void,
  opts: { easing?: (t: number) => number; delay?: number; done?: () => void } = {},
): void {
  active.push({ t: 0, duration, delay: opts.delay ?? 0, fn, easing: opts.easing ?? ease.outCubic, done: opts.done });
}

export function after(seconds: number, fn: () => void): void {
  tween(0.0001, () => {}, { delay: seconds, done: fn });
}

export function updateTweens(dt: number): void {
  for (let i = active.length - 1; i >= 0; i -= 1) {
    const tw = active[i];
    if (tw.delay > 0) {
      tw.delay -= dt;
      continue;
    }
    tw.t += dt;
    const k = Math.min(tw.t / tw.duration, 1);
    tw.fn(tw.easing(k));
    if (k >= 1) {
      active.splice(i, 1);
      tw.done?.();
    }
  }
}

export function clearTweens(): void {
  active.length = 0;
}

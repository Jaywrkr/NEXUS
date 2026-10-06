export interface SpringState { value: number; velocity: number }
/** Substeps and bounded elapsed time keep decorative physics stable after tab suspension. */
export function stepSpring(state: SpringState, target: number, deltaMs: number): void {
  let remaining = Math.max(0, Math.min(64, Number.isFinite(deltaMs) ? deltaMs : 0)) / 1000;
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120);
    state.velocity += ((target - state.value) * 65 - state.velocity * 12) * dt;
    state.value += state.velocity * dt;
    remaining -= dt;
  }
}

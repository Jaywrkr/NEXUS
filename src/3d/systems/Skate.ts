import { clamp, damp, dampAngle } from '../core/util';
import type { Nexus3D } from '../entities/Nexus3D';
import type { Kicker, Rail } from '../world/Skatepark';

/*
 * Andar en patineta (Fase 1). La tabla va hacia donde mira: el joystick dobla de a poco y acelera,
 * soltar hace que se deslice y frene sola, tirar para atrás frena. Espacio = ollie.
 * Rampitas: si se pasan rápido en su dirección, el Nexus vuela. La rampa grande devuelve hacia afuera.
 * Barandas: cayendo cerca de una (y yendo a lo largo), se engancha y grinda hasta la punta.
 */

export const RIDE_MAX = 9;
const RIDE_ACCEL = 7;
const COAST = 1.6;
const BRAKE = 12;

export type Trick = 'ollie' | 'air' | 'grind';

export class Skate {
  speed = 0;
  private grind: { r: Rail; t: number; dir: number; len: number } | null = null;

  get grinding(): boolean {
    return this.grind !== null;
  }

  reset(): void {
    this.speed = 0;
    this.grind = null;
  }

  /** Avanza la patineta: dirX/dirZ es lo que pide el joystick (magnitud 0..1). */
  move(n: Nexus3D, dirX: number, dirZ: number, dt: number, airborne: boolean, boost = 1): void {
    const max = RIDE_MAX * boost;
    const m = Math.min(1, Math.hypot(dirX, dirZ));
    let turn = 0;
    if (m > 0.15 && !airborne) {
      const want = Math.atan2(dirX, dirZ);
      let diff = want - n.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.cos(diff) < -0.35 && this.speed > 1) {
        // Tirar para atrás: frena
        this.speed = Math.max(0, this.speed - BRAKE * dt);
      } else {
        n.heading = dampAngle(n.heading, want, this.speed < 1.5 ? 10 : 4.5, dt);
        this.speed = Math.min(max, this.speed + RIDE_ACCEL * m * dt);
        turn = clamp(diff * 1.5, -1, 1);
      }
    } else if (!airborne) {
      this.speed = Math.max(0, this.speed - COAST * dt);
    }
    n.lean = damp(n.lean, turn, 6, dt);
    n.velocity.x = Math.sin(n.heading) * this.speed;
    n.velocity.z = Math.cos(n.heading) * this.speed;
    n.position.x += n.velocity.x * dt;
    n.position.z += n.velocity.z * dt;
  }

  /** Chocó contra algo: pierde casi toda la velocidad. */
  bonk(): void {
    this.speed *= 0.35;
  }

  /** En el piso sobre una rampita a buena velocidad: devuelve la velocidad vertical del vuelo. */
  kick(n: Nexus3D, kickers: Kicker[]): number {
    const p = n.position;
    for (const k of kickers) {
      const dx = p.x - k.x;
      const dz = p.z - k.z;
      const along = dx * k.dirX + dz * k.dirZ;
      const across = -dx * k.dirZ + dz * k.dirX;
      if (Math.abs(along) > k.halfL || Math.abs(across) > k.halfW) continue;
      const v = n.velocity.x * k.dirX + n.velocity.z * k.dirZ;
      if (v < 3) continue;
      if (k.ramp) {
        // Cuarto de tubo: sube, vuela y vuelve mirando hacia afuera
        n.heading += Math.PI;
        this.speed = Math.max(this.speed * 0.7, 4);
        return 9.5;
      }
      this.speed = Math.max(this.speed, 6.5);
      return 7.6;
    }
    return 0;
  }

  /** Cayendo cerca de una baranda y yendo a lo largo: empieza a grindar. */
  tryGrind(n: Nexus3D, rails: Rail[], vy: number): boolean {
    if (vy > 0 || this.grind) return false;
    const p = n.position;
    for (const r of rails) {
      const ex = r.bx - r.ax;
      const ez = r.bz - r.az;
      const len = Math.hypot(ex, ez);
      const ux = ex / len;
      const uz = ez / len;
      const t = ((p.x - r.ax) * ux + (p.z - r.az) * uz) / len;
      if (t < 0.02 || t > 0.95) continue;
      const cx = r.ax + ex * t;
      const cz = r.az + ez * t;
      if (Math.hypot(p.x - cx, p.z - cz) > 0.6) continue;
      if (p.y < r.h - 0.25 || p.y > r.h + 0.6) continue;
      const along = n.velocity.x * ux + n.velocity.z * uz;
      if (Math.abs(along) < Math.max(1.5, this.speed * 0.55)) continue;
      const dir = Math.sign(along);
      this.grind = { r, t, dir, len };
      this.speed = Math.max(this.speed, 5.5);
      n.heading = Math.atan2(ux * dir, uz * dir);
      p.set(cx, r.h, cz);
      return true;
    }
    return false;
  }

  /** Deslizando: devuelve true cuando llegó a la punta (sale con un saltito). */
  updateGrind(n: Nexus3D, dt: number): boolean {
    const g = this.grind;
    if (!g) return true;
    g.t += (g.dir * this.speed * dt) / g.len;
    const t = clamp(g.t, 0, 1);
    n.position.set(g.r.ax + (g.r.bx - g.r.ax) * t, g.r.h, g.r.az + (g.r.bz - g.r.az) * t);
    n.velocity.x = Math.sin(n.heading) * this.speed;
    n.velocity.z = Math.cos(n.heading) * this.speed;
    if (g.t <= 0 || g.t >= 1) {
      this.grind = null;
      return true;
    }
    return false;
  }

  /** Salir de la baranda antes (saltando). */
  leaveGrind(): void {
    this.grind = null;
  }
}

import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * El tren de la Estación (Fase 7, PLAN_MAESTRO.md). Está dormido (gris); se despierta cerrando su
 * circuito en el Mundo Voltio y llevándole energía con cable (carrera de luz «cable de vías»).
 * Despierto, larga humo y las paradas de todos los distritos sirven para viajar.
 */
export class Train extends Connectable {
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly lamp: THREE.MeshBasicMaterial;
  private readonly wheels: THREE.Object3D[] = [];
  private readonly puffs: THREE.Mesh[] = [];
  private readonly body = new THREE.Group();
  private t = 0;
  /** Motor trabado hasta cerrar el circuito del Mundo Voltio. */
  unlocked = false;
  /** El tren está saliendo (animación de viaje). */
  private leaving = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, Math.PI / 2); // mira a +X (sobre la vía este-oeste)
    this.collideRadius = 0;
    this.label = 'Tren';
    const paint = (color: string) => {
      const m = toonUnique('#8e8a99');
      m.userData.on = color;
      this.paint.push(m);
      return m;
    };
    const dark = toon('#2c2838');
    // Locomotora: caldera, cabina, chimenea, faro y miriñaque
    const chassis = box(1.8, 0.3, 5.2, '', { mat: dark, outline: 0.02 });
    chassis.position.set(0, 0.55, 0);
    this.body.add(chassis);
    const boiler = rounded(new THREE.CylinderGeometry(0.75, 0.75, 3.2, 18), paint('#c8452f'), 0.016);
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 1.45, 0.8);
    this.body.add(boiler);
    for (const z of [0.0, 1.0, 2.0]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 18), toon('#ffc23a'));
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 1.45, z);
      this.body.add(band);
    }
    const cab = box(1.8, 1.9, 1.6, '', { mat: paint('#2c3f66'), outline: 0.03 });
    cab.position.set(0, 1.65, -1.6);
    this.body.add(cab);
    const roof = box(2.1, 0.18, 2.0, '', { mat: paint('#ffc23a'), outline: 0.02 });
    roof.position.set(0, 2.7, -1.6);
    this.body.add(roof);
    for (const sx of [-0.91, 0.91]) {
      const win = box(0.04, 0.6, 0.8, '#bfe6ff', { outline: false });
      win.position.set(sx, 2.0, -1.6);
      this.body.add(win);
    }
    const stack = rounded(new THREE.CylinderGeometry(0.28, 0.2, 0.9, 12), dark, 0.012);
    stack.position.set(0, 2.45, 1.8);
    this.body.add(stack);
    const dome = rounded(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint('#ffc23a'), 0.01);
    dome.position.set(0, 2.15, 0.6);
    this.body.add(dome);
    this.lamp = new THREE.MeshBasicMaterial({ color: '#4a4856' });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 14), this.lamp);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 1.55, 2.5);
    this.body.add(lamp);
    const catcher = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.7, 4), dark);
    catcher.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    catcher.position.set(0, 0.55, 2.8);
    this.body.add(catcher);
    // Ruedas
    for (const z of [-1.8, -0.6, 0.8, 1.9]) {
      for (const sx of [-0.92, 0.92]) {
        const w = rounded(new THREE.CylinderGeometry(z < 0 ? 0.5 : 0.36, z < 0 ? 0.5 : 0.36, 0.12, 16), toon('#c8452f'), 0.01);
        w.rotation.z = Math.PI / 2;
        w.position.set(sx, z < 0 ? 0.5 : 0.36, z);
        this.body.add(w);
        this.wheels.push(w);
      }
    }
    // Dos vagones detrás
    for (let i = 0; i < 2; i += 1) {
      const zc = -4.4 - i * 4.2;
      const car = box(1.9, 1.6, 3.6, '', { mat: paint(i ? '#2bb3a8' : '#ff9f43'), outline: 0.03 });
      car.position.set(0, 1.4, zc);
      this.body.add(car);
      const top = box(2.1, 0.15, 3.8, '', { mat: paint('#fff3dc'), outline: 0.015 });
      top.position.set(0, 2.25, zc);
      this.body.add(top);
      for (const wz of [-1, 0, 1]) {
        for (const sx of [-0.96, 0.96]) {
          const win = box(0.04, 0.5, 0.6, '#bfe6ff', { outline: false });
          win.position.set(sx, 1.6, zc + wz);
          this.body.add(win);
        }
      }
      for (const wz of [-1.2, 1.2]) {
        for (const sx of [-0.92, 0.92]) {
          const w = rounded(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 14), dark, 0.01);
          w.rotation.z = Math.PI / 2;
          w.position.set(sx, 0.34, zc + wz);
          this.body.add(w);
          this.wheels.push(w);
        }
      }
    }
    for (let i = 0; i < 4; i += 1) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0 }));
      p.position.set(0, 3, 1.8);
      this.body.add(p);
      this.puffs.push(p);
    }
    this.group.add(this.body);
    this.plugAnchor.position.set(-1, 1.2, 1.5);
  }

  /** Rectángulo largo del tren (locomotora + vagones) sobre la vía. */
  distanceFrom(x: number, z: number): number {
    // El grupo mira a +X: el largo va sobre X, de −11 a +3 respecto del centro
    const lx = x - this.x;
    const lz = z - this.z;
    const dx = lx > 3 ? lx - 3 : lx < -11 ? -11 - lx : 0;
    const dz = Math.max(Math.abs(lz) - 1.1, 0);
    return Math.hypot(dx, dz);
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.paint) m.color.set(m.userData.on as string);
    this.lamp.color.set('#fff3a8');
  }

  /** Hace como que sale y vuelve (al viajar). */
  depart(): void {
    this.leaving = 1;
  }

  update(dt: number, time: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.puffs.forEach((p, i) => {
      const k = (time * 0.7 + i / 4) % 1;
      p.position.y = 3 + k * 2.2;
      p.position.z = 1.8 - k * 1.2;
      p.scale.setScalar(0.6 + k * 1.4);
      (p.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
    });
    if (this.leaving > 0) {
      this.leaving = Math.max(0, this.leaving - dt * 0.8);
      const k = Math.sin(this.leaving * Math.PI);
      this.body.position.z = k * 3;
      for (const w of this.wheels) w.rotation.x += dt * 8;
    } else {
      this.body.position.y = Math.sin(this.t * 6) * 0.015;
    }
  }
}

/** Parada del tren: poste con cartel y campanita. Despierto el tren, sirve para viajar. */
export function makeStop(name: string): THREE.Group {
  const g = new THREE.Group();
  const post = rounded(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), toon('#3d3550'), 0.01);
  post.position.y = 1.3;
  g.add(post);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#c7a17a';
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#1d1630';
  x.font = 'bold 34px "Arial Black", Impact, sans-serif';
  x.textAlign = 'center';
  x.fillText('🚂 PARADA', 128, 52);
  x.font = 'bold 26px "Arial Black", Impact, sans-serif';
  x.fillText(name.toUpperCase(), 128, 98);
  x.strokeStyle = '#1d1630';
  x.lineWidth = 8;
  x.strokeRect(4, 4, 248, 120);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, 2.45, 0.06);
  g.add(sign);
  const back = box(1.45, 0.75, 0.05, '#3d3550', { outline: 0.01 });
  back.position.set(0, 2.45, 0.02);
  g.add(back);
  const bell = rounded(new THREE.ConeGeometry(0.14, 0.22, 10, 1, true), toon('#ffc23a'), 0.008);
  bell.position.set(0.25, 1.85, 0.12);
  g.add(bell);
  return g;
}

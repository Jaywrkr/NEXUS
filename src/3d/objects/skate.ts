import * as THREE from 'three';
import { box, glow, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * Cosas del Skatepark (Fase 1, PLAN_MAESTRO.md): la patineta y la rampa grande (un "lugar grande":
 * se revive con cable desde una fuente y su carrera de luz tiene el tema grafiti).
 */

/** Patineta: tabla con nariz y cola levantadas, lija, ejes y cuatro ruedas. Mira hacia +Z. */
export function makeBoard(): THREE.Group {
  const g = new THREE.Group();
  const deck = box(0.26, 0.035, 0.74, '#ff9f43', { outline: 0.012 });
  deck.position.y = 0.11;
  g.add(deck);
  const grip = box(0.24, 0.006, 0.6, '#2c2838', { outline: false });
  grip.position.y = 0.13;
  g.add(grip);
  for (const s of [-1, 1]) {
    const kick = box(0.26, 0.035, 0.14, '#ff9f43', { outline: 0.012 });
    kick.position.set(0, 0.135, s * 0.42);
    kick.rotation.x = -s * 0.45;
    g.add(kick);
    const truck = box(0.24, 0.03, 0.05, '#b8bcc6', { outline: 0.008 });
    truck.position.set(0, 0.075, s * 0.24);
    g.add(truck);
    for (const w of [-1, 1]) {
      const wheel = rounded(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), toon('#7dff8a'), 0.006);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(w * 0.13, 0.04, s * 0.24);
      g.add(wheel);
    }
  }
  // Raya de color en la parte de abajo (se ve al saltar)
  const stripe = box(0.06, 0.004, 0.6, '#7dff8a', { outline: false });
  stripe.position.y = 0.09;
  g.add(stripe);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return g;
}

/** Perfil de la rampa (cuarto de tubo): u = hacia atrás, v = altura. */
export const RAMP_DEPTH = 4.2;
export const RAMP_WIDTH = 12;
export const RAMP_HEIGHT = 1.8;

/**
 * La rampa grande del Skatepark (cuarto de tubo). Mira a +Z: el frente (donde se entra con la
 * patineta) está en z del grupo y el resto queda hacia −Z. Se apagó con la Gran Chispa: al
 * conectarla se prenden las luces del borde y los focos.
 */
export class SkateRamp extends Connectable {
  private readonly strip: THREE.MeshToonMaterial;
  private readonly bulbs: THREE.Mesh[] = [];
  private readonly beams: THREE.Mesh[] = [];
  private onT = -1;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0;
    this.label = 'Rampa';

    const R = 3.4;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 1; i <= 16; i += 1) {
      const u = (3.0 * i) / 16;
      shape.lineTo(u, R - Math.sqrt(R * R - u * u));
    }
    shape.lineTo(RAMP_DEPTH, RAMP_HEIGHT);
    shape.lineTo(RAMP_DEPTH, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: RAMP_WIDTH, bevelEnabled: false, curveSegments: 4 });
    const surface = new THREE.Mesh(geo, toon('#c9c2b8', 10));
    surface.rotation.y = Math.PI / 2;
    surface.position.x = -RAMP_WIDTH / 2;
    surface.castShadow = surface.receiveShadow = true;
    this.group.add(surface);
    // Bordes de madera a los costados y caño de metal (coping) arriba
    const sideMat = toonUnique('#8a5a3a', 4);
    sideMat.side = THREE.DoubleSide;
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.ShapeGeometry(shape), sideMat);
      side.rotation.y = Math.PI / 2;
      side.position.x = s * (RAMP_WIDTH / 2 + 0.01);
      this.group.add(side);
    }
    const coping = rounded(new THREE.CylinderGeometry(0.06, 0.06, RAMP_WIDTH, 10), toon('#b8bcc6'), 0.012);
    coping.rotation.z = Math.PI / 2;
    coping.position.set(0, RAMP_HEIGHT + 0.03, -3.0);
    this.group.add(coping);
    // Tira de luces en la cara del deck (apagada = gris)
    this.strip = toonUnique('#5a5866');
    const strip = new THREE.Mesh(new THREE.BoxGeometry(RAMP_WIDTH - 0.4, 0.14, 0.04), this.strip);
    // La cara de arriba de la curva es casi vertical y mira a +Z: la tira va justo debajo del borde
    strip.position.set(0, RAMP_HEIGHT - 0.3, -2.9);
    strip.rotation.x = -0.3;
    this.group.add(strip);
    // Barandita del deck
    for (let i = 0; i < 7; i += 1) {
      const post = box(0.06, 0.7, 0.06, '#3d3550', { outline: 0.01 });
      post.position.set(-5.5 + i * (11 / 6), RAMP_HEIGHT + 0.35, -RAMP_DEPTH + 0.15);
      this.group.add(post);
    }
    const rail = box(11.2, 0.06, 0.06, '#3d3550', { outline: 0.01 });
    rail.position.set(0, RAMP_HEIGHT + 0.68, -RAMP_DEPTH + 0.15);
    this.group.add(rail);
    // Dos focos en postes a los costados
    for (const s of [-1, 1]) {
      const pole = rounded(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), toon('#3d3550'), 0.012);
      pole.position.set(s * (RAMP_WIDTH / 2 + 0.6), 2.1, -2.5);
      this.group.add(pole);
      const head = box(0.6, 0.35, 0.3, '#2c2838', { outline: 0.015 });
      head.position.set(s * (RAMP_WIDTH / 2 + 0.3), 4.15, -2.3);
      head.rotation.x = 0.5;
      this.group.add(head);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.04), new THREE.MeshBasicMaterial({ color: '#4a4856' }));
      bulb.position.set(s * (RAMP_WIDTH / 2 + 0.3), 4.08, -2.13);
      bulb.rotation.x = 0.5;
      this.group.add(bulb);
      this.bulbs.push(bulb);
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 4, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      beam.position.set(s * (RAMP_WIDTH / 2 - 0.4), 2.2, -1.2);
      beam.rotation.set(0.5, 0, s * -0.35);
      this.group.add(beam);
      this.beams.push(beam);
    }
    this.plugAnchor.position.set(0, 0.6, -0.8);
  }

  /** El borde de la rampa: un rectángulo de 12 × 4,2 detrás del frente. */
  distanceFrom(x: number, z: number): number {
    const lx = x - this.x;
    const lz = z - this.z;
    const dx = Math.max(Math.abs(lx) - RAMP_WIDTH / 2, 0);
    const dz = lz > 0 ? lz : Math.max(-RAMP_DEPTH - lz, 0);
    return Math.hypot(dx, dz);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.onT = 0;
  }

  restore(): void {
    this.activate();
    this.onT = 1;
  }

  update(dt: number, time: number): void {
    if (!this.active_) return;
    this.onT = Math.min(1, this.onT + dt);
    // Luces que corren por la tira, de naranja a verde
    const c = new THREE.Color('#ff9f43').lerp(new THREE.Color('#7dff8a'), (Math.sin(time * 3) + 1) / 2);
    this.strip.color.copy(c);
    for (const b of this.bulbs) (b.material as THREE.MeshBasicMaterial).color.set('#fff3c4');
    for (const beam of this.beams) (beam.material as THREE.MeshBasicMaterial).opacity = 0.12 * this.onT;
  }
}

/** Un nodo del circuito del Mundo Voltio: un pilar de luz (solo se ve en Voltio). */
export function makeNode(): { g: THREE.Group; ring: THREE.Mesh; core: THREE.Mesh } {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.2, 6), glow('#3a2a6a'));
  base.position.y = 0.1;
  g.add(base);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshBasicMaterial({ color: '#ff4fd8' }));
  core.position.y = 1.1;
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: '#ff4fd8' }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  g.add(ring);
  return { g, ring, core };
}

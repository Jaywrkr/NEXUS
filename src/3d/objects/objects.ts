import * as THREE from 'three';
import { box, glow, gradientMap, outline, outlineScaled, rounded, toon, toonUnique } from '../core/render';
import { ease, tween } from '../core/tween';
import { Connectable } from './Connectable';

/** Estrella extruida (fragmentos, núcleo de las fuentes). */
export function starGeometry(points: number, inner: number, outer: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: depth * 0.4, bevelSegments: 1 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Fragmento con volumen: dos estrellas cruzadas, para que no se vea "de canto" al girar.
 * El secreto es dorado para distinguirlo en el museo.
 */
export function crystalStar(color: string): THREE.Group {
  const g = new THREE.Group();
  const geo = starGeometry(5, 0.17, 0.38, 0.12);
  const rim = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide });
  for (const ry of [0, Math.PI / 2]) {
    const m = new THREE.Mesh(geo, toon(color));
    m.rotation.y = ry;
    m.castShadow = true;
    outlineScaled(m, 1.12, 1.12, 1.4);
    (m.children[0] as THREE.Mesh).material = rim;
    g.add(m);
  }
  return g;
}

/* ---------- Fuente de energía ---------- */

export type EnergySourceVariant = 'active' | 'dim';

/**
 * Pedestal con un núcleo-estrella dorado que gira y un halo que late.
 * Variante 'dim' = señuelo (Decisión 018): gris, quieta, sin halo; parece una fuente más pero ninguna regla la usa.
 */
export class EnergySource extends Connectable {
  private readonly core: THREE.Mesh;
  private readonly halo: THREE.Mesh | null = null;
  private readonly variant: EnergySourceVariant;

  constructor(id: string, x: number, z: number, variant: EnergySourceVariant = 'active') {
    super(id, 'source', x, z);
    this.variant = variant;
    this.collideRadius = 0.5;

    const base = rounded(new THREE.CylinderGeometry(0.32, 0.42, 0.55, 12), toon('#555b6e', 2), 0.02);
    base.position.y = 0.275;
    this.group.add(base);
    const cap = rounded(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12), toon('#3a3d48'), 0.015);
    cap.position.y = 0.58;
    this.group.add(cap);

    const dim = variant === 'dim';
    // Detalle: placa de piso, pernos, franjas de energía y un conducto que entra al suelo
    const plate = rounded(new THREE.CylinderGeometry(0.56, 0.6, 0.06, 16), toon('#3a3d48'), 0.012);
    plate.position.y = 0.03;
    this.group.add(plate);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), toon('#c9ccd4'));
      bolt.position.set(Math.cos(a) * 0.5, 0.075, Math.sin(a) * 0.5);
      this.group.add(bolt);
    }
    for (const y of [0.18, 0.4]) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4 - y * 0.18, 0.4 - y * 0.18, 0.045, 16, 1, true),
        dim ? toon('#6a6f7c') : glow('#ffd93d'),
      );
      band.position.y = y;
      this.group.add(band);
    }
    const prongs = [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2;
      const prong = box(0.05, 0.28, 0.05, '#2c3040', { outline: 0.008 });
      prong.position.set(Math.cos(a) * 0.26, 0.74, Math.sin(a) * 0.26);
      prong.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      return prong;
    });
    for (const pr of prongs) this.group.add(pr);
    const conduit = rounded(new THREE.TorusGeometry(0.22, 0.045, 6, 12, Math.PI / 2), toon('#2c3040'), 0.01);
    conduit.position.set(0.42, 0.06, 0);
    conduit.rotation.set(0, 0, Math.PI);
    this.group.add(conduit);
    this.core = rounded(starGeometry(6, 0.16, 0.32, 0.08), toon(dim ? '#9aa0ad' : '#ffd93d'), 0.015);
    this.core.position.y = 1.0;
    this.group.add(this.core);

    if (!dim) {
      this.halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0.25, depthWrite: false, fog: false }),
      );
      this.halo.position.y = 1.0;
      this.group.add(this.halo);
    }

    this.plugAnchor.position.set(0, 1.0, 0);
  }

  activate(): void {
    this.active_ = true;
  }

  update(_dt: number, time: number): void {
    if (this.variant === 'dim') return;
    this.core.rotation.y = time * 1.05;
    this.core.position.y = 1.0 + Math.sin(time * 2) * 0.05;
    if (this.halo) {
      const k = (Math.sin(time * 3.5) + 1) / 2;
      this.halo.scale.setScalar(0.9 + k * 0.2);
      (this.halo.material as THREE.MeshBasicMaterial).opacity = 0.15 + k * 0.25;
    }
  }
}

/* ---------- Farola ---------- */

/** Farola de la plaza. Es destino de la fuente y, ya encendida, origen hacia la puerta. */
export class StreetLamp extends Connectable {
  private readonly bulb: THREE.Mesh;
  private readonly light: THREE.PointLight;
  private readonly pool: THREE.Mesh;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.35;

    const base = rounded(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 10), toon('#3a3d48'), 0.015);
    base.position.y = 0.15;
    this.group.add(base);
    const pole = rounded(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8), toon('#3a3d48'), 0.015);
    pole.position.y = 1.6;
    this.group.add(pole);
    const arm = box(0.09, 0.09, 0.7, '#3a3d48', { outline: 0.015 });
    arm.position.set(0, 3.15, 0.3);
    this.group.add(arm);
    const head = rounded(new THREE.ConeGeometry(0.32, 0.3, 10, 1, true), toon('#2c3040'), 0.015);
    head.position.set(0, 3.05, 0.62);
    this.group.add(head);
    // Detalle: anillos en la base y a media altura, remate arriba, voluta bajo el brazo y placa
    for (const [y, r] of [[0.34, 0.13], [1.4, 0.1], [2.6, 0.095]] as const) {
      const ring = rounded(new THREE.TorusGeometry(r, 0.03, 6, 14), toon('#2c3040'), 0.008);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.group.add(ring);
    }
    const finial = rounded(new THREE.SphereGeometry(0.07, 8, 6), toon('#2c3040'), 0.01);
    finial.position.y = 3.27;
    this.group.add(finial);
    const scroll = rounded(new THREE.TorusGeometry(0.16, 0.025, 6, 12, Math.PI * 1.3), toon('#2c3040'), 0.008);
    scroll.position.set(0, 2.98, 0.2);
    scroll.rotation.y = Math.PI / 2;
    this.group.add(scroll);
    const topCap = rounded(new THREE.ConeGeometry(0.12, 0.12, 8), toon('#2c3040'), 0.01);
    topCap.position.set(0, 3.25, 0.62);
    this.group.add(topCap);
    const plaque = box(0.16, 0.22, 0.03, '#f2c14e', { outline: 0.008 });
    plaque.position.set(0, 0.9, 0.09);
    this.group.add(plaque);

    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toonUnique('#5a5f6b'));
    this.bulb.position.set(0, 2.92, 0.62);
    this.group.add(this.bulb);

    this.light = new THREE.PointLight('#ffd27a', 0, 9, 1.6);
    this.light.position.set(0, 2.7, 0.62);
    this.group.add(this.light);

    this.pool = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 24),
      new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0, depthWrite: false }),
    );
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.set(0, 0.03, 0.62);
    this.group.add(this.pool);

    this.plugAnchor.position.set(0, 1.3, 0);
  }

  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.bulb.material = glow('#ffe066');
    tween(0.5, (k) => {
      this.light.intensity = k * 9;
      (this.pool.material as THREE.MeshBasicMaterial).opacity = k * 0.35;
    });
  }

  restore(): void {
    this.active_ = true;
    this.bulb.material = glow('#ffe066');
    this.light.intensity = 9;
    (this.pool.material as THREE.MeshBasicMaterial).opacity = 0.35;
  }
}

/* ---------- Puerta ---------- */

/** Puerta en la fachada de la casa apagada. Al conectarse se abre y deja ver la luz de adentro. */
export class Door extends Connectable {
  private readonly hinge = new THREE.Group();
  private readonly inside: THREE.Mesh;

  constructor(id: string, x: number, z: number, rotY = 0) {
    super(id, 'target', x, z, rotY);
    this.collideRadius = 0;

    this.inside = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshBasicMaterial({ color: '#2a2d36' }));
    this.inside.position.set(0, 1.0, 0.0);
    this.group.add(this.inside);

    const frame = box(1.35, 2.3, 0.12, '#f4efe6', { outline: 0.03 });
    frame.position.set(0, 1.12, -0.03);
    this.group.add(frame);
    this.inside.position.z = 0.035;

    this.hinge.position.set(-0.52, 0, 0.07);
    const slab = box(1.04, 2.04, 0.1, '#7a4a2e', { outline: 0.03, brush: 1 });
    slab.position.set(0.52, 1.02, 0);
    this.hinge.add(slab);
    const knob = rounded(new THREE.SphereGeometry(0.05, 8, 6), toon('#f2c14e'), 0.01);
    knob.position.set(0.9, 1.0, 0.07);
    this.hinge.add(knob);
    for (const y of [0.55, 1.45]) {
      const panel = box(0.7, 0.6, 0.02, '#6a3e26', { outline: false });
      panel.position.set(0.52, y, 0.06);
      this.hinge.add(panel);
    }
    this.group.add(this.hinge);

    const step = box(1.8, 0.2, 0.9, '#b8573a', { outline: 0.03 });
    step.position.set(0, 0.1, 0.5);
    this.group.add(step);

    this.plugAnchor.position.set(0.4, 1.1, 0.2);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.inside.material = glow('#ffd77a');
    tween(0.6, (k) => (this.hinge.rotation.y = -k * 1.9), { easing: ease.outBack });
  }

  restore(): void {
    this.active_ = true;
    this.inside.material = glow('#ffd77a');
    this.hinge.rotation.y = -1.9;
  }
}

/* ---------- Fuente de agua ---------- */

/** Pila de piedra seca; al conectarse sube el agua y sale un chorro con gotas. */
export class Fountain extends Connectable {
  private readonly water: THREE.Mesh;
  private readonly jet: THREE.Group;
  private readonly drops: THREE.Mesh[] = [];

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 2.5;

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.65, 28, 1, true), toon('#cfc2ad', 2));
    ring.position.y = 0.32;
    ring.castShadow = ring.receiveShadow = true;
    outline(ring, 0.03);
    this.group.add(ring);
    const rim = rounded(new THREE.TorusGeometry(2.42, 0.13, 8, 32), toon('#e6dbc6', 2), 0.02);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.65;
    this.group.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.35, 28), toon('#6b6a72', 2));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.08;
    floor.receiveShadow = true;
    this.group.add(floor);

    const column = rounded(new THREE.CylinderGeometry(0.28, 0.4, 1.3, 12), toon('#e6dbc6', 2), 0.02);
    column.position.y = 0.65;
    this.group.add(column);
    const bowl = rounded(new THREE.CylinderGeometry(0.85, 0.35, 0.3, 16), toon('#e6dbc6', 2), 0.02);
    bowl.position.y = 1.4;
    this.group.add(bowl);

    this.water = new THREE.Mesh(
      new THREE.CircleGeometry(2.33, 28),
      new THREE.MeshToonMaterial({ color: '#4fa8e0', gradientMap, transparent: true, opacity: 0.9 }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0.09;
    this.water.visible = false;
    this.group.add(this.water);

    this.jet = new THREE.Group();
    this.jet.position.y = 1.5;
    const jetMat = new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.85 });
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1.4, 10), jetMat);
    stream.position.y = 0.7;
    this.jet.add(stream);
    for (let i = 0; i < 14; i += 1) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), jetMat);
      d.userData.angle = (i / 14) * Math.PI * 2;
      d.userData.offset = i / 14;
      this.drops.push(d);
      this.jet.add(d);
    }
    this.jet.scale.setScalar(0.001);
    this.jet.visible = false;
    this.group.add(this.jet);

    this.plugAnchor.position.set(0, 0.7, 2.45);
  }

  /** Orienta el punto de enchufe hacia la fuente de energía. */
  facePlug(towardX: number, towardZ: number): void {
    const a = Math.atan2(towardX - this.x, towardZ - this.z);
    this.plugAnchor.position.set(Math.sin(a) * 2.45, 0.7, Math.cos(a) * 2.45);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.water.visible = true;
    this.jet.visible = true;
    tween(0.8, (k) => {
      this.water.position.y = 0.09 + k * 0.45;
      this.jet.scale.setScalar(Math.max(k, 0.001));
    });
  }

  restore(): void {
    this.active_ = true;
    this.water.visible = true;
    this.water.position.y = 0.54;
    this.jet.visible = true;
    this.jet.scale.setScalar(1);
  }

  update(_dt: number, time: number): void {
    if (!this.active_) return;
    for (const d of this.drops) {
      const t = (time * 0.9 + d.userData.offset) % 1;
      const a = d.userData.angle as number;
      const r = t * 1.6;
      d.position.set(Math.cos(a) * r, 1.4 + t * 1.2 - t * t * 3.1, Math.sin(a) * r);
    }
  }
}

/* ---------- Antena ---------- */

/** Barra fina entre dos puntos (refuerzos, soportes). */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 5), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

const REQUIRED_BEACON_CONNECTIONS = 2;
const BEACON_ON = glow('#ff4a3a');
const BEACON_OFF = toon('#7a2a2a');

/** Torre de antena con plato. Necesita dos conexiones distintas para transmitir. */
export class Beacon extends Connectable {
  private connections = 0;
  private readonly dish: THREE.Mesh;
  private readonly indicators: THREE.Mesh[] = [];
  private readonly waves: THREE.Mesh[] = [];
  private readonly beaconLight: THREE.Mesh;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 1.0;

    // Base de hormigón con pernos
    const pad = box(1.9, 0.2, 1.9, '#b9b2a6', { outline: 0.02, brush: 2 });
    pad.position.y = 0.1;
    this.group.add(pad);
    for (const [px, pz] of [[-0.75, -0.75], [0.75, -0.75], [0.75, 0.75], [-0.75, 0.75]]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6), toon('#c9ccd4'));
      bolt.position.set(px, 0.23, pz);
      this.group.add(bolt);
    }

    const legMat = toon('#5a5f6b');
    for (const [lx, lz] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
      const leg = box(0.12, 4.4, 0.12, '#5a5f6b', { mat: legMat, outline: 0.015 });
      leg.position.set(lx * 0.6, 2.2, lz * 0.6);
      leg.rotation.z = -lx * 0.12;
      leg.rotation.x = lz * 0.12;
      this.group.add(leg);
    }
    for (const y of [1.2, 2.4, 3.5]) {
      const w = 1.25 - y * 0.18;
      const ring = box(w, 0.08, w, '#5a5f6b', { mat: legMat, outline: 0.012 });
      ring.position.y = y;
      this.group.add(ring);
    }
    // Cruces de refuerzo en las cuatro caras de cada tramo (torre reticulada)
    const half = (y: number) => 0.625 - 0.09 * y;
    const levels = [0.2, 1.2, 2.4, 3.5];
    for (let i = 0; i < levels.length - 1; i += 1) {
      const y1 = levels[i];
      const y2 = levels[i + 1];
      const h1 = half(y1);
      const h2 = half(y2);
      for (const [ax, az] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const p = (u: number, y: number, hh: number) =>
          new THREE.Vector3(ax * hh + az * u * hh, y, az * hh - ax * u * hh);
        this.group.add(strut(p(-1, y1, h1), p(1, y2, h2), 0.022, legMat));
        this.group.add(strut(p(1, y1, h1), p(-1, y2, h2), 0.022, legMat));
      }
    }
    // Escalera por la cara este (la que mira a la cámara)
    const ladderMat = toon('#c9ccd4');
    for (const lz of [-0.18, 0.18]) {
      this.group.add(strut(new THREE.Vector3(0.72, 0.2, lz), new THREE.Vector3(0.42, 3.5, lz), 0.02, ladderMat));
    }
    for (let i = 0; i < 11; i += 1) {
      const t = (i + 0.5) / 11;
      const lx = 0.72 - t * 0.3;
      const ly = 0.2 + t * 3.3;
      this.group.add(strut(new THREE.Vector3(lx, ly, -0.18), new THREE.Vector3(lx, ly, 0.18), 0.014, ladderMat));
    }
    // Cartel de "peligro" amarillo en una pata
    const warn = new THREE.Mesh(new THREE.CircleGeometry(0.16, 3), toon('#ffd23a'));
    warn.position.set(0.2, 1.75, 0.6);
    warn.rotation.z = Math.PI / 2;
    this.group.add(warn);
    const warnMark = box(0.03, 0.1, 0.01, '#1d1630', { outline: false });
    warnMark.position.set(0.2, 1.75, 0.605);
    this.group.add(warnMark);
    // Luz roja de aviso en la punta (parpadea cuando transmite)
    const mast = rounded(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), legMat, 0.008);
    mast.position.set(0, 3.9, -0.25);
    this.group.add(mast);
    this.beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toonUnique('#5a2a2a'));
    this.beaconLight.position.set(0, 4.28, -0.25);
    this.group.add(this.beaconLight);

    const panel = box(0.9, 0.7, 0.14, '#3a3d48', { outline: 0.02 });
    panel.position.set(0, 0.8, 0.62);
    this.group.add(panel);
    for (const ix of [-0.2, 0.2]) {
      const ind = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toonUnique('#2a2d36'));
      ind.position.set(ix, 0.85, 0.71);
      this.group.add(ind);
      this.indicators.push(ind);
      // Anillo alrededor de cada luz: "1" y "2" conexiones
      const bezel = rounded(new THREE.TorusGeometry(0.1, 0.018, 5, 14), toon('#c9ccd4'), 0);
      bezel.position.set(ix, 0.85, 0.7);
      this.group.add(bezel);
    }
    // Tablero: rejilla, perilla y patas
    for (let i = 0; i < 3; i += 1) {
      const slot = box(0.5, 0.025, 0.01, '#23262f', { outline: false });
      slot.position.set(0, 0.6 - i * 0.05, 0.695);
      this.group.add(slot);
    }
    const dial = rounded(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), toon('#e0563f'), 0.006);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.34, 1.05, 0.7);
    this.group.add(dial);
    const conduit = box(0.06, 2.4, 0.06, '#3a3d48', { outline: 0.008 });
    conduit.position.set(-0.36, 2.35, 0.56);
    conduit.rotation.x = 0.06;
    this.group.add(conduit);

    this.dish = rounded(new THREE.SphereGeometry(0.9, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), toonUnique('#8b8f9a', 2), 0.02);
    this.dish.material = toonUnique('#8b8f9a', 2);
    (this.dish.material as THREE.Material).side = THREE.DoubleSide;
    this.dish.position.set(0, 4.55, 0.1);
    this.dish.rotation.x = Math.PI / 2 + 0.5;
    this.group.add(this.dish);
    // Receptor en el foco del plato, sostenido por tres brazos (giran con el plato)
    const feedMat = toon('#3a3d48');
    const tipPos = new THREE.Vector3(0, -0.05, 0);
    const tip = rounded(new THREE.SphereGeometry(0.1, 8, 6), feedMat, 0.01);
    tip.position.copy(tipPos);
    this.dish.add(tip);
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      this.dish.add(strut(new THREE.Vector3(Math.cos(a) * 0.8, 0.34, Math.sin(a) * 0.8), tipPos, 0.018, feedMat));
    }
    const dishRim = rounded(new THREE.TorusGeometry(0.84, 0.03, 5, 28), toon('#5a5f6b'), 0);
    dishRim.rotation.x = Math.PI / 2;
    dishRim.position.y = 0.33;
    this.dish.add(dishRim);
    const mount = box(0.18, 0.5, 0.18, '#3a3d48', { outline: 0.01 });
    mount.position.set(0, 4.15, -0.05);
    this.group.add(mount);

    for (let i = 0; i < 3; i += 1) {
      const w = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.04, 6, 24),
        new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0, depthWrite: false, fog: false }),
      );
      w.position.set(0, 5.0, 0.2);
      w.rotation.x = Math.PI / 2;
      this.waves.push(w);
      this.group.add(w);
    }

    this.plugAnchor.position.set(0, 0.8, 0.75);
  }

  get isFullyActive(): boolean {
    return this.connections >= REQUIRED_BEACON_CONNECTIONS;
  }

  get connectionCount(): number {
    return this.connections;
  }

  activate(): void {
    if (this.isFullyActive) return;
    const ind = this.indicators[this.connections];
    ind.material = glow('#7cf07a');
    tween(0.3, (k) => ind.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.6));
    this.connections += 1;
    if (this.connections === 1) {
      (this.dish.material as THREE.MeshToonMaterial).color.set('#f4b631');
      return;
    }
    this.active_ = true;
    (this.dish.material as THREE.MeshToonMaterial).color.set('#5ee7ff');
  }

  restore(): void {
    this.connections = REQUIRED_BEACON_CONNECTIONS;
    this.active_ = true;
    this.indicators.forEach((i) => (i.material = glow('#7cf07a')));
    (this.dish.material as THREE.MeshToonMaterial).color.set('#5ee7ff');
  }

  update(_dt: number, time: number): void {
    if (!this.active_) return;
    // La luz roja de aviso parpadea mientras transmite
    this.beaconLight.material = Math.sin(time * 4) > 0.2 ? BEACON_ON : BEACON_OFF;
    this.dish.rotation.z = Math.sin(time * 0.8) * 0.25;
    this.waves.forEach((w, i) => {
      const t = (time * 0.6 + i / 3) % 1;
      w.position.y = 5.0 + t * 2.2;
      w.scale.setScalar(0.6 + t * 2.4);
      (w.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
    });
  }
}

/* ---------- Puente ---------- */

/** Palanca en la cabecera del puente: al conectarse, el tablero de madera se despliega sobre el canal. */
export class BridgeLever extends Connectable {
  readonly deck = new THREE.Group();
  private readonly lever = new THREE.Group();
  private readonly lamp: THREE.Mesh;
  private readonly planks: THREE.Mesh[] = [];
  private gear!: THREE.Group;

  /** deckFromZ/deckToZ: dónde empieza y termina el tablero (en el eje Z del mundo), centrado en deckX. */
  constructor(id: string, x: number, z: number, deckX: number, deckFromZ: number, deckToZ: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.45;

    const post = box(0.6, 1.0, 0.5, '#5a5f6b', { outline: 0.02 });
    post.position.y = 0.5;
    this.group.add(post);
    this.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toonUnique('#c8452f'));
    this.lamp.position.set(0, 1.08, 0.12);
    this.group.add(this.lamp);
    this.lever.position.set(0, 1.0, -0.05);
    const stick = box(0.07, 0.6, 0.07, '#cfd3da', { outline: 0.012 });
    stick.position.y = 0.3;
    this.lever.add(stick);
    const knob = rounded(new THREE.SphereGeometry(0.09, 10, 8), toon('#e0563f'), 0.012);
    knob.position.y = 0.62;
    this.lever.add(knob);
    this.lever.rotation.x = 0.6;
    this.group.add(this.lever);
    this.plugAnchor.position.set(0, 0.7, 0.3);

    // Detalle de la palanca: base con pernos, franjas de peligro, rueda dentada, ranura y cartel
    const plate = box(0.9, 0.08, 0.8, '#3a3d48', { outline: 0.012 });
    plate.position.y = 0.04;
    this.group.add(plate);
    for (const [bx, bz] of [[-0.36, -0.32], [0.36, -0.32], [0.36, 0.32], [-0.36, 0.32]]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), toon('#c9ccd4'));
      bolt.position.set(bx, 0.1, bz);
      this.group.add(bolt);
    }
    for (let i = 0; i < 4; i += 1) {
      const stripe = box(0.13, 0.5, 0.02, i % 2 ? '#1d1630' : '#ffd23a', { outline: false });
      stripe.position.set(-0.22 + i * 0.15, 0.32, 0.26);
      stripe.rotation.z = 0.5;
      this.group.add(stripe);
    }
    const slot = box(0.12, 0.04, 0.4, '#1d1630', { outline: false });
    slot.position.set(0, 1.005, 0);
    this.group.add(slot);
    const gear = new THREE.Group();
    gear.add(rounded(new THREE.TorusGeometry(0.17, 0.035, 6, 16), toon('#8a8f9a'), 0.008));
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const tooth = box(0.05, 0.06, 0.06, '#8a8f9a', { outline: false });
      tooth.position.set(Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0);
      tooth.rotation.z = a;
      gear.add(tooth);
    }
    for (let i = 0; i < 3; i += 1) {
      const spoke = box(0.3, 0.03, 0.03, '#8a8f9a', { outline: false });
      spoke.rotation.z = (i / 3) * Math.PI;
      gear.add(spoke);
    }
    gear.rotation.y = Math.PI / 2;
    gear.position.set(0.32, 0.62, 0);
    this.group.add(gear);
    this.gear = gear;

    // Tablero: tablones que aparecen uno tras otro
    const len = deckToZ - deckFromZ;
    const n = Math.round(len / 0.55);
    this.deck.position.set(deckX, 0, deckFromZ);
    const woods = ['#a97a52', '#9b6c45', '#b0855c'];
    for (let i = 0; i < n; i += 1) {
      // Tablones apenas desparejos: se ven hechos a mano
      const plank = box(3.0 - (i % 3) * 0.08, 0.16, 0.5, woods[i % 3], { outline: 0.02, brush: 1 });
      plank.rotation.y = ((i * 37) % 7 - 3) * 0.008;
      plank.position.set(((i * 13) % 5 - 2) * 0.02, -0.08, (i + 0.5) * (len / n));
      // Clavos en las puntas
      for (const nx of [-1.3, 1.3]) {
        const nail = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), toon('#5a5f6b'));
        nail.position.set(nx, 0.08, 0);
        plank.add(nail);
      }
      plank.scale.setScalar(0.001);
      plank.visible = false;
      this.deck.add(plank);
      this.planks.push(plank);
    }
    for (const sx of [-1.55, 1.55]) {
      // Viga lateral que sostiene los tablones
      const stringer = box(0.22, 0.3, len, '#6b4a33', { outline: 0.015 });
      stringer.position.set(sx, -0.2, len / 2);
      stringer.visible = false;
      stringer.userData.rail = true;
      this.deck.add(stringer);
      const midRail = box(0.07, 0.07, len, '#7a5a42', { outline: 0.01 });
      midRail.position.set(sx, 0.42, len / 2);
      midRail.visible = false;
      midRail.userData.rail = true;
      this.deck.add(midRail);
      const rail = box(0.1, 0.1, len, '#7a5a42', { outline: 0.015 });
      rail.position.set(sx, 0.75, len / 2);
      rail.visible = false;
      rail.userData.rail = true;
      this.deck.add(rail);
      for (let p = 0; p <= 4; p += 1) {
        const post2 = box(0.1, 0.8, 0.1, '#7a5a42', { outline: 0.012 });
        post2.position.set(sx, 0.35, (p / 4) * len);
        post2.visible = false;
        post2.userData.rail = true;
        this.deck.add(post2);
        const capP = rounded(new THREE.SphereGeometry(0.08, 8, 6), toon('#5a4030'), 0.008);
        capP.position.set(sx, 0.82, (p / 4) * len);
        capP.visible = false;
        capP.userData.rail = true;
        this.deck.add(capP);
      }
    }
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.lamp.material = glow('#7cf07a');
    tween(0.4, (k) => (this.lever.rotation.x = 0.6 - k * 1.2), { easing: ease.outBack });
    tween(1.2, (k) => (this.gear.rotation.x = k * Math.PI * 3));
    this.planks.forEach((p, i) => {
      tween(
        0.25,
        (k) => {
          p.visible = true;
          p.scale.setScalar(Math.max(k, 0.001));
        },
        { delay: 0.2 + i * 0.05, easing: ease.outBack },
      );
    });
    tween(0.01, () => this.deck.children.forEach((c) => c.userData.rail && (c.visible = true)), { delay: 0.2 + this.planks.length * 0.05 });
  }

  restore(): void {
    this.active_ = true;
    this.lamp.material = glow('#7cf07a');
    this.lever.rotation.x = -0.6;
    this.deck.children.forEach((c) => {
      c.visible = true;
      c.scale.setScalar(1);
    });
  }
}

/* ---------- Fragmento ---------- */

/** Coleccionable (estrella rosada que gira y flota). Empieza oculto; se recoge por cercanía. */
export class Fragment {
  readonly id: string;
  readonly group = new THREE.Group();
  private readonly shard: THREE.Group;
  private readonly halo: THREE.Mesh;
  private revealed = false;
  private collected = false;
  private readonly baseY: number;

  constructor(id: string, x: number, y: number, z: number) {
    this.id = id;
    this.baseY = y;
    this.group.position.set(x, y, z);
    this.shard = crystalStar(id === 'secret-fragment' ? '#ffd84a' : '#ff9ff3');
    this.group.add(this.shard);
    this.halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ff9ff3', transparent: true, opacity: 0.25, depthWrite: false, fog: false }),
    );
    this.group.add(this.halo);
    this.group.visible = false;
    this.group.scale.setScalar(0.001);
  }

  get isRevealed(): boolean {
    return this.revealed;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  reveal(animate = true): void {
    if (this.revealed) return;
    this.revealed = true;
    this.group.visible = true;
    if (!animate) {
      this.group.scale.setScalar(1);
      return;
    }
    tween(0.4, (k) => this.group.scale.setScalar(Math.max(k, 0.001)), { easing: ease.outBack });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    tween(0.3, (k) => this.group.scale.setScalar(Math.max(1 - k, 0.001)), { done: () => (this.group.visible = false) });
  }

  update(time: number): void {
    if (!this.revealed || this.collected) return;
    this.shard.rotation.y = time * 1.6;
    this.group.position.y = this.baseY + Math.sin(time * 2.2) * 0.15;
    const k = (Math.sin(time * 4) + 1) / 2;
    this.halo.scale.setScalar(0.9 + k * 0.25);
    (this.halo.material as THREE.MeshBasicMaterial).opacity = 0.15 + k * 0.25;
  }
}

/* ---------- Jardín: aspersor ---------- */

/**
 * Aspersor del jardín municipal. Recibe energía y, ya encendido, puede iniciar el cable de agua
 * hacia las flores (como la farola con la puerta). Al activarse gira y reparte agua en círculo.
 */
export class Sprinkler extends Connectable {
  private readonly head = new THREE.Group();
  private readonly nozzleGlow: THREE.Mesh;
  private readonly drops: THREE.Mesh[] = [];
  private readonly ring: THREE.Mesh;
  private spin = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.5;

    const plate = rounded(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 16), toon('#4166c6'), 0.015);
    plate.position.y = 0.06;
    this.group.add(plate);
    const valve = box(0.3, 0.22, 0.3, '#2f4a96', { outline: 0.012 });
    valve.position.y = 0.23;
    this.group.add(valve);
    const wheel = rounded(new THREE.TorusGeometry(0.11, 0.025, 6, 14), toon('#c8452f'), 0.008);
    wheel.position.set(0, 0.3, 0.17);
    this.group.add(wheel);
    const pipe = rounded(new THREE.CylinderGeometry(0.05, 0.06, 0.75, 10), toon('#67b7fa'), 0.012);
    pipe.position.y = 0.7;
    this.group.add(pipe);

    this.head.position.y = 1.1;
    const hub = rounded(new THREE.SphereGeometry(0.13, 14, 10), toon('#91a6bf'), 0.012);
    this.head.add(hub);
    for (let i = 0; i < 3; i += 1) {
      const arm = new THREE.Group();
      arm.rotation.y = (i / 3) * Math.PI * 2;
      const tube = box(0.36, 0.05, 0.05, '#67b7fa', { outline: 0.008 });
      tube.position.x = 0.2;
      arm.add(tube);
      const tip = rounded(new THREE.SphereGeometry(0.045, 8, 6), toon('#2f4a96'), 0.006);
      tip.position.x = 0.38;
      arm.add(tip);
      this.head.add(arm);
    }
    this.nozzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toonUnique('#5a6577'));
    this.nozzleGlow.position.y = 0.12;
    this.head.add(this.nozzleGlow);
    this.group.add(this.head);

    // Agua: gotas que salen en abanico y caen alrededor
    const dropMat = new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.9 });
    const dropGeo = new THREE.SphereGeometry(0.05, 6, 4);
    for (let i = 0; i < 36; i += 1) {
      const d = new THREE.Mesh(dropGeo, dropMat);
      d.userData.arm = i % 3;
      d.userData.offset = (i / 36) * 3;
      d.visible = false;
      this.group.add(d);
      this.drops.push(d);
    }
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.6, 40),
      new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.group.add(this.ring);

    this.plugAnchor.position.set(0, 1.05, 0);
  }

  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.nozzleGlow.material = glow('#5ee7ff');
    this.drops.forEach((d) => (d.visible = true));
    tween(1.2, (k) => {
      this.spin = k;
    });
  }

  restore(): void {
    this.active_ = true;
    this.nozzleGlow.material = glow('#5ee7ff');
    this.drops.forEach((d) => (d.visible = true));
    this.spin = 1;
  }

  update(dt: number, time: number): void {
    if (!this.active_) return;
    this.head.rotation.y += dt * 2.4 * this.spin;
    for (const d of this.drops) {
      // Cada gota recorre un arco parabólico desde la punta de un brazo
      const t = (time * 0.9 + d.userData.offset) % 1;
      const a = this.head.rotation.y + (d.userData.arm / 3) * Math.PI * 2 - t * 0.6;
      const r = 0.38 + t * 2.2;
      d.position.set(Math.cos(a) * r, 1.1 + t * 0.9 - t * t * 1.9, -Math.sin(a) * r);
      d.scale.setScalar(this.spin * (1 - t * 0.4));
    }
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (0.18 + Math.sin(time * 3) * 0.06) * this.spin;
  }
}

/* ---------- Jardín: parterre de flores ---------- */

const PETALS = ['#ff7aa8', '#ffd23a', '#b48cff', '#ff8a5b', '#ffffff', '#e8327f'];

/**
 * Parterre del jardín: tierra agrietada y flores marchitas, caídas y grises. Al recibir el agua del
 * aspersor la tierra se oscurece (mojada), los tallos se enderezan y las flores abren una a una.
 */
export class FlowerBed extends Connectable {
  private readonly soil: THREE.MeshToonMaterial;
  private readonly flowers: { stem: THREE.Group; bloom: THREE.Group; bud: THREE.Mesh; tilt: number; dir: number }[] = [];
  private readonly cracks: THREE.Mesh[] = [];
  private readonly halfW: number;
  private readonly halfD: number;

  constructor(id: string, x: number, z: number, width = 7, depth = 3) {
    super(id, 'target', x, z);
    this.halfW = width / 2;
    this.halfD = depth / 2;
    this.collideRadius = 0; // el bloqueo es un rectángulo que agrega WorldMode

    // Borde de madera
    const wood = '#8a5a3a';
    for (const [w, d, px, pz] of [
      [width + 0.3, 0.2, 0, depth / 2],
      [width + 0.3, 0.2, 0, -depth / 2],
      [0.2, depth, width / 2, 0],
      [0.2, depth, -width / 2, 0],
    ] as const) {
      const plank = box(w, 0.35, d, wood, { outline: 0.015, brush: 1 });
      plank.position.set(px, 0.17, pz);
      this.group.add(plank);
    }
    this.soil = toonUnique('#9a8064', 4);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, depth), this.soil);
    soil.position.y = 0.15;
    soil.receiveShadow = true;
    this.group.add(soil);
    // Grietas de tierra seca
    const crackMat = new THREE.MeshBasicMaterial({ color: '#5e4a38' });
    for (let i = 0; i < 9; i += 1) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.6 + Math.random() * 0.6, 0.04), crackMat);
      c.rotation.x = -Math.PI / 2;
      c.rotation.z = Math.random() * Math.PI;
      c.position.set((Math.random() - 0.5) * (width - 0.8), 0.305, (Math.random() - 0.5) * (depth - 0.6));
      this.group.add(c);
      this.cracks.push(c);
    }

    // Flores marchitas
    const cols = 8;
    const rows = 3;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const stem = new THREE.Group();
        stem.position.set(-width / 2 + 0.55 + c * ((width - 1.1) / (cols - 1)) + (r % 2) * 0.2, 0.3, -depth / 2 + 0.6 + r * ((depth - 1.2) / (rows - 1)));
        const h = 0.45 + Math.random() * 0.25;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, h, 5), toonUnique('#7b8170'));
        stalk.position.y = h / 2;
        stem.add(stalk);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), toonUnique('#7b8170'));
        leaf.scale.set(1.4, 0.3, 0.6);
        leaf.position.set(0.06, h * 0.35, 0);
        stem.add(leaf);
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toonUnique('#8a8070'));
        bud.position.y = h;
        stem.add(bud);
        // Flor abierta (escondida hasta que llega el agua)
        const bloom = new THREE.Group();
        bloom.position.y = h;
        const color = PETALS[(r * cols + c) % PETALS.length];
        for (let p = 0; p < 5; p += 1) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(color));
          const a = (p / 5) * Math.PI * 2;
          petal.scale.set(1, 0.35, 0.65);
          petal.position.set(Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11);
          petal.rotation.y = -a;
          bloom.add(petal);
        }
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon('#ffb52e'));
        bloom.add(center);
        bloom.scale.setScalar(0.001);
        bloom.visible = false;
        stem.add(bloom);
        const tilt = 0.7 + Math.random() * 0.5;
        const dir = Math.random() * Math.PI * 2;
        stem.rotation.set(Math.cos(dir) * tilt, 0, Math.sin(dir) * tilt);
        this.group.add(stem);
        this.flowers.push({ stem, bloom, bud, tilt, dir });
      }
    }
    this.plugAnchor.position.set(width / 2 + 0.1, 0.5, 0);
  }

  /** El parterre es largo: la distancia se mide hasta su borde, no hasta el centro. */
  distanceFrom(x: number, z: number): number {
    const dx = Math.max(Math.abs(x - this.x) - this.halfW, 0);
    const dz = Math.max(Math.abs(z - this.z) - this.halfD, 0);
    return Math.hypot(dx, dz);
  }

  /** Orienta el enchufe hacia quien le lleva el agua. */
  facePlug(towardX: number, towardZ: number): void {
    const dx = towardX - this.x;
    const dz = towardZ - this.z;
    this.plugAnchor.position.set(Math.sign(dx) * 3.6, 0.5, Math.abs(dz) > 1.6 ? Math.sign(dz) * 1.6 : 0);
  }

  private bloomAll(animate: boolean): void {
    this.soil.color.set('#5a3e2a');
    this.cracks.forEach((c) => (c.visible = false));
    this.flowers.forEach((f, i) => {
      const greens = ['#4f8f3a', '#5fa34a'];
      (f.stem.children[0] as THREE.Mesh).material = toon(greens[i % 2]);
      (f.stem.children[1] as THREE.Mesh).material = toon(greens[(i + 1) % 2]);
      if (!animate) {
        f.stem.rotation.set(0, 0, 0);
        f.bud.visible = false;
        f.bloom.visible = true;
        f.bloom.scale.setScalar(1);
        return;
      }
      const delay = 0.2 + i * 0.05;
      tween(0.6, (k) => f.stem.rotation.set(Math.cos(f.dir) * f.tilt * (1 - k), 0, Math.sin(f.dir) * f.tilt * (1 - k)), { delay, easing: ease.outBack });
      tween(
        0.45,
        (k) => {
          f.bud.visible = false;
          f.bloom.visible = true;
          f.bloom.scale.setScalar(Math.max(k, 0.001));
        },
        { delay: delay + 0.35, easing: ease.outBack },
      );
    });
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.bloomAll(true);
  }

  restore(): void {
    this.active_ = true;
    this.bloomAll(false);
  }

  update(_dt: number, time: number): void {
    if (!this.active_) return;
    this.flowers.forEach((f, i) => {
      f.bloom.rotation.y = Math.sin(time * 1.3 + i) * 0.25;
      f.stem.rotation.z = Math.sin(time * 1.1 + i * 0.7) * 0.05;
    });
  }
}

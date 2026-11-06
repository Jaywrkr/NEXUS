import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * Juegos del Parque de diversiones (Fase 6, PLAN_MAESTRO.md). Cada juego es un "lugar grande":
 * se revive con cable desde una fuente (carrera de luz con tema de feria) y, ya vivo, el Nexus se
 * puede SUBIR (botón contextual). La vuelta al mundo y la montaña rusa además tienen el motor
 * trabado: se destraban cerrando su circuito en el Mundo Voltio.
 * Cada juego expone `seat(i)`: un Object3D que se mueve con el juego y donde se sienta el Nexus.
 */

const FAIR = ['#ff5a6e', '#ffe066', '#5ec8ff', '#7be07a', '#ff9ff3', '#ff9f43'];

/** Algo de lo que el Nexus se puede subir. */
export interface Ride {
  readonly id: string;
  readonly isActive: boolean;
  /** Dónde se sube (al costado del juego, en el piso). */
  readonly boardAt: { x: number; z: number };
  /** El asiento donde va el Nexus mientras anda. */
  seat(): THREE.Object3D;
  /** Se subió el Nexus: empieza la vuelta (la montaña rusa devuelve false cuando termina). */
  startRide(): void;
  /** Avanza la vuelta; devuelve false cuando el juego terminó solo (montaña rusa). */
  updateRide(dt: number): boolean;
}

/** Calesita: plataforma que gira con caballitos que suben y bajan, techo de lona a rayas. */
export class Carousel extends Connectable implements Ride {
  readonly boardAt: { x: number; z: number };
  private readonly spin = new THREE.Group();
  private readonly horses: THREE.Group[] = [];
  private readonly seats: THREE.Object3D[] = [];
  private readonly bulbs: THREE.MeshBasicMaterial[] = [];
  private readonly canopy: THREE.MeshToonMaterial[] = [];
  private angle = 0;
  private t = 0;
  private riding = false;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0;
    this.label = 'Calesita';
    this.boardAt = { x: x + 3.6, z: z + 3.6 };
    const base = rounded(new THREE.CylinderGeometry(4.6, 4.8, 0.4, 32), toon('#7a4a2e', 3), 0.02);
    base.position.y = 0.2;
    this.group.add(base);
    const deck = rounded(new THREE.CylinderGeometry(4.3, 4.3, 0.12, 32), toon('#f3d9b1', 2), 0.012);
    deck.position.y = 0.46;
    this.spin.add(deck);
    const pole = rounded(new THREE.CylinderGeometry(0.4, 0.5, 4.2, 14), toon('#ffe066'), 0.014);
    pole.position.y = 2.5;
    this.spin.add(pole);
    // Techo: gajos de lona de colores alternados
    for (let i = 0; i < 12; i += 1) {
      const m = toonUnique(i % 2 ? '#fff3dc' : '#8e8a99');
      m.userData.on = i % 2 ? '#fff3dc' : FAIR[(i / 2) % FAIR.length | 0];
      this.canopy.push(m);
      const seg = new THREE.Mesh(new THREE.ConeGeometry(4.9, 1.6, 12, 1, true, (i / 12) * Math.PI * 2, (Math.PI * 2) / 12), m);
      (seg.material as THREE.Material).side = THREE.DoubleSide;
      seg.position.y = 5.2;
      seg.castShadow = true;
      this.spin.add(seg);
    }
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 3), toon('#ff5a6e'));
    flag.position.y = 6.4;
    this.spin.add(flag);
    // Caballitos en dos anillos
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 2.4 : 3.4;
      const h = new THREE.Group();
      const rod = rounded(new THREE.CylinderGeometry(0.04, 0.04, 3.9, 6), toon('#ffe066'), 0.006);
      rod.position.y = 2.4;
      h.add(rod);
      const horse = new THREE.Group();
      const body = rounded(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10), toon(FAIR[i % FAIR.length]), 0.012);
      body.rotation.z = Math.PI / 2;
      horse.add(body);
      const head = rounded(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), toon(FAIR[i % FAIR.length]), 0.01);
      head.position.set(0.45, 0.25, 0);
      head.rotation.z = -0.6;
      horse.add(head);
      const saddle = box(0.3, 0.06, 0.34, '#3d3550', { outline: false });
      saddle.position.y = 0.22;
      horse.add(saddle);
      horse.position.y = 1.4;
      h.add(horse);
      h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      h.rotation.y = -a;
      const seat = new THREE.Object3D();
      seat.position.set(0, 0.15, 0);
      horse.add(seat);
      this.seats.push(seat);
      this.spin.add(h);
      this.horses.push(horse);
    }
    // Foquitos en el borde del techo
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const m = new THREE.MeshBasicMaterial({ color: '#5a5866' });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m);
      b.position.set(Math.cos(a) * 4.75, 4.42, Math.sin(a) * 4.75);
      this.spin.add(b);
      this.bulbs.push(m);
    }
    this.group.add(this.spin);
    this.plugAnchor.position.set(3.2, 1, 3.2);
  }

  distanceFrom(x: number, z: number): number {
    return Math.max(0, Math.hypot(x - this.x, z - this.z) - 4.8);
  }

  seat(): THREE.Object3D {
    // El caballito del anillo de afuera que está más cerca de la cámara (sureste)
    return this.seats[0];
  }

  startRide(): void {
    this.riding = true;
  }

  updateRide(): boolean {
    return true;
  }

  stopRide(): void {
    this.riding = false;
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.canopy) m.color.set(m.userData.on as string);
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.angle += dt * (this.riding ? 0.9 : 0.5);
    this.spin.rotation.y = this.angle;
    this.horses.forEach((h, i) => (h.position.y = 1.4 + Math.sin(this.t * 2.5 + i) * 0.3));
    this.bulbs.forEach((m, i) => m.color.set((i + Math.floor(this.t * 5)) % 2 ? '#ffe066' : '#ff9ff3'));
  }
}

/** Vuelta al mundo: rueda gigante que mira a +Z, con cabinas que se mantienen derechas. */
export class FerrisWheel extends Connectable implements Ride {
  readonly boardAt: { x: number; z: number };
  private readonly wheel = new THREE.Group();
  private readonly cabins: THREE.Group[] = [];
  private readonly cabinMats: THREE.MeshToonMaterial[] = [];
  private readonly R = 7.5;
  private readonly H = 9;
  private angle = 0;
  private rideCabin = 0;
  private riding = false;
  /** Motor trabado hasta cerrar su circuito en el Mundo Voltio. */
  unlocked = false;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0;
    this.label = 'Vuelta al mundo';
    this.boardAt = { x: x + 1.5, z: z + 3.2 };
    const steel = toon('#3d3550');
    // Dos patas en A a cada lado de la rueda
    for (const sz of [-1.2, 1.2]) {
      for (const sx of [-1, 1]) {
        const leg = rounded(new THREE.CylinderGeometry(0.16, 0.22, this.H + 0.6, 8), steel, 0.012);
        leg.position.set(sx * 2.4, (this.H + 0.6) / 2 - 0.1, sz);
        leg.rotation.z = -sx * 0.26;
        this.group.add(leg);
      }
    }
    const axle = rounded(new THREE.CylinderGeometry(0.35, 0.35, 3, 12), steel, 0.012);
    axle.rotation.x = Math.PI / 2;
    axle.position.y = this.H;
    this.group.add(axle);
    // Rueda: dos aros con rayos
    for (const sz of [-0.9, 0.9]) {
      const ring = rounded(new THREE.TorusGeometry(this.R, 0.12, 6, 48), toon('#ff5a6e'), 0.012);
      ring.position.z = sz;
      this.wheel.add(ring);
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const spoke = rounded(new THREE.CylinderGeometry(0.05, 0.05, this.R, 6), toon('#fff3dc'), 0.006);
        spoke.position.set(Math.cos(a) * this.R * 0.5, Math.sin(a) * this.R * 0.5, sz);
        spoke.rotation.z = a - Math.PI / 2;
        this.wheel.add(spoke);
      }
    }
    // Cabinas colgando de cada rayo (se compensan para quedar derechas)
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * this.R, Math.sin(a) * this.R, 0);
      const cabin = new THREE.Group();
      const mat = toonUnique('#8e8a99');
      mat.userData.on = FAIR[i % FAIR.length];
      this.cabinMats.push(mat);
      const tub = rounded(new THREE.CylinderGeometry(0.75, 0.6, 0.8, 12), mat, 0.012);
      tub.position.y = -1.1;
      cabin.add(tub);
      const roof = rounded(new THREE.ConeGeometry(0.8, 0.45, 12), toon('#fff3dc'), 0.01);
      roof.position.y = 0.0;
      cabin.add(roof);
      const hanger = rounded(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), steel, 0.005);
      hanger.position.y = -0.4;
      cabin.add(hanger);
      const seat = new THREE.Object3D();
      seat.position.set(0, -1.45, 0.05);
      cabin.add(seat);
      cabin.userData.seat = seat;
      pivot.add(cabin);
      this.wheel.add(pivot);
      this.cabins.push(cabin);
    }
    this.wheel.position.y = this.H;
    this.group.add(this.wheel);
    // Escalón de subida
    const step = box(2.6, 0.3, 1.6, '#7a4a2e', { outline: 0.02 });
    step.position.set(0, 0.15, 2.4);
    this.group.add(step);
    this.plugAnchor.position.set(2.4, 1.2, 1.4);
  }

  distanceFrom(x: number, z: number): number {
    const dx = Math.max(Math.abs(x - this.x) - 3, 0);
    const dz = Math.max(Math.abs(z - this.z) - 2, 0);
    return Math.hypot(dx, dz);
  }

  /** La cabina más baja (donde uno se sube). */
  private lowestCabin(): number {
    let best = 0;
    let by = Infinity;
    this.cabins.forEach((_c, i) => {
      const y = Math.sin((i / 8) * Math.PI * 2 + this.angle);
      if (y < by) {
        by = y;
        best = i;
      }
    });
    return best;
  }

  seat(): THREE.Object3D {
    return this.cabins[this.rideCabin].userData.seat as THREE.Object3D;
  }

  startRide(): void {
    this.rideCabin = this.lowestCabin();
    this.riding = true;
  }

  updateRide(): boolean {
    return true;
  }

  stopRide(): void {
    this.riding = false;
  }

  /** Altura del asiento del Nexus (para las pruebas: sube alto). */
  get seatHeight(): number {
    const v = new THREE.Vector3();
    this.seat().getWorldPosition(v);
    return v.y;
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.cabinMats) m.color.set(m.userData.on as string);
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.angle += dt * (this.riding ? 0.35 : 0.2);
    this.wheel.rotation.z = this.angle;
    for (const c of this.cabins) c.rotation.z = -this.angle;
  }
}

/** Montaña rusa: una vía cerrada con subidas y bajadas, un carrito y la estación. */
export class Coaster extends Connectable implements Ride {
  readonly boardAt: { x: number; z: number };
  readonly curve: THREE.CatmullRomCurve3;
  private readonly car = new THREE.Group();
  private readonly seatObj = new THREE.Object3D();
  private readonly railMat: THREE.MeshToonMaterial;
  private u = 0;
  private speed = 0;
  private riding = false;
  private lapDone = 0;
  unlocked = false;

  /** `points`: recorrido (x, altura, z) en coordenadas del mundo; el primero es la estación. */
  constructor(id: string, station: { x: number; z: number }, points: [number, number, number][]) {
    super(id, 'target', station.x, station.z);
    this.collideRadius = 0;
    this.label = 'Montaña rusa';
    this.boardAt = { x: station.x + 1.6, z: station.z + 1.4 };
    this.curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x - station.x, y, z - station.z)),
      true,
      'catmullrom',
      0.4,
    );
    this.railMat = toonUnique('#8e8a99');
    // Vía: dos rieles (tubos) y durmientes, con columnas hasta el piso
    const frames = this.curve.computeFrenetFrames(200, true);
    for (const off of [-0.45, 0.45]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 200; i += 1) {
        const p = this.curve.getPointAt(i / 200);
        const side = frames.binormals[i % 200].clone().setY(0).normalize();
        pts.push(p.clone().addScaledVector(side, off));
      }
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 300, 0.07, 6, true), this.railMat);
      rail.castShadow = true;
      this.group.add(rail);
    }
    const tieMat = toon('#7a4a2e');
    const colMat = toon('#3d3550');
    for (let i = 0; i < 70; i += 1) {
      const t = i / 70;
      const p = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t);
      const tie = box(1.2, 0.07, 0.18, '', { mat: tieMat, outline: false });
      tie.position.copy(p).add(new THREE.Vector3(0, -0.05, 0));
      tie.rotation.y = Math.atan2(tan.x, tan.z);
      this.group.add(tie);
      if (i % 3 === 0 && p.y > 0.6) {
        const col = rounded(new THREE.CylinderGeometry(0.08, 0.1, p.y, 6), colMat, 0.006);
        col.position.set(p.x, p.y / 2, p.z);
        this.group.add(col);
      }
    }
    // Carrito
    const body = box(1.2, 0.5, 1.6, '#ff5a6e', { outline: 0.02 });
    body.position.y = 0.35;
    this.car.add(body);
    const nose = box(1.2, 0.3, 0.4, '#ffe066', { outline: 0.012 });
    nose.position.set(0, 0.45, 0.9);
    this.car.add(nose);
    for (const sx of [-0.55, 0.55]) {
      for (const sz of [-0.5, 0.5]) {
        const w = rounded(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 10), toon('#3d3550'), 0.006);
        w.rotation.z = Math.PI / 2;
        w.position.set(sx, 0.1, sz);
        this.car.add(w);
      }
    }
    this.seatObj.position.set(0, 0.3, -0.1);
    this.car.add(this.seatObj);
    this.group.add(this.car);
    // Estación: plataforma con techito
    const plat = box(3, 0.5, 4, '#a8a097', { outline: 0.02 });
    plat.position.set(2.2, 0.25, 0);
    this.group.add(plat);
    const roof = box(3.4, 0.15, 4.4, '#ff9f43', { outline: 0.02 });
    roof.position.set(2.2, 2.8, 0);
    this.group.add(roof);
    for (const sz of [-1.8, 1.8]) {
      const post = box(0.15, 2.5, 0.15, '#3d3550', { outline: 0.008 });
      post.position.set(3.6, 1.5, sz);
      this.group.add(post);
    }
    this.placeCar();
    this.plugAnchor.position.set(1.5, 0.8, 1.2);
  }

  distanceFrom(x: number, z: number): number {
    return Math.max(0, Math.hypot(x - this.x - 1.2, z - this.z) - 2);
  }

  private placeCar(): void {
    const p = this.curve.getPointAt(this.u);
    const ahead = this.curve.getPointAt((this.u + 0.004) % 1);
    this.car.position.copy(p);
    // Mira hacia adelante en la vía (el grupo no está rotado: alcanza con sumar su posición)
    const g = this.group.position;
    this.car.lookAt(ahead.x + g.x, ahead.y + g.y, ahead.z + g.z);
  }

  /** Puntos de la vía en el mundo (para poner chispitas arriba). */
  worldPoint(t: number): THREE.Vector3 {
    return this.curve.getPointAt(t).add(this.group.position);
  }

  seat(): THREE.Object3D {
    return this.seatObj;
  }

  get rideProgress(): number {
    return this.lapDone;
  }

  startRide(): void {
    this.riding = true;
    this.u = 0;
    this.speed = 3;
    this.lapDone = 0;
  }

  /** Recorre una vuelta: rápido en las bajadas, lento en las subidas. Al volver a la estación, termina. */
  updateRide(dt: number): boolean {
    if (!this.riding) return false;
    const tan = this.curve.getTangentAt(this.u);
    this.speed = THREE.MathUtils.clamp(this.speed - tan.y * 14 * dt, 4, 16);
    const len = this.curve.getLength();
    this.u += (this.speed * dt) / len;
    this.lapDone = Math.min(1, this.lapDone + (this.speed * dt) / len);
    if (this.lapDone >= 1) {
      this.u = 0;
      this.riding = false;
      this.placeCar();
      return false;
    }
    this.u %= 1;
    this.placeCar();
    return true;
  }

  stopRide(): void {
    this.riding = false;
    this.u = 0;
    this.placeCar();
  }

  activate(): void {
    this.active_ = true;
    this.railMat.color.set('#ffe066');
  }

  update(): void {}
}

/** Bola de espejos de la casa de los espejos: gira y tira puntitos de luz cuando revive. */
export class MirrorBall extends Connectable {
  private readonly ball: THREE.Mesh;
  private readonly mat: THREE.MeshToonMaterial;
  private readonly dots: THREE.Mesh[] = [];
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.5;
    this.label = 'Bola de espejos';
    const stand = rounded(new THREE.CylinderGeometry(0.06, 0.3, 1.6, 10), toon('#3d3550'), 0.01);
    stand.position.y = 0.8;
    this.group.add(stand);
    this.mat = toonUnique('#8e8a99');
    this.ball = rounded(new THREE.IcosahedronGeometry(0.55, 1), this.mat, 0.012);
    this.ball.position.y = 2.1;
    this.group.add(this.ball);
    for (let i = 0; i < 14; i += 1) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ color: FAIR[i % FAIR.length], transparent: true, opacity: 0 }));
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.07;
      this.group.add(d);
      this.dots.push(d);
    }
    this.plugAnchor.position.set(0.5, 1.2, 0.4);
  }

  activate(): void {
    this.active_ = true;
    this.mat.color.set('#e8fbff');
    for (const d of this.dots) (d.material as THREE.MeshBasicMaterial).opacity = 0.85;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.ball.rotation.y += dt * 1.2;
    this.dots.forEach((d, i) => {
      const a = this.t * 0.8 + (i / this.dots.length) * Math.PI * 2;
      const r = 1.5 + (i % 3) * 1.1;
      d.position.x = Math.cos(a) * r;
      d.position.z = Math.sin(a) * r;
    });
  }
}

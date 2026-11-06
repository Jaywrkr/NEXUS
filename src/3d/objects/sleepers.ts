import * as THREE from 'three';
import type { AudioSystem } from '../../systems/AudioSystem';
import { box, glow, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * "Cosas dormidas" del barrio: objetos chicos que se despiertan con un cable desde un
 * chispero (poste de energía chiquito). Cada uno tiene una reacción corta y graciosa,
 * y una vez despierto se puede volver a tocar para repetirla. No son lugares ni niveles:
 * llenan el barrio que ya existe de cosas para hacer (Decisiones 008, 036 y 037).
 */

export type SleeperKind =
  | 'mailbox'
  | 'birdhouse'
  | 'trash'
  | 'hydrant'
  | 'radio'
  | 'neon'
  | 'icecream'
  | 'bike'
  | 'clothes'
  | 'duck'
  | 'balloons'
  | 'gnome'
  | 'pinwheel'
  | 'car'
  | 'drain'
  | 'firefly'
  | 'cow'
  | 'hen'
  | 'owl';

/** Nombre que flota encima y frase al despertarlo. */
export const SLEEPER_INFO: Record<SleeperKind, { label: string; wake: string }> = {
  mailbox: { label: 'Buzón', wake: '¡El buzón escupió cartas! Alguien tenía mucho para contar' },
  birdhouse: { label: 'Casita de pájaros', wake: '¡Pío! Un pajarito se asomó a cantar' },
  trash: { label: 'Tacho', wake: '¡BURP! El tacho se despertó con hambre' },
  hydrant: { label: 'Hidrante', wake: '¡Splash! El hidrante largó un chorro' },
  radio: { label: 'Radio', wake: '¡La radio volvió a sonar!' },
  neon: { label: 'Cartel', wake: '¡ABIERTO! La heladería prendió su cartel' },
  icecream: { label: 'Carrito de helados', wake: '¡Din din! El carrito de helados abrió la sombrilla' },
  bike: { label: 'Bici', wake: '¡Rin rin! La bici tocó el timbre' },
  clothes: { label: 'Tendedero', wake: '¡Fiuuu! La ropa se puso a bailar con el viento' },
  duck: { label: 'Pato de goma', wake: '¡Cuac! El pato de goma pegó un salto' },
  balloons: { label: 'Globos', wake: '¡Los globos se inflaron solos!' },
  gnome: { label: 'Enano de jardín', wake: '¡Jo, jo! El enano dio una vuelta' },
  pinwheel: { label: 'Molinete', wake: '¡El molinete giró a toda velocidad!' },
  car: { label: 'Auto', wake: '¡BIP BIP! El auto prendió las luces' },
  owl: { label: 'Búho', wake: '¡Uuuh, uuuh! El búho abrió los ojos: de noche es cuando está despierto' },
  cow: { label: 'Vaca', wake: '¡Muuu! La vaca se despertó con ganas de pastar' },
  hen: { label: 'Gallina', wake: '¡Cocoroco! La gallina puso un huevo de la emoción' },
  firefly: { label: 'Frasco de luciérnagas', wake: '¡Las luciérnagas se prendieron y salieron a bailar!' },
  drain: { label: 'Desagüe', wake: '¡Glu glu! El caño echó agua al canal' },
};

/* ---------- Ayudas ---------- */

function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

function canvasSprite(draw: (g: CanvasRenderingContext2D) => void, w: number, h: number): THREE.SpriteMaterial {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
}

let zzzMat: THREE.SpriteMaterial | null = null;
function zzzMaterial(): THREE.SpriteMaterial {
  zzzMat ??= canvasSprite((g) => {
    g.font = 'bold 44px "Arial Black", Impact, sans-serif';
    g.lineWidth = 7;
    g.strokeStyle = '#1d1630';
    g.fillStyle = '#e9f1ff';
    for (const [t, x, y, s] of [['z', 10, 78, 0.7], ['Z', 40, 52, 0.9], ['Z', 72, 30, 1.1]] as const) {
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      g.strokeText(t, 0, 0);
      g.fillText(t, 0, 0);
      g.restore();
    }
  }, 128, 96);
  return zzzMat;
}

let noteMat: THREE.SpriteMaterial | null = null;
function noteMaterial(): THREE.SpriteMaterial {
  noteMat ??= canvasSprite((g) => {
    g.font = 'bold 56px sans-serif';
    g.lineWidth = 6;
    g.strokeStyle = '#1d1630';
    g.fillStyle = '#ffd23a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeText('♪', 32, 34);
    g.fillText('♪', 32, 34);
  }, 64, 64);
  return noteMat;
}

/* ---------- Nido de chispitas ---------- */

/** Segundos que tarda un nido en volver a llenarse. */
export const NEST_REFILL = 40;

/**
 * Nido de chispitas (Decisión 041): un poste donde se juntan chispitas perdidas de la Gran Chispa.
 * Al tocarlo suelta unas cuantas, que saltan alrededor y hay que atrapar caminando; después
 * tarda un rato en volver a llenarse. No es una fuente para cables.
 */
export class Spark extends Connectable {
  /** Lo conecta WorldMode: soltar chispitas o avisar que el nido está vacío. */
  static onRelease: ((nest: Spark) => void) | null = null;
  static onEmpty: ((nest: Spark) => void) | null = null;

  private readonly bulb: THREE.Mesh;
  private readonly orbit: THREE.Group;
  private readonly onMat = glow('#ffe066');
  private readonly offMat = glow('#6a6450');
  private refill = 0;

  get ready(): boolean {
    return this.refill <= 0;
  }

  constructor(id: string, x: number, z: number) {
    super(id, 'source', x, z);
    this.collideRadius = 0.3;
    this.label = 'Nido de chispitas';
    this.active_ = true;
    const base = rounded(new THREE.CylinderGeometry(0.26, 0.32, 0.14, 10), toon('#3a3d48'), 0.012);
    base.position.y = 0.07;
    this.group.add(base);
    const post = box(0.14, 0.95, 0.14, '#5a5f6b', { outline: 0.012 });
    post.position.y = 0.6;
    this.group.add(post);
    for (const y of [0.35, 0.75]) {
      const band = box(0.16, 0.06, 0.16, '#ffd23a', { outline: false });
      band.position.y = y;
      this.group.add(band);
    }
    const cage = rounded(new THREE.TorusGeometry(0.17, 0.02, 5, 14), toon('#3a3d48'), 0);
    cage.rotation.x = Math.PI / 2;
    cage.position.y = 1.18;
    this.group.add(cage);
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), this.onMat);
    this.bulb.position.y = 1.2;
    this.group.add(this.bulb);
    this.orbit = new THREE.Group();
    this.orbit.position.y = 1.2;
    for (let i = 0; i < 3; i += 1) {
      const dot = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), glow('#5ee7ff'));
      const a = (i / 3) * Math.PI * 2;
      dot.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28);
      this.orbit.add(dot);
    }
    this.group.add(this.orbit);
    this.plugAnchor.position.set(0, 1.2, 0);
  }

  activate(): void {}

  /** No inicia cables: se toca para que suelte chispitas. */
  canInitiate(): boolean {
    return false;
  }

  poke(): boolean {
    if (this.ready) {
      this.refill = NEST_REFILL;
      Spark.onRelease?.(this);
    } else {
      Spark.onEmpty?.(this);
    }
    return true;
  }

  update(dt: number, time: number): void {
    if (this.refill > 0) this.refill -= dt;
    const ready = this.ready;
    // Vacío: la luz se apaga y crece de a poco mientras se vuelve a llenar
    this.bulb.material = ready ? this.onMat : this.offMat;
    const fill = ready ? 1 : 0.4 + 0.6 * (1 - this.refill / NEST_REFILL);
    this.bulb.scale.setScalar(fill * (1 + Math.sin(time * 5 + this.x) * (ready ? 0.12 : 0.03)));
    this.orbit.visible = ready;
    this.orbit.rotation.y = time * 2.2;
    this.orbit.position.y = 1.2 + Math.sin(time * 3) * 0.04;
  }
}

/* ---------- Cosa dormida ---------- */

export class Sleeper extends Connectable {
  /** Sonido compartido (lo pone WorldMode). */
  static audio: AudioSystem | null = null;

  readonly kind: SleeperKind;
  private readonly zzz: THREE.Sprite;
  private readonly zzzBase: number;
  /** Piezas que se animan, por nombre. */
  private readonly p: Record<string, THREE.Object3D> = {};
  private readonly bits: THREE.Object3D[] = [];
  private react = -1;
  private time = Math.random() * 10;

  constructor(id: string, kind: SleeperKind, x: number, z: number, rotY = 0) {
    super(id, 'target', x, z, rotY);
    this.kind = kind;
    this.onceOnly = true;
    this.label = SLEEPER_INFO[kind].label;
    const top = this.build();
    this.zzz = new THREE.Sprite(zzzMaterial());
    this.zzz.scale.set(0.6, 0.45, 1);
    this.zzzBase = top + 0.45;
    this.zzz.position.set(0.15, this.zzzBase, 0);
    this.group.add(this.zzz);
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  /** Arma la pieza según el tipo; devuelve la altura de arriba (para el "Zzz"). */
  private build(): number {
    const g = this.group;
    const add = (o: THREE.Object3D, name?: string) => {
      g.add(o);
      if (name) this.p[name] = o;
      return o;
    };
    switch (this.kind) {
      case 'mailbox': {
        this.collideRadius = 0.3;
        const post = box(0.1, 0.85, 0.1, '#5a4030', { outline: 0.01 });
        post.position.y = 0.42;
        add(post);
        const body = box(0.42, 0.36, 0.6, '#2f6fd1', { outline: 0.015 });
        body.position.y = 1.03;
        add(body);
        const roof = rounded(new THREE.CylinderGeometry(0.21, 0.21, 0.6, 12, 1, false, 0, Math.PI), toon('#2f6fd1'), 0.012);
        roof.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        roof.rotation.order = 'YXZ';
        roof.position.y = 1.21;
        add(roof);
        const slot = box(0.24, 0.04, 0.02, '#1d1630', { outline: false });
        slot.position.set(0, 1.12, 0.31);
        add(slot);
        const flag = new THREE.Group();
        flag.position.set(0.23, 0.95, -0.1);
        const stick = box(0.03, 0.34, 0.03, '#d8dbe2', { outline: false });
        stick.position.y = 0.17;
        flag.add(stick);
        const cloth = box(0.02, 0.1, 0.16, '#e0453a', { outline: 0.006 });
        cloth.position.set(0, 0.29, 0.07);
        flag.add(cloth);
        flag.rotation.x = Math.PI / 2;
        add(flag, 'flag');
        for (let i = 0; i < 3; i += 1) {
          const letter = box(0.22, 0.14, 0.015, '#f4efe6', { outline: 0.006 });
          const stamp = box(0.05, 0.05, 0.01, '#e0453a', { outline: false });
          stamp.position.set(0.06, 0.03, 0.01);
          letter.add(stamp);
          letter.visible = false;
          g.add(letter);
          this.bits.push(letter);
        }
        this.plugAnchor.position.set(0, 1.0, 0.3);
        return 1.4;
      }
      case 'birdhouse': {
        this.collideRadius = 0.2;
        const pole = box(0.1, 1.8, 0.1, '#7a5a42', { outline: 0.01 });
        pole.position.y = 0.9;
        add(pole);
        const house = box(0.46, 0.46, 0.46, '#e0563f', { outline: 0.015 });
        house.position.y = 2.0;
        add(house);
        for (const s of [-1, 1]) {
          const roof = box(0.36, 0.05, 0.58, '#7a4a2e', { outline: 0.01 });
          roof.position.set(s * 0.14, 2.32, 0);
          roof.rotation.z = -s * 0.7;
          add(roof);
        }
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), toon('#1d1630'));
        hole.position.set(0, 2.02, 0.235);
        add(hole);
        const perch = box(0.03, 0.03, 0.14, '#7a5a42', { outline: false });
        perch.position.set(0, 1.88, 0.3);
        add(perch);
        const bird = new THREE.Group();
        const bb = rounded(new THREE.SphereGeometry(0.1, 10, 8), toon('#ffd23a'), 0.008);
        bird.add(bb);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), toon('#f2742b'));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0, 0.11);
        bird.add(beak);
        for (const ex of [-0.04, 0.04]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 4), toon('#1d1630'));
          eye.position.set(ex, 0.03, 0.085);
          bird.add(eye);
        }
        bird.position.set(0, 2.02, 0.05);
        bird.scale.setScalar(0.01);
        add(bird, 'bird');
        this.plugAnchor.position.set(0, 1.3, 0.1);
        return 2.4;
      }
      case 'trash': {
        this.collideRadius = 0.35;
        const bin = rounded(new THREE.CylinderGeometry(0.3, 0.26, 0.8, 14), toon('#4f8f3a'), 0.015);
        bin.position.y = 0.4;
        add(bin);
        for (const y of [0.2, 0.6]) {
          const ring = rounded(new THREE.TorusGeometry(0.29, 0.02, 5, 16), toon('#3a6f2c'), 0);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = y;
          add(ring);
        }
        const lid = new THREE.Group();
        lid.position.y = 0.82;
        const lidMesh = rounded(new THREE.CylinderGeometry(0.33, 0.33, 0.07, 14), toon('#3a6f2c'), 0.01);
        lid.add(lidMesh);
        const knob = rounded(new THREE.SphereGeometry(0.05, 6, 5), toon('#3a6f2c'), 0.006);
        knob.position.y = 0.06;
        lid.add(knob);
        add(lid, 'lid');
        const eyes = new THREE.Group();
        for (const ex of [-0.1, 0.1]) {
          const white = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon('#ffffff'));
          white.position.set(ex, 0, 0);
          eyes.add(white);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), toon('#1d1630'));
          pupil.position.set(ex, 0, 0.05);
          eyes.add(pupil);
        }
        eyes.position.set(0, 0.55, 0.25);
        eyes.scale.y = 0.1;
        add(eyes, 'eyes');
        this.plugAnchor.position.set(0, 0.6, 0.3);
        return 1.0;
      }
      case 'hydrant': {
        this.collideRadius = 0.25;
        const body = rounded(new THREE.CylinderGeometry(0.16, 0.19, 0.6, 12), toon('#e0453a'), 0.015);
        body.position.y = 0.3;
        add(body);
        const dome = rounded(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#e0453a'), 0.012);
        dome.position.y = 0.6;
        add(dome);
        const nut = rounded(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), toon('#f2c14e'), 0.006);
        nut.position.y = 0.78;
        add(nut);
        for (const s of [-1, 1]) {
          const nozzle = rounded(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), toon('#f2c14e'), 0.006);
          nozzle.rotation.z = Math.PI / 2;
          nozzle.position.set(s * 0.21, 0.42, 0);
          add(nozzle);
        }
        const front = rounded(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), toon('#f2c14e'), 0.006);
        front.rotation.x = Math.PI / 2;
        front.position.set(0, 0.4, 0.2);
        add(front);
        const mat = new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.85 });
        for (let i = 0; i < 18; i += 1) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat);
          d.visible = false;
          g.add(d);
          this.bits.push(d);
        }
        this.plugAnchor.position.set(0, 0.5, 0.2);
        return 0.85;
      }
      case 'radio': {
        this.collideRadius = 0.35;
        const crate = box(0.6, 0.4, 0.5, '#b0855c', { outline: 0.015, brush: 1 });
        crate.position.y = 0.2;
        add(crate);
        const radio = new THREE.Group();
        radio.position.y = 0.6;
        const body = box(0.72, 0.38, 0.22, '#3a3d48', { outline: 0.012 });
        radio.add(body);
        const speakers: THREE.Mesh[] = [];
        for (const sx of [-0.2, 0.2]) {
          const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), toon('#1d1630'));
          sp.rotation.x = Math.PI / 2;
          sp.position.set(sx, 0, 0.11);
          radio.add(sp);
          const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), toon('#8a8f9a'));
          cone.rotation.x = Math.PI / 2;
          cone.position.set(sx, 0, 0.13);
          radio.add(cone);
          speakers.push(sp);
        }
        const dial = box(0.12, 0.08, 0.02, '#ffd23a', { outline: false });
        dial.position.set(0, 0.11, 0.115);
        radio.add(dial);
        const handle = rounded(new THREE.TorusGeometry(0.18, 0.02, 5, 12, Math.PI), toon('#2a2733'), 0);
        handle.position.y = 0.19;
        radio.add(handle);
        const antenna = strut(new THREE.Vector3(0.28, 0.19, 0), new THREE.Vector3(0.4, 0.6, -0.05), 0.008, toon('#c9ccd4'));
        radio.add(antenna);
        add(radio, 'radio');
        for (let i = 0; i < 4; i += 1) {
          const note = new THREE.Sprite(noteMaterial().clone());
          note.scale.setScalar(0.3);
          note.visible = false;
          g.add(note);
          this.bits.push(note);
        }
        this.plugAnchor.position.set(0.3, 0.6, 0.1);
        return 1.0;
      }
      case 'neon': {
        this.collideRadius = 0;
        const frame = box(1.2, 0.46, 0.06, '#2a2733', { outline: 0.012 });
        frame.position.y = 1.85;
        add(frame);
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 96;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#1d1630';
        ctx.fillRect(0, 0, 256, 96);
        ctx.font = 'bold 54px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ff6fb5';
        ctx.strokeText('ABIERTO', 128, 50);
        ctx.fillStyle = '#ffe1f0';
        ctx.fillText('ABIERTO', 128, 50);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), new THREE.MeshBasicMaterial({ map: tex, color: '#555566' }));
        sign.position.set(0, 1.85, 0.035);
        add(sign, 'sign');
        for (const sx of [-0.4, 0.4]) {
          const wire = box(0.01, 0.4, 0.01, '#8a8f9a', { outline: false });
          wire.position.set(sx, 2.28, 0);
          add(wire);
        }
        this.plugAnchor.position.set(0, 1.6, 0.05);
        return 2.1;
      }
      case 'icecream': {
        this.collideRadius = 0.6;
        const cart = box(1.2, 0.6, 0.6, '#f4efe6', { outline: 0.015 });
        cart.position.y = 0.65;
        add(cart);
        for (let i = 0; i < 4; i += 1) {
          const stripe = box(0.14, 0.6, 0.62, '#f48fb1', { outline: false });
          stripe.position.set(-0.45 + i * 0.3, 0.65, 0);
          add(stripe);
        }
        for (const [cx, col] of [[-0.3, '#f48fb1'], [0, '#fff3c4'], [0.3, '#8d5a3b']] as const) {
          const scoop = rounded(new THREE.SphereGeometry(0.11, 10, 8), toon(col), 0.008);
          scoop.position.set(cx, 1.02, 0.1);
          add(scoop);
        }
        for (const wx of [-0.45, 0.45]) {
          const wheel = rounded(new THREE.TorusGeometry(0.17, 0.04, 6, 14), toon('#3a3d48'), 0);
          wheel.position.set(wx, 0.2, 0.32);
          add(wheel);
        }
        const handle = box(0.06, 0.06, 0.5, '#8a8f9a', { outline: false });
        handle.position.set(-0.7, 0.95, 0);
        add(handle);
        const umbrella = new THREE.Group();
        umbrella.position.set(0.35, 0.95, -0.15);
        const pole = box(0.04, 1.2, 0.04, '#d8dbe2', { outline: false });
        pole.position.y = 0.6;
        umbrella.add(pole);
        const canopy = new THREE.Group();
        canopy.position.y = 1.2;
        for (let i = 0; i < 8; i += 1) {
          const seg = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.35, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), toon(i % 2 ? '#ffffff' : '#f48fb1'));
          seg.material.side = THREE.DoubleSide;
          canopy.add(seg);
        }
        canopy.scale.set(0.12, 1.4, 0.12);
        umbrella.add(canopy);
        this.p.canopy = canopy;
        add(umbrella, 'umbrella');
        const bell = rounded(new THREE.SphereGeometry(0.06, 8, 6), toon('#f2c14e'), 0.006);
        bell.position.set(-0.7, 1.05, 0.2);
        add(bell, 'bell');
        this.plugAnchor.position.set(0, 0.8, 0.32);
        return 2.3;
      }
      case 'bike': {
        this.collideRadius = 0.4;
        const frameMat = toon('#2bb3a8');
        const wheels: THREE.Group[] = [];
        for (const wz of [-0.5, 0.5]) {
          const wheel = new THREE.Group();
          wheel.position.set(0, 0.33, wz);
          const tire = rounded(new THREE.TorusGeometry(0.3, 0.035, 6, 18), toon('#1d1630'), 0);
          tire.rotation.y = Math.PI / 2;
          wheel.add(tire);
          for (let i = 0; i < 3; i += 1) {
            const spoke = box(0.01, 0.58, 0.01, '#c9ccd4', { outline: false });
            spoke.rotation.x = (i / 3) * Math.PI;
            wheel.add(spoke);
          }
          g.add(wheel);
          wheels.push(wheel);
        }
        this.p.w0 = wheels[0];
        this.p.w1 = wheels[1];
        const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
        g.add(strut(P(0, 0.33, -0.5), P(0, 0.75, -0.1), 0.025, frameMat));
        g.add(strut(P(0, 0.75, -0.1), P(0, 0.8, 0.38), 0.025, frameMat));
        g.add(strut(P(0, 0.33, -0.5), P(0, 0.35, 0.05), 0.025, frameMat));
        g.add(strut(P(0, 0.35, 0.05), P(0, 0.8, 0.38), 0.025, frameMat));
        g.add(strut(P(0, 0.33, 0.5), P(0, 0.95, 0.42), 0.025, frameMat));
        g.add(strut(P(0, 0.35, 0.05), P(0, 0.78, -0.12), 0.025, frameMat));
        const bar = box(0.5, 0.04, 0.04, '#3a3d48', { outline: false });
        bar.position.set(0, 0.97, 0.42);
        g.add(bar);
        const seat = box(0.14, 0.05, 0.24, '#1d1630', { outline: 0.006 });
        seat.position.set(0, 0.83, -0.14);
        g.add(seat);
        const basket = box(0.3, 0.2, 0.26, '#b0855c', { outline: 0.008 });
        basket.position.set(0, 0.9, 0.64);
        g.add(basket);
        const bell = rounded(new THREE.SphereGeometry(0.04, 8, 6), toon('#ffd23a'), 0.006);
        bell.position.set(0.18, 1.01, 0.42);
        add(bell, 'bell');
        this.plugAnchor.position.set(0, 0.8, 0.2);
        return 1.1;
      }
      case 'clothes': {
        this.collideRadius = 0.2;
        for (const sx of [-1.2, 1.2]) {
          const post = box(0.08, 1.7, 0.08, '#d8dbe2', { outline: 0.01 });
          post.position.set(sx, 0.85, 0);
          add(post);
        }
        const line = box(2.4, 0.015, 0.015, '#f4efe6', { outline: false });
        line.position.y = 1.62;
        add(line);
        const colors = ['#e0563f', '#2f6fd1', '#ffd23a', '#2bb3a8'];
        colors.forEach((col, i) => {
          const hang = new THREE.Group();
          hang.position.set(-0.85 + i * 0.57, 1.62, 0);
          const cloth = box(0.38, i % 2 ? 0.5 : 0.36, 0.02, col, { outline: 0.008 });
          cloth.position.y = i % 2 ? -0.27 : -0.2;
          hang.add(cloth);
          const pin = box(0.03, 0.06, 0.03, '#b0855c', { outline: false });
          hang.add(pin);
          g.add(hang);
          this.bits.push(hang);
        });
        this.plugAnchor.position.set(-1.2, 1.2, 0.05);
        return 1.9;
      }
      case 'duck': {
        this.collideRadius = 0;
        const duck = new THREE.Group();
        const body = rounded(new THREE.SphereGeometry(0.2, 12, 10), toon('#ffd23a'), 0.012);
        body.scale.set(1, 0.75, 1.25);
        duck.add(body);
        const head = rounded(new THREE.SphereGeometry(0.13, 12, 10), toon('#ffd23a'), 0.01);
        head.position.set(0, 0.2, 0.14);
        duck.add(head);
        const beak = rounded(new THREE.SphereGeometry(0.06, 8, 6), toon('#f2742b'), 0.006);
        beak.scale.set(1.2, 0.5, 1.3);
        beak.position.set(0, 0.18, 0.27);
        duck.add(beak);
        for (const ex of [-0.06, 0.06]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), toon('#1d1630'));
          eye.position.set(ex, 0.25, 0.24);
          duck.add(eye);
        }
        const tail = rounded(new THREE.ConeGeometry(0.07, 0.14, 6), toon('#ffd23a'), 0.006);
        tail.rotation.x = -1.0;
        tail.position.set(0, 0.08, -0.25);
        duck.add(tail);
        duck.position.y = 0.82;
        add(duck, 'duck');
        this.plugAnchor.position.set(0, 0.9, 0);
        return 1.1;
      }
      case 'balloons': {
        this.collideRadius = 0.25;
        const weight = box(0.3, 0.2, 0.3, '#5a5f6b', { outline: 0.01 });
        weight.position.y = 0.1;
        add(weight);
        const cols = ['#e0453a', '#ffd23a', '#2f6fd1', '#ff9ff3'];
        cols.forEach((col, i) => {
          const bal = new THREE.Group();
          const sphere = rounded(new THREE.SphereGeometry(0.24, 12, 10), toonUnique(col), 0.012);
          sphere.scale.set(1, 1.18, 1);
          bal.add(sphere);
          const knot = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 6), toon(col));
          knot.position.y = -0.29;
          bal.add(knot);
          const string = box(0.008, 1, 0.008, '#f4efe6', { outline: false });
          string.position.y = -0.8;
          bal.add(string);
          bal.userData.home = new THREE.Vector3(Math.cos(i * 1.6) * 0.3, 1.8 + (i % 2) * 0.35, Math.sin(i * 1.6) * 0.3);
          bal.position.set(0, 0.3, 0);
          bal.scale.setScalar(0.25);
          g.add(bal);
          this.bits.push(bal);
        });
        this.plugAnchor.position.set(0, 0.25, 0.15);
        return 1.0;
      }
      case 'gnome': {
        this.collideRadius = 0.25;
        const gnome = new THREE.Group();
        const body = rounded(new THREE.ConeGeometry(0.22, 0.45, 12), toon('#2f6fd1'), 0.012);
        body.position.y = 0.25;
        gnome.add(body);
        const face = rounded(new THREE.SphereGeometry(0.12, 10, 8), toon('#f0c39a'), 0.01);
        face.position.y = 0.52;
        gnome.add(face);
        const beard = rounded(new THREE.ConeGeometry(0.12, 0.24, 10), toon('#f4efe6'), 0.008);
        beard.rotation.x = Math.PI;
        beard.position.set(0, 0.4, 0.06);
        gnome.add(beard);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), toon('#ef8f8f'));
        nose.position.set(0, 0.52, 0.12);
        gnome.add(nose);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 12), toonUnique('#e0453a'));
        hat.position.y = 0.78;
        hat.castShadow = true;
        gnome.add(hat);
        this.p.hat = hat;
        add(gnome, 'gnome');
        this.plugAnchor.position.set(0, 0.4, 0.2);
        return 1.0;
      }
      case 'owl': {
        this.collideRadius = 0.2;
        const post = box(0.16, 1.6, 0.16, '#6a4a32', { outline: 0.008 });
        post.position.y = 0.8;
        add(post);
        const bird = new THREE.Group();
        const b = rounded(new THREE.SphereGeometry(0.26, 12, 10), toon('#a97a52'), 0.012);
        b.scale.set(1, 1.2, 0.9);
        bird.add(b);
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), toon('#f2d38a'));
        belly.position.set(0, -0.05, 0.12);
        bird.add(belly);
        for (const sx of [-0.1, 0.1]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), toon('#6a4a32'));
          ear.position.set(sx, 0.3, 0);
          bird.add(ear);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon('#4a4452'));
          eye.position.set(sx, 0.08, 0.2);
          eye.scale.y = 0.2;
          bird.add(eye);
          this.bits.push(eye);
        }
        bird.position.y = 1.85;
        add(bird, 'owl');
        this.plugAnchor.position.set(0, 1.6, 0.2);
        return 2.2;
      }
      case 'cow': {
        this.collideRadius = 0.8;
        const white = toon('#f4efe6');
        const spot = toon('#2c2838');
        const body = rounded(new THREE.CapsuleGeometry(0.42, 0.9, 6, 12), white, 0.02);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.95;
        add(body);
        for (const [x, z] of [
          [0.25, 0.2],
          [-0.2, -0.3],
        ] as [number, number][]) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), spot);
          s.scale.set(1, 0.6, 1.2);
          s.position.set(x, 1.2, z);
          add(s);
        }
        for (const [x, z] of [
          [-0.25, 0.45],
          [0.25, 0.45],
          [-0.25, -0.45],
          [0.25, -0.45],
        ] as [number, number][]) {
          const leg = box(0.14, 0.6, 0.14, '#f4efe6', { outline: 0.006 });
          leg.position.set(x, 0.3, z);
          add(leg);
        }
        const head = new THREE.Group();
        const skull = rounded(new THREE.BoxGeometry(0.45, 0.4, 0.5), white, 0.015);
        head.add(skull);
        const snout = box(0.4, 0.22, 0.2, '#f2b8b0', { outline: 0.008 });
        snout.position.set(0, -0.08, 0.3);
        head.add(snout);
        for (const sx of [-0.25, 0.25]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), toon('#e8dcc6'));
          horn.position.set(sx, 0.25, 0);
          head.add(horn);
        }
        head.position.set(0, 1.15, 0.95);
        head.rotation.x = 0.5;
        add(head, 'head');
        this.plugAnchor.position.set(0, 1, 0.6);
        return 1.6;
      }
      case 'hen': {
        this.collideRadius = 0.3;
        const body = new THREE.Group();
        const b = rounded(new THREE.SphereGeometry(0.28, 12, 10), toon('#f4efe6'), 0.012);
        b.scale.set(1, 0.9, 1.2);
        body.add(b);
        const comb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon('#e0453f'));
        comb.position.set(0, 0.32, 0.22);
        body.add(comb);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), toon('#ff9f43'));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.15, 0.4);
        body.add(beak);
        const tail = rounded(new THREE.ConeGeometry(0.14, 0.3, 6), toon('#c8a24a'), 0.006);
        tail.rotation.x = -0.9;
        tail.position.set(0, 0.18, -0.35);
        body.add(tail);
        body.position.y = 0.4;
        body.rotation.x = 0.35;
        add(body, 'hen');
        for (const sx of [-0.1, 0.1]) {
          const leg = box(0.04, 0.2, 0.04, '#ff9f43', { outline: false });
          leg.position.set(sx, 0.1, 0);
          add(leg);
        }
        this.plugAnchor.position.set(0, 0.5, 0.3);
        return 0.9;
      }
      case 'firefly': {
        this.collideRadius = 0.2;
        const post = box(0.08, 1.1, 0.08, '#6a4a32', { outline: 0.006 });
        post.position.y = 0.55;
        add(post);
        const jarMat = new THREE.MeshBasicMaterial({ color: '#5a5868', transparent: true, opacity: 0.85 });
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 12), jarMat);
        jar.position.y = 1.3;
        add(jar, 'jar');
        const lid = rounded(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), toon('#c8a24a'), 0.006);
        lid.position.y = 1.5;
        add(lid);
        for (let i = 0; i < 6; i += 1) {
          const bug = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), glow('#e8ff7a'));
          bug.visible = false;
          bug.position.set(0, 1.3, 0);
          g.add(bug);
          this.bits.push(bug);
        }
        this.plugAnchor.position.set(0, 1.2, 0.2);
        return 1.6;
      }
      case 'pinwheel': {
        this.collideRadius = 0.15;
        const stick = box(0.04, 1.2, 0.04, '#f4efe6', { outline: 0.006 });
        stick.position.y = 0.6;
        add(stick);
        const wheel = new THREE.Group();
        wheel.position.set(0, 1.2, 0.05);
        ['#e0453a', '#ffd23a', '#2f6fd1', '#2bb3a8'].forEach((col, i) => {
          const shape = new THREE.Shape();
          shape.moveTo(0, 0);
          shape.lineTo(0.3, 0.05);
          shape.lineTo(0.18, 0.22);
          shape.lineTo(0, 0);
          const blade = new THREE.Mesh(new THREE.ShapeGeometry(shape), toon(col));
          blade.material.side = THREE.DoubleSide;
          blade.rotation.z = (i / 4) * Math.PI * 2;
          wheel.add(blade);
        });
        const pin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), toon('#f4efe6'));
        wheel.add(pin);
        add(wheel, 'wheel');
        this.plugAnchor.position.set(0, 0.8, 0.05);
        return 1.5;
      }
      case 'car': {
        // Se ubica justo delante del frente de un auto ya estacionado; el auto ya bloquea el paso
        this.collideRadius = 0;
        for (const sx of [-0.72, 0.72]) {
          const lens = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.05), toonUnique('#8a8a80'));
          lens.position.set(sx, 0.9, 0.0);
          g.add(lens);
          this.bits.push(lens);
          const beam = new THREE.Mesh(
            new THREE.ConeGeometry(0.9, 3.2, 14, 1, true),
            new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }),
          );
          beam.rotation.x = -Math.PI / 2;
          beam.position.set(sx, 0.75, 1.6);
          g.add(beam);
          this.bits.push(beam);
        }
        this.plugAnchor.position.set(0, 0.9, 0.05);
        return 1.6;
      }
      case 'drain': {
        // Llave en la orilla; el agua sale del caño del muro del canal (1.4 m hacia +Z)
        this.collideRadius = 0.2;
        const stub = box(0.16, 0.5, 0.16, '#6b6f7a', { outline: 0.01 });
        stub.position.y = 0.25;
        add(stub);
        const wheel = rounded(new THREE.TorusGeometry(0.14, 0.03, 6, 14), toon('#e0453a'), 0.006);
        wheel.position.set(0, 0.56, 0);
        wheel.rotation.x = Math.PI / 2;
        add(wheel, 'valve');
        const mat = new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.85 });
        for (let i = 0; i < 14; i += 1) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat);
          d.visible = false;
          g.add(d);
          this.bits.push(d);
        }
        this.plugAnchor.position.set(0, 0.55, 0);
        return 0.7;
      }
    }
  }

  /** El pato está sobre el borde de la fuente: gana la prioridad del botón cuando el Nexus está al lado. */
  distanceFrom(x: number, z: number): number {
    const d = super.distanceFrom(x, z);
    return this.kind === 'duck' ? d - 0.6 : d;
  }

  private get sfx(): AudioSystem | null {
    return Sleeper.audio;
  }

  /** Despierta: saca el "Zzz", deja la pose despierta y hace la reacción. */
  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.zzz.visible = false;
    this.awakePose();
    this.startReaction();
  }

  restore(): void {
    this.active_ = true;
    this.zzz.visible = false;
    this.awakePose();
  }

  poke(): boolean {
    if (!this.active_) return false;
    this.startReaction();
    return true;
  }

  private awakePose(): void {
    switch (this.kind) {
      case 'owl':
        for (const e of this.bits) {
          e.scale.y = 1;
          (e as THREE.Mesh).material = glow('#ffd23a');
        }
        break;
      case 'cow':
        this.p.head.rotation.x = 0;
        break;
      case 'hen':
        this.p.hen.rotation.x = 0;
        break;
      case 'firefly':
        ((this.p.jar as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set('#f4ffb0');
        for (const b of this.bits) b.visible = true;
        break;
      case 'mailbox':
        this.p.flag.rotation.x = 0;
        break;
      case 'trash':
        this.p.eyes.scale.y = 1;
        break;
      case 'neon':
        ((this.p.sign as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set('#ffffff');
        break;
      case 'icecream':
        this.p.canopy.scale.set(1, 1, 1);
        break;
      case 'balloons':
        for (const b of this.bits) {
          b.position.copy(b.userData.home as THREE.Vector3);
          b.scale.setScalar(1);
        }
        break;
      case 'car':
        for (const b of this.bits) {
          const m = (b as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (b instanceof THREE.Mesh && b.geometry.type === 'ConeGeometry') m.opacity = 0.16;
          else (b as THREE.Mesh).material = glow('#fff4c8');
        }
        break;
      default:
        break;
    }
  }

  private startReaction(): void {
    this.react = 0;
    const a = this.sfx;
    if (!a) return;
    switch (this.kind) {
      case 'mailbox':
        [660, 760, 880].forEach((f, i) => a.tone(f, i * 0.12, 0.08, 'square', 0.05));
        break;
      case 'birdhouse':
        [2200, 2600, 2300, 2900].forEach((f, i) => a.tone(f, i * 0.09 + (i > 1 ? 0.25 : 0), 0.07, 'sine', 0.07));
        break;
      case 'trash':
        a.tone(95, 0.15, 0.45, 'sawtooth', 0.09);
        a.tone(80, 0.25, 0.4, 'sawtooth', 0.07);
        break;
      case 'hydrant':
      case 'drain':
        a.noise(0, 1.6, 0.08, 1400);
        break;
      case 'radio':
        [523, 659, 784, 659, 880, 784, 1047].forEach((f, i) => a.tone(f, i * 0.16, 0.15, 'triangle', 0.08));
        break;
      case 'neon':
        for (let i = 0; i < 4; i += 1) a.tone(120, i * 0.15, 0.08, 'square', 0.04);
        break;
      case 'icecream':
      case 'bike':
        a.tone(1760, 0, 0.25, 'triangle', 0.08);
        a.tone(1760, 0.28, 0.35, 'triangle', 0.08);
        break;
      case 'clothes':
        a.noise(0, 1.4, 0.05, 700);
        break;
      case 'duck':
        a.tone(720, 0.05, 0.12, 'square', 0.06);
        a.tone(560, 0.18, 0.16, 'square', 0.06);
        break;
      case 'balloons':
        [400, 520, 660, 820].forEach((f, i) => a.tone(f, i * 0.1, 0.12, 'sine', 0.07));
        break;
      case 'gnome':
        a.tone(196, 0.05, 0.18, 'triangle', 0.1);
        a.tone(196, 0.3, 0.22, 'triangle', 0.1);
        break;
      case 'pinwheel':
        a.noise(0, 1.0, 0.05, 2500);
        break;
      case 'firefly':
        [1568, 1760, 2093, 2349, 2637].forEach((f, i) => a.tone(f, i * 0.08, 0.1, 'sine', 0.05));
        break;
      case 'owl':
        a.tone(392, 0, 0.35, 'sine', 0.08);
        a.tone(330, 0.4, 0.5, 'sine', 0.08);
        break;
      case 'cow':
        a.tone(140, 0, 0.9, 'sawtooth', 0.07);
        a.tone(110, 0.3, 0.7, 'sawtooth', 0.06);
        break;
      case 'hen':
        [700, 760, 700, 900].forEach((f, i) => a.tone(f, i * 0.11, 0.08, 'square', 0.04));
        break;
      case 'car':
        for (const t of [0, 0.42]) {
          a.tone(330, t, 0.3, 'square', 0.05);
          a.tone(415, t, 0.3, 'square', 0.05);
        }
        break;
    }
  }

  update(dt: number, time: number): void {
    this.time += dt;
    const T = this.time;
    if (!this.active_) {
      // Durmiendo: el "Zzz" sube y baja despacito
      this.zzz.position.y = this.zzzBase + Math.sin(time * 1.6 + this.x) * 0.08;
      (this.zzz.material as THREE.SpriteMaterial).opacity = 0.65 + Math.sin(time * 1.6 + this.x) * 0.3;
      return;
    }
    const r = this.react;
    if (r >= 0) this.react += dt;
    const k = r >= 0 ? r : 99;

    switch (this.kind) {
      case 'owl': {
        this.p.owl.rotation.y = r >= 0 && k < 1.5 ? Math.sin(k * 8) * 0.8 : Math.sin(T * 0.5) * 0.4;
        if (r >= 1.6) this.react = -1;
        break;
      }
      case 'cow': {
        // Mastica (y en la reacción mueve la cabeza)
        this.p.head.rotation.x = r >= 0 ? Math.sin(k * 6) * 0.3 : Math.sin(T * 2) * 0.05;
        if (r >= 2) this.react = -1;
        break;
      }
      case 'hen': {
        const hop = r >= 0 && k < 1.2 ? Math.abs(Math.sin(k * 10)) * 0.25 : 0;
        this.p.hen.position.y = 0.4 + hop;
        this.p.hen.rotation.x = Math.sin(T * 4) > 0.8 ? 0.4 : 0;
        if (r >= 1.5) this.react = -1;
        break;
      }
      case 'firefly': {
        const spread = r >= 0 ? 0.35 + Math.min(1, k) * 1.2 : 0.55;
        this.bits.forEach((b, i) => {
          const a = T * (1.2 + i * 0.15) + i * 1.3;
          b.position.set(Math.cos(a) * spread, 1.35 + Math.sin(T * 2 + i) * 0.35 + (r >= 0 ? Math.min(1, k) * 0.4 : 0), Math.sin(a) * spread);
        });
        if (r >= 2.5) this.react = -1;
        break;
      }
      case 'mailbox':
        this.bits.forEach((l, i) => {
          const t = (k - i * 0.12) / 1.3;
          l.visible = t > 0 && t < 1;
          if (!l.visible) return;
          const dir = (i - 1) * 0.5;
          l.position.set(Math.sin(dir) * t * 1.4, 1.15 + t * 1.6 - t * t * 2.2, 0.3 + t * 0.9);
          l.rotation.set(t * 6, t * 4 + i, t * 3);
        });
        if (r >= 1.8) this.react = -1;
        break;
      case 'birdhouse': {
        const bird = this.p.bird;
        const out = r >= 0 ? Math.min(1, k * 4) * (k < 2.2 ? 1 : Math.max(0, 1 - (k - 2.2) * 3)) : (Math.sin(T * 0.8) > 0.85 ? 0.6 : 0);
        bird.scale.setScalar(Math.max(0.01, out));
        bird.position.z = 0.05 + out * 0.3;
        bird.position.y = 2.02 + (r >= 0 ? Math.abs(Math.sin(k * 10)) * 0.06 : 0);
        if (r >= 2.6) this.react = -1;
        break;
      }
      case 'trash': {
        const lid = this.p.lid;
        if (r >= 0) {
          const t = Math.min(1, k / 0.9);
          lid.position.y = 0.82 + Math.sin(t * Math.PI) * 0.7;
          lid.rotation.y = t * Math.PI * 3;
          lid.rotation.z = Math.sin(t * Math.PI) * 0.4;
          this.group.scale.set(1 + Math.sin(k * 20) * 0.04 * (1 - t), 1, 1);
          if (r >= 1.0) this.react = -1;
        } else {
          lid.position.y = 0.82;
          lid.rotation.set(0, 0, 0);
          this.group.scale.set(1, 1, 1);
        }
        // Parpadea
        this.p.eyes.scale.y = (T % 3.5) < 0.12 ? 0.1 : 1;
        break;
      }
      case 'hydrant':
        this.bits.forEach((d, i) => {
          const on = r >= 0 && k < 2.4;
          d.visible = on;
          if (!on) return;
          const t = (k * 1.6 + i / this.bits.length) % 1;
          const spread = ((i % 3) - 1) * 0.25;
          d.position.set(spread * t * 2, 0.4 + t * 1.3 - t * t * 1.7, 0.25 + t * 1.8);
        });
        if (r >= 2.5) this.react = -1;
        break;
      case 'radio': {
        const beat = Math.abs(Math.sin(T * (r >= 0 ? 9 : 5)));
        this.p.radio.scale.set(1 + beat * 0.04, 1 + beat * 0.06, 1);
        this.bits.forEach((n, i) => {
          const t = r >= 0 ? (k - i * 0.25) / 1.4 : ((T * 0.4 + i * 0.25) % 1) * (i === 0 ? 1 : 0);
          n.visible = t > 0 && t < 1;
          if (!n.visible) return;
          n.position.set(Math.sin(t * 6 + i) * 0.3, 0.9 + t * 1.2, 0.1);
          ((n as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 1 - t;
        });
        if (r >= 2.2) this.react = -1;
        break;
      }
      case 'neon': {
        const mat = (this.p.sign as THREE.Mesh).material as THREE.MeshBasicMaterial;
        const on = r >= 0 && k < 1 ? Math.sin(k * 40) > 0 : true;
        mat.color.set(on ? '#ffffff' : '#555566');
        if (r >= 1.2) this.react = -1;
        break;
      }
      case 'icecream': {
        this.p.umbrella.rotation.y = T * 0.6;
        if (r >= 0) {
          const t = Math.min(1, k / 0.6);
          this.p.canopy.scale.set(0.12 + t * 0.88, 1.4 - t * 0.4, 0.12 + t * 0.88);
          this.p.bell.position.y = 1.05 + Math.abs(Math.sin(k * 25)) * 0.05 * (1 - Math.min(1, k));
          if (r >= 1.2) this.react = -1;
        }
        break;
      }
      case 'bike': {
        const spin = r >= 0 ? Math.max(0, 14 - k * 5) : 0;
        this.p.w0.rotation.x += spin * dt;
        this.p.w1.rotation.x += spin * dt;
        this.p.bell.scale.setScalar(r >= 0 && k < 0.7 ? 1 + Math.abs(Math.sin(k * 30)) * 0.4 : 1);
        if (r >= 3) this.react = -1;
        break;
      }
      case 'clothes': {
        const amp = r >= 0 ? Math.max(0.15, 1 - k / 2) : 0.15;
        this.bits.forEach((h, i) => {
          h.rotation.x = Math.sin(T * (r >= 0 ? 9 : 2) + i) * 0.5 * amp;
          h.rotation.z = Math.sin(T * 1.3 + i * 2) * 0.1 * amp;
        });
        if (r >= 2) this.react = -1;
        break;
      }
      case 'duck': {
        const duck = this.p.duck;
        if (r >= 0) {
          const t = Math.min(1, k / 0.8);
          duck.position.y = 0.82 + Math.sin(t * Math.PI) * 0.6;
          duck.rotation.y = t * Math.PI * 2;
          if (r >= 0.9) this.react = -1;
        } else {
          duck.position.y = 0.82 + Math.sin(T * 2) * 0.02;
          duck.rotation.z = Math.sin(T * 1.7) * 0.08;
          duck.rotation.y = 0;
        }
        break;
      }
      case 'balloons':
        this.bits.forEach((b, i) => {
          const home = b.userData.home as THREE.Vector3;
          if (r >= 0 && k < 1) {
            const t = Math.min(1, k / 0.8);
            b.scale.setScalar(0.25 + t * 0.75);
            b.position.lerpVectors(new THREE.Vector3(0, 0.3, 0), home, t);
          } else {
            b.position.set(home.x + Math.sin(T + i) * 0.08, home.y + Math.sin(T * 1.3 + i) * 0.1, home.z);
          }
        });
        if (r >= 1) this.react = -1;
        break;
      case 'gnome': {
        const gnome = this.p.gnome;
        const hat = this.p.hat as THREE.Mesh;
        if (r >= 0) {
          const t = Math.min(1, k / 1.1);
          gnome.rotation.y = t * Math.PI * 4;
          gnome.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.2;
          (hat.material as THREE.MeshToonMaterial).emissive.set('#ff6a4a').multiplyScalar(Math.sin(t * Math.PI));
          if (r >= 1.2) this.react = -1;
        } else {
          gnome.rotation.y = 0;
          gnome.position.y = 0;
          gnome.rotation.z = Math.sin(T * 1.2) * 0.03;
          (hat.material as THREE.MeshToonMaterial).emissive.set('#000000');
        }
        break;
      }
      case 'pinwheel': {
        const speed = r >= 0 ? Math.max(1.2, 22 - k * 8) : 1.2;
        this.p.wheel.rotation.z -= speed * dt;
        if (r >= 2.6) this.react = -1;
        break;
      }
      case 'car': {
        const flash = r >= 0 && k < 1 ? (Math.sin(k * 25) > 0 ? 1 : 0.2) : 1;
        for (const b of this.bits) {
          const m = (b as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if ((b as THREE.Mesh).geometry.type === 'ConeGeometry') m.opacity = 0.16 * flash;
        }
        if (r >= 1.2) this.react = -1;
        break;
      }
      case 'drain': {
        const gush = r >= 0 && k < 2.5;
        this.p.valve.rotation.z += (r >= 0 ? 8 : 0) * dt;
        this.bits.forEach((d, i) => {
          const trickle = !gush && i < 3;
          d.visible = gush || trickle;
          if (!d.visible) return;
          const t = (T * (gush ? 1.5 : 0.7) + i / this.bits.length) % 1;
          d.position.set(Math.sin(i * 2.1) * 0.08, -0.35 - t * t * 0.6, 1.45 + t * (gush ? 0.7 : 0.15));
        });
        if (r >= 2.6) this.react = -1;
        break;
      }
    }
  }
}

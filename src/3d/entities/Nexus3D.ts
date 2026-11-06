import * as THREE from 'three';
import { makeBoard } from '../objects/skate';
import { box, glow, rounded, toon } from '../core/render';
import { clamp, damp, dampAngle } from '../core/util';
import { CABLES, EARS, HATS, HOODIES, PACKS, option, type NexusLook } from '../data/wardrobe';

const SPEED = 4.6; // m/s
const ACCEL = 11; // qué tan rápido llega a la velocidad deseada (equivale al ACCEL_MS de 90 ms del 2D)

const C = {
  head: '#f4ecdc',
  face: '#1c2240',
  eye: '#ffd84a',
  hoodie: '#22b8a8',
  hoodieDark: '#178c82',
  collar: '#f2742b',
  pants: '#24305a',
  glove: '#24305a',
  shoe: '#f7f4ee',
  sole: '#f2742b',
  shoeAccent: '#2f6fd1',
  earTipL: '#2ec7e6',
  earTipR: '#f2742b',
  pack: '#4a5263',
  lens: '#5ee7ff',
  cable: '#b8e04a',
  blush: '#f7a6a0',
  earInner: '#f3c3c8',
  strap: '#363c4a',
};

/**
 * El Nexus en 3D, armado con primitivas (como Nico en Calle 85) y animación procedural.
 * Mantiene la identidad de la Decisión 012/017: orejas de conejo con puntas de color,
 * cabeza clara con cara oscura y ojos amarillos, hoodie turquesa y mochila con cable.
 * El grupo raíz está a la altura de los pies y mira hacia +Z.
 */
export class Nexus3D {
  readonly root = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  /** Materiales propios de cada pieza, para el armario (copias de `toon`: el Nexus no se apaga con el pueblo). */
  private readonly mat = {
    hoodie: toon(C.hoodie, 2).clone(),
    hoodieDark: toon(C.hoodieDark).clone(),
    pack: toon(C.pack).clone(),
    tipL: toon(C.earTipL).clone(),
    tipR: toon(C.earTipR).clone(),
    cable: toon(C.cable).clone(),
  };
  /** Accesorio de la cabeza (armario). */
  private readonly hat = new THREE.Group();
  private hatId = 'nada';
  heading = 0;
  /**
   * Hacia dónde mira cuando se queda quieto (o null para no girar). En la vista isométrica
   * WorldMode lo apunta a la cámara: así se le ve la cara y no la mochila.
   */
  idleFacing: number | null = null;
  private idleT = 0;

  private readonly body = new THREE.Group();
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly earL = new THREE.Group();
  private readonly earR = new THREE.Group();
  private readonly lens: THREE.Mesh;
  private readonly cable: THREE.Mesh;
  private readonly cableCurve: THREE.CatmullRomCurve3;
  private phase = 0;
  private time = 0;
  private earSwing = 0;
  private celebrateT = -1;
  private reachT = -1;
  private blinkT = 2;
  private readonly eyes: THREE.Mesh[] = [];
  /** Carga de la mochila Atrapachispas (0..1): la lente brilla más cuanto más llena. */
  charge = 0;
  private chargePulse = 0;
  private readonly packGlow: THREE.Mesh;
  private hoodBack!: THREE.Mesh;
  private readonly hoodUp = new THREE.Group();
  readonly board = makeBoard();
  /** Multiplica la velocidad al caminar (Mundo Voltio: más rápido). */
  speedScale = 1;
  /** Andando en patineta. */
  riding = false;
  /** Deslizando por una baranda. */
  grinding = false;
  /** Cuánto se inclina la patineta al doblar (−1..1). */
  lean = 0;
  /** En el aire (saltando o cayendo): piernas recogidas y brazos abiertos. */
  airborne = false;
  /** Colgado de la tirolesa: brazos arriba, piernas colgando. */
  hanging = false;
  private danceT = -1;
  private waveT = -1;
  private landT = -1;

  constructor() {
    this.root.add(this.body);
    // Un poco más grande que "a escala": el protagonista tiene que leerse bien en el celular
    this.root.scale.setScalar(1.3);

    // Piernas (pivote en la cadera) con zapatillas blancas, suela naranja y detalle azul
    for (const [leg, x] of [[this.legL, 0.08], [this.legR, -0.08]] as const) {
      leg.position.set(x, 0.34, 0);
      const thigh = rounded(new THREE.CapsuleGeometry(0.065, 0.18, 4, 10), toon(C.pants), 0.014);
      thigh.position.y = -0.155;
      leg.add(thigh);
      const shoe = new THREE.Group();
      shoe.position.set(0, -0.3, 0.03);
      const upper = box(0.13, 0.08, 0.21, C.shoe, { outline: 0.012 });
      shoe.add(upper);
      const sole = box(0.135, 0.03, 0.22, C.sole, { outline: false });
      sole.position.y = -0.05;
      shoe.add(sole);
      const accent = box(0.137, 0.035, 0.08, C.shoeAccent, { outline: false });
      accent.position.set(0, 0.005, -0.03);
      shoe.add(accent);
      leg.add(shoe);
      this.body.add(leg);
    }

    // Cadera y torso con hoodie
    const hips = rounded(new THREE.SphereGeometry(0.13, 14, 10), toon(C.pants), 0.014);
    hips.scale.set(1.2, 0.7, 0.95);
    hips.position.y = 0.36;
    this.body.add(hips);

    const torso = rounded(new THREE.CapsuleGeometry(0.155, 0.12, 6, 14), this.mat.hoodie, 0.016);
    torso.scale.set(1.12, 1, 0.86);
    torso.position.y = 0.52;
    this.body.add(torso);

    const pocket = rounded(new THREE.CylinderGeometry(0.15, 0.16, 0.07, 14), this.mat.hoodieDark, 0);
    pocket.scale.set(1.12, 1, 0.86);
    pocket.position.y = 0.42;
    this.body.add(pocket);

    const zip = box(0.018, 0.2, 0.01, '#f4ecdc', { outline: false });
    zip.position.set(0, 0.52, 0.137);
    this.body.add(zip);

    for (const sx of [-0.04, 0.04]) {
      const cord = box(0.012, 0.08, 0.012, '#f4ecdc', { outline: false });
      cord.position.set(sx, 0.6, 0.14);
      this.body.add(cord);
    }

    const collar = rounded(new THREE.TorusGeometry(0.1, 0.035, 8, 16), toon(C.collar), 0.012);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.68;
    this.body.add(collar);

    const hood = rounded(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), this.mat.hoodie, 0.014);
    hood.rotation.x = -Math.PI / 2 - 0.3;
    hood.position.set(0, 0.68, -0.1);
    this.body.add(hood);
    this.hoodBack = hood;

    // Brazos (pivote en el hombro) con guantes oscuros
    for (const [arm, x] of [[this.armL, 0.2], [this.armR, -0.2]] as const) {
      arm.position.set(x, 0.62, 0);
      const sleeve = rounded(new THREE.CapsuleGeometry(0.056, 0.15, 4, 10), this.mat.hoodie, 0.014);
      sleeve.position.y = -0.12;
      arm.add(sleeve);
      const cuff = rounded(new THREE.TorusGeometry(0.052, 0.018, 6, 14), toon(C.collar), 0.008);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.215;
      arm.add(cuff);
      const hand = rounded(new THREE.SphereGeometry(0.066, 12, 8), toon(C.glove), 0.014);
      hand.position.y = -0.27;
      arm.add(hand);
      // Pulgar: la mano deja de ser una bolita
      const thumb = rounded(new THREE.CapsuleGeometry(0.022, 0.03, 3, 6), toon(C.glove), 0.008);
      thumb.position.set(0, -0.255, 0.05);
      thumb.rotation.x = 0.7;
      arm.add(thumb);
      this.body.add(arm);
    }

    // Mochila con lente y cable de energía colgando
    const pack = new THREE.Group();
    pack.position.set(0, 0.54, -0.2);
    const packBody = box(0.24, 0.27, 0.13, '', { mat: this.mat.pack, outline: 0.014 });
    pack.add(packBody);
    const lensRim = rounded(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16), toon('#2a2f3c'), 0.01);
    lensRim.rotation.x = Math.PI / 2;
    lensRim.position.z = -0.075;
    pack.add(lensRim);
    this.lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.045, 16), glow(C.lens));
    this.lens.rotation.x = Math.PI / 2;
    this.lens.position.z = -0.08;
    pack.add(this.lens);
    this.packGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    this.packGlow.position.z = -0.09;
    pack.add(this.packGlow);
    // Detalles de la mochila: manija, bolsillos laterales, rejilla y hebilla
    const handle = rounded(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), toon(C.strap), 0.006);
    handle.position.set(0, 0.135, 0);
    pack.add(handle);
    for (const sx of [-0.135, 0.135]) {
      const side = box(0.04, 0.14, 0.1, '#3d4453', { outline: 0.008 });
      side.position.set(sx, -0.05, 0);
      pack.add(side);
    }
    for (let i = 0; i < 3; i += 1) {
      const vent = box(0.12, 0.012, 0.01, '#2a2f3c', { outline: false });
      vent.position.set(0, 0.095 - i * 0.022, -0.068);
      pack.add(vent);
    }
    const flap = box(0.2, 0.05, 0.02, '#3d4453', { outline: 0.008 });
    flap.position.set(0, -0.1, -0.07);
    pack.add(flap);
    const buckle = box(0.04, 0.03, 0.012, '#c9ccd4', { outline: false });
    buckle.position.set(0, -0.1, -0.082);
    pack.add(buckle);
    this.body.add(pack);

    // Tirantes: pasan por los hombros y bajan por el pecho
    for (const sx of [-0.1, 0.1]) {
      const top = box(0.045, 0.02, 0.3, C.strap, { outline: false });
      top.position.set(sx, 0.665, -0.03);
      this.body.add(top);
      const front = box(0.045, 0.2, 0.02, C.strap, { outline: false });
      front.position.set(sx, 0.56, 0.128);
      front.rotation.x = -0.12;
      this.body.add(front);
      const clip = box(0.05, 0.03, 0.015, '#c9ccd4', { outline: false });
      clip.position.set(sx, 0.5, 0.14);
      this.body.add(clip);
    }

    this.cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.42, -0.24),
      new THREE.Vector3(0.12, 0.3, -0.27),
      new THREE.Vector3(0.1, 0.2, -0.26),
      new THREE.Vector3(0.06, 0.16, -0.24),
    ]);
    this.cable = new THREE.Mesh(new THREE.TubeGeometry(this.cableCurve, 12, 0.014, 6), this.mat.cable);
    this.cable.castShadow = true;
    this.body.add(this.cable);

    // Cabeza grande: casco claro, cara oscura tipo visor, ojos amarillos que brillan
    this.head.position.y = 0.7;
    const skull = rounded(new THREE.SphereGeometry(0.27, 24, 18), toon(C.head, 2), 0.02);
    skull.scale.set(1.06, 0.94, 1);
    skull.position.y = 0.25;
    this.head.add(skull);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), toon(C.face));
    face.scale.set(1.05, 0.74, 0.55);
    face.position.set(0, 0.22, 0.16);
    this.head.add(face);
    for (const ex of [-0.075, 0.075]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), glow(C.eye));
      eye.scale.set(0.78, 1.3, 0.5);
      eye.position.set(ex, 0.23, 0.258);
      this.head.add(eye);
      this.eyes.push(eye);
      // Brillo del ojo: le da mirada
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), glow('#ffffff'));
      shine.position.set(-0.016, 0.034, 0.03);
      eye.add(shine);
    }
    // Sonrisa chiquita en el visor
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 10, Math.PI), glow(C.eye));
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.16, 0.262);
    this.head.add(smile);
    // Borde del visor (marco claro alrededor de la cara)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 28), toon('#c9d3e6'));
    rim.scale.set(1.05, 0.74, 1);
    rim.position.set(0, 0.22, 0.225);
    rim.rotation.x = -0.18;
    this.head.add(rim);
    // Cachetes rosados, al costado del visor
    for (const bx of [-0.17, 0.17]) {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), toon(C.blush));
      blush.scale.set(1.2, 0.7, 0.4);
      blush.position.set(bx, 0.14, 0.215);
      blush.rotation.y = bx * 2.6;
      this.head.add(blush);
    }

    // Orejas de conejo con puntas de color distinto (izq. celeste, der. naranja)
    for (const [ear, x, tip, tilt] of [
      [this.earL, 0.11, C.earTipL, -0.2],
      [this.earR, -0.11, C.earTipR, 0.2],
    ] as const) {
      ear.position.set(x, 0.43, -0.02);
      ear.rotation.z = tilt;
      const earGeo = new THREE.CapsuleGeometry(0.066, 0.26, 6, 12);
      earGeo.translate(0, 0.18, 0);
      const earMesh = rounded(earGeo, toon(C.head, 2), 0.018);
      earMesh.scale.set(1, 1, 0.8);
      ear.add(earMesh);
      const innerGeo = new THREE.CapsuleGeometry(0.036, 0.2, 4, 10);
      innerGeo.translate(0, 0.17, 0);
      const inner = new THREE.Mesh(innerGeo, toon(C.earInner));
      inner.scale.set(1, 1, 0.5);
      inner.position.z = 0.03;
      ear.add(inner);
      const tipGeo = new THREE.CapsuleGeometry(0.068, 0.06, 6, 12);
      tipGeo.translate(0, 0.33, 0);
      const tipMesh = new THREE.Mesh(tipGeo, tip === C.earTipL ? this.mat.tipL : this.mat.tipR);
      tipMesh.scale.set(1, 1, 0.82);
      tipMesh.castShadow = true;
      ear.add(tipMesh);
      this.head.add(ear);
    }
    this.body.add(this.head);

    // Capucha puesta (Modo Voltio): cubre la cabeza dejando la cara al aire, con costuras de neón
    const hoodGeo = new THREE.SphereGeometry(0.31, 22, 14, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.7);
    const hoodUp = rounded(hoodGeo, this.mat.hoodie, 0.016);
    hoodUp.scale.set(1.08, 0.98, 1.05);
    hoodUp.position.y = 0.25;
    this.hoodUp.add(hoodUp);
    for (const side of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.012, 4, 24, Math.PI * 0.62), glow('#5ee7ff'));
      seam.rotation.set(0, side * 0.55, Math.PI * 0.19);
      seam.position.y = 0.25;
      this.hoodUp.add(seam);
    }
    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 4, 24, Math.PI * 0.9), glow('#ff4fd8'));
    crest.rotation.set(0, Math.PI / 2, Math.PI * 0.05);
    crest.position.y = 0.25;
    this.hoodUp.add(crest);
    this.hoodUp.visible = false;
    this.head.add(this.hoodUp);
    this.head.add(this.hat);

    // Patineta (se ve solo al andar en ella)
    this.board.visible = false;
    this.root.add(this.board);

    // Cada malla recuerda qué pieza es (el armario la recolorea aunque después le copien el material)
    const roles = Object.entries(this.mat) as [keyof typeof this.mat, THREE.MeshToonMaterial][];
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const role = roles.find(([, mat]) => mat === m.material);
      if (role) m.userData.look = role[0];
    });
  }

  /** Ajuste que se aplica a cada material nuevo del Nexus (la silueta usa el stencil). */
  materialHook: ((m: THREE.Mesh) => void) | null = null;

  /** Punto del que sale el cable de energía (la lente de la mochila), en coordenadas de mundo. */
  plugPoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.lens.getWorldPosition(out);
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Capucha arriba (Modo Voltio) o abajo. */
  /** Ropa del armario: colores y accesorio. */
  applyLook(look: NexusLook): void {
    const h = option(HOODIES, look.hoodie);
    this.mat.hoodie.color.set(h.color!);
    this.mat.hoodieDark.color.set(h.color2!);
    this.mat.pack.color.set(option(PACKS, look.pack).color!);
    const e = option(EARS, look.ears);
    this.mat.tipL.color.set(e.color!);
    this.mat.tipR.color.set(e.color2!);
    this.mat.cable.color.set(option(CABLES, look.cable).color!);
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      const role = m.userData.look as keyof typeof this.mat | undefined;
      if (m.isMesh && role) (m.material as THREE.MeshToonMaterial).color.copy(this.mat[role].color);
    });
    this.setHat(option(HATS, look.hat).id);
  }

  private setHat(id: string): void {
    if (id === this.hatId) return;
    this.hatId = id;
    this.hat.clear();
    const add = (m: THREE.Object3D, x: number, y: number, z: number) => {
      m.position.set(x, y, z);
      this.hat.add(m);
      m.traverse((o) => {
        o.castShadow = true;
        if ((o as THREE.Mesh).isMesh) this.materialHook?.(o as THREE.Mesh);
      });
      return m;
    };
    if (id === 'lazo') {
      for (const s of [-1, 1]) {
        const loop = rounded(new THREE.ConeGeometry(0.06, 0.12, 8), toon('#ff5a6e'), 0.008);
        loop.rotation.z = (s * Math.PI) / 2;
        add(loop, 0.11 + s * 0.06, 0.5, 0.02);
      }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toon('#ff5a6e')), 0.11, 0.5, 0.02);
    } else if (id === 'gorra') {
      add(rounded(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#ff9f43'), 0.012), 0, 0.42, 0);
      const visor = box(0.24, 0.025, 0.18, '#2c3f66', { outline: 0.008 });
      add(visor, 0, 0.43, -0.28);
    } else if (id === 'paja') {
      add(rounded(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 16), toon('#f2d38a'), 0.01), 0, 0.53, 0);
      add(rounded(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 22), toon('#f2d38a'), 0.008), 0, 0.47, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.2, 0.04, 16), toon('#ff5a6e')), 0, 0.5, 0);
    } else if (id === 'corona') {
      add(rounded(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16, 1, true), toon('#ffd23a'), 0.01), 0, 0.53, 0);
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), toon('#ffd23a')), Math.cos(a) * 0.16, 0.62, Math.sin(a) * 0.16);
      }
      add(new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), glow('#ff4fd8')), 0, 0.55, 0.17);
    } else if (id === 'pato') {
      const body = add(rounded(new THREE.SphereGeometry(0.12, 12, 10), toon('#ffd23a'), 0.01), 0, 0.56, 0);
      body.scale.set(1, 0.8, 1.2);
      add(rounded(new THREE.SphereGeometry(0.075, 10, 8), toon('#ffd23a'), 0.008), 0, 0.68, 0.08);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 6), toon('#ff9f43'));
      beak.rotation.x = Math.PI / 2;
      add(beak, 0, 0.67, 0.17);
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), toon('#1d1630')), s * 0.03, 0.7, 0.14);
    } else if (id === 'capitan') {
      add(rounded(new THREE.CylinderGeometry(0.22, 0.19, 0.12, 16), toon('#fff3dc'), 0.012), 0, 0.53, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.035, 16), toon('#1d1630')), 0, 0.49, 0);
      add(box(0.22, 0.02, 0.14, '#1d1630', { outline: 0.008 }), 0, 0.48, 0.22);
      add(new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), glow('#ffd23a')), 0, 0.53, 0.2);
    }
  }

  setHood(up: boolean): void {
    this.hoodUp.visible = up;
    this.hat.visible = !up;
    this.hoodBack.visible = !up;
  }

  get hoodIsUp(): boolean {
    return this.hoodUp.visible;
  }

  /** Baile corto (unos 2,4 s). */
  dance(): void {
    this.danceT = 0;
  }

  get dancing(): boolean {
    return this.danceT >= 0;
  }

  /** Saludo con la mano (al hablar con un vecino). */
  wave(): void {
    this.waveT = 0;
  }

  /** Aterrizaje: se aplasta un poquito y rebota. */
  land(): void {
    this.landT = 0;
  }

  /** La mochila recibió chispitas: un destello corto. */
  sparkle(): void {
    this.chargePulse = 1;
  }

  celebrate(): void {
    this.celebrateT = 0;
  }

  /** Gesto corto de "estirar el brazo" al tocar un objeto. */
  reach(): void {
    this.reachT = 0;
  }

  /** dir: dirección deseada en el plano XZ (magnitud 0..1). */
  move(dirX: number, dirZ: number, dt: number): void {
    const tx = dirX * SPEED * this.speedScale;
    const tz = dirZ * SPEED * this.speedScale;
    this.velocity.x = damp(this.velocity.x, tx, ACCEL, dt);
    this.velocity.z = damp(this.velocity.z, tz, ACCEL, dt);
    this.root.position.x += this.velocity.x * dt;
    this.root.position.z += this.velocity.z * dt;
    if (Math.hypot(dirX, dirZ) > 0.15) {
      this.heading = dampAngle(this.heading, Math.atan2(dirX, dirZ), 12, dt);
    }
  }

  animate(dt: number): void {
    this.time += dt;
    const speed = this.speed;
    const k = clamp(speed / SPEED, 0, 1);
    this.phase += dt * (4 + speed * 2.1);
    const s = Math.sin(this.phase);

    // Quieto un rato → gira despacio hacia la cámara (se le ve la cara)
    if (speed < 0.15 && this.celebrateT < 0) this.idleT += dt;
    else this.idleT = 0;
    if (this.idleFacing !== null && this.idleT > 0.9) {
      this.heading = dampAngle(this.heading, this.idleFacing, 3, dt);
    }
    this.root.rotation.y = this.heading;

    // Caminar: piernas y brazos en oposición, rebote del cuerpo, leve inclinación hacia adelante
    this.legL.rotation.x = s * 0.75 * k;
    this.legR.rotation.x = -s * 0.75 * k;
    this.armL.rotation.x = -s * 0.65 * k;
    this.armR.rotation.x = s * 0.65 * k;
    this.armL.rotation.z = 0.12;
    this.armR.rotation.z = -0.12;
    const bob = Math.abs(Math.cos(this.phase)) * 0.045 * k;
    const breathe = Math.sin(this.time * 2.2) * 0.008 * (1 - k);
    this.body.position.y = bob + breathe;
    this.body.rotation.x = 0.1 * k;

    // Orejas: se quedan atrás al acelerar y rebotan con el paso
    this.earSwing = damp(this.earSwing, -0.5 * k, 6, dt);
    const flop = Math.sin(this.phase * 2) * 0.12 * k + Math.sin(this.time * 1.7) * 0.04;
    this.earL.rotation.x = this.earSwing + flop;
    this.earR.rotation.x = this.earSwing - flop * 0.8;
    this.head.rotation.x = -0.05 * k + Math.sin(this.phase * 2) * 0.03 * k;

    // Parpadeo
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12 && this.blinkT > 0 ? 0.15 : 1;
    if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 3;
    for (const eye of this.eyes) eye.scale.y = 1.3 * blink;

    // Cable de la mochila se balancea
    const sway = Math.sin(this.time * 3 + this.phase) * 0.03 * (0.3 + k);
    const pts = this.cableCurve.points;
    pts[1].x = 0.12 + sway;
    pts[2].x = 0.1 + sway * 1.6;
    pts[3].x = 0.06 + sway * 2;
    pts[3].z = -0.24 - k * 0.08;
    this.cable.geometry.dispose();
    this.cable.geometry = new THREE.TubeGeometry(this.cableCurve, 12, 0.014, 6);

    // En el aire: piernas recogidas, brazos abiertos (parece que vuela)
    if (this.airborne && !this.hanging && !this.riding) {
      this.legL.rotation.x = 0.7;
      this.legR.rotation.x = -0.25;
      this.armL.rotation.z = 0.9;
      this.armR.rotation.z = -0.9;
      this.armL.rotation.x = this.armR.rotation.x = -0.3;
      this.body.rotation.x = -0.05;
      this.earL.rotation.x = this.earR.rotation.x = -0.9;
    }
    // En patineta: de costado, un pie adelante y otro atrás, brazos abiertos para el equilibrio
    this.board.visible = this.riding;
    if (this.riding) {
      const crouch = this.grinding ? 0.12 : this.airborne ? 0.08 : 0.03;
      this.body.position.y = 0.15 - crouch + Math.sin(this.time * 3) * 0.008;
      this.body.rotation.y = 0.9;
      this.body.rotation.z = this.lean * 0.25;
      this.legL.rotation.set(0.45, 0, 0.12);
      this.legR.rotation.set(-0.4, 0, -0.12);
      this.armL.rotation.set(-0.2, 0, 1.0 + this.lean * 0.3);
      this.armR.rotation.set(0.2, 0, -1.0 + this.lean * 0.3);
      this.head.rotation.y = -0.8;
      this.board.rotation.z = -this.lean * 0.12;
      this.board.rotation.x = this.airborne && !this.grinding ? -0.15 : 0;
      this.earL.rotation.x = this.earR.rotation.x = -0.4 - Math.min(1, this.speed / 8) * 0.6;
    } else {
      this.body.rotation.z = 0;
      this.body.rotation.y = 0;
      this.head.rotation.y = 0;
      this.legL.rotation.z = this.legR.rotation.z = 0;
    }
    // Colgado de la tirolesa: las dos manos arriba en el cable, piernas que se mecen
    if (this.hanging) {
      this.armL.rotation.set(-Math.PI * 0.95, 0, 0.15);
      this.armR.rotation.set(-Math.PI * 0.95, 0, -0.15);
      const swing = Math.sin(this.time * 6) * 0.35;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = swing * 0.8;
      this.body.position.y = 0;
      this.body.rotation.x = 0;
      this.earL.rotation.x = this.earR.rotation.x = -1.1;
    }
    // Aterrizaje
    if (this.landT >= 0) {
      this.landT += dt / 0.25;
      const sq = Math.sin(Math.min(this.landT, 1) * Math.PI);
      this.body.scale.set(1 + sq * 0.12, 1 - sq * 0.18, 1 + sq * 0.12);
      if (this.landT >= 1) {
        this.landT = -1;
        this.body.scale.set(1, 1, 1);
      }
    }
    // Baile: gira la cadera, brazos arriba alternados, saltitos y orejas locas
    if (this.danceT >= 0) {
      this.danceT += dt;
      const d = this.danceT;
      const beat = Math.sin(d * 9);
      this.body.rotation.y = Math.sin(d * 4.5) * 0.6;
      this.body.position.y += Math.abs(beat) * 0.12;
      this.armL.rotation.x = -2.4 + Math.max(0, beat) * 0.6;
      this.armR.rotation.x = -2.4 + Math.max(0, -beat) * 0.6;
      this.armL.rotation.z = 0.4 + beat * 0.3;
      this.armR.rotation.z = -0.4 + beat * 0.3;
      this.legL.rotation.x = Math.max(0, beat) * 0.5;
      this.legR.rotation.x = Math.max(0, -beat) * 0.5;
      this.earL.rotation.x = Math.sin(d * 12) * 0.5;
      this.earR.rotation.x = Math.cos(d * 12) * 0.5;
      this.head.rotation.z = Math.sin(d * 4.5) * 0.2;
      if (d >= 2.4) {
        this.danceT = -1;
        this.body.rotation.y = 0;
        this.head.rotation.z = 0;
      }
    }
    // Saludo con la mano derecha
    if (this.waveT >= 0) {
      this.waveT += dt / 1.2;
      const w = Math.sin(Math.min(this.waveT, 1) * Math.PI);
      this.armR.rotation.x = -2.6 * w;
      this.armR.rotation.z = -0.3 - Math.sin(this.time * 14) * 0.4 * w;
      if (this.waveT >= 1) this.waveT = -1;
    }

    // Gesto de alcanzar
    if (this.reachT >= 0) {
      this.reachT += dt / 0.35;
      const r = Math.sin(Math.min(this.reachT, 1) * Math.PI);
      this.armL.rotation.x = -1.4 * r;
      if (this.reachT >= 1) this.reachT = -1;
    }

    // Festejo: salto con giro y brazos arriba
    if (this.celebrateT >= 0) {
      this.celebrateT += dt / 0.9;
      const t = Math.min(this.celebrateT, 1);
      this.body.position.y += Math.sin(t * Math.PI) * 0.55;
      this.body.rotation.y = t * Math.PI * 2;
      this.armL.rotation.x = this.armR.rotation.x = Math.PI * 0.85 * Math.sin(t * Math.PI);
      this.armL.rotation.z = 0.5 * Math.sin(t * Math.PI);
      this.armR.rotation.z = -0.5 * Math.sin(t * Math.PI);
      if (this.celebrateT >= 1) {
        this.celebrateT = -1;
        this.body.rotation.y = 0;
      }
    }

    // La lente pasa de cian apagado (vacía) a dorado brillante (llena) y late con la carga
    const c = this.charge;
    this.chargePulse = Math.max(0, this.chargePulse - dt * 2.5);
    (this.lens.material as THREE.MeshBasicMaterial).color.setHSL(0.52 - c * 0.38, 0.9, 0.35 + c * 0.3 + Math.sin(this.time * 4) * 0.06 * c);
    const glowMat = this.packGlow.material as THREE.MeshBasicMaterial;
    glowMat.opacity = c * 0.35 + this.chargePulse * 0.5;
    this.packGlow.scale.setScalar(1 + c * 0.6 + this.chargePulse * 1.2 + Math.sin(this.time * 5) * 0.1 * c);
  }
}

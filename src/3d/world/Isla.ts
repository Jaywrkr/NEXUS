import * as THREE from 'three';
import { box, keepVivid, rounded, toon, withLife } from '../core/render';
import { makeGray } from './revive';
import { roomShell, type ReviveRoom } from './MigaHouse';
import type { Rect } from './World';

/*
 * Expansión, Fase 17 (PLAN_EXPANSION.md): la Isla misteriosa, al sur, cruzando el mar. Se llega en la lancha
 * de Marina (sale de la punta del muelle oeste del Puerto cuando el faro chiquito de la Playa está prendido).
 * Selva, cueva con eco, tortugas dormidas, el templo de la chispa antigua (portón con circuito del Mundo
 * Voltio; adentro, x = 1400, tres piedras que se prenden en el orden que muestra el mural) y un volcán
 * dormido al que se sube por rocas en espiral para despertar su corazón.
 */

export const ISLA_REGION: Rect = { minX: -24, maxX: 44, minZ: 150, maxZ: 196 };
/** Muelle de la isla (donde llega la lancha). */
export const ISLA_PIER: Rect = { minX: 8, maxX: 12, minZ: 139, maxZ: 151 };
export const ISLA_X = 1400;

export const LANCHA = {
  /** En la punta del muelle oeste del Puerto. */
  portDock: { x: -19.5, z: 110.5 },
  islandDock: { x: 10, z: 140.5 },
  source: { x: -21.2, z: 106 },
  route: [
    [-19.5, 114.5],
    [-12, 124],
    [2, 132],
    [10, 137],
  ] as [number, number][],
};

export const VOLCANO = { x: 30, z: 182, r: 6.2, h: 6.3 };
/** Rocas en espiral alrededor del volcán (cada una 0,9 m más alta, pegadas). */
export const VOLCANO_STEPS: { x: number; z: number; h: number }[] = Array.from({ length: 7 }, (_, i) => {
  const a = 0.15 + i * 0.29;
  return { x: VOLCANO.x + Math.cos(a) * 7.8, z: VOLCANO.z + Math.sin(a) * 7.8, h: 0.9 * (i + 1) };
});

export const ISLA = {
  pip: { x: 16, z: 157, faceX: 18, faceZ: 165 },
  temple: { x: -6, z: 178, w: 14, d: 10 },
  templeNodes: [
    { x: -12, z: 188 },
    { x: -6, z: 191 },
    { x: 0, z: 188 },
  ],
  cave: { x: -18, z: 164, r: 3.2 },
  heart: { x: 30, z: 182 },
  heartSource: { x: 27.6, z: 184.4 },
  spring: { x: 22, z: 192 },
  turtles: [
    [-20, 154],
    [0, 152.5],
    [38, 156],
    [40, 192],
    [-21, 192],
  ] as [number, number][],
  chispi: { x: -12, z: 170 },
};

export interface IslaInfo {
  hall: ReviveRoom & { stones: { x: number; z: number }[]; altar: { x: number; z: number } };
  /** Abre el portón del templo. */
  openTemple(): void;
  /** El volcán despierta: humito, brillo y la vertiente tibia. */
  wakeVolcano(): void;
  update(t: number): void;
}

export function buildIsla(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): IslaInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = ISLA_REGION;
  // La isla: arena alrededor y selva en el medio
  add(box(R.maxX - R.minX + 6, 0.9, R.maxZ - R.minZ + 6, '#f2dca0', { outline: 0.04, cast: false, brush: 24 }), (R.minX + R.maxX) / 2, -0.42, (R.minZ + R.maxZ) / 2);
  add(box(R.maxX - R.minX - 8, 0.08, R.maxZ - R.minZ - 10, '#6fae4a', { outline: false, cast: false, brush: 20 }), (R.minX + R.maxX) / 2, 0.05, (R.minZ + R.maxZ) / 2 + 2);
  const P = ISLA_PIER;
  add(box(P.maxX - P.minX, 0.4, P.maxZ - P.minZ, '#a97a52', { outline: 0.02, brush: 6 }), (P.minX + P.maxX) / 2, -0.18, (P.minZ + P.maxZ) / 2);
  for (const z of [140, 144, 148]) for (const x of [P.minX, P.maxX]) add(rounded(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8), toon('#6a3e26'), 0.006), x, -0.4, z);
  // Muelle oeste del Puerto: poste y cartel de la lancha
  add(rounded(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), toon('#6a3e26'), 0.006), LANCHA.portDock.x - 2.2, 1.1, LANCHA.portDock.z);

  // Selva: árboles grandes y hojas gigantes
  const jungle = toon('#3f8a3a');
  for (let i = 0; i < 26; i += 1) {
    const x = R.minX + 4 + ((i * 37) % (R.maxX - R.minX - 8));
    const z = R.minZ + 6 + ((i * 53) % (R.maxZ - R.minZ - 10));
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < 11.5) continue;
    if (Math.abs(x - ISLA.temple.x) < 9 && Math.abs(z - ISLA.temple.z) < 9) continue;
    if (Math.hypot(x - ISLA.cave.x, z - ISLA.cave.z) < 6) continue;
    if (Math.abs(x - 10) < 4 && z < 162) continue;
    if (Math.hypot(x - ISLA.pip.x, z - ISLA.pip.z) < 4) continue;
    add(rounded(new THREE.CylinderGeometry(0.25, 0.35, 4.5, 8), toon('#7a5a3a'), 0.008), x, 2.25, z);
    add(rounded(new THREE.IcosahedronGeometry(1.8, 0), jungle, 0.03), x, 5, z);
    circles.push({ x, z, r: 0.45 });
  }
  for (let i = 0; i < 18; i += 1) {
    const x = R.minX + 3 + ((i * 29) % (R.maxX - R.minX - 6));
    const z = R.minZ + 4 + ((i * 41) % (R.maxZ - R.minZ - 8));
    const leaf = box(0.7, 0.05, 1.8, '#4f9e3e', { outline: 0.006 });
    leaf.rotation.set(0.5, i, 0);
    add(leaf, x, 0.5, z);
  }

  // Cueva del eco: arco de rocas
  const C = ISLA.cave;
  for (let i = 0; i < 9; i += 1) {
    const a = Math.PI * 0.95 + (i / 8) * Math.PI * 1.1;
    const rock = rounded(new THREE.DodecahedronGeometry(1.4, 0), toon('#6e6a62'), 0.02);
    add(rock, C.x + Math.cos(a) * C.r, 1 + Math.sin((i / 8) * Math.PI) * 1.8, C.z + Math.sin(a) * C.r);
    circles.push({ x: C.x + Math.cos(a) * C.r, z: C.z + Math.sin(a) * C.r, r: 0.9 });
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(C.r - 0.4, 20), new THREE.MeshBasicMaterial({ color: '#2a2630' })), C.x, 0.07, C.z).rotation.x = -Math.PI / 2;

  // Templo de la chispa antigua (mira a +Z), con lianas y portón de piedra
  const T = ISLA.temple;
  add(box(T.w, 5, T.d, '#9a9484', { outline: 0.05, brush: 4 }), T.x, 2.5, T.z);
  add(box(T.w - 2, 1.5, T.d - 2, '#8a8474', { outline: 0.04 }), T.x, 5.75, T.z);
  add(box(T.w - 5, 1.2, T.d - 5, '#7a7464', { outline: 0.03 }), T.x, 7.1, T.z);
  rects.push({ minX: T.x - T.w / 2, maxX: T.x + T.w / 2, minZ: T.z - T.d / 2, maxZ: T.z + T.d / 2 });
  for (let i = 0; i < 7; i += 1) add(box(0.12, 2 + (i % 3), 0.12, '#4f9e3e', { outline: false }), T.x - 6 + i * 2, 4 - (i % 3) * 0.5, T.z + T.d / 2 + 0.08);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), withLife(toon('#ffd23a')));
  add(star, T.x, 8.4, T.z);
  const doorZ = T.z + T.d / 2;
  const gate = new THREE.Group();
  const slab = box(3, 3.4, 0.4, '#6e6a5e', { outline: 0.02 });
  slab.position.y = 1.7;
  gate.add(slab);
  const glyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), toon('#4a4656'));
  glyph.position.set(0, 2, 0.25);
  gate.add(glyph);
  gate.userData.dynamic = true;
  add(gate, T.x, 0, doorZ + 0.2);
  const gateRect: Rect = { minX: T.x - 1.8, maxX: T.x + 1.8, minZ: doorZ, maxZ: doorZ + 0.5 };
  rects.push(gateRect);

  // Volcán dormido: cono truncado (su cima se pisa) y rocas en espiral
  const V = VOLCANO;
  const cone = rounded(new THREE.CylinderGeometry(V.r - 0.4, V.r + 1.3, V.h, 18), withLife(toon('#6e5a50')), 0.04);
  add(cone, V.x, V.h / 2, V.z);
  circles.push({ x: V.x, z: V.z, r: V.r, h: V.h });
  const craterMat = new THREE.MeshBasicMaterial({ color: '#4a3a36' });
  add(new THREE.Mesh(new THREE.CircleGeometry(1.6, 18), craterMat), V.x, V.h + 0.03, V.z).rotation.x = -Math.PI / 2;
  for (const s of VOLCANO_STEPS) {
    const rock = rounded(new THREE.CylinderGeometry(1.3, 1.4, s.h, 8), toon('#7a6a5e'), 0.02);
    add(rock, s.x, s.h / 2, s.z);
    circles.push({ x: s.x, z: s.z, r: 1.3, h: s.h });
  }
  const smoke: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: '#d8d0cc', transparent: true, opacity: 0.6, depthWrite: false }));
    m.visible = false;
    m.userData.dynamic = true;
    add(m, V.x, V.h + 1, V.z);
    smoke.push(m);
  }
  // Vertiente (se pone tibia y turquesa cuando despierta el volcán)
  const springMat = new THREE.MeshBasicMaterial({ color: '#6a7a80' });
  add(new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), springMat), ISLA.spring.x, 0.09, ISLA.spring.z).rotation.x = -Math.PI / 2;
  circles.push({ x: ISLA.spring.x, z: ISLA.spring.z, r: 1.8 });

  const hall = buildTemple(scene, rects);
  let awake = false;
  return {
    hall,
    openTemple() {
      gate.position.y = -3.3;
      glyph.material = toon('#ffd23a');
      const i = rects.indexOf(gateRect);
      if (i >= 0) rects.splice(i, 1);
    },
    wakeVolcano() {
      awake = true;
      craterMat.color.set('#ff7a2a');
      springMat.color.set('#5fd0e8');
      for (const s of smoke) s.visible = true;
    },
    update(t: number) {
      if (!awake) return;
      smoke.forEach((s, i) => {
        const k = (t * 0.25 + i / smoke.length) % 1;
        s.position.set(V.x + Math.sin(i * 2 + t * 0.3) * 0.8 * k, V.h + 0.8 + k * 6, V.z + Math.cos(i) * 0.5 * k);
        s.scale.setScalar(0.6 + k * 1.6);
        (s.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
      });
    },
  };
}

/** Templo por dentro: mural con el orden (luna → sol → estrella), tres piedras y el altar. */
function buildTemple(scene: THREE.Scene, rects: Rect[]): IslaInfo['hall'] {
  const RX = ISLA_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 14,
    d: 9,
    wall: '#a8a290',
    low: '#6e6a5e',
    trim: '#ffd23a',
    floor: ['#8a8474', '#7e786a'],
    base: '#4a4656',
    doorFrom: RX + 2.5,
    doorTo: RX + 4.5,
  });
  const { add, z0 } = k;
  // Mural: luna → sol → estrella
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#5a5444';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#ffd23a';
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 148);
  g.fillStyle = '#e8e2d0';
  // Luna
  g.beginPath();
  g.arc(90, 80, 38, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a5444';
  g.beginPath();
  g.arc(108, 68, 34, 0, Math.PI * 2);
  g.fill();
  // Sol
  g.fillStyle = '#ffd23a';
  g.beginPath();
  g.arc(256, 80, 30, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    g.fillRect(256 + Math.cos(a) * 42 - 4, 80 + Math.sin(a) * 42 - 4, 8, 8);
  }
  // Estrella
  g.fillStyle = '#7dffef';
  g.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 16 : 40;
    g.lineTo(422 + Math.cos(a) * r, 80 + Math.sin(a) * r);
  }
  g.fill();
  // Flechas
  g.fillStyle = '#e8e2d0';
  for (const x of [160, 330]) {
    g.fillRect(x, 74, 36, 12);
    g.beginPath();
    g.moveTo(x + 36, 62);
    g.lineTo(x + 56, 80);
    g.lineTo(x + 36, 98);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2), new THREE.MeshBasicMaterial({ map: tex })), RX - 1, 2.7, z0 + 0.08);
  // Columnas
  for (const dx of [-5.5, 5.5]) {
    add(rounded(new THREE.CylinderGeometry(0.35, 0.4, 3.6, 10), toon('#c8c0aa'), 0.01), RX + dx, 1.8, z0 + 1);
    rects.push({ minX: RX + dx - 0.4, maxX: RX + dx + 0.4, minZ: z0 + 0.6, maxZ: z0 + 1.4 });
  }
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
    spawn: { x: RX + 3.5, z: k.z1 - 1.3 },
    exit: { x: RX + 3.5, z: k.z1 - 0.3 },
    spark: { id: 'spark-room-templo', x: RX + 6, z: -3.4, y: 0.9 },
    source: { x: RX - 5.6, z: 2.6 },
    target: { x: RX, z: 1.4 },
    stones: [
      { x: RX - 3.4, z: -1.6 },
      { x: RX, z: -2.4 },
      { x: RX + 3.4, z: -1.6 },
    ],
    altar: { x: RX, z: 1.6 },
    gray,
  };
}

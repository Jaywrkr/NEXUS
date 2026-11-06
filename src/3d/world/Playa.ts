import * as THREE from 'three';
import { box, rounded, toon, withLife } from '../core/render';
import type { Rect } from './World';

/*
 * Expansión, Fase 16 (PLAN_EXPANSION.md): la Playa, al este del Puerto y al sur de la Estación, siguiendo la
 * costa. Arena con sombrillas, un kiosco con heladera, un castillo de arena gigante, la torre de Coral (la
 * salvavidas), cangrejos dormidos y una escollera con portón trabado (Mundo Voltio) que llega al faro
 * chiquito, que necesita DOS cables a la vez (panel solar y molinito). En patineta se puede **surfear**:
 * el mar de la orilla se vuelve caminable solo arriba de la tabla, y las olas hacen saltar.
 */

export const PLAYA_REGION: Rect = { minX: 46, maxX: 132, minZ: 64, maxZ: 96 };
/** Desde el Puerto, por la costanera. */
export const PLAYA_FROM_PORT: Rect = { minX: 43, maxX: 47, minZ: 76, maxZ: 84 };
/** Desde la Estación, bajando al sur. */
export const PLAYA_FROM_STATION: Rect = { minX: 70, maxX: 76, minZ: 61, maxZ: 65 };
/** Escollera de piedras hasta el faro chiquito. */
export const JETTY: Rect = { minX: 119.5, maxX: 124.5, minZ: 95.5, maxZ: 123 };
/** El mar de la orilla: solo se anda arriba de la patineta (surf). */
export const SURF_REGION: Rect = { minX: 50, maxX: 118, minZ: 95.5, maxZ: 112 };

export const PLAYA = {
  kiosco: { x: 62, z: 69.5, w: 8, d: 5 },
  fridge: { x: 64.5, z: 73.4 },
  kioscoSource: { x: 57.5, z: 75.5 },
  castle: { x: 88, z: 84 },
  castleSource: { x: 83.5, z: 80.5 },
  tower: { minX: 103, maxX: 105, minZ: 75, maxZ: 77, h: 2.2 },
  towerStep: { minX: 105, maxX: 106.2, minZ: 75.4, maxZ: 76.6, h: 1.1 },
  coral: { x: 101, z: 79.5, faceX: 103, faceZ: 86 },
  farito: { x: 122, z: 119.5 },
  panel: { x: 120.6, z: 112.5 },
  wind: { x: 123.4, z: 108.5 },
  gateZ: 97,
  nodes: [
    { x: 115, z: 92 },
    { x: 122, z: 90.5 },
    { x: 129, z: 92 },
  ],
  crabs: [
    [56, 92],
    [72, 94],
    [95, 93],
    [110, 92],
    [128, 88],
    [66, 86],
  ] as [number, number][],
  chispi: { x: 96, z: 68 },
  /** Olas: rampitas sobre el mar (hacen saltar en patineta). */
  waves: [
    { x: 64, z: 104, dirX: 1, dirZ: 0, halfW: 1.6, halfL: 1.2, ramp: false },
    { x: 84, z: 106, dirX: 1, dirZ: 0, halfW: 1.6, halfL: 1.2, ramp: false },
    { x: 104, z: 104, dirX: 1, dirZ: 0, halfW: 1.6, halfL: 1.2, ramp: false },
    { x: 94, z: 101, dirX: -1, dirZ: 0, halfW: 1.6, halfL: 1.2, ramp: false },
  ],
};

export interface PlayaInfo {
  /** Abre el portón de la escollera. */
  openGate(): void;
  /** Abre las sombrillas (cuando el kiosco vuelve). */
  openUmbrellas(): void;
  /** Olas que suben y bajan (se animan desde WorldMode). */
  waveMeshes: THREE.Object3D[];
}

export function buildPlaya(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): PlayaInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = PLAYA_REGION;
  // Arena (con vida), costanera y pasajes
  add(box(R.maxX - R.minX + 2, 0.1, R.maxZ - R.minZ + 1, '#f2dca0', { outline: false, cast: false, brush: 26 }), (R.minX + R.maxX) / 2, 0.03, (R.minZ + R.maxZ) / 2);
  add(box(R.maxX - R.minX, 0.08, 4, '#c9bfae', { outline: false, cast: false, brush: 8 }), (R.minX + R.maxX) / 2, 0.06, 66);
  for (const C of [PLAYA_FROM_PORT, PLAYA_FROM_STATION]) {
    add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#c9bfae', { outline: false, cast: false, brush: 6 }), (C.minX + C.maxX) / 2, 0.045, (C.minZ + C.maxZ) / 2);
  }
  // Mar de la orilla (turquesa, encima del mar del puerto) y espuma
  const shallow = new THREE.Mesh(
    new THREE.PlaneGeometry(SURF_REGION.maxX - SURF_REGION.minX + 14, SURF_REGION.maxZ - SURF_REGION.minZ),
    withLife(new THREE.MeshBasicMaterial({ color: '#5fd0e8', transparent: true, opacity: 0.6, depthWrite: false })),
  );
  shallow.rotation.x = -Math.PI / 2;
  add(shallow, (SURF_REGION.minX + SURF_REGION.maxX) / 2 + 7, -0.04, (SURF_REGION.minZ + SURF_REGION.maxZ) / 2);
  for (let x = R.minX + 2; x < R.maxX; x += 4) add(box(3, 0.05, 0.35, '#ffffff', { outline: false, cast: false }), x, -0.02, 96.6 + ((x * 7) % 3) * 0.2);
  // Olas (rampitas de espuma)
  const waveMeshes: THREE.Object3D[] = [];
  const foam = toon('#e8fbff');
  for (const k of PLAYA.waves) {
    const shape = new THREE.Shape();
    shape.moveTo(-k.halfL, 0);
    shape.quadraticCurveTo(k.halfL * 0.4, 0.1, k.halfL, 0.6);
    shape.lineTo(k.halfL, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: k.halfW * 2, bevelEnabled: false });
    geo.translate(0, 0, -k.halfW);
    const wave = new THREE.Mesh(geo, foam);
    wave.rotation.y = Math.atan2(-k.dirZ, k.dirX);
    wave.userData.dynamic = true;
    add(wave, k.x, -0.05, k.z);
    waveMeshes.push(wave);
  }

  // Kiosco de playa (mira a +Z)
  const K = PLAYA.kiosco;
  add(box(K.w, 3, K.d, '#4fa8e0', { outline: 0.04, brush: 3 }), K.x, 1.5, K.z);
  rects.push({ minX: K.x - K.w / 2, maxX: K.x + K.w / 2, minZ: K.z - K.d / 2, maxZ: K.z + K.d / 2 });
  const roof = box(K.w + 1.4, 0.3, K.d + 1.6, '#fff3dc', { outline: 0.03 });
  add(roof, K.x, 3.15, K.z + 0.3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(5, 1.1), withLife(new THREE.MeshBasicMaterial({ map: label('KIOSCO', '#e0453f') }))), K.x, 2.4, K.z + K.d / 2 + 0.03);
  add(box(4.5, 0.12, 0.8, '#c7a17a', { outline: 0.015 }), K.x - 1, 1.1, K.z + K.d / 2 + 0.35);

  // Sombrillas y toallas (las sombrillas se abren cuando vuelve el kiosco)
  const umbrellas: THREE.Object3D[] = [];
  const cols = ['#e0453f', '#ffd23a', '#4fa8e0', '#e77fa6', '#9be37a', '#ff9f43'];
  [
    [52, 86],
    [60, 80],
    [70, 88],
    [78, 78],
    [96, 88],
    [114, 82],
    [124, 76],
  ].forEach(([x, z], i) => {
    add(rounded(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), toon('#fff3dc'), 0.004), x, 1.2, z);
    circles.push({ x, z, r: 0.12 });
    const top = rounded(new THREE.ConeGeometry(1.4, 0.6, 8, 1, true), toon(cols[i % cols.length]), 0.01);
    top.position.set(x, 2.3, z);
    top.scale.set(0.25, 1, 0.25);
    top.userData.dynamic = true;
    scene.add(top);
    umbrellas.push(top);
    add(box(1, 0.04, 1.9, cols[(i + 2) % cols.length], { outline: 0.005, cast: false }), x + 1.3, 0.1, z + 0.4);
  });
  // Palmeras
  for (const [x, z] of [
    [48, 70],
    [80, 70],
    [110, 70],
    [130, 84],
    [92, 76],
  ] as [number, number][]) {
    const trunk = rounded(new THREE.CylinderGeometry(0.18, 0.26, 4.2, 8), toon('#a97a52'), 0.006);
    trunk.rotation.z = 0.12;
    add(trunk, x, 2.1, z);
    for (let i = 0; i < 6; i += 1) {
      const leaf = box(0.4, 0.06, 2, '#4f9e3e', { outline: 0.006 });
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(x + 0.25 + Math.cos(a) * 0.9, 4.1, z + Math.sin(a) * 0.9);
      leaf.rotation.y = -a + Math.PI / 2;
      leaf.rotation.x = 0.35;
      scene.add(leaf);
    }
    circles.push({ x, z, r: 0.3 });
  }

  // Torre de la salvavidas (se sube por el escalón)
  const T = PLAYA.tower;
  add(box(T.maxX - T.minX, 0.2, T.maxZ - T.minZ, '#fff3dc', { outline: 0.02 }), (T.minX + T.maxX) / 2, T.h - 0.1, (T.minZ + T.maxZ) / 2);
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    add(box(0.14, T.h, 0.14, '#e0453f', { outline: 0.008 }), (T.minX + T.maxX) / 2 + dx * 0.85, T.h / 2, (T.minZ + T.maxZ) / 2 + dz * 0.85);
  }
  add(box(2, 1, 0.08, '#e0453f', { outline: 0.01 }), (T.minX + T.maxX) / 2, T.h + 0.5, T.minZ + 0.04);
  rects.push({ ...T });
  const S = PLAYA.towerStep;
  add(box(S.maxX - S.minX, S.h, S.maxZ - S.minZ, '#c7a17a', { outline: 0.015 }), (S.minX + S.maxX) / 2, S.h / 2, (S.minZ + S.maxZ) / 2);
  rects.push({ ...S });
  const flag = box(0.7, 0.45, 0.03, '#e0453f', { outline: 0.006 });
  add(flag, T.maxX - 0.2, T.h + 2, T.minZ + 0.2);
  add(box(0.05, 1.8, 0.05, '#3d3550', { outline: false }), T.maxX - 0.55, T.h + 1.4, T.minZ + 0.2);

  // Escollera de piedras con portón trabado hasta el faro chiquito
  const J = JETTY;
  add(box(J.maxX - J.minX, 0.7, J.maxZ - J.minZ, '#8a8478', { outline: 0.03, brush: 6 }), (J.minX + J.maxX) / 2, -0.33, (J.minZ + J.maxZ) / 2);
  for (let z = J.minZ + 1; z < J.maxZ; z += 2.4) {
    for (const x of [J.minX - 0.3, J.maxX + 0.3]) add(rounded(new THREE.DodecahedronGeometry(0.7, 0), toon('#7a7468'), 0.02), x, -0.1, z + ((x * 3) % 1));
  }
  const gateRect: Rect = { minX: J.minX, maxX: J.maxX, minZ: PLAYA.gateZ - 0.2, maxZ: PLAYA.gateZ + 0.2 };
  rects.push(gateRect);
  const gate = new THREE.Group();
  const leaves: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const leaf = box(2.4, 1.4, 0.12, '#30406a', { outline: 0.015 });
    leaf.position.set(s * 1.2, 0.7, 0);
    gate.add(leaf);
    leaves.push(leaf);
  }
  gate.userData.dynamic = true;
  add(gate, (J.minX + J.maxX) / 2, 0, PLAYA.gateZ);

  return {
    waveMeshes,
    openGate() {
      leaves[0].position.x = -3.4;
      leaves[1].position.x = 3.4;
      const i = rects.indexOf(gateRect);
      if (i >= 0) rects.splice(i, 1);
    },
    openUmbrellas() {
      for (const u of umbrellas) u.scale.set(1, 1, 1);
    },
  };
}

function label(text: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 70px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

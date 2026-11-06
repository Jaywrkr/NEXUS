import * as THREE from 'three';
import { box, keepVivid, rounded, toon, withLife } from '../core/render';
import { makeGray } from './revive';
import { roomShell, type ReviveRoom } from './MigaHouse';
import type { Rect } from './World';

/*
 * Expansión, Fase 14 (PLAN_EXPANSION.md): Fábrica de Chispas, al noreste (al este del Parque, al norte del
 * Skatepark). Donde se hizo la Gran Chispa. Afuera: tres cintas transportadoras que se prenden EN ORDEN,
 * un montacargas que sube al techo del depósito, chimeneas, engranajes y robots dormidos. El portón de la
 * sala de máquinas está trabado (circuito del Mundo Voltio). Adentro (x = 1200), la Gran Máquina se
 * revive con tres cables en orden: caldera → engranaje → máquina.
 */

export const FACTORY_REGION: Rect = { minX: 45, maxX: 112, minZ: -100, maxZ: -38 };
/** Desde el Parque, por su lado este. */
export const FACTORY_FROM_PARK: Rect = { minX: 35, maxX: 46, minZ: -78, maxZ: -72 };
/** Desde el Skatepark, por el norte. */
export const FACTORY_FROM_SKATE: Rect = { minX: 75, maxX: 81, minZ: -39, maxZ: -19 };
export const FACTORY_X = 1200;

export const FACTORY = {
  hall: { x: 92, z: -86, w: 22, d: 12, doorX: 92 },
  /** Nodos del circuito del Mundo Voltio que destraba el portón. */
  gateNodes: [
    { x: 84, z: -74 },
    { x: 92, z: -70 },
    { x: 100, z: -74 },
  ],
  beltSource: { x: 52, z: -60 },
  /** Las tres cintas (se conectan en orden). */
  belts: [
    { x: 58, z: -66 },
    { x: 66, z: -60 },
    { x: 74, z: -66 },
  ],
  warehouse: { minX: 54, maxX: 70, minZ: -96, maxZ: -84, h: 6 },
  lift: { x: 71.3, z: -90, size: 2.6 },
  zipTop: { x: 56, z: -86 },
  zipBottom: { x: 52, z: -66 },
  tuerca: { x: 62, z: -50, faceX: 66, faceZ: -46 },
  chispi: { x: 104, z: -52 },
  robots: [
    [80, -50],
    [96, -60],
    [106, -70],
    [86, -64],
    [62, -76],
  ] as [number, number][],
};

/** Altura del montacargas según la fase (0..1..0). Lo usa WorldMode para mover la plataforma. */
export function liftHeight(t: number): number {
  const cycle = 10; // segundos: sube 3, espera 2, baja 3, espera 2
  const k = ((t % cycle) + cycle) % cycle;
  const H = FACTORY.warehouse.h;
  if (k < 2) return 0;
  if (k < 5) return ((k - 2) / 3) * H;
  if (k < 7) return H;
  if (k < 10) return H - ((k - 7) / 3) * H;
  return 0;
}

export interface FactoryInfo {
  hall: ReviveRoom & { machine: { x: number; z: number }; boiler: { x: number; z: number }; gear: { x: number; z: number } };
  zipLine: THREE.Vector3[];
  /** La plataforma del montacargas (rect que WorldMode sube y baja) y su malla. */
  liftRect: Rect;
  liftMesh: THREE.Object3D;
  /** Abre el portón de la sala de máquinas (afuera). */
  openGate(): void;
  /** Las cajas sobre las cintas (se mueven cuando las cintas andan). */
  boxes: THREE.Object3D[];
}

export function buildFactory(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): FactoryInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = FACTORY_REGION;
  add(box(R.maxX - R.minX + 2, 0.08, R.maxZ - R.minZ + 2, '#8e8a86', { outline: false, cast: false, brush: 22 }), (R.minX + R.maxX) / 2, 0.035, (R.minZ + R.maxZ) / 2);
  for (const C of [FACTORY_FROM_PARK, FACTORY_FROM_SKATE]) {
    add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#a8a097', { outline: false, cast: false, brush: 8 }), (C.minX + C.maxX) / 2, 0.045, (C.minZ + C.maxZ) / 2);
  }
  // Rayas amarillas de seguridad en el piso
  for (let x = R.minX + 4; x < R.maxX - 4; x += 6) add(box(3, 0.06, 0.3, '#ffc23a', { outline: false, cast: false }), x, 0.08, -56);

  // Sala de máquinas (mira a +Z) con portón trabado y chimeneas
  const H = FACTORY.hall;
  add(box(H.w, 7, H.d, '#6e6a7a', { outline: 0.06, brush: 3 }), H.x, 3.5, H.z);
  rects.push({ minX: H.x - H.w / 2, maxX: H.x + H.w / 2, minZ: H.z - H.d / 2, maxZ: H.z + H.d / 2 });
  for (let i = 0; i < 3; i += 1) {
    const roofTooth = box(H.w / 3, 1.6, H.d, '#4a4656', { outline: 0.04 });
    roofTooth.position.set(H.x - H.w / 3 + i * (H.w / 3), 7.8, H.z);
    roofTooth.rotation.x = 0.2;
    scene.add(roofTooth);
  }
  for (const [dx, h] of [
    [-8, 14],
    [-4, 11],
  ] as [number, number][]) {
    add(rounded(new THREE.CylinderGeometry(0.9, 1.2, h, 12), toon('#8a3a2a'), 0.03), H.x + dx, h / 2, H.z - 2);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.6, 12), toon('#ffc23a')), H.x + dx, h - 0.8, H.z - 2);
  }
  // Cartel FÁBRICA DE CHISPAS
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2c2838';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#ffd23a';
  g.font = 'bold 44px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('FÁBRICA DE CHISPAS', 256, 66);
  g.strokeStyle = '#ffc23a';
  g.lineWidth = 8;
  g.strokeRect(5, 5, 502, 118);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), withLife(new THREE.MeshBasicMaterial({ map: tex }))), H.x, 5.6, H.z + H.d / 2 + 0.04);
  // Portón (dos hojas que se corren al abrir)
  const gate = new THREE.Group();
  const leaves: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const leaf = box(2.2, 3.6, 0.15, '#3d3550', { outline: 0.02 });
    leaf.position.set(s * 1.1, 1.8, 0);
    gate.add(leaf);
    leaves.push(leaf);
    for (let k = 0; k < 4; k += 1) {
      const stripe = box(0.25, 3.6, 0.05, '#ffc23a', { outline: false });
      stripe.position.set(s * 1.1 - 0.8 + k * 0.55, 1.8, 0.1);
      stripe.rotation.z = 0.5;
      leaf.add(stripe);
      stripe.position.set(-0.8 + k * 0.55, 0, 0.1);
    }
  }
  gate.userData.dynamic = true;
  add(gate, H.doorX, 0, H.z + H.d / 2 + 0.1);

  // Depósito (techo plano a 6 m: se llega con el montacargas) y montacargas
  const W = FACTORY.warehouse;
  add(box(W.maxX - W.minX, W.h, W.maxZ - W.minZ, '#a8a097', { outline: 0.05, brush: 3 }), (W.minX + W.maxX) / 2, W.h / 2, (W.minZ + W.maxZ) / 2);
  add(box(W.maxX - W.minX + 0.3, 0.2, W.maxZ - W.minZ + 0.3, '#6e6a7a', { outline: 0.02 }), (W.minX + W.maxX) / 2, W.h, (W.minZ + W.maxZ) / 2);
  rects.push({ ...W });
  for (let i = 0; i < 3; i += 1) add(box(3, 2.6, 0.1, '#30406a', { outline: 0.02 }), W.minX + 3 + i * 5, 1.3, W.maxZ + 0.06);
  const L = FACTORY.lift;
  const liftRect: Rect = { minX: L.x - L.size / 2, maxX: L.x + L.size / 2, minZ: L.z - L.size / 2, maxZ: L.z + L.size / 2, h: 0.05 };
  rects.push(liftRect);
  const liftMesh = new THREE.Group();
  const deck = box(L.size, 0.2, L.size, '#ffc23a', { outline: 0.02 });
  deck.position.y = -0.1;
  liftMesh.add(deck);
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const rail = box(0.1, 0.9, 0.1, '#3d3550', { outline: false });
    rail.position.set((dx * L.size) / 2, 0.45, (dz * L.size) / 2);
    liftMesh.add(rail);
  }
  liftMesh.userData.dynamic = true;
  add(liftMesh, L.x, 0, L.z);
  // Torre del montacargas
  for (const dz of [-1.5, 1.5]) add(box(0.25, W.h + 1.2, 0.25, '#3d3550', { outline: 0.01 }), L.x + 1.5, (W.h + 1.2) / 2, L.z + dz);

  // Cintas transportadoras con cajas (las cajas se mueven cuando la cinta anda)
  const boxes: THREE.Object3D[] = [];
  for (const b of FACTORY.belts) {
    add(box(6, 0.8, 1.6, '#3d3550', { outline: 0.02 }), b.x, 0.4, b.z);
    add(box(6.1, 0.08, 1.4, '#2c2838', { outline: false }), b.x, 0.84, b.z);
    rects.push({ minX: b.x - 3, maxX: b.x + 3, minZ: b.z - 0.8, maxZ: b.z + 0.8, h: 0.85 });
    for (let k = 0; k < 2; k += 1) {
      const crate = box(0.8, 0.6, 0.8, '#c7a17a', { outline: 0.015 });
      crate.position.set(b.x - 2 + k * 3, 1.18, b.z);
      crate.userData.dynamic = true;
      crate.userData.belt = b;
      scene.add(crate);
      boxes.push(crate);
    }
  }
  // Engranajes gigantes de decoración y barriles
  for (const [x, z, r] of [
    [104, -90, 3],
    [108, -80, 2],
  ] as [number, number, number][]) {
    const gear = rounded(new THREE.CylinderGeometry(r, r, 0.6, 14), toon('#c8a24a'), 0.03);
    gear.rotation.x = Math.PI / 2;
    add(gear, x, r, z);
    circles.push({ x, z, r: 0.5 });
  }
  for (const [x, z] of [
    [50, -46],
    [51.2, -46],
    [50.6, -47.1],
    [108, -44],
  ] as [number, number][]) {
    add(rounded(new THREE.CylinderGeometry(0.45, 0.45, 1, 12), toon('#e0453f'), 0.01), x, 0.5, z);
    circles.push({ x, z, r: 0.45, h: 1 });
  }

  // Tirolesa desde el techo del depósito hasta la entrada de las cintas
  const zipLine: THREE.Vector3[] = [];
  const rope = toon('#3d3550');
  for (const [p, base] of [
    [FACTORY.zipTop, W.h],
    [FACTORY.zipBottom, 0],
  ] as [{ x: number; z: number }, number][]) {
    add(rounded(new THREE.CylinderGeometry(0.1, 0.13, 3.2, 10), rope, 0.01), p.x, base + 1.6, p.z);
    add(box(0.8, 0.12, 0.12, '#ffc23a', { outline: 0.01 }), p.x, base + 3.1, p.z);
    if (base === 0) circles.push({ x: p.x, z: p.z, r: 0.22 });
    zipLine.push(new THREE.Vector3(p.x, base + 3.1, p.z));
  }
  const [za, zb] = zipLine;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    pts.push(new THREE.Vector3(za.x + (zb.x - za.x) * t, za.y + (zb.y - za.y) * t - Math.sin(t * Math.PI) * 0.6, za.z + (zb.z - za.z) * t));
  }
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 6), toon('#2c2838')));

  // Barrera del portón: hasta abrirlo no se puede pasar a la puerta
  const gateRect: Rect = { minX: H.doorX - 2.3, maxX: H.doorX + 2.3, minZ: H.z + H.d / 2, maxZ: H.z + H.d / 2 + 0.4 };
  rects.push(gateRect);

  return {
    hall: buildHall(scene, rects),
    zipLine,
    liftRect,
    liftMesh,
    boxes,
    openGate() {
      leaves[0].position.x = -3.2;
      leaves[1].position.x = 3.2;
      const i = rects.indexOf(gateRect);
      if (i >= 0) rects.splice(i, 1);
    },
  };
}

/** Sala de máquinas por dentro: gris; la Gran Máquina se revive con caldera → engranaje → máquina. */
function buildHall(scene: THREE.Scene, rects: Rect[]): FactoryInfo['hall'] {
  const RX = FACTORY_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 14,
    d: 9,
    wall: '#8e8a99',
    low: '#4a4656',
    trim: '#ffc23a',
    floor: ['#6e6a7a', '#5e5a6a'],
    base: '#2c2838',
    doorFrom: RX + 2.5,
    doorTo: RX + 4.5,
  });
  const { add, z0 } = k;
  // Tuberías en las paredes y un plano de la Gran Chispa
  for (let i = 0; i < 4; i += 1) add(rounded(new THREE.CylinderGeometry(0.12, 0.12, 13, 8), toon('#c8a24a'), 0.006), RX, 2.6 + i * 0.35, z0 + 0.25).rotation.z = Math.PI / 2;
  const plan = box(3, 2, 0.06, '#30406a', { outline: 0.02 });
  add(plan, RX - 3.6, 2.2, z0 + 0.08);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), toon('#ffd23a'));
  add(star, RX - 3.6, 2.2, z0 + 0.2);
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
    spawn: { x: RX + 3.5, z: k.z1 - 1.3 },
    exit: { x: RX + 3.5, z: k.z1 - 0.3 },
    spark: { id: 'spark-room-fabrica', x: RX - 5.6, z: 2.8, y: 0.9 },
    source: { x: RX - 5.4, z: -2.6 },
    target: { x: RX + 1, z: -2.2 },
    boiler: { x: RX - 2.6, z: -2.4 },
    gear: { x: RX - 0.4, z: 1.2 },
    machine: { x: RX + 1.8, z: -2.2 },
    gray,
  };
}

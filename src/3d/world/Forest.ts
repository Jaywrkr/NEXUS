import * as THREE from 'three';
import { box, rounded, toon, withLife } from '../core/render';
import type { Rect } from './World';

/*
 * Expansión, Fase 11 (PLAN_EXPANSION.md): Bosque de las luciérnagas, al noroeste (entre el Cerro y el Parque).
 * - Un arroyo norte-sur parte el bosque; el puente colgante se arma con cable (y abre el paso).
 * - Del otro lado, el árbol gigante: plataformas en espiral alrededor del tronco hasta la casa del árbol
 *   (h 8,1), y una tirolesa que baja hasta el puente.
 * - Hongos que hacen rebotar muy alto, el fogón del claro (se prende con cable) y luciérnagas dormidas.
 */

export const FOREST_REGION: Rect = { minX: -104, maxX: -46, minZ: -104, maxZ: -47 };
/** Desde el Cerro, por el costado del acantilado. */
export const FOREST_FROM_CERRO: Rect = { minX: -55.5, maxX: -51.5, minZ: -48, maxZ: -31 };
/** Desde el Parque, por su lado oeste. */
export const FOREST_FROM_PARK: Rect = { minX: -47, maxX: -35, minZ: -76, maxZ: -70 };

export const CREEK = { minX: -80, maxX: -76 };
export const FOREST_BRIDGE_Z = { min: -77, max: -73 };
export const TREE = { x: -92, z: -78, r: 2.5, top: 8.1 };

/** Plataformas en espiral alrededor del tronco (x, z, h). */
export const TREE_STEPS: { x: number; z: number; h: number }[] = Array.from({ length: 8 }, (_, i) => {
  const a = Math.PI * 0.1 + i * 0.85;
  return { x: TREE.x + Math.cos(a) * 3.7, z: TREE.z + Math.sin(a) * 3.7, h: 0.9 * (i + 1) };
});

export const FOREST = {
  bridgeSource: { x: -71, z: -81.5 },
  bridge: { x: -74.4, z: -79.2 },
  fireSource: { x: -56, z: -64 },
  fire: { x: -62, z: -60 },
  yuyo: { x: -54, z: -54, faceX: -50, faceZ: -50 },
  chispi: { x: -96, z: -96 },
  zipTop: { x: TREE.x + 0.6, z: TREE.z + 1.2 },
  zipBottom: { x: -70, z: -66 },
  /** Hongos que rebotan (x, z). */
  mushrooms: [
    [-60, -88],
    [-66, -92],
    [-72, -96],
    [-56, -80],
    [-88, -60],
    [-96, -66],
  ] as [number, number][],
  fireflies: [
    [-50, -72],
    [-58, -96],
    [-70, -84],
    [-64, -52],
    [-86, -94],
    [-100, -82],
    [-98, -54],
    [-84, -50],
  ] as [number, number][],
};

export const MUSHROOM_H = 0.5;
/** Altura de arriba del sombrero (donde se rebota). */
export const MUSHROOM_TOP = 0.95;
export const MUSHROOM_R = 1.1;

export interface ForestInfo {
  zipLine: THREE.Vector3[];
  /** Saca la barrera del arroyo cuando el puente se arma. */
  openBridge(): void;
  /** Muestra el puente armado. */
  bridgeMesh: THREE.Group;
}

export function buildForest(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): ForestInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = FOREST_REGION;
  // Piso del bosque y senderos
  add(box(R.maxX - R.minX + 2, 0.08, R.maxZ - R.minZ + 2, '#5f8f4a', { outline: false, cast: false, brush: 22 }), (R.minX + R.maxX) / 2, 0.035, (R.minZ + R.maxZ) / 2);
  for (const C of [FOREST_FROM_CERRO, FOREST_FROM_PARK]) {
    add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#a98f6a', { outline: false, cast: false, brush: 8 }), (C.minX + C.maxX) / 2, 0.045, (C.minZ + C.maxZ) / 2);
  }
  for (let i = 0; i < 10; i += 1) add(box(2.6, 0.06, 2.6, '#a98f6a', { outline: false, cast: false }), -54 - i * 2.2, 0.05, -50 - i * 2.6);

  // El arroyo (agua con vida) y su barrera; el hueco del puente se abre al armarlo
  const water = new THREE.Mesh(new THREE.PlaneGeometry(CREEK.maxX - CREEK.minX, R.maxZ - R.minZ + 2), withLife(new THREE.MeshToonMaterial({ color: '#3f86c8' })));
  water.rotation.x = -Math.PI / 2;
  add(water, (CREEK.minX + CREEK.maxX) / 2, 0.06, (R.minZ + R.maxZ) / 2);
  const bankMat = toon('#7a6a5a');
  for (const x of [CREEK.minX - 0.2, CREEK.maxX + 0.2]) add(box(0.4, 0.25, R.maxZ - R.minZ + 2, '', { mat: bankMat, outline: 0.01, cast: false }), x, 0.12, (R.minZ + R.maxZ) / 2);
  rects.push({ minX: CREEK.minX, maxX: CREEK.maxX, minZ: R.minZ - 1, maxZ: FOREST_BRIDGE_Z.min });
  rects.push({ minX: CREEK.minX, maxX: CREEK.maxX, minZ: FOREST_BRIDGE_Z.max, maxZ: R.maxZ + 1 });
  const gap: Rect = { minX: CREEK.minX, maxX: CREEK.maxX, minZ: FOREST_BRIDGE_Z.min, maxZ: FOREST_BRIDGE_Z.max };
  rects.push(gap);

  // Puente colgante: postes siempre; las tablas aparecen al armarlo
  const rope = toon('#6a3e26');
  for (const x of [CREEK.minX - 0.6, CREEK.maxX + 0.6]) {
    for (const z of [FOREST_BRIDGE_Z.min + 0.3, FOREST_BRIDGE_Z.max - 0.3]) {
      add(rounded(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 8), rope, 0.01), x, 0.8, z);
      circles.push({ x, z, r: 0.18 });
    }
  }
  const bridgeMesh = new THREE.Group();
  for (let i = 0; i < 9; i += 1) {
    const plank = box(0.5, 0.1, 3.2, '#a97a52', { outline: 0.01 });
    plank.position.set(CREEK.minX - 0.4 + i * 0.6, 0.18 - Math.sin((i / 8) * Math.PI) * 0.12, (FOREST_BRIDGE_Z.min + FOREST_BRIDGE_Z.max) / 2);
    bridgeMesh.add(plank);
  }
  for (const z of [FOREST_BRIDGE_Z.min + 0.3, FOREST_BRIDGE_Z.max - 0.3]) {
    const r = box(5.6, 0.06, 0.06, '', { mat: rope, outline: false });
    r.position.set((CREEK.minX + CREEK.maxX) / 2, 1.2, z);
    bridgeMesh.add(r);
  }
  bridgeMesh.visible = false;
  bridgeMesh.userData.dynamic = true;
  scene.add(bridgeMesh);

  // Árbol gigante: tronco (también es la plataforma de arriba), copa, espiral de plataformas y casa del árbol
  const bark = toon('#6a4a32');
  const trunk = rounded(new THREE.CylinderGeometry(TREE.r * 0.9, TREE.r * 1.15, TREE.top, 16), bark, 0.04);
  add(trunk, TREE.x, TREE.top / 2, TREE.z);
  circles.push({ x: TREE.x, z: TREE.z, r: TREE.r, h: TREE.top });
  const deck = rounded(new THREE.CylinderGeometry(TREE.r + 0.6, TREE.r + 0.6, 0.25, 18), toon('#a97a52'), 0.02);
  add(deck, TREE.x, TREE.top - 0.1, TREE.z);
  const leaves = toon('#3f7a3a');
  const leavesDark = toon('#2f6a32');
  for (const [dx, dy, dz, s] of [
    [0, 14.5, 0, 6],
    [-3.5, 13, 2.5, 4],
    [3, 13.5, -2.5, 4.2],
    [2, 16.5, 2, 3.5],
  ] as [number, number, number, number][]) {
    add(rounded(new THREE.IcosahedronGeometry(s, 1), dy > 14 ? leaves : leavesDark, 0.05), TREE.x + dx, dy, TREE.z + dz);
  }
  for (const s of TREE_STEPS) {
    add(box(2.4, 0.3, 2.4, '#a97a52', { outline: 0.02 }), s.x, s.h - 0.15, s.z);
    add(box(0.25, s.h, 0.25, '', { mat: bark, outline: 0.01 }), s.x, s.h / 2, s.z);
    rects.push({ minX: s.x - 1.2, maxX: s.x + 1.2, minZ: s.z - 1.2, maxZ: s.z + 1.2, h: s.h });
  }
  // Casa del árbol: techito a dos aguas y paredes bajas (frente abierto a +Z)
  const hut = new THREE.Group();
  const wall = toon('#c7a17a');
  const back = box(3.2, 1.6, 0.15, '', { mat: wall, outline: 0.02 });
  back.position.set(0, 0.8, -1.4);
  hut.add(back);
  for (const sx of [-1.55, 1.55]) {
    const side = box(0.15, 1.6, 2.8, '', { mat: wall, outline: 0.02 });
    side.position.set(sx, 0.8, 0);
    hut.add(side);
  }
  for (const s of [-1, 1]) {
    const roof = box(1.9, 0.12, 3.2, '#c8452f', { outline: 0.02 });
    roof.position.set(s * 0.8, 2.0, 0);
    roof.rotation.z = -s * 0.6;
    hut.add(roof);
  }
  add(hut, TREE.x - 0.4, TREE.top, TREE.z - 0.6);

  // Tirolesa del árbol al puente
  const zipLine: THREE.Vector3[] = [];
  for (const [p, base] of [
    [FOREST.zipTop, TREE.top],
    [FOREST.zipBottom, 0],
  ] as [{ x: number; z: number }, number][]) {
    add(rounded(new THREE.CylinderGeometry(0.1, 0.13, 3.4, 10), rope, 0.01), p.x, base + 1.7, p.z);
    add(box(0.8, 0.12, 0.12, '#ffc23a', { outline: 0.01 }), p.x, base + 3.3, p.z);
    if (base === 0) circles.push({ x: p.x, z: p.z, r: 0.22 });
    zipLine.push(new THREE.Vector3(p.x, base + 3.3, p.z));
  }
  const [za, zb] = zipLine;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    pts.push(new THREE.Vector3(za.x + (zb.x - za.x) * t, za.y + (zb.y - za.y) * t - Math.sin(t * Math.PI) * 0.7, za.z + (zb.z - za.z) * t));
  }
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 6), toon('#2c2838')));

  // Hongos que rebotan (sombrero = plataforma; WorldMode los hace saltar)
  for (const [x, z] of FOREST.mushrooms) {
    add(rounded(new THREE.CylinderGeometry(0.35, 0.45, MUSHROOM_H, 10), toon('#f4ecdc'), 0.01), x, MUSHROOM_H / 2, z);
    const cap = rounded(new THREE.SphereGeometry(MUSHROOM_R, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#e0453f'), 0.02);
    cap.scale.y = 0.45;
    add(cap, x, MUSHROOM_H - 0.05, z);
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon('#fff3dc')), x + Math.cos(a) * 0.6, MUSHROOM_H - 0.05 + 0.42, z + Math.sin(a) * 0.6);
    }
    circles.push({ x, z, r: MUSHROOM_R * 0.85, h: MUSHROOM_TOP });
  }

  // Árboles del bosque (con colisión), troncos caídos y piedras con musgo
  const pine = toon('#2f6b45');
  const pineDark = toon('#24563a');
  const placeTree = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    const t = rounded(new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 1.4 * s, 8), bark, 0.01);
    t.position.y = 0.7 * s;
    g.add(t);
    for (let k = 0; k < 3; k += 1) {
      const cone = rounded(new THREE.ConeGeometry((1.7 - k * 0.42) * s, 1.8 * s, 9), k % 2 ? pineDark : pine, 0.02);
      cone.position.y = (1.7 + k * 1.05) * s;
      g.add(cone);
    }
    add(g, x, 0, z);
    circles.push({ x, z, r: 0.5 * s });
  };
  for (const [x, z, s] of [
    [-50, -100, 1.2], [-58, -102, 1], [-68, -100, 1.3], [-48, -86, 1], [-52, -66, 1.1], [-70, -54, 1.2], [-74, -62, 0.9],
    [-60, -72, 1], [-66, -78, 1.1], [-84, -100, 1.2], [-100, -100, 1.3], [-102, -72, 1], [-102, -50, 1.1], [-90, -52, 0.9],
    [-86, -64, 1], [-98, -88, 1.1], [-84, -86, 0.9], [-48, -92, 0.9], [-64, -104, 1],
  ] as [number, number, number][]) placeTree(x, z, s);
  add(rounded(new THREE.CylinderGeometry(0.45, 0.45, 5, 10), bark, 0.015), -58, 0.45, -76).rotation.z = Math.PI / 2;
  rects.push({ minX: -60.5, maxX: -55.5, minZ: -76.5, maxZ: -75.5, h: 0.9 });
  // Cartel del bosque
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3f7a3a';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 50px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BOSQUE', 256, 66);
  g.strokeStyle = '#231a36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 118);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: tex })), -50, 2.1, -46.6);
  add(rounded(new THREE.CylinderGeometry(0.07, 0.07, 2, 6), bark, 0.008), -50, 1, -46.7);

  return {
    zipLine,
    bridgeMesh,
    openBridge() {
      const i = rects.indexOf(gap);
      if (i >= 0) rects.splice(i, 1);
      bridgeMesh.visible = true;
    },
  };
}

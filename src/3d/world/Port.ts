import * as THREE from 'three';
import { box, rounded, toon, withLife } from '../core/render';
import type { Rect } from './World';

/*
 * Distrito Puerto y faro (Fase 9, PLAN_MAESTRO.md §6): el final del capítulo. Al sur del barrio del
 * canal, pasando entre el jardín y la calle de los faroles. Muelle de tablas, mar, cajones, redes,
 * barcos amarrados y, sobre las rocas del este, el faro: su circuito del Mundo Voltio y su cable traen
 * de vuelta la Gran Chispa.
 * El bote de Marina está varado en el canal (embarcadero al norte del canal, oeste del Centro).
 */

export const PORT_REGION: Rect = { minX: -40, maxX: 44, minZ: 67, maxZ: 96 };
/** Pasaje desde el canal sur (entre el jardín y los faroles). */
export const PORT_CORRIDOR: Rect = { minX: 4.6, maxX: 8.6, minZ: 61, maxZ: 68 };
/** Muelles que entran al mar (caminables). */
export const PIERS: Rect[] = [
  { minX: -22, maxX: -17, minZ: 95, maxZ: 112 },
  { minX: 28, maxX: 40, minZ: 95, maxZ: 110 },
];
export const SEA_Z = 96;

export const PORT = {
  lighthouse: { x: 34, z: 105 },
  source: { x: 30.5, z: 92 },
  nodes: [
    { x: 24, z: 88 },
    { x: 41, z: 91 },
    { x: 37, z: 99.5 },
  ],
  marina: { x: 2, z: 80, faceX: 6, faceZ: 84 },
  chispi: { x: -28, z: 84 },
  plaza: { x: 6, z: 84 },
};

/** Bote de Marina en el canal: embarcadero y recorrido (x, z) por el agua. */
export const BOAT = {
  dock: { x: -38, z: 28.2 },
  source: { x: -42.5, z: 25.5 },
  route: [
    [-38, 33],
    [-60, 33],
    [-92, 33],
    [-60, 33],
    [-20, 33],
    [10, 33],
    [-20, 33],
    [-38, 33],
  ] as [number, number][],
};

function label(text: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 66px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  g.strokeStyle = '#231a36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 118);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildPort(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number }[]): void {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = PORT_REGION;
  // Adoquines del puerto y el pasaje
  add(box(R.maxX - R.minX + 2, 0.08, R.maxZ - R.minZ + 1, '#b9ad9c', { outline: false, cast: false, brush: 20 }), (R.minX + R.maxX) / 2, 0.04, (R.minZ + R.maxZ) / 2 - 0.5);
  const C = PORT_CORRIDOR;
  add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#b8a99a', { outline: false, cast: false, brush: 6 }), (C.minX + C.maxX) / 2, 0.05, (C.minZ + C.maxZ) / 2);
  // El mar (con vida: se pone azul cuando vuelve la Gran Chispa) y el borde del muelle
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), withLife(new THREE.MeshToonMaterial({ color: '#2f78c8' })));
  sea.rotation.x = -Math.PI / 2;
  add(sea, 0, -0.6, SEA_Z + 60);
  add(box(R.maxX - R.minX + 2, 0.5, 0.6, '#8a7f76', { outline: 0.02 }), (R.minX + R.maxX) / 2, -0.15, SEA_Z + 0.2);
  // Muelles de tablas con pilotes
  const plank = toon('#a97a52');
  const post = toon('#6a3e26');
  for (const p of PIERS) {
    const w = p.maxX - p.minX;
    const d = p.maxZ - p.minZ;
    add(box(w, 0.25, d, '', { mat: plank, outline: 0.02, brush: 4 }), (p.minX + p.maxX) / 2, 0.0, (p.minZ + p.maxZ) / 2);
    for (let z = p.minZ + 2; z <= p.maxZ; z += 3.5) {
      for (const x of [p.minX + 0.3, p.maxX - 0.3]) add(rounded(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 8), post, 0.01), x, -0.3, z);
    }
  }
  // Rocas del faro
  const rock = toon('#7a706a');
  for (const [x, z, s] of [
    [33, 108, 2.2], [38, 104, 1.6], [30, 103, 1.4], [36, 110, 1.8],
  ] as [number, number, number][]) add(rounded(new THREE.DodecahedronGeometry(s, 0), rock, 0.02), x, -0.2, z);
  // Barcos amarrados al costado del muelle oeste
  for (const [x, z, col] of [
    [-25, 101, '#ff5a6e'],
    [-14, 106, '#2bb3a8'],
  ] as [number, number, string][]) {
    const hull = box(2.2, 0.9, 5, col, { outline: 0.03 });
    add(hull, x, -0.2, z);
    add(box(1.8, 0.1, 4.4, '#fff3dc', { outline: false }), x, 0.27, z);
    add(rounded(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), post, 0.008), x, 1.9, z - 0.6);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), withLife(new THREE.MeshBasicMaterial({ color: '#fff3dc', side: THREE.DoubleSide })));
    sail.rotation.y = Math.PI / 2;
    add(sail, x, 2.2, z + 0.3);
  }
  // Galpón del puerto (mira a +Z) con cartel
  add(box(14, 4.6, 6, '#3f7fd6', { outline: 0.05, brush: 3 }), -14, 2.3, 72);
  rects.push({ minX: -21, maxX: -7, minZ: 69, maxZ: 75 });
  add(box(14.8, 0.4, 6.8, '#163f80', { outline: 0.03 }), -14, 4.7, 72);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.2), withLife(new THREE.MeshBasicMaterial({ map: label('PUERTO', '#163f80') })));
  add(sign, -14, 3.6, 75.04);
  for (let i = 0; i < 3; i += 1) add(box(2.6, 2.8, 0.08, '#6e5133', { outline: 0.02 }), -18.5 + i * 4.5, 1.4, 75.04);
  // Cajones apilados (algunos se saltan), redes y bitas
  const crate = toon('#c7a17a');
  for (const [x, z, h] of [
    [-4, 90, 0.9], [-2.6, 90, 0.9], [-3.3, 90, 1.8], [16, 74, 0.9], [17.4, 74, 0.9], [12, 92, 0.9],
  ] as [number, number, number][]) {
    add(box(1.2, 0.9, 1.2, '', { mat: crate, outline: 0.02 }), x, h - 0.45, z);
  }
  rects.push({ minX: -4.6, maxX: -2, minZ: 89.4, maxZ: 90.6, h: 0.9 });
  rects.push({ minX: 15.4, maxX: 18, minZ: 73.4, maxZ: 74.6, h: 0.9 });
  rects.push({ minX: 11.4, maxX: 12.6, minZ: 91.4, maxZ: 92.6, h: 0.9 });
  for (const x of [-30, -10, 10, 22]) {
    add(rounded(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 10), toon('#2c2838'), 0.01), x, 0.3, 95);
    circles.push({ x, z: 95, r: 0.3 });
  }
  const net = toon('#2bb3a8');
  add(box(3, 0.12, 2, '', { mat: net, outline: 0.01 }), 20, 0.12, 80);
  // Puesto de pescado y faroles del muelle
  add(box(3, 1.1, 1.4, '#ff9f43', { outline: 0.03 }), -30, 0.55, 78);
  add(box(3.4, 0.15, 1.8, '#fff3dc', { outline: 0.02 }), -30, 2.3, 78);
  for (const sx of [-1.5, 1.5]) add(rounded(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), post, 0.006), -30 + sx, 1.6, 78.6);
  rects.push({ minX: -31.5, maxX: -28.5, minZ: 77.3, maxZ: 78.7 });
  for (const x of [-34, -6, 18, 40]) {
    add(rounded(new THREE.CylinderGeometry(0.08, 0.1, 3, 8), toon('#3d3550'), 0.01), x, 1.5, 93.5);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), withLife(new THREE.MeshBasicMaterial({ color: '#ffe066' }))), x, 3.1, 93.5);
    circles.push({ x, z: 93.5, r: 0.2 });
  }
  // Embarcadero del bote en el canal (al norte del canal, oeste del Centro)
  const D = BOAT.dock;
  add(box(4, 0.2, 2.2, '', { mat: plank, outline: 0.02 }), D.x, 0.1, D.z + 0.4);
  const dockSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.5), new THREE.MeshBasicMaterial({ map: label('BOTE', '#3f7fd6') }));
  add(dockSign, D.x - 2.6, 1.9, D.z - 0.2);
  add(rounded(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 6), post, 0.008), D.x - 2.6, 0.95, D.z - 0.25);
}

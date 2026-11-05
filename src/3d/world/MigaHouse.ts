import * as THREE from 'three';
import { box, flat, keepVivid, rounded, toon } from '../core/render';
import type { Rect } from './World';

/*
 * Primer interior (PLAN_MAESTRO.md, Fase 0): la casa de Miga, detrás de la puerta de la plaza.
 * Es una habitación "maqueta" lejos del barrio (x = 300): las paredes del norte y del oeste son
 * altas y las del sur y el este son bajitas, para que la cámara isométrica (desde +X+Z) vea adentro.
 * Siempre está a todo color: es donde la luz volvió primero.
 * Se puede saltar a la cama y al banco de trabajo; arriba del banco hay una chispita escondida.
 */

export const ROOM_X = 300;
export const ROOM_Z = 0;
const W = 12; // ancho interior (x)
const D = 9; // fondo interior (z)
const WALL = 3.2;

export interface InteriorInfo {
  /** Rectángulo transitable (el resolve lo usa en vez de los límites del barrio). */
  room: Rect;
  /** Donde aparece el Nexus al entrar. */
  spawn: { x: number; z: number };
  /** Felpudo de salida. */
  exit: { x: number; z: number };
  /** Chispita escondida. */
  spark: { id: string; x: number; z: number; y: number };
}

export function buildMigaHouse(scene: THREE.Scene, rects: Rect[]): InteriorInfo {
  const g = new THREE.Group();
  const x0 = ROOM_X - W / 2;
  const x1 = ROOM_X + W / 2;
  const z0 = ROOM_Z - D / 2;
  const z1 = ROOM_Z + D / 2;
  const add = (m: THREE.Object3D, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const solid = (cx: number, cz: number, w: number, d: number, h?: number) =>
    rects.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });

  // Fondo oscuro alrededor: la casa flota como una maqueta
  const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshBasicMaterial({ color: '#211a38', fog: false }));
  voidPlane.rotation.x = -Math.PI / 2;
  add(voidPlane, ROOM_X, 0.012, ROOM_Z);

  // Piso de tablas
  const base = box(W + 0.8, 0.4, D + 0.8, '#5b3b2a', { outline: 0.04, cast: false });
  add(base, ROOM_X, -0.2, ROOM_Z);
  const planks = ['#c98f5a', '#b97f4d', '#d29a63'];
  for (let i = 0; i < 12; i += 1) {
    const p = box(W / 12 - 0.03, 0.04, D, planks[i % 3], { outline: false, cast: false, brush: 2 });
    add(p, x0 + (i + 0.5) * (W / 12), 0.02, ROOM_Z);
  }

  // Paredes: altas al norte y al oeste, bajitas al sur y al este
  const wallMat = toon('#f3d9b1', 3);
  const trim = toon('#2bb3a8');
  const north = box(W + 0.8, WALL, 0.4, '', { mat: wallMat, outline: 0.04 });
  add(north, ROOM_X, WALL / 2, z0 - 0.2);
  const west = box(0.4, WALL, D + 0.8, '', { mat: wallMat, outline: 0.04 });
  add(west, x0 - 0.2, WALL / 2, ROOM_Z);
  for (const [m, x, z] of [
    [box(W + 0.8, 0.18, 0.08, '', { mat: trim, outline: false }), ROOM_X, z0 + 0.02],
    [box(0.08, 0.18, D + 0.8, '', { mat: trim, outline: false }), x0 + 0.02, ROOM_Z],
  ] as [THREE.Mesh, number, number][]) add(m, x, 0.5, z);
  const low = toon('#e7c79c', 3);
  // Sur: con un hueco para la puerta de salida (x 302..304)
  add(box(302 - x0 + 0.4, 0.55, 0.4, '', { mat: low, outline: 0.04 }), (x0 - 0.4 + 302) / 2, 0.27, z1 + 0.2);
  add(box(x1 + 0.4 - 304, 0.55, 0.4, '', { mat: low, outline: 0.04 }), (304 + x1 + 0.4) / 2, 0.27, z1 + 0.2);
  add(box(0.4, 0.55, D + 0.8, '', { mat: low, outline: 0.04 }), x1 + 0.2, 0.27, ROOM_Z);

  // Ventana al norte con luz de día
  add(box(2.6, 1.6, 0.1, '#ffffff', { mat: flat('#bfe6ff'), outline: false }), ROOM_X - 1.5, 1.9, z0 + 0.03);
  add(box(2.9, 0.14, 0.2, '#ffffff', { mat: trim, outline: 0.02 }), ROOM_X - 1.5, 1.05, z0 + 0.1);
  add(box(0.1, 1.6, 0.12, '', { mat: toon('#fff3dc'), outline: false }), ROOM_X - 1.5, 1.9, z0 + 0.09);
  // Rayo de sol en el piso
  const sunPatch = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.35, depthWrite: false }));
  sunPatch.rotation.x = -Math.PI / 2;
  add(sunPatch, ROOM_X - 1.3, 0.05, z0 + 1.6);

  // Cuadro de la Gran Chispa en la pared oeste
  const frame = box(0.08, 1.4, 1.8, '#7a4a2e', { outline: 0.02 });
  add(frame, x0 + 0.04, 2.0, ROOM_Z + 1.2);
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 140;
  const c2 = canvas.getContext('2d')!;
  c2.fillStyle = '#2a2050';
  c2.fillRect(0, 0, 180, 140);
  c2.fillStyle = '#ffc23a';
  c2.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 22 : 50;
    c2.lineTo(90 + Math.cos(a) * r, 72 + Math.sin(a) * r);
  }
  c2.fill();
  c2.fillStyle = '#9be7ff';
  for (let i = 0; i < 14; i += 1) c2.fillRect((i * 53) % 170, (i * 37) % 130, 5, 5);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
  pic.rotation.y = Math.PI / 2;
  add(pic, x0 + 0.1, 2.0, ROOM_Z + 1.2);

  // Cama (se puede saltar encima)
  const bx = x0 + 1.6;
  const bz = z0 + 1.5;
  add(box(2.2, 0.35, 3.0, '#7a4a2e', { outline: 0.03 }), bx, 0.2, bz);
  add(box(2.0, 0.2, 2.8, '#fff3dc', { outline: 0.02 }), bx, 0.45, bz);
  add(box(2.05, 0.12, 1.8, '#2bb3a8', { outline: 0.02, brush: 4 }), bx, 0.56, bz + 0.45);
  add(rounded(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), toon('#ffffff'), 0.02), bx, 0.62, bz - 1.0).rotation.z = Math.PI / 2;
  add(box(2.3, 1.2, 0.18, '#7a4a2e', { outline: 0.03 }), bx, 0.6, z0 + 0.05);
  solid(bx, bz, 2.2, 3.0, 0.55);

  // Banco de trabajo de Miga contra la pared norte (se puede saltar encima: ahí está la chispita)
  const wx = ROOM_X + 3.4;
  const wz = z0 + 0.8;
  add(box(3.6, 0.14, 1.3, '#a8703f', { outline: 0.03, brush: 2 }), wx, 0.88, wz);
  for (const dx of [-1.6, 1.6]) for (const dz of [-0.5, 0.5]) add(box(0.14, 0.86, 0.14, '#6a3e26', { outline: 0.015 }), wx + dx, 0.43, wz + dz);
  add(box(3.3, 0.08, 1.0, '#6a3e26', { outline: false }), wx, 0.3, wz);
  // Herramientas
  add(box(0.7, 0.1, 0.16, '#8b8f9a', { outline: 0.012 }), wx - 1.1, 1.0, wz + 0.2).rotation.y = 0.4;
  add(box(0.18, 0.18, 0.4, '#e0563f', { outline: 0.012 }), wx - 0.8, 1.04, wz + 0.25);
  add(rounded(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 12), toon('#f2c14e'), 0.012), wx + 0.2, 1.07, wz - 0.2);
  add(box(0.5, 0.35, 0.35, '#4fa8e0', { outline: 0.015 }), wx + 1.1, 1.13, wz - 0.25);
  // Lámpara de banco
  add(rounded(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), toon('#3d3550'), 0.01), wx + 1.45, 1.25, wz - 0.35);
  add(rounded(new THREE.ConeGeometry(0.2, 0.25, 12, 1, true), toon('#2bb3a8'), 0.012), wx + 1.35, 1.55, wz - 0.25).rotation.z = 0.6;
  // Estantes con frascos que brillan
  for (const y of [1.8, 2.5]) {
    add(box(3.4, 0.08, 0.4, '#7a4a2e', { outline: 0.02 }), wx, y, z0 + 0.2);
    for (let i = 0; i < 5; i += 1) {
      const jar = rounded(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10), flat(['#ffe066', '#9be7ff', '#ff9f43'][(i + Math.round(y)) % 3]), 0.012);
      add(jar, wx - 1.3 + i * 0.65, y + 0.19, z0 + 0.22);
    }
  }
  solid(wx, wz, 3.6, 1.3, 0.95);

  // Alfombra redonda, mesa y dos sillas
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), toon('#e77fa6', 6));
  rug.rotation.x = -Math.PI / 2;
  add(rug, ROOM_X, 0.05, ROOM_Z + 0.6);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.7, 32), flat('#fff3dc'));
  ring.rotation.x = -Math.PI / 2;
  add(ring, ROOM_X, 0.06, ROOM_Z + 0.6);
  add(rounded(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 20), toon('#d29a63'), 0.02), ROOM_X, 0.78, ROOM_Z + 0.6);
  add(rounded(new THREE.CylinderGeometry(0.1, 0.18, 0.72, 10), toon('#6a3e26'), 0.012), ROOM_X, 0.37, ROOM_Z + 0.6);
  add(rounded(new THREE.CylinderGeometry(0.18, 0.15, 0.25, 10), toon('#ffffff'), 0.012), ROOM_X + 0.2, 0.95, ROOM_Z + 0.5);
  rects.push({ minX: ROOM_X - 0.75, maxX: ROOM_X + 0.75, minZ: ROOM_Z - 0.15, maxZ: ROOM_Z + 1.35, h: 0.83 });
  for (const dx of [-1.3, 1.3]) {
    add(box(0.6, 0.08, 0.6, '#2bb3a8', { outline: 0.015 }), ROOM_X + dx, 0.48, ROOM_Z + 0.6);
    add(box(0.08, 0.7, 0.6, '#6a3e26', { outline: 0.015 }), ROOM_X + dx + Math.sign(dx) * 0.28, 0.8, ROOM_Z + 0.6);
    for (const ex of [-0.24, 0.24]) for (const ez of [-0.24, 0.24]) add(box(0.06, 0.46, 0.06, '#6a3e26', { outline: false }), ROOM_X + dx + ex, 0.23, ROOM_Z + 0.6 + ez);
  }

  // Sillón y planta
  add(box(1.6, 0.5, 1.2, '#4d6b8a', { outline: 0.03, brush: 3 }), x1 - 1.3, 0.3, ROOM_Z + 1.4);
  add(box(1.6, 0.8, 0.3, '#4d6b8a', { outline: 0.03, brush: 3 }), x1 - 1.3, 0.75, ROOM_Z + 0.95);
  for (const dx of [-0.75, 0.75]) add(box(0.22, 0.6, 1.2, '#3f5a75', { outline: 0.02 }), x1 - 1.3 + dx, 0.5, ROOM_Z + 1.4);
  solid(x1 - 1.3, ROOM_Z + 1.4, 1.8, 1.3, 0.55);
  add(rounded(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 12), toon('#e0563f'), 0.015), x0 + 0.6, 0.25, z1 - 0.7);
  for (let i = 0; i < 5; i += 1) {
    const leaf = rounded(new THREE.SphereGeometry(0.28, 8, 6), toon('#3f8f4a'), 0.015);
    leaf.scale.set(0.7, 1.4, 0.7);
    add(leaf, x0 + 0.6 + Math.cos(i * 1.3) * 0.18, 0.85 + (i % 2) * 0.25, z1 - 0.7 + Math.sin(i * 1.3) * 0.18);
  }
  rects.push({ minX: x0 + 0.25, maxX: x0 + 0.95, minZ: z1 - 1.05, maxZ: z1 - 0.35 });

  // Felpudo de salida (brilla)
  const mat = box(1.8, 0.04, 0.9, '#ffc23a', { mat: flat('#ffc23a'), outline: 0.02, cast: false });
  add(mat, 303, 0.04, z1 - 0.3);

  keepVivid(g);
  scene.add(g);

  return {
    room: { minX: x0, maxX: x1, minZ: z0, maxZ: z1 + 0.2 },
    spawn: { x: 303, z: z1 - 1.3 },
    exit: { x: 303, z: z1 - 0.3 },
    spark: { id: 'spark-room-casa', x: wx, z: wz, y: 0.95 + 0.9 },
  };
}

import * as THREE from 'three';
import { box, flat, keepVivid, rounded, toon, withLife } from '../core/render';
import { RAMP_DEPTH, RAMP_WIDTH } from '../objects/skate';
import { roomShell, type InteriorInfo } from './MigaHouse';
import type { Rect } from './World';

/*
 * Distrito Skatepark (Fase 1, PLAN_MAESTRO.md §6), al final de la calle del este.
 * Piso de cemento, grafitis, la rampa grande (lugar grande, objeto aparte), dos rampitas para volar,
 * dos barandas para grindar, un cajón, la sala del skatepark (persiana cerrada hasta que un circuito
 * del Mundo Voltio la abre) y su interior. Coordenadas: +X este, +Z sur.
 */

export const SKATE_REGION: Rect = { minX: 61, maxX: 96, minZ: -20, maxZ: 20 };
export const SKATE_GATE_X = 61.5;

/** Rampita: al pasar en patineta en su dirección, el Nexus vuela. `ramp` = la rampa grande (rebota). */
export interface Kicker {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  halfW: number;
  halfL: number;
  ramp: boolean;
}

/** Baranda para grindar (segmento a la altura h). */
export interface Rail {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  h: number;
}

export interface SkateparkInfo {
  kickers: Kicker[];
  rails: Rail[];
  ramp: { x: number; z: number };
  source: { x: number; z: number };
  rulo: { x: number; z: number; faceX: number; faceZ: number };
  board: { x: number; z: number };
  sala: { doorX: number; doorZ: number; shutter: THREE.Group };
  nodes: { x: number; z: number }[];
  chispi: { x: number; z: number };
  room: InteriorInfo;
}

function textTexture(text: string, bg: string, w = 512, h = 128, size = 64): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff3dc';
  g.font = `bold ${size}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  g.strokeStyle = '#231a36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Pared de grafitis: letras gordas, estrellas, flechas y un Chispi con ruedas (todo original). */
function graffitiTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d8d2c8';
  g.fillRect(0, 0, 2048, 256);
  const blob = (x: number, y: number, r: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i <= 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const rr = r * (0.8 + ((i * 37) % 7) / 18);
      g.lineTo(x + Math.cos(a) * rr * 1.6, y + Math.sin(a) * rr);
    }
    g.fill();
  };
  blob(260, 130, 80, '#ff9f43');
  blob(900, 120, 90, '#7dff8a');
  blob(1500, 135, 85, '#4fa8e0');
  blob(1880, 120, 70, '#e77fa6');
  g.font = 'bold 150px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = '#1d1630';
  for (const [t, x, col] of [
    ['RODAR', 260, '#fff3dc'],
    ['¡VUELA!', 900, '#ffe066'],
    ['CHISPA', 1500, '#ff4fd8'],
  ] as [string, number, string][]) {
    g.strokeText(t, x, 140);
    g.fillStyle = col;
    g.fillText(t, x, 140);
  }
  // Estrellas y flechas
  const star = (x: number, y: number, r: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.fill();
  };
  star(560, 60, 34, '#ffe066');
  star(1200, 200, 28, '#ff9f43');
  star(1720, 50, 30, '#7dff8a');
  g.strokeStyle = '#ff4fd8';
  g.lineWidth = 16;
  g.beginPath();
  g.moveTo(1150, 60);
  g.quadraticCurveTo(1230, 20, 1290, 70);
  g.stroke();
  // Chispi con ruedas
  g.fillStyle = '#9be7ff';
  g.beginPath();
  g.arc(1880, 110, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1d1630';
  g.fillRect(1862, 98, 10, 18);
  g.fillRect(1890, 98, 10, 18);
  g.beginPath();
  g.arc(1855, 165, 16, 0, Math.PI * 2);
  g.arc(1905, 165, 16, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSkatepark(scene: THREE.Scene, rects: Rect[]): SkateparkInfo {
  const R = SKATE_REGION;
  const add = (m: THREE.Object3D, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const cx = (R.minX + R.maxX) / 2;
  const cz = (R.minZ + R.maxZ) / 2;

  // Piso de cemento con juntas
  const concrete = toon('#bdb6ad', 16);
  add(box(R.maxX - R.minX + 1, 0.1, R.maxZ - R.minZ + 1, '', { mat: concrete, outline: false, cast: false }), cx, 0.05, cz);
  const joint = flat('#9a938a');
  for (let x = R.minX + 5; x < R.maxX; x += 5) {
    const j = new THREE.Mesh(new THREE.PlaneGeometry(0.06, R.maxZ - R.minZ), joint);
    j.rotation.x = -Math.PI / 2;
    add(j, x, 0.105, cz);
  }
  for (let z = R.minZ + 5; z < R.maxZ; z += 5) {
    const j = new THREE.Mesh(new THREE.PlaneGeometry(R.maxX - R.minX, 0.06), joint);
    j.rotation.x = -Math.PI / 2;
    add(j, cx, 0.106, z);
  }

  // Portón: dos columnas y el arco naranja sobre la calle
  const steel = toon('#3d3550');
  const orange = toon('#ff9f43');
  const half = 6.4;
  for (const side of [-1, 1]) {
    add(box(0.8, 4.4, 0.8, '', { mat: steel, outline: 0.03 }), SKATE_GATE_X, 2.2, side * (half + 0.3));
    add(box(1.2, 0.3, 1.2, '', { mat: orange, outline: 0.03 }), SKATE_GATE_X, 4.5, side * (half + 0.3));
    rects.push({ minX: SKATE_GATE_X - 0.5, maxX: SKATE_GATE_X + 0.5, minZ: side * (half + 0.3) - 0.5, maxZ: side * (half + 0.3) + 0.5 });
  }
  add(box(0.7, 0.9, half * 2 + 1.6, '', { mat: orange, outline: 0.03 }), SKATE_GATE_X, 4.8, 0);
  // Cartel al costado del camino (mira a +Z, la cámara lo ve de frente)
  for (const dx of [-2.2, 2.2]) add(box(0.16, 2.4, 0.16, '', { mat: steel, outline: 0.012 }), 55.5 + dx, 1.2, -half - 0.8);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), withLife(new THREE.MeshBasicMaterial({ map: textTexture('SKATEPARK', '#ff9f43') })));
  add(board, 55.5, 2.5, -half - 0.7);

  // Cerco bajo alrededor (deja la entrada del oeste abierta)
  const fence = toon('#8b8f9a');
  const fenceRun = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      add(box(0.1, 1.1, 0.1, '', { mat: fence, outline: 0.01 }), x1 + (x2 - x1) * t, 0.55, z1 + (z2 - z1) * t);
    }
    const rail = box(Math.abs(x2 - x1) + 0.1, 0.07, Math.abs(z2 - z1) + 0.1, '', { mat: fence, outline: 0.008 });
    add(rail, (x1 + x2) / 2, 1.0, (z1 + z2) / 2);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1)), 0.9),
      new THREE.MeshBasicMaterial({ color: '#9aa0ad', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
    );
    if (Math.abs(z2 - z1) > Math.abs(x2 - x1)) mesh.rotation.y = Math.PI / 2;
    add(mesh, (x1 + x2) / 2, 0.55, (z1 + z2) / 2);
  };
  fenceRun(R.minX + 0.5, R.minZ - 0.3, R.minX + 0.5, -half - 0.6);
  fenceRun(R.minX + 0.5, half + 0.6, R.minX + 0.5, R.maxZ + 0.3);
  fenceRun(R.minX + 0.5, R.maxZ + 0.3, R.maxX + 0.3, R.maxZ + 0.3);
  // Reja del este con abertura (z −3…3) hacia el Barrio Alto (Fase 15)
  fenceRun(R.maxX + 0.3, R.minZ - 0.3, R.maxX + 0.3, -3);
  fenceRun(R.maxX + 0.3, 3, R.maxX + 0.3, R.maxZ + 0.3);

  // Pared de grafitis al norte (mira a +Z), con un hueco (x 75…81) hacia la Fábrica de Chispas (Fase 14)
  const graffiti = graffitiTexture();
  const wallFrom = R.minX + 0.5;
  const wallTo = R.maxX - 0.5;
  for (const [a, b] of [
    [wallFrom, 75],
    [81, wallTo],
  ] as [number, number][]) {
    add(box(b - a, 2.8, 0.5, '#9a938a', { outline: 0.03 }), (a + b) / 2, 1.4, R.minZ - 0.4);
    const tex = graffiti.clone();
    tex.repeat.x = (b - a - 0.3) / (wallTo - wallFrom);
    tex.offset.x = (a - wallFrom) / (wallTo - wallFrom);
    tex.needsUpdate = true;
    add(new THREE.Mesh(new THREE.PlaneGeometry(b - a - 0.3, 2.4), withLife(new THREE.MeshBasicMaterial({ map: tex }))), (a + b) / 2, 1.4, R.minZ - 0.14);
  }

  // Rampa grande (el objeto conectable va aparte): su frente mira a +Z
  const ramp = { x: 82, z: -15.2 };
  rects.push({ minX: ramp.x - RAMP_WIDTH / 2, maxX: ramp.x + RAMP_WIDTH / 2, minZ: ramp.z - RAMP_DEPTH, maxZ: ramp.z - 0.05 });

  // Rampitas (cuñas): suben en su dirección
  const kickers: Kicker[] = [
    { x: 70, z: 9, dirX: 1, dirZ: 0, halfW: 1.1, halfL: 1.2, ramp: false },
    { x: 90.5, z: -5, dirX: -1, dirZ: 0, halfW: 1.1, halfL: 1.2, ramp: false },
    { x: ramp.x, z: ramp.z + 0.6, dirX: 0, dirZ: -1, halfW: RAMP_WIDTH / 2 - 0.6, halfL: 0.8, ramp: true },
  ];
  const wedgeMat = toon('#a8a097', 8);
  for (const k of kickers) {
    if (k.ramp) continue;
    const shape = new THREE.Shape();
    shape.moveTo(-k.halfL, 0);
    shape.lineTo(k.halfL, 0.55);
    shape.lineTo(k.halfL, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: k.halfW * 2, bevelEnabled: false });
    geo.translate(0, 0, -k.halfW);
    const wedge = new THREE.Mesh(geo, wedgeMat);
    wedge.castShadow = wedge.receiveShadow = true;
    wedge.rotation.y = Math.atan2(-k.dirZ, k.dirX);
    add(wedge, k.x, 0.1, k.z);
    const lip = box(0.08, 0.06, k.halfW * 2, '#b8bcc6', { outline: 0.01 });
    lip.rotation.y = wedge.rotation.y;
    add(lip, k.x + k.dirX * k.halfL, 0.66, k.z + k.dirZ * k.halfL);
  }

  // Barandas para grindar
  const rails: Rail[] = [
    { ax: 67, az: -6, bx: 79, bz: -6, h: 0.55 },
    { ax: 66, az: 15.5, bx: 78, bz: 15.5, h: 0.55 },
  ];
  const railMat = toon('#ffc23a');
  for (const r of rails) {
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
    const bar = rounded(new THREE.CylinderGeometry(0.05, 0.05, len, 10), railMat, 0.012);
    bar.rotation.z = Math.PI / 2;
    bar.rotation.y = -Math.atan2(r.bz - r.az, r.bx - r.ax);
    add(bar, (r.ax + r.bx) / 2, r.h + 0.1, (r.az + r.bz) / 2);
    for (const t of [0.05, 0.5, 0.95]) {
      add(box(0.08, r.h + 0.1, 0.08, '', { mat: steel, outline: 0.01 }), r.ax + (r.bx - r.ax) * t, (r.h + 0.1) / 2, r.az + (r.bz - r.az) * t);
    }
  }

  // Cajón (se puede saltar encima)
  add(box(4, 0.55, 2.4, '#8a5a3a', { outline: 0.03, brush: 3 }), 75, 0.38, 2);
  add(box(4.1, 0.06, 0.1, '#b8bcc6', { outline: 0.01 }), 75, 0.68, 0.8);
  add(box(4.1, 0.06, 0.1, '#b8bcc6', { outline: 0.01 }), 75, 0.68, 3.2);
  rects.push({ minX: 73, maxX: 77, minZ: 0.8, maxZ: 3.2, h: 0.65 });

  // Bancos de cemento y un tacho
  for (const [x, z] of [
    [65, -16],
    [93, 1],
  ]) {
    add(box(2.2, 0.45, 0.7, '#a8a097', { outline: 0.02 }), x, 0.32, z);
    rects.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 0.35, maxZ: z + 0.35, h: 0.55 });
  }

  // Sala del skatepark (sureste): la puerta mira a +Z; persiana cerrada hasta el circuito
  const sala = { x: 89, z: 14.5, w: 10, d: 5 };
  add(box(sala.w, 3.6, sala.d, '#6f8fcf', { outline: 0.04, brush: 3 }), sala.x, 1.8 + 0.1, sala.z);
  add(box(sala.w + 0.6, 0.35, sala.d + 0.6, '#3d3550', { outline: 0.03 }), sala.x, 3.85, sala.z);
  const salaSign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), withLife(new THREE.MeshBasicMaterial({ map: textTexture('SALA SKATE', '#e0563f') })));
  add(salaSign, sala.x - 1.8, 3.1, sala.z + sala.d / 2 + 0.02);
  rects.push({ minX: sala.x - sala.w / 2, maxX: sala.x + sala.w / 2, minZ: sala.z - sala.d / 2, maxZ: sala.z + sala.d / 2 });
  const doorX = sala.x + 2.5;
  const doorZ = sala.z + sala.d / 2;
  add(box(2.4, 2.6, 0.12, '#1d1630', { outline: 0.02 }), doorX, 1.4, doorZ + 0.01);
  const shutter = new THREE.Group();
  shutter.userData.dynamic = true;
  for (let i = 0; i < 9; i += 1) {
    const slat = box(2.3, 0.27, 0.08, i % 2 ? '#b8bcc6' : '#a3a8b3', { outline: 0.008 });
    slat.position.y = 0.25 + i * 0.27;
    shutter.add(slat);
  }
  const lock = box(0.3, 0.3, 0.06, '#ff4fd8', { mat: flat('#ff4fd8'), outline: 0.01 });
  lock.position.set(0, 1.2, 0.07);
  shutter.add(lock);
  add(shutter, doorX, 0.1, doorZ + 0.08);
  // Los tres nodos del circuito (solo se ven en el Mundo Voltio) frente a la sala
  const nodes = [
    { x: 81.5, z: 8 },
    { x: 87.5, z: 5.5 },
    { x: 93, z: 9 },
  ];

  const room = buildSkateRoom(scene, rects);

  return {
    kickers,
    rails,
    ramp,
    source: { x: 66.5, z: -12 },
    rulo: { x: 67.2, z: 4.6, faceX: 72, faceZ: 8 },
    board: { x: 68.8, z: 6.2 },
    sala: { doorX, doorZ, shutter },
    nodes,
    chispi: { x: 72.5, z: -11.5 },
    room,
  };
}

/** Interior de la sala del skatepark (x = 400): mini rampa, trofeos, pósters y un sillón. */
function buildSkateRoom(scene: THREE.Scene, rects: Rect[]): InteriorInfo {
  const RX = 400;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 10,
    d: 8,
    wall: '#bcd0f2',
    low: '#9fb6e0',
    trim: '#ff9f43',
    floor: ['#a8a097', '#b3aba1'],
    base: '#3d3550',
    doorFrom: 401.8,
    doorTo: 403.8,
  });
  const { add, solid, x0, z0, z1 } = k;
  // Mini rampa contra la pared norte (se puede saltar al deck)
  add(box(4, 0.9, 1.6, '#c9c2b8', { outline: 0.03 }), RX - 2.5, 0.45, z0 + 0.9);
  add(box(4, 0.06, 0.1, '#b8bcc6', { outline: 0.01 }), RX - 2.5, 0.92, z0 + 1.7);
  solid(RX - 2.5, z0 + 0.9, 4, 1.6, 0.9);
  // Estante de trofeos
  add(box(3.4, 0.1, 0.5, '#7a4a2e', { outline: 0.02 }), RX + 2.5, 1.6, z0 + 0.3);
  for (let i = 0; i < 4; i += 1) {
    const cup = rounded(new THREE.CylinderGeometry(0.16, 0.08, 0.3, 10), toon(['#ffc23a', '#d8d8d8', '#c8843a', '#ffc23a'][i]), 0.01);
    add(cup, RX + 1.3 + i * 0.8, 1.85, z0 + 0.3);
  }
  // Pósters en la pared oeste
  const poster = (text: string, col: string, z: number) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: textTexture(text, col, 320, 200, 52) }));
    p.rotation.y = Math.PI / 2;
    add(p, x0 + 0.03, 1.9, z);
  };
  poster('OLLIE', '#e0563f', -1.5);
  poster('GRIND', '#2bb3a8', 1.2);
  // Sillón y patinetas colgadas
  add(box(1.8, 0.5, 1.0, '#e77fa6', { outline: 0.03, brush: 3 }), RX + 3, 0.3, z1 - 1.6);
  add(box(1.8, 0.8, 0.3, '#e77fa6', { outline: 0.03, brush: 3 }), RX + 3, 0.7, z1 - 2.0);
  solid(RX + 3, z1 - 1.7, 1.9, 1.2, 0.55);
  for (let i = 0; i < 3; i += 1) {
    const deck = box(0.24, 0.74, 0.04, ['#ff9f43', '#7dff8a', '#4fa8e0'][i], { outline: 0.01 });
    add(deck, RX - 0.6 + i * 0.45, 2.0, z0 + 0.05);
  }
  // Cajas apiladas: arriba hay una chispita
  add(box(1.2, 0.9, 1.2, '#c98f5a', { outline: 0.03 }), RX + 0.4, 0.45, z0 + 2.4);
  solid(RX + 0.4, z0 + 2.4, 1.2, 1.2, 0.9);
  keepVivid(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: z1 + 0.2 },
    spawn: { x: 402.8, z: z1 - 1.3 },
    exit: { x: 402.8, z: z1 - 0.3 },
    spark: { id: 'spark-room-skate', x: RX + 0.4, z: z0 + 2.4, y: 0.9 + 0.9 },
  };
}

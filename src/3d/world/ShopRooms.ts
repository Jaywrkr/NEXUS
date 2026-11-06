import * as THREE from 'three';
import { box, keepVivid, rounded, toon } from '../core/render';
import { roomShell, type ReviveRoom } from './MigaHouse';
import { makeGray } from './revive';
import type { Rect } from './World';

/*
 * Interiores de los locales de la calle (Fase 2): la heladería (x = 500) y la tienda de cartas (x = 600).
 * Empiezan grises; al conectar la energía de la habitación con su máquina, recuperan el color.
 */

export type ShopRoom = ReviveRoom;

function menuTexture(lines: string[], bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 220;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 320, 220);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 30px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, 160, 52 + i * 52));
  g.strokeStyle = '#231a36';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 312, 212);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Heladería: mostrador, mesitas, banquetas, un cucurucho gigante de adorno y el menú en la pared. */
export function buildIceCreamRoom(scene: THREE.Scene, rects: Rect[]): ShopRoom {
  const RX = 500;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 10,
    d: 8,
    wall: '#ffd6e7',
    low: '#f4b8cf',
    trim: '#9be7ff',
    floor: ['#fff3dc', '#e77fa6'],
    base: '#7a4a2e',
    doorFrom: 501.8,
    doorTo: 503.8,
  });
  const { add, solid, x0, z0, z1 } = k;
  // Mostrador a lo largo de la pared norte (la máquina va en el medio, aparte)
  for (const cx of [RX - 3.4, RX + 3.4]) {
    add(box(2.6, 1.0, 1.0, '#9be7ff', { outline: 0.03 }), cx, 0.5, z0 + 0.9);
    add(box(2.7, 0.08, 1.1, '#fff3dc', { outline: 0.01 }), cx, 1.04, z0 + 0.9);
    solid(cx, z0 + 0.9, 2.6, 1.0, 1.0);
  }
  // Frascos de cucuruchos en el mostrador
  for (let i = 0; i < 3; i += 1) {
    add(rounded(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 10), toon('#bfe6ff'), 0.01), RX + 2.6 + i * 0.5, 1.28, z0 + 0.9);
  }
  // Menú en la pared oeste
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshBasicMaterial({ map: menuTexture(['FRUTILLA', 'VAINILLA', 'CHISPA ✦'], '#e0563f') }));
  menu.rotation.y = Math.PI / 2;
  add(menu, x0 + 0.03, 1.9, -0.5);
  // Mesitas redondas con banquetas
  for (const [tx, tz] of [
    [RX - 2.2, 1.2],
    [RX + 1.4, 1.8],
  ]) {
    add(rounded(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), toon('#fff3dc'), 0.012), tx, 0.78, tz);
    add(rounded(new THREE.CylinderGeometry(0.06, 0.12, 0.76, 8), toon('#3d3550'), 0.01), tx, 0.38, tz);
    rects.push({ minX: tx - 0.5, maxX: tx + 0.5, minZ: tz - 0.5, maxZ: tz + 0.5, h: 0.81 });
    for (const dx of [-0.85, 0.85]) {
      add(rounded(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), toon('#e77fa6'), 0.01), tx + dx, 0.55, tz);
      add(rounded(new THREE.CylinderGeometry(0.04, 0.04, 0.52, 6), toon('#3d3550'), 0.006), tx + dx, 0.27, tz);
    }
  }
  // Cucurucho gigante de adorno en la esquina
  const cone = rounded(new THREE.ConeGeometry(0.45, 1.3, 14), toon('#d29a63', 3), 0.016);
  cone.rotation.x = Math.PI;
  add(cone, x0 + 0.8, 0.75, z1 - 0.9);
  add(rounded(new THREE.SphereGeometry(0.5, 14, 10), toon('#9be7ff'), 0.016), x0 + 0.8, 1.55, z1 - 0.9);
  add(rounded(new THREE.SphereGeometry(0.42, 14, 10), toon('#ffb3da'), 0.016), x0 + 0.8, 2.15, z1 - 0.9);
  rects.push({ minX: x0 + 0.3, maxX: x0 + 1.3, minZ: z1 - 1.4, maxZ: z1 - 0.4 });
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: z1 + 0.2 },
    spawn: { x: 502.8, z: z1 - 1.3 },
    exit: { x: 502.8, z: z1 - 0.3 },
    spark: { id: 'spark-room-helados', x: RX + 3.4, z: z0 + 0.9, y: 1.0 + 0.9 },
    source: { x: RX - 3.3, z: 2.4 },
    target: { x: RX, z: z0 + 0.75 },
    gray,
  };
}

/** Tienda de cartas: estanterías con carpetas, mostrador, póster de Chispis y la vitrina (aparte). */
export function buildCardRoom(scene: THREE.Scene, rects: Rect[]): ShopRoom {
  const RX = 600;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 10,
    d: 8,
    wall: '#d9ccf2',
    low: '#b8a6e0',
    trim: '#ffc23a',
    floor: ['#3d3550', '#4a3f66'],
    base: '#2a2146',
    doorFrom: 601.8,
    doorTo: 603.8,
  });
  const { add, solid, x0, z0, z1 } = k;
  // Estanterías con carpetas de colores contra la pared norte
  for (const cx of [RX - 3.3, RX + 3.3]) {
    add(box(2.6, 2.4, 0.6, '#7a4a2e', { outline: 0.03 }), cx, 1.2, z0 + 0.35);
    solid(cx, z0 + 0.35, 2.6, 0.6);
    for (const y of [0.6, 1.3, 2.0]) {
      for (let i = 0; i < 6; i += 1) {
        const col = ['#ff9f43', '#7dff8a', '#9be7ff', '#ff4fd8', '#ffe066', '#e0563f'][(i + Math.round(y * 3)) % 6];
        add(box(0.3, 0.5, 0.4, col, { outline: 0.008 }), cx - 1.0 + i * 0.4, y + 0.1, z0 + 0.45);
      }
    }
  }
  // Póster de Chispis en la pared oeste
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ map: menuTexture(['CHISPIS', '¡JUNTALOS!', '🃏 ✦ ⚡'], '#2bb3a8') }));
  poster.rotation.y = Math.PI / 2;
  add(poster, x0 + 0.03, 1.9, -0.4);
  // Mostrador con caja registradora (se puede saltar encima)
  add(box(2.4, 1.0, 0.9, '#ffc23a', { outline: 0.03 }), RX + 2.6, 0.5, 1.4);
  add(box(0.6, 0.35, 0.4, '#3d3550', { outline: 0.012 }), RX + 3.2, 1.18, 1.4);
  solid(RX + 2.6, 1.4, 2.4, 0.9, 1.0);
  // Alfombra y almohadones para jugar a las cartas
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), toon('#ff4fd8', 6));
  rug.rotation.x = -Math.PI / 2;
  add(rug, RX - 2.4, 0.05, 1.8);
  for (const [dx, dz] of [
    [-0.9, 0],
    [0.9, 0],
    [0, 0.9],
  ]) {
    add(rounded(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12), toon('#9be7ff'), 0.01), RX - 2.4 + dx, 0.15, 1.8 + dz);
  }
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: z1 + 0.2 },
    spawn: { x: 602.8, z: z1 - 1.3 },
    exit: { x: 602.8, z: z1 - 0.3 },
    spark: { id: 'spark-room-cartas', x: RX + 2.6, z: 1.4, y: 1.0 + 0.9 },
    source: { x: RX - 3.6, z: 2.6 },
    target: { x: RX, z: z0 + 0.75 },
    gray,
  };
}

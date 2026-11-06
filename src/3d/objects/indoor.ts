import * as THREE from 'three';
import { box, glow, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * Lo que se revive adentro de cada casa (Fase 2). Son "lugares grandes" chiquitos: se conectan con
 * cable desde la energía de la habitación y abren su carrera de luz. Al revivirlos, la habitación
 * recupera el color y afuera se nota (ventanas, guirnaldas, carteles).
 */

/** Tablero de luz de la casa de Miga (en la pared oeste, mira a +X). */
export class FuseBox extends Connectable {
  private readonly leds: THREE.MeshBasicMaterial[] = [];
  private readonly lever = new THREE.Group();
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, Math.PI / 2);
    this.collideRadius = 0.3;
    this.label = 'Tablero de luz';
    const cab = box(0.9, 1.2, 0.2, '#8b8f9a', { outline: 0.02 });
    cab.position.set(0, 1.6, 0.1);
    this.group.add(cab);
    const door = box(0.8, 1.1, 0.04, '#b8bcc6', { outline: 0.01 });
    door.position.set(0, 1.6, 0.22);
    this.group.add(door);
    const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), toon('#ffc23a'));
    bolt.rotation.z = Math.PI;
    bolt.position.set(0, 1.95, 0.25);
    this.group.add(bolt);
    for (let i = 0; i < 4; i += 1) {
      const m = new THREE.MeshBasicMaterial({ color: '#4a4856' });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), m);
      led.position.set(-0.27 + i * 0.18, 1.4, 0.25);
      this.group.add(led);
      this.leds.push(m);
    }
    const handle = box(0.08, 0.32, 0.08, '#e0563f', { outline: 0.01 });
    handle.position.y = 0.16;
    this.lever.add(handle);
    this.lever.position.set(0.32, 1.1, 0.25);
    this.lever.rotation.z = 0.7;
    this.group.add(this.lever);
    // Cable que baja al zócalo
    const conduit = box(0.08, 1.0, 0.08, '#3d3550', { outline: 0.01 });
    conduit.position.set(-0.3, 0.5, 0.06);
    this.group.add(conduit);
    this.plugAnchor.position.set(0, 1.3, 0.3);
  }

  activate(): void {
    this.active_ = true;
    this.lever.rotation.z = -0.7;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.leds.forEach((m, i) => m.color.set(Math.sin(this.t * 4 + i) > -0.3 ? ['#7dff8a', '#ffe066', '#7dff8a', '#5ee7ff'][i] : '#4a4856'));
  }
}

/** Máquina de helados de la heladería: tres canillas, bachas de colores y un cucurucho gigante. */
export class IceCreamMachine extends Connectable {
  private readonly tubs: THREE.MeshToonMaterial[] = [];
  private readonly cone = new THREE.Group();
  private readonly sign: THREE.MeshBasicMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 1.1;
    this.label = 'Máquina de helados';
    const body = box(2.2, 1.6, 0.9, '#f4efe6', { outline: 0.03 });
    body.position.y = 0.8;
    this.group.add(body);
    const top = box(2.3, 0.12, 1.0, '#e77fa6', { outline: 0.02 });
    top.position.y = 1.66;
    this.group.add(top);
    const colors = ['#ffb3da', '#fff0a8', '#9be7ff'];
    for (let i = 0; i < 3; i += 1) {
      const tap = rounded(new THREE.CylinderGeometry(0.08, 0.06, 0.3, 8), toon('#b8bcc6'), 0.008);
      tap.position.set(-0.6 + i * 0.6, 1.25, 0.5);
      this.group.add(tap);
      const mat = toonUnique('#8e8a99');
      const tub = rounded(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0.01);
      tub.position.set(-0.6 + i * 0.6, 1.72, 0);
      this.group.add(tub);
      this.tubs.push(mat);
      mat.userData.on = colors[i];
    }
    // Cucurucho gigante arriba
    const wafer = rounded(new THREE.ConeGeometry(0.28, 0.7, 12), toon('#d29a63'), 0.012);
    wafer.rotation.x = Math.PI;
    wafer.position.y = 0.35;
    this.cone.add(wafer);
    const scoop = rounded(new THREE.SphereGeometry(0.3, 14, 10), toon('#ff9fd0'), 0.012);
    scoop.position.y = 0.78;
    this.cone.add(scoop);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon('#e0563f'));
    cherry.position.y = 1.1;
    this.cone.add(cherry);
    this.cone.position.set(0, 1.75, -0.1);
    this.group.add(this.cone);
    this.sign = new THREE.MeshBasicMaterial({ color: '#4a4856' });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.04), this.sign);
    sign.position.set(0, 1.1, 0.47);
    this.group.add(sign);
    this.plugAnchor.position.set(0.9, 0.9, 0.5);
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.tubs) m.color.set(m.userData.on as string);
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.cone.rotation.y += dt * 0.8;
    this.cone.position.y = 1.75 + Math.sin(this.t * 2) * 0.05;
    this.sign.color.setHSL((this.t * 0.15) % 1, 0.8, 0.65);
  }
}

/** Vitrina de cartas de la tienda: abanicos de cartas que brillan cuando vuelve la luz. */
export class CardDisplay extends Connectable {
  /** Tocar la vitrina encendida abre el álbum. */
  static onPoke: (() => void) | null = null;

  poke(): boolean {
    if (!this.active_) return false;
    CardDisplay.onPoke?.();
    return true;
  }

  private readonly cards: THREE.Mesh[] = [];
  private readonly glowMat: THREE.MeshBasicMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 1.1;
    this.label = 'Vitrina de cartas';
    const base = box(2.4, 0.9, 1.0, '#7a4a2e', { outline: 0.03 });
    base.position.y = 0.45;
    this.group.add(base);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.7, 0.9),
      new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.25, depthWrite: false }),
    );
    glass.position.y = 1.25;
    this.group.add(glass);
    const frame = box(2.4, 0.06, 1.0, '#3d3550', { outline: 0.01 });
    frame.position.y = 1.62;
    this.group.add(frame);
    this.glowMat = glow('#4a4856');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.8), this.glowMat);
    floor.position.y = 0.92;
    this.group.add(floor);
    const colors = ['#ff9f43', '#7dff8a', '#9be7ff', '#ff4fd8', '#ffe066'];
    for (let f = 0; f < 3; f += 1) {
      for (let i = 0; i < 5; i += 1) {
        const card = box(0.22, 0.32, 0.015, colors[(i + f) % 5], { outline: 0.006 });
        card.position.set(-0.75 + f * 0.75 + (i - 2) * 0.05, 1.12, 0.05);
        card.rotation.z = (i - 2) * 0.25;
        this.group.add(card);
        this.cards.push(card);
      }
    }
    // Cartel "CARTAS" chiquito arriba
    const tag = box(1.0, 0.28, 0.04, '#ffc23a', { outline: 0.01 });
    tag.position.set(0, 1.85, 0);
    this.group.add(tag);
    this.plugAnchor.position.set(1.0, 0.7, 0.5);
  }

  activate(): void {
    this.active_ = true;
    this.glowMat.color.set('#fff3c4');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.cards.forEach((c, i) => {
      c.position.y = 1.12 + Math.max(0, Math.sin(this.t * 2 + i * 0.6)) * 0.06;
    });
  }
}

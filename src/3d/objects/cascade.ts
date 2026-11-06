import * as THREE from 'three';
import { box, rounded, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * La cascada del Cerro (Fase 8). Empieza congelada: una columna de hielo gris y un pozo duro.
 * Con cable desde la energía (carrera de luz «cable de hielo») se descongela: el agua corre por la
 * roca, el pozo se llena y sube rocío.
 */
export class Cascade extends Connectable {
  private readonly ice: THREE.MeshToonMaterial;
  private readonly pool: THREE.MeshToonMaterial;
  private readonly flow: THREE.MeshBasicMaterial;
  private readonly flowTex: THREE.CanvasTexture;
  private readonly mist: THREE.Mesh[] = [];
  private readonly icicles: THREE.Object3D[] = [];

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 1.4;
    this.label = 'Cascada';
    this.ice = toonUnique('#c8d6de');
    this.pool = toonUnique('#b9c7cf');
    // Columna de hielo pegada a la roca (de 8 m de alto)
    const col = box(3.2, 8, 0.7, '', { mat: this.ice, outline: 0.03 });
    col.position.set(0, 4, -0.7);
    this.group.add(col);
    for (let i = 0; i < 7; i += 1) {
      const ic = rounded(new THREE.ConeGeometry(0.22, 1.2 + (i % 3) * 0.5, 6), this.ice, 0.008);
      ic.rotation.x = Math.PI;
      ic.position.set(-1.4 + i * 0.47, 0.9 + (i % 2) * 0.4, -0.25);
      this.group.add(ic);
      this.icicles.push(ic);
    }
    // Agua que corre (aparece al descongelar)
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#5ec8ff';
    g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 40; i += 1) {
      g.fillStyle = i % 3 ? '#bfefff' : '#ffffff';
      g.fillRect((i * 23) % 60, (i * 53) % 256, 3, 18 + (i % 4) * 10);
    }
    this.flowTex = new THREE.CanvasTexture(c);
    this.flowTex.wrapS = this.flowTex.wrapT = THREE.RepeatWrapping;
    this.flowTex.repeat.set(1, 2);
    this.flowTex.colorSpace = THREE.SRGBColorSpace;
    this.flow = new THREE.MeshBasicMaterial({ map: this.flowTex, transparent: true, opacity: 0 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 8), this.flow);
    water.position.set(0, 4, -0.3);
    this.group.add(water);
    // Pozo
    const rim = rounded(new THREE.CylinderGeometry(2.3, 2.4, 0.4, 20), toonUnique('#8a7f76'), 0.02);
    rim.position.set(0, 0.2, 0.9);
    this.group.add(rim);
    const surf = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.1, 20), this.pool);
    surf.position.set(0, 0.38, 0.9);
    this.group.add(surf);
    for (let i = 0; i < 5; i += 1) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }));
      p.position.set(-1 + i * 0.5, 0.6, 0.2);
      this.group.add(p);
      this.mist.push(p);
    }
    this.plugAnchor.position.set(1.8, 0.6, 1.2);
  }

  activate(): void {
    this.active_ = true;
    this.ice.color.set('#8fd8ff');
    this.pool.color.set('#3fa8e8');
    this.flow.opacity = 0.92;
    for (const ic of this.icicles) ic.visible = false;
  }

  update(dt: number, time: number): void {
    if (!this.active_) return;
    this.flowTex.offset.y += dt * 1.6;
    this.mist.forEach((p, i) => {
      const k = (time * 0.5 + i / 5) % 1;
      p.position.y = 0.5 + k * 1.6;
      p.scale.setScalar(0.6 + k);
      (p.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
    });
  }
}

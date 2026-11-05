import * as THREE from 'three';
import type { Progress3D } from '../core/progress';
import { box, toon } from '../core/render';
import type { Renderer } from '../core/render';
import { crystalStar } from '../objects/objects';

export const ZONE_FRAGMENTS = [
  { id: 'plaza-fragment', label: 'Fragmento de la plaza' },
  { id: 'fountain-fragment', label: 'Fragmento de la fuente' },
  { id: 'beacon-fragment', label: 'Fragmento de la antena' },
  { id: 'bridge-fragment', label: 'Fragmento del puente' },
  { id: 'garden-fragment', label: 'Flor del jardín' },
  { id: 'workshop-fragment', label: 'Pato del taller' },
  { id: 'lantern-fragment', label: 'Farol de Lucio' },
];
/** No cuenta para "¡Colección completa!" (Decisión 019). */
export const SECRET_FRAGMENT = { id: 'secret-fragment', label: 'Fragmento secreto' };

interface Case {
  group: THREE.Group;
  shard: THREE.Group;
  label: HTMLElement;
  id: string;
}

/** Museo Nexus en 3D: una sala con cinco vitrinas. Los fragmentos recolectados giran adentro. */
export class MuseumMode {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private readonly cases: Case[] = [];
  private readonly overlay: HTMLElement | null;
  private portrait = false;
  private rug!: THREE.Object3D;

  constructor() {
    const s = this.scene;
    s.background = new THREE.Color('#20233a');
    s.add(new THREE.HemisphereLight('#c9d4ff', '#5a4030', 1.6));
    const key = new THREE.DirectionalLight('#ffe2b0', 2.2);
    key.position.set(3, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -8;
    sc.right = sc.top = 8;
    s.add(key);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 44), toon('#7a5236', 12));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), toon('#3a3f63', 6));
    wall.position.set(0, 7, -3);
    wall.receiveShadow = true;
    s.add(wall);
    const rug = box(16, 0.03, 3.4, '#8c3b3b', { outline: false, cast: false, brush: 4 });
    rug.position.set(0, 0.015, 0.4);
    s.add(rug);
    this.rug = rug;

    this.overlay = document.getElementById('museum');
    const labels = document.getElementById('museumLabels');
    [...ZONE_FRAGMENTS, SECRET_FRAGMENT].forEach((f) => {
      const g = new THREE.Group();
      const ped = box(1.1, 0.9, 1.1, '#2c2f48', { outline: 0.03 });
      ped.position.y = 0.45;
      g.add(ped);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.25, 1.0),
        new THREE.MeshBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.16, depthWrite: false }),
      );
      glass.position.y = 0.9 + 0.625;
      g.add(glass);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: '#c9d0ff' }));
      edges.position.copy(glass.position);
      g.add(edges);
      const shard = crystalStar(f.id === SECRET_FRAGMENT.id ? '#ffd84a' : '#ff9ff3');
      shard.position.y = 1.5;
      g.add(shard);
      s.add(g);
      const label = document.createElement('div');
      label.className = 'museum-label';
      labels?.appendChild(label);
      this.cases.push({ group: g, shard, label, id: f.id });
    });
  }

  /** Acomoda las vitrinas: una fila en horizontal, filas de 2 en vertical (sirve para cualquier cantidad). */
  private layout(aspect: number): void {
    this.portrait = aspect < 1;
    const n = this.cases.length;
    if (this.portrait) {
      // Filas de 2, bien separadas y vistas desde arriba: así ninguna vitrina
      // tapa a la de atrás ni su nombre se pisa con el de al lado.
      const perRow = 2;
      const rows = Math.ceil(n / perRow);
      this.cases.forEach((c, i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, n - row * perRow);
        const col = (i % perRow) - (inRow - 1) / 2;
        // La pared del fondo está en z = -3: las filas empiezan delante de ella.
        c.group.position.set(col * 3.0, 0, -1.6 + row * 3.6);
      });
      const cz = -1.6 + (rows - 1) * 1.8;
      this.rug.scale.set(0.42, 1, (rows * 3.6) / 3.4);
      this.rug.position.set(0, 0.015, cz + 0.3);
      this.camera.fov = 50;
      this.camera.position.set(0, 9 + rows * 2.6, cz + 5 + rows * 1.4);
      this.camera.lookAt(0, 0.4, cz + 0.6);
    } else {
      this.rug.scale.set(1, 1, 1);
      this.rug.position.set(0, 0.015, 0.4);
      const spacing = Math.min(2.4, 13 / Math.max(1, n - 1));
      this.cases.forEach((c, i) => c.group.position.set((i - (n - 1) / 2) * spacing, 0, 0));
      this.camera.fov = 38;
      this.camera.position.set(0, 4.2, 11 + n * 0.45);
      this.camera.lookAt(0, 1.0, 0);
    }
  }

  enter(progress: Progress3D): void {
    for (const c of this.cases) {
      const has = progress.hasFragment(c.id);
      c.shard.visible = has;
      const meta = [...ZONE_FRAGMENTS, SECRET_FRAGMENT].find((f) => f.id === c.id)!;
      c.label.textContent = has ? meta.label : 'Vitrina vacía';
      c.label.classList.toggle('empty', !has);
    }
    const complete = ZONE_FRAGMENTS.every((f) => progress.hasFragment(f.id));
    document.getElementById('museumComplete')?.toggleAttribute('hidden', !complete);
    this.overlay?.removeAttribute('hidden');
  }

  exit(): void {
    this.overlay?.setAttribute('hidden', '');
  }

  render(renderer: Renderer, time: number): void {
    const aspect = renderer.width / renderer.height;
    if ((aspect < 1) !== this.portrait || this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.layout(aspect);
      this.camera.updateProjectionMatrix();
    }
    const v = new THREE.Vector3();
    for (const c of this.cases) {
      c.shard.rotation.y = time * 1.2;
      c.shard.position.y = 1.5 + Math.sin(time * 2 + c.group.position.x) * 0.06;
      // Etiqueta HTML debajo de cada vitrina
      v.set(c.group.position.x, -0.05, c.group.position.z + 0.6).project(this.camera);
      c.label.style.left = `${((v.x + 1) / 2) * renderer.width}px`;
      c.label.style.top = `${((1 - v.y) / 2) * renderer.height}px`;
    }
    renderer.render(this.scene, this.camera, time);
  }
}

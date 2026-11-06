import * as THREE from 'three';
import { box, glow, keepVivid, rounded, toon } from '../core/render';
import { NOTES, RACES, type NoteSpot, type Race } from '../data/collectibles';

/*
 * Expansión, Fase 10 (PLAN_EXPANSION.md):
 *  - Notas de la canción: corcheas brillantes escondidas por la ciudad (algunas arriba de autos y rocas).
 *  - Carreras de aros: se arrancan en un cartel 🏁, hay que pasar por los aros en orden antes de que se
 *    acabe el tiempo. Si no se llega, se prueba otra vez: no se pierde nada.
 */

const NOTE_COLORS: Record<string, string> = {
  centro: '#ffd23a',
  skatepark: '#ff9f43',
  parque: '#ff5a6e',
  estacion: '#c7a17a',
  cerro: '#7be07a',
  puerto: '#5ec8ff',
};

function makeNote(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = glow(color);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat);
  head.scale.set(1.25, 0.9, 0.8);
  head.position.set(-0.08, -0.22, 0);
  g.add(head);
  const stem = box(0.05, 0.55, 0.05, '', { mat, outline: false });
  stem.position.set(0.1, 0.05, 0);
  g.add(stem);
  const flag = box(0.22, 0.07, 0.05, '', { mat, outline: false });
  flag.position.set(0.2, 0.28, 0);
  flag.rotation.z = -0.5;
  g.add(flag);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
  g.add(halo);
  return g;
}

export class Notes {
  private readonly items: { spot: NoteSpot; g: THREE.Group }[] = [];

  constructor(scene: THREE.Scene, has: (id: string) => boolean) {
    for (const spot of NOTES) {
      if (has(spot.id)) continue;
      const g = makeNote(NOTE_COLORS[spot.district] ?? '#ffffff');
      g.position.set(spot.x, spot.y, spot.z);
      scene.add(g);
      this.items.push({ spot, g });
    }
  }

  /** Devuelve la nota que se juntó en este cuadro (o null). */
  update(_dt: number, time: number, p: THREE.Vector3): NoteSpot | null {
    let got: NoteSpot | null = null;
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const it = this.items[i];
      it.g.rotation.y = time * 2 + i;
      it.g.position.y = it.spot.y + Math.sin(time * 2.5 + i) * 0.1;
      if (!got && Math.hypot(p.x - it.spot.x, p.z - it.spot.z) < 1.0 && Math.abs(p.y + 0.7 - it.spot.y) < 1.1) {
        got = it.spot;
        it.g.removeFromParent();
        this.items.splice(i, 1);
      }
    }
    return got;
  }

  /** La nota sin juntar más cercana (para la pista). */
  nearest(p: { x: number; z: number }, district?: string): NoteSpot | null {
    let best: NoteSpot | null = null;
    let bd = Infinity;
    for (const { spot } of this.items) {
      if (district && spot.district !== district) continue;
      const d = Math.hypot(spot.x - p.x, spot.z - p.z);
      if (d < bd) {
        bd = d;
        best = spot;
      }
    }
    return best;
  }
}

export type RaceEvent = { kind: 'ring'; n: number; total: number } | { kind: 'win'; time: number } | { kind: 'fail' };

function startSign(name: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = '#1d1630';
  x.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 16; i += 1) {
    x.fillStyle = i % 2 ? '#fff3dc' : '#1d1630';
    x.fillRect(i * 32, 0, 32, 18);
    x.fillStyle = i % 2 ? '#1d1630' : '#fff3dc';
    x.fillRect(i * 32, 142, 32, 18);
  }
  x.fillStyle = '#ffd23a';
  x.font = 'bold 44px "Arial Black", Impact, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('🏁 CARRERA', 256, 58);
  x.fillStyle = '#fff3dc';
  x.font = 'bold 30px "Arial Black", Impact, sans-serif';
  x.fillText(name.toUpperCase(), 256, 108);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Races {
  active: Race | null = null;
  private ringIdx = 0;
  private t = 0;
  private readonly rings: THREE.Mesh[] = [];
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23a' });
  private readonly nextMat = new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0.55 });
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (const race of RACES) {
      const g = new THREE.Group();
      const pad = rounded(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 24), toon('#1d1630'), 0.01);
      pad.position.y = 0.05;
      g.add(pad);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 6, 28), glow('#ffd23a'));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      g.add(ring);
      const post = rounded(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), toon('#3d3550'), 0.008);
      post.position.set(-1, 1.2, 0);
      g.add(post);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.56), new THREE.MeshBasicMaterial({ map: startSign(race.name) }));
      sign.position.set(-1, 2.2, 0.05);
      g.add(sign);
      g.position.set(race.start.x, 0, race.start.z);
      keepVivid(g);
      scene.add(g);
    }
  }

  /** Carrera cuyo cartel de salida está al lado (y no hay otra corriendo). */
  nearStart(p: { x: number; z: number }): Race | null {
    if (this.active) return null;
    return RACES.find((r) => Math.hypot(r.start.x - p.x, r.start.z - p.z) < 1.6) ?? null;
  }

  start(race: Race): void {
    this.cancel();
    this.active = race;
    this.ringIdx = 0;
    this.t = 0;
    race.rings.forEach(([x, y, z], i) => {
      const [px, , pz] = i === 0 ? [race.start.x, 0, race.start.z] : race.rings[i - 1];
      const m = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.11, 8, 32), i === 0 ? this.ringMat : this.nextMat);
      m.position.set(x, y, z);
      m.rotation.y = Math.atan2(x - px, z - pz);
      m.visible = i < 2;
      this.scene.add(m);
      this.rings.push(m);
    });
  }

  cancel(): void {
    for (const m of this.rings) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    this.rings.length = 0;
    this.active = null;
  }

  get timeLeft(): number {
    return this.active ? Math.max(0, this.active.time - this.t) : 0;
  }

  get progress(): [number, number] {
    return [this.ringIdx, this.active?.rings.length ?? 0];
  }

  update(dt: number, time: number, p: THREE.Vector3): RaceEvent | null {
    const race = this.active;
    if (!race) return null;
    this.t += dt;
    const cur = this.rings[this.ringIdx];
    if (cur) {
      cur.scale.setScalar(1 + Math.sin(time * 6) * 0.06);
      const [x, y, z] = race.rings[this.ringIdx];
      if (Math.hypot(p.x - x, p.z - z) < 1.6 && Math.abs(p.y + 0.8 - y) < 1.6) {
        cur.removeFromParent();
        this.ringIdx += 1;
        const next = this.rings[this.ringIdx];
        if (next) {
          next.material = this.ringMat;
          next.visible = true;
        }
        const after = this.rings[this.ringIdx + 1];
        if (after) after.visible = true;
        if (this.ringIdx >= race.rings.length) {
          const t = this.t;
          this.cancel();
          return { kind: 'win', time: t };
        }
        return { kind: 'ring', n: this.ringIdx, total: race.rings.length };
      }
    }
    if (this.t > race.time) {
      this.cancel();
      return { kind: 'fail' };
    }
    return null;
  }
}

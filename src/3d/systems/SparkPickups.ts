import * as THREE from 'three';
import type { World } from '../world/World';

/*
 * Chispitas sueltas por el barrio: pedacitos de la Gran Chispa que se apagó (Decisión 041).
 * El Nexus las junta caminando con su mochila Atrapachispas. Salen de tres lados:
 *  - escondidas por el barrio (se escapan un poquito cuando te acercás; se guardan al juntarlas),
 *  - saltan de los nidos de chispitas al tocarlos,
 *  - estallan al revivir un lugar grande.
 * Cerca del Nexus las atrae un imán suave, salvo que la mochila esté llena.
 */

interface Pickup {
  id: string | null; // las escondidas tienen id (se guardan); las demás no
  g: THREE.Group;
  home: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  flying: boolean;
  p: number;
  life: number;
  /** Altura a la que flota (las de arriba de los autos o en los cables están altas: hay que saltar o colgarse). */
  baseY: number;
}

/** Escondidas por el barrio (ids fijos). */
export const HIDDEN_SPARKS: [string, number, number][] = [
  ['spark-hidden-0', -16, -37.5], // detrás de la casa de la plaza
  ['spark-hidden-1', -40, 2],
  ['spark-hidden-2', 42, -2],
  ['spark-hidden-3', 34, -32],
  ['spark-hidden-4', 8, -33],
  ['spark-hidden-5', -33, 30],
  ['spark-hidden-6', 26, 26],
  ['spark-hidden-7', 30, 44],
  ['spark-hidden-8', -24, 61],
  ['spark-hidden-9', 3, 59.5],
];

let coreGeo: THREE.OctahedronGeometry | null = null;

export class SparkPickups {
  private readonly scene: THREE.Scene;
  private readonly world: World;
  readonly items: Pickup[] = [];

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
  }

  private make(id: string | null, x: number, z: number, y = 0.9): Pickup {
    coreGeo ??= new THREE.OctahedronGeometry(0.17);
    const g = new THREE.Group();
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: '#ffe066', fog: false }));
    g.add(core);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.3, depthWrite: false, fog: false }),
    );
    g.add(halo);
    g.position.set(x, y, z);
    this.scene.add(g);
    const pk: Pickup = { id, g, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), flying: false, p: Math.random() * 10, life: 0, baseY: y };
    this.items.push(pk);
    return pk;
  }

  /** Coloca una escondida (si todavía no se juntó). */
  addHidden(id: string, x: number, z: number, y = 0.9): void {
    this.make(id, x, z, y);
  }

  /** Estallido: n chispitas que saltan desde (x, z) y caen alrededor. */
  burst(n: number, x: number, z: number, y = 1.2): void {
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.8;
      let r = 1.8 + Math.random() * 1.2;
      let tx = x + Math.cos(a) * r;
      let tz = z + Math.sin(a) * r;
      for (let k = 0; k < 6 && !this.world.isWalkable(tx, tz, 0.3); k += 1) {
        r *= 0.7;
        tx = x + Math.cos(a + k) * r;
        tz = z + Math.sin(a + k) * r;
      }
      const pk = this.make(null, x, z);
      pk.home.set(tx, 0, tz);
      pk.pos.set(x, y, z);
      pk.vel.set((tx - x) / 0.8, 4.2, (tz - z) / 0.8);
      pk.flying = true;
    }
  }

  private remove(pk: Pickup): void {
    this.scene.remove(pk.g);
    this.items.splice(this.items.indexOf(pk), 1);
  }

  /**
   * `room`: cuántas chispitas entran todavía en la mochila. `take` se llama por cada una juntada.
   * Devuelve true si el Nexus tocó una pero la mochila estaba llena.
   */
  update(dt: number, time: number, nexus: THREE.Vector3, room: number, take: (id: string | null) => void): boolean {
    let full = false;
    for (const pk of [...this.items]) {
      pk.life += dt;
      if (pk.flying) {
        pk.vel.y -= 9 * dt;
        pk.pos.addScaledVector(pk.vel, dt);
        if (pk.life > 0.8 || pk.pos.y < 0.9) {
          pk.flying = false;
          pk.pos.set(pk.home.x, 0.9, pk.home.z);
        }
      } else {
        const dx = pk.pos.x - nexus.x;
        const dz = pk.pos.z - nexus.z;
        // Las que están altas solo se alcanzan saltando, subido a algo o colgado de la tirolesa
        const reachY = Math.abs(pk.baseY - (nexus.y + 0.9)) < 0.95;
        const d = reachY ? Math.hypot(dx, dz) : Infinity;
        if (pk.id && pk.baseY < 1.5 && d < 2.6 && room > 0) {
          // Las escondidas se escapan un poquito (más lento que el Nexus: se pueden alcanzar)
          const fromHome = Math.hypot(pk.pos.x - pk.home.x, pk.pos.z - pk.home.z);
          if (fromHome < 1.8 && d > 0.9) {
            const nx = pk.pos.x + (dx / (d || 1)) * 1.7 * dt;
            const nz = pk.pos.z + (dz / (d || 1)) * 1.7 * dt;
            if (this.world.isWalkable(nx, nz, 0.2)) {
              pk.pos.x = nx;
              pk.pos.z = nz;
            }
          }
        }
        if (d < 1.4 && room > 0) {
          // Imán: se acercan a la mochila
          pk.pos.x -= (dx / (d || 1)) * Math.min(d, 6 * dt);
          pk.pos.z -= (dz / (d || 1)) * Math.min(d, 6 * dt);
        }
        if (d < 0.65) {
          if (room > 0) {
            take(pk.id);
            room -= 1;
            this.remove(pk);
            continue;
          }
          full = true;
        }
        pk.pos.y = pk.baseY + Math.sin(time * 2.5 + pk.p) * 0.12;
      }
      pk.g.position.copy(pk.pos);
      pk.g.rotation.y = time * 2.5 + pk.p;
      (pk.g.children[1] as THREE.Mesh).scale.setScalar(1 + Math.sin(time * 6 + pk.p) * 0.15);
    }
    return full;
  }
}

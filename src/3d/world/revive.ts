import * as THREE from 'three';
import { tween } from '../core/tween';

/*
 * Habitaciones que empiezan grises y recuperan el color al revivirlas (Fase 2, Decisión 036 adentro).
 * Las habitaciones están lejos del barrio (x ≥ 300), fuera de los círculos de vida del shader, así que
 * en vez de LIFE se guarda el color original de cada material y se lo pasa a gris; `revive()` lo devuelve.
 */

export interface Revivable {
  readonly alive: boolean;
  revive(animate: boolean): void;
}

function gray(c: THREE.Color): THREE.Color {
  const l = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  return new THREE.Color(l * 0.86, l * 0.9, l * 0.98).lerp(c, 0.12);
}

export function makeGray(root: THREE.Object3D): Revivable {
  const entries: { mat: THREE.Material & { color: THREE.Color }; from: THREE.Color; to: THREE.Color }[] = [];
  const done = new Map<THREE.Material, THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material) || m.userData.isOutline) return;
    const mat = m.material as THREE.Material & { color?: THREE.Color };
    if (!mat.color) return;
    let own = done.get(mat) as (THREE.Material & { color: THREE.Color }) | undefined;
    if (!own) {
      own = mat.clone() as THREE.Material & { color: THREE.Color };
      done.set(mat, own);
      const to = own.color.clone();
      const from = gray(to);
      own.color.copy(from);
      entries.push({ mat: own, from, to });
    }
    m.material = own;
  });
  let alive = false;
  return {
    get alive() {
      return alive;
    },
    revive(animate: boolean) {
      if (alive) return;
      alive = true;
      if (!animate) {
        for (const e of entries) e.mat.color.copy(e.to);
        return;
      }
      tween(1.4, (k) => {
        for (const e of entries) e.mat.color.copy(e.from).lerp(e.to, k);
      });
    },
  };
}

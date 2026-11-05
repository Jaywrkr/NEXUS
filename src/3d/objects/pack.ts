import * as THREE from 'three';
import { box, glow, keepVivid } from '../core/render';

/** Sobre de cartas que flota y gira en el mundo (Fase 3). Se junta caminando encima. */
export function makePack(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const front = box(0.5, 0.72, 0.06, '#ff9f43', { outline: 0.015 });
  body.add(front);
  const foil = box(0.52, 0.12, 0.07, '#ffe066', { outline: false });
  foil.position.y = 0.3;
  body.add(foil);
  const foil2 = box(0.52, 0.06, 0.07, '#ffe066', { outline: false });
  foil2.position.y = -0.33;
  body.add(foil2);
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.13, 5), glow('#fff3a8'));
  star.position.z = 0.036;
  body.add(star);
  const star2 = star.clone();
  star2.position.z = -0.036;
  star2.rotation.y = Math.PI;
  body.add(star2);
  const label = box(0.3, 0.08, 0.072, '#1d1630', { outline: false });
  label.position.y = -0.18;
  body.add(label);
  body.rotation.z = 0.12;
  g.add(body);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 24), glow('#ffe066', 0.5));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.85;
  g.add(halo);
  g.userData.body = body;
  keepVivid(g);
  return g;
}

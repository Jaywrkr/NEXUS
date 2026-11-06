import * as THREE from 'three';

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Suavizado independiente de los fps (l = qué tan rápido se acerca). */
export const damp = (a: number, b: number, l: number, dt: number): number => lerp(a, b, 1 - Math.exp(-l * dt));

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Ángulo con suavizado por el camino más corto. */
export function dampAngle(a: number, b: number, l: number, dt: number): number {
  return a + wrapAngle(b - a) * (1 - Math.exp(-l * dt));
}

// Aleatorio con semilla: el barrio sale igual en cada partida.
let seed = 85;
export function rnd(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

export const isTouch = (): boolean => window.matchMedia('(pointer: coarse)').matches;

export const V3 = THREE.Vector3;

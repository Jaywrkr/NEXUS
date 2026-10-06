import { expect, world, clickObject, ready, returnToWorld, saved } from './helpers.js';

import { steer } from './steering.js';

export async function walkTo(page, x, y) {
  const arrived = await steer(page, 'WorldScene', { x, y });
  expect(arrived, `Must reach (${Math.round(x)}, ${Math.round(y)}) using movement inputs`).toBe(true);
}

export async function walkingConnection(page, source, target) {
  const point = await world(page, `const a=s.connectables.find(o=>o.id===${JSON.stringify(source)}),b=s.connectables.find(o=>o.id===${JSON.stringify(target)});return {x:(a.x+b.x)/2,y:s.scale.height*0.8};`);
  await walkTo(page, point.x, point.y);
  // Wait for the existing follow camera to settle before sampling click coordinates.
  // A protocol round trip can otherwise outlast its last eased movement.
  await expect.poll(() => world(page, 'return Math.abs(s.cameras.main.midPoint.x - Math.max(s.scale.width / 2, Math.min(s.physics.world.bounds.width - s.scale.width / 2, s.nexus.x)));')).toBeLessThan(1);
  await clickObject(page, source);
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(true);
  await clickObject(page, target);
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(false);
}

export async function walkingCollection(page, field, id) {
  const point = await world(page, `return {x:s.${field}.x,y:s.${field}.y};`);
  await walkTo(page, point.x, point.y);
  await ready(page, 'MuseumScene');
  expect((await saved(page)).fragmentsCollected).toContain(id);
  await returnToWorld(page);
}

export async function walkingTunnel(page) {
  expect(await steer(page, 'CableTunnelScene', null), 'Steering must win the tunnel without changing its state').toBe(true);
  await ready(page, 'WorldScene');
  expect(await world(page, 'return s.lamp.isActive;')).toBe(true);
}

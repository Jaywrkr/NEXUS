import { test, expect, ready, start, world, connect, clickObject, near, saved, collect, returnToWorld, checkpoint } from './helpers.js';

const previous = ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'bridge-fragment', 'garden-fragment'];
test('workshop branches merge in either order and preserve a single parade input', async ({ page }, testInfo) => {
  await page.evaluate(ids => localStorage.setItem('los-nexus-progress', JSON.stringify({
    fragmentsCollected: ids, seenCompletion: true, completionCount: 5, connections: [], position: { x: 3950, yRatio: 0.8 },
    story: { heard: ['intro'], discoveries: [], chapterSeen: false },
  })), previous);
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  await near(page, 'toy-motor', 'toy-source');
  await clickObject(page, 'toy-motor');
  expect(await world(page, 'return s.connectionSystem.hasSelection();')).toBe(false);
  await connect(page, 'toy-source', 'toy-duck');
  expect((await saved(page)).connections).toEqual([]);
  await connect(page, 'toy-source', 'toy-motor');
  await connect(page, 'toy-motor', 'toy-bell');
  await connect(page, 'toy-bell', 'toy-parade');
  expect(await world(page, 'return s.workshop.parade.isActive || s.workshop.fragment.visible;')).toBe(false);
  await checkpoint(page, testInfo, 'workshop-partial');
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await world(page, 'return s.workshop.motor.isActive && s.workshop.bell.isActive && !s.workshop.duck.isActive && !s.workshop.parade.isActive;')).toBe(true);
  await connect(page, 'toy-bell', 'toy-parade');
  expect((await saved(page)).connections).toHaveLength(3);
  expect(await world(page, 'return s.workshop.parade.isActive;')).toBe(false);
  await connect(page, 'toy-motor', 'toy-duck');
  await connect(page, 'toy-duck', 'toy-parade');
  expect(await world(page, 'return s.workshop.parade.isActive && s.workshop.fragment.visible;')).toBe(true);
  await checkpoint(page, testInfo, 'workshop-complete');
  await collect(page, 'workshop.fragment', 'workshop-fragment');
  expect((await saved(page)).completionCount).toBe(5);
  await checkpoint(page, testInfo, 'museum-six');
  await returnToWorld(page);
  expect(await world(page, 'return s.workshop.parade.isActive && !s.workshop.fragment.visible;')).toBe(true);
});

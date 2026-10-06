import { test, expect, start, ready, world, clickObject, checkpoint } from './helpers.js';
import { walkTo } from './walking.js';

async function restore(page, position, connections = []) {
  await page.evaluate(({ position, connections }) => localStorage.setItem('los-nexus-progress', JSON.stringify({
    fragmentsCollected: [], connections, position,
    story: { heard: ['miga'], discoveries: [], chapterSeen: false },
  })), { position, connections });
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
}

test('old roof positions return to the pavement and plaza props have solid footprints and depth', async ({ page }, testInfo) => {
  await restore(page, { x: 200, yRatio: .08 });
  expect(await world(page, 'return s.nexus.groundY / s.scale.height;')).toBeGreaterThanOrEqual(.63);
  const source = await world(page, 'return { x:s.connectables[0].x, y:s.connectables[0].y, ground:s.connectables[0].groundY };');
  await walkTo(page, source.x, source.y + 100);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowUp');
  expect(await world(page, 'return s.nexus.y;')).toBeGreaterThanOrEqual(source.ground - 16);
  expect(await world(page, 'return s.nexus.depth > s.connectables[0].depth;')).toBe(true);
  expect(await world(page, 'return s.nexus.shadow.parentContainer === s.nexus;')).toBe(true);
  await checkpoint(page, testInfo, 'plaza-solid-generator');
  await walkTo(page, source.x + 90, source.y + 100);
  await walkTo(page, source.x + 90, source.y - 45);
  await walkTo(page, source.x, source.y - 45);
  expect(await world(page, 'return s.nexus.depth < s.connectables[0].depth;')).toBe(true);
  await checkpoint(page, testInfo, 'plaza-behind-generator');
});

test('rapid correction keeps the latest cable and feedback; selection is visible and cancellable', async ({ page }, testInfo) => {
  await restore(page, { x:730, yRatio:.8 }, [{sourceId:'energy-source',targetId:'lamp'}]);
  await expect.poll(() => world(page,'return Math.abs(s.cameras.main.midPoint.x-730);')).toBeLessThan(1);
  await clickObject(page, 'lamp');
  expect(await world(page,'return s.connectionSystem.selectionRings.commandBuffer.length;')).toBeGreaterThan(0);
  expect(await world(page,'return s.connectionSystem.feedbackText.text;')).toContain('seleccionado');
  await checkpoint(page,testInfo,'plaza-connection-preview');
  await page.keyboard.press('Escape');
  expect(await world(page,'return s.connectionSystem.hasSelection();')).toBe(false);
  expect(await world(page,'return s.connectionSystem.feedbackText.alpha;')).toBe(0);
  // A stale error timer must never erase a newer, successful cable.
  await clickObject(page,'lamp'); await clickObject(page,'energy-source');
  await clickObject(page,'lamp'); await clickObject(page,'door');
  await page.waitForTimeout(650);
  expect(await world(page,'return s.door.isActive;')).toBe(true);
  expect(await world(page,'return s.connectionSystem.cableGraphics.commandBuffer.length;')).toBeGreaterThan(0);
  expect(await world(page,'return s.connectionSystem.feedbackText.text;')).toContain('cierre eléctrico');
  expect(await world(page,'return s.connectionSystem.feedbackText.alpha;')).toBe(1);
  await checkpoint(page,testInfo,'plaza-logical-connection');
});

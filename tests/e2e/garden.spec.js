import { test, expect, ready, world, start, near, connect, saved, collect, returnToWorld, checkpoint, tap } from './helpers.js';

const oldCollection = ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'bridge-fragment'];

async function continueGame(page) {
  await page.reload();
  await ready(page, 'BootScene');
  await start(page, 'Continuar');
}

async function interactNearby(page, id) {
  await world(page, `const o = s.connectables.find(o => o.id === ${JSON.stringify(id)});
    s.nexus.setPosition(o.x, o.y + 55); s.nexus.body.updateFromGameObject();`);
  await expect.poll(() => world(page, 'return s.interactButton.bg.visible;')).toBe(true);
  await tap(page, page.viewportSize().width / 2, page.viewportSize().height - 40);
}

test('continue a completed four-zone save into the garden and restore each watering step', async ({ page, isMobile }, testInfo) => {
  await page.evaluate(ids => {
    localStorage.setItem('los-nexus-progress', JSON.stringify({
      fragmentsCollected: ids, seenCompletion: true, position: { x: 2820, yRatio: 0.8 },
    }));
    localStorage.setItem('los-nexus-reduced-effects', 'false');
  }, oldCollection);
  await continueGame(page);
  expect(await world(page, 'return s.fragmentHud.text;')).toBe('★ 4/5');
  expect(await world(page, 'return s.instructionText.text;')).toContain('aspersor');
  expect(await world(page, 'return s.bridge.isActive && !s.sprinkler.isActive && !s.flowerBed.isActive && !s.gardenFragment.visible;')).toBe(true);

  // The fifth zone is reachable by normal movement beyond the original world boundary.
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    const y = page.viewportSize().height - 90;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 90, y, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 130, y, id: 1 }] });
    await expect.poll(() => world(page, 'return s.nexus.x;')).toBeGreaterThan(3050);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => world(page, 'return s.nexus.x;')).toBeGreaterThan(3050);
    await page.keyboard.up('ArrowRight');
  }
  await near(page, 'garden-bed', 'garden-source');
  await checkpoint(page, testInfo, 'garden-dormant');
  await interactNearby(page, 'garden-sprinkler');
  expect(await world(page, 'return s.connectionSystem.hasSelection();')).toBe(false);
  await connect(page, 'garden-source', 'garden-bed');
  expect((await saved(page)).connections).toEqual([]);
  expect(await world(page, 'return s.flowerBed.isActive || s.gardenFragment.visible;')).toBe(false);

  // Both puzzle steps work through the large proximity button as well as direct taps.
  await interactNearby(page, 'garden-source');
  expect(await world(page, 'return s.connectionSystem.hasSelection();')).toBe(true);
  await interactNearby(page, 'garden-sprinkler');
  await expect.poll(() => world(page, 'return s.sprinkler.isActive;')).toBe(true);
  expect((await saved(page)).connections).toEqual([{ sourceId: 'garden-source', targetId: 'garden-sprinkler' }]);
  await checkpoint(page, testInfo, 'garden-water-ready');
  await continueGame(page);
  expect(await world(page, 'return s.nexus.x;')).toBeGreaterThan(2950);
  expect(await world(page, 'return s.sprinkler.isActive && !s.flowerBed.isActive && !s.gardenFragment.visible;')).toBe(true);
  await expect.poll(() => world(page, 'return s.connectionSystem.hintObject?.id;'), { timeout: 15_000 }).toBe('garden-sprinkler');
  await connect(page, 'garden-source', 'garden-sprinkler');
  expect((await saved(page)).connections).toHaveLength(1);
  await interactNearby(page, 'garden-sprinkler');
  await interactNearby(page, 'garden-bed');
  await expect.poll(() => world(page, 'return s.flowerBed.isActive && s.gardenFragment.visible;')).toBe(true);
  expect((await saved(page)).connections).toHaveLength(2);

  // A solved-but-uncollected garden survives reload and keeps its reward available.
  await continueGame(page);
  expect(await world(page, 'return s.flowerBed.isActive && s.gardenFragment.visible;')).toBe(true);
  expect((await saved(page)).fragmentsCollected).toEqual(oldCollection);
  expect(await page.evaluate(() => window.__effectCalls.flash)).toBe(0);
  await checkpoint(page, testInfo, 'garden-restored-before-collection');
  await collect(page, 'gardenFragment', 'garden-fragment');
  expect((await saved(page)).fragmentsCollected).toEqual([...oldCollection, 'garden-fragment']);
  expect((await saved(page)).completionCount).toBe(5);
  expect(await page.evaluate(() => window.__effectCalls.flash)).toBe(1);
  const flower = await page.evaluate(() => {
    const s = window.__nexusTest.scene.getScene('MuseumScene');
    const exhibit = s.children.getByName('garden-fragment');
    return { x: exhibit.x, y: exhibit.y };
  });
  await tap(page, flower.x, flower.y);
  expect(await page.evaluate(() => window.__nexusTest.scene.getScene('MuseumScene').children.list.some(o => o.text === '¡El jardín volvió a florecer!'))).toBe(true);
  await checkpoint(page, testInfo, 'museum-five-souvenirs');
  await returnToWorld(page);
  await continueGame(page);
  expect(await world(page, 'return s.fragmentHud.text;')).toBe('★ 5/5');
  expect(await world(page, 'return s.flowerBed.isActive && !s.gardenFragment.visible;')).toBe(true);
  expect(await page.evaluate(() => window.__effectCalls.flash)).toBe(0);
});

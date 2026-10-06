import { test, expect, start, world, ready, connect, saved, returnToWorld, checkpoint } from './helpers.js';

test('upstream decoy and secret coexist with chapter progress and restore safely', async ({ page }, testInfo) => {
  await start(page);
  await connect(page, 'beacon-source-fake', 'beacon');
  expect(await world(page, 'return s.beacon.isActive;')).toBe(false);
  expect((await saved(page)).connections).toEqual([]);
  expect(await world(page, 'return s.connectables.find(o => o.id === "beacon-source-fake").glow.visible;')).toBe(false);
  // Collect through a real physics overlap. The secret never contributes to the chapter count.
  await world(page, 's.storyCard.hide(); s.nexus.setPosition(140, s.scale.height / 2 + 60 * s.scale.height / 540); s.nexus.body.updateFromGameObject();');
  await ready(page, 'MuseumScene');
  expect((await saved(page)).fragmentsCollected).toEqual(['secret-fragment']);
  expect((await saved(page)).seenCompletion).toBe(false);
  const exhibit = await page.evaluate(() => {
    const s = window.__nexusTest.scene.getScene('MuseumScene');
    return s.children.list.some(o => o.name === 'secret-fragment' && o.input);
  });
  expect(exhibit).toBe(true);
  await checkpoint(page, testInfo, 'secret-museum');
  await returnToWorld(page);
  expect(await world(page, 'return s.fragmentHud.text;')).toBe('★ 0/7');
  expect(await world(page, 'return s.secretFragment.visible;')).toBe(false);
  await page.reload();
  await ready(page, 'BootScene');
  await start(page, 'Continuar');
  expect(await world(page, 'return s.secretFragment.visible;')).toBe(false);
  expect(await world(page, 'return s.fragmentHud.text;')).toBe('★ 0/7');
});

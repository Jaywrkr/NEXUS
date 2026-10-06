import { connectWater, test, expect, start, ready, world, connect, saved, collect, returnToWorld, tap, checkpoint } from './helpers.js';

test('unexpected connections are harmless discoveries and repairs change other places', async ({ page }, testInfo) => {
  await start(page);
  await connect(page, 'energy-source', 'door');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('relé de la lámpara');
  await connect(page, 'energy-source', 'door');
  expect((await saved(page)).story.discoveries).toEqual(['singing-door']);
  expect((await saved(page)).connections).toEqual([]);
  expect(await world(page, 'return s.door.isActive;')).toBe(false);
  await checkpoint(page, testInfo, 'singing-door');

  await connectWater(page);
  expect(await world(page, 'return s.plazaFlowers.visible;')).toBe(true);
  await collect(page, 'fountainFragment', 'fountain-fragment');
  await returnToWorld(page);
  expect(await world(page, 'return s.plazaFlowers.visible;')).toBe(true);
  await world(page, "const r=s.residents.find(r=>r.id==='miga');s.nexus.setPosition(r.x,r.y+70);s.nexus.body.updateFromGameObject();s.cameras.main.centerOn(r.x,r.y);");
  await expect.poll(async () => (await saved(page)).story.discoveries).toContain('house-garden');
  const point = await world(page, "const r=s.residents.find(r=>r.id==='miga');return {x:r.x-s.cameras.main.scrollX,y:r.y};");
  await tap(page, point.x, point.y);
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('firmar');
  await checkpoint(page, testInfo, 'plaza-water-consequence');
  await connect(page, 'beacon-source-a', 'beacon');
  expect(await world(page, 'return s.radioBanner.visible;')).toBe(false);
  await connect(page, 'beacon-source-b', 'beacon');
  expect(await world(page, 'return s.radioBanner.visible;')).toBe(true);
  await page.reload();
  await ready(page, 'BootScene');
  await start(page, 'Continuar');
  expect(await world(page, 'return s.plazaFlowers.visible && s.radioBanner.visible;')).toBe(true);
  expect((await saved(page)).story.discoveries).toEqual(['singing-door', 'house-garden']);
  expect((await saved(page)).connections).toHaveLength(5);
});

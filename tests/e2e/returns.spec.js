import { test, expect, start, ready, world, connect, saved, tap, checkpoint, titleButton } from './helpers.js';
import { walkTo } from './walking.js';

async function visit(page, id) {
  const point = await world(page, `const r=s.residents.find(r=>r.id===${JSON.stringify(id)});return {x:r.x-s.cameras.main.scrollX,y:r.y-s.cameras.main.scrollY};`);
  await tap(page, point.x, point.y);
}

async function clue(page) { const { width, height } = page.viewportSize(); await tap(page, width - 62, height - 86); }

test('radio creates two optional return projects whose results survive switching, reload and chapter reset', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const memories = ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'bridge-fragment', 'garden-fragment'];
  await page.evaluate(memories => {
    localStorage.setItem('los-nexus-progress', JSON.stringify({ fragmentsCollected: memories, connections: [],
      position: { x: 1750, yRatio: 0.8 }, seenCompletion: false,
      story: { heard: ['intro', 'miga', 'goteo'], discoveries: [], chapterSeen: false } }));
    localStorage.setItem('los-nexus-reduced-effects', 'true');
  }, memories);
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  await connect(page, 'garden-sprinkler', 'garden-band');
  expect(await world(page, 'return s.returnCircuits.band.isActive;')).toBe(false);
  await connect(page, 'radio-source', 'radio-music');
  expect(await world(page, 'return s.returnCircuits.notes.visible;')).toBe(true);
  await walkTo(page, 3480, page.viewportSize().height * 0.8);
  await expect.poll(() => world(page, 'return Math.abs(s.cameras.main.midPoint.x-s.nexus.x);')).toBeLessThan(1);
  await visit(page, 'goteo');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('banda');
  await clue(page); await clue(page); await clue(page);
  expect(await world(page, 'return s.storyCard.message.text;')).toBe('Aspersor → escenario de flores.');
  await connect(page, 'garden-sprinkler', 'garden-band');
  expect((await saved(page)).story.discoveries).toContain('garden-concert');
  await checkpoint(page, testInfo, 'garden-concert');
  await connect(page, 'lamp', 'plaza-bulletin');
  expect(await world(page, 'return s.returnCircuits.bulletin.isActive;')).toBe(false);
  await connect(page, 'radio-source', 'radio-news');
  expect(await world(page, 'return s.returnCircuits.band.isActive && !s.returnCircuits.notes.visible;')).toBe(true);
  const miga = await world(page, "const r=s.residents.find(r=>r.id==='miga');return{x:r.x,y:r.y+50};");
  // Use the clear lower pavement, then approach Miga; the water valves are solid.
  await walkTo(page, miga.x, page.viewportSize().height * .85);
  await walkTo(page, miga.x, miga.y);
  await expect.poll(() => world(page, 'return Math.abs(s.cameras.main.midPoint.x-Math.max(s.scale.width/2,s.nexus.x));')).toBeLessThan(1);
  await visit(page, 'miga');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('anuncio absurdo');
  await clue(page);
  expect(await world(page, 'return s.storyCard.speaker.text;')).toBe('Pista 1/3');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('La noticia ya llegó');
  await connect(page, 'lamp', 'plaza-bulletin');
  expect((await saved(page)).story.discoveries).toContain('plaza-bulletin');
  await checkpoint(page, testInfo, 'plaza-announcement');
  await connect(page, 'radio-source', 'radio-music');
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await world(page, 'return s.returnCircuits.band.isActive && s.returnCircuits.bulletin.isActive;')).toBe(true);
  expect(await world(page, 'return s.radio.channel;')).toBe('music');
  await connect(page, 'garden-sprinkler', 'garden-band');
  expect((await saved(page)).story.discoveries.filter(id => id === 'garden-concert')).toHaveLength(1);
  expect((await saved(page)).connections).toHaveLength(3);
  expect((await saved(page)).fragmentsCollected).toEqual(memories);
  expect((await saved(page)).story.chapterSeen).toBe(false);
  expect(await page.evaluate(() => window.__effectCalls)).toEqual({ flash: 0, shake: 0 });
  await world(page, 's.scene.start("BootScene");'); await ready(page, 'BootScene');
  const dialog = page.waitForEvent('dialog');
  await titleButton(page, 'Nueva partida'); await (await dialog).accept(); await ready(page, 'WorldScene');
  expect(await world(page, 'return s.radio.channel;')).toBe(null);
  expect(await world(page, 'return s.returnCircuits.band.isActive || s.returnCircuits.bulletin.isActive;')).toBe(false);
  expect((await saved(page)).story.discoveries).toEqual([]);
});

import { test, expect, ready, start, connect, world, saved, tap, checkpoint, titleButton } from './helpers.js';

async function endingButton(page, label) {
  const point = await page.evaluate(label => {
    const text = window.__nexusTest.scene.getScene('EndingScene').children.list.find(o => o.text === label);
    return { x: text.x, y: text.y };
  }, label);
  await tap(page, point.x, point.y);
}

test('ending remembers completion, offers exploration and museum, and new game clears its story', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    localStorage.setItem('los-nexus-progress', JSON.stringify({
      fragmentsCollected: ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'bridge-fragment', 'garden-fragment', 'workshop-fragment', 'lantern-fragment'],
      connections: [], position: { x: 5410, yRatio: 0.8 }, seenCompletion: true, completionCount: 7,
      story: { heard: ['intro'], discoveries: ['singing-door'], chapterSeen: false },
    }));
    localStorage.setItem('los-nexus-reduced-effects', 'true');
  });
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  await connect(page, 'lantern-last', 'party-stage');
  await connect(page, 'party-stage', 'party-confetti');
  await ready(page, 'EndingScene');
  expect((await saved(page)).story.chapterSeen).toBe(true);
  expect(await page.evaluate(() => window.__effectCalls)).toEqual({ flash: 0, shake: 0 });
  const labels = await page.evaluate(() => window.__nexusTest.scene.getScene('EndingScene').children.list.filter(o => o.type === 'Text').map(o => {
    const b=o.getBounds();return {text:o.text,left:b.left,right:b.right,top:b.top,bottom:b.bottom};
  }));
  for (const label of labels) {
    expect(label.left, label.text).toBeGreaterThanOrEqual(0);
    expect(label.right, label.text).toBeLessThanOrEqual(page.viewportSize().width);
    expect(label.top, label.text).toBeGreaterThanOrEqual(0);
    expect(label.bottom, label.text).toBeLessThanOrEqual(page.viewportSize().height);
  }
  await checkpoint(page, testInfo, 'chapter-ending');
  await endingButton(page, 'Ver recuerdos'); await ready(page, 'MuseumScene');
  const museumFinal = await page.evaluate(() => {
    const text=window.__nexusTest.scene.getScene('MuseumScene').children.list.find(o=>o.text==='Ver final');return {x:text.x,y:text.y};
  });
  await tap(page, museumFinal.x, museumFinal.y); await ready(page, 'EndingScene');
  await endingButton(page, 'Seguir explorando'); await ready(page, 'WorldScene');
  expect(await world(page, 'return s.lanterns.confetti.isActive;')).toBe(true);
  const beforeSecrets = (await saved(page)).connections;
  await connect(page, 'lamp', 'energy-source');
  expect((await saved(page)).story.discoveries).toContain('no-refunds');
  expect((await saved(page)).connections).toEqual(beforeSecrets);
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await page.evaluate(() => window.__nexusTest.scene.isActive('EndingScene'))).toBe(false);
  expect((await saved(page)).story.discoveries).toContain('singing-door');
  await world(page, "s.scene.start('BootScene');"); await ready(page, 'BootScene');
  const dialog = page.waitForEvent('dialog'); await titleButton(page, 'Nueva partida'); await (await dialog).accept();
  await ready(page, 'WorldScene');
  const state = await saved(page);
  expect(state.connections).toEqual([]); expect(state.fragmentsCollected).toEqual([]);
  expect(state.story).toEqual({ heard: ['intro'], discoveries: [], chapterSeen: false });
  expect(await page.evaluate(() => localStorage.getItem('los-nexus-reduced-effects'))).toBe('true');
});

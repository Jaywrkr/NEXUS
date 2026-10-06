import { test, expect, start, world, near, clickObject, ready, tap } from './helpers.js';

test('illustrated districts keep controls usable and textures reusable after the museum', async ({ page }, testInfo) => {
  await page.screenshot({ path: testInfo.outputPath('title.png') });
  await start(page);
  await world(page, 's.storyCard.hide();');
  const districts = [480, 1460, 2220, 2850, 3370, 4290, 5410];
  for (let i = 0; i < districts.length; i++) {
    await world(page, `s.nexus.setPosition(${districts[i]}, s.scale.height * 0.72); s.nexus.body.updateFromGameObject(); s.cameras.main.centerOn(s.nexus.x, s.nexus.y); s.storyCard.hide();`);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await world(page, 's.storyCard.hide();');
    await page.screenshot({ path: testInfo.outputPath(`district-${i + 1}.png`) });
  }
  const art = await world(page, `return {
    backgrounds: s.children.list.filter(o => o.type === 'Image' && o.texture.key.startsWith('pencil-district-')).length,
    residents: s.residents.map(r => r.list.filter(o => o.type === 'Image').map(o => o.texture.key)),
    font: document.fonts.check('18px "Patrick Hand"'),
    objects: s.connectables.map(o => o.list.filter(c => c.type === 'Image' && c.visible).map(c => c.texture.key)),
    sources: Array.from({length:8}, (_,i) => s.textures.get('sketch-district-'+i).getSourceImage().width),
  };`);
  expect(art.backgrounds).toBe(7);
  expect(art.font).toBe(true);
  expect(art.objects.every(keys => keys.length === 1 && (keys[0].startsWith('sketch-') || keys[0] === 'water-machines'))).toBe(true);
  expect(art.sources.every(w => w >= 1600)).toBe(true);
  expect(art.residents.flat().every(key => ['sketch-residents', 'plaza-sprites'].includes(key))).toBe(true);
  // Decoration must never receive input intended for an actual connectable.
  await near(page, 'toy-motor', 'toy-source');
  await clickObject(page, 'toy-source');
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(true);
  await clickObject(page, 'toy-motor');
  await expect.poll(() => world(page, 'return s.workshop.motor.isActive;')).toBe(true);
  await expect.poll(() => world(page, "return s.workshop.motor.list.find(o => o.type === 'Image' && o.visible)?.texture.key;")).toBe('sketch-props-on');
  const before = await page.evaluate(() => window.__nexusTest.textures.getTextureKeys());
  await world(page, "s.scene.start('MuseumScene');");
  await ready(page, 'MuseumScene');
  await page.screenshot({ path: testInfo.outputPath('gallery.png') });
  const point = await page.evaluate(() => {
    const s = window.__nexusTest.scene.getScene('MuseumScene');
    const t = s.children.list.find(o => o.type === 'Text' && o.text === 'Volver al mundo');
    return { x: t.x, y: t.y };
  });
  await tap(page, point.x, point.y);
  await ready(page, 'WorldScene');
  const after = await page.evaluate(() => window.__nexusTest.textures.getTextureKeys());
  expect(before.filter(k => k.startsWith('pencil-district-'))).toHaveLength(7);
  expect(after.filter(k => k.startsWith('pencil-district-'))).toEqual(before.filter(k => k.startsWith('pencil-district-')));
  await near(page, 'toy-duck', 'toy-motor');
  await clickObject(page, 'toy-motor');
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(true);
  await clickObject(page, 'toy-duck');
  await expect.poll(() => world(page, 'return s.workshop.duck.isActive;')).toBe(true);
});

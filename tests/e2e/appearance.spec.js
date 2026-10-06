import { test, expect, titleButton, ready, tap, start, world } from './helpers.js';
async function choice(page, label) {
  const point = await page.evaluate(label => {
    const s = window.__nexusTest.scene.getScene('CustomizeScene');
    const t = s.children.list.find(o => o.type === 'Text' && o.text === label);
    if (!t) throw new Error(`Missing wardrobe choice ${label}`);
    return { x:t.x, y:t.y };
  }, label);
  await tap(page, point.x, point.y);
}
test('wardrobe persists names, outfit poses and cable colors without changing progress', async ({ page }, testInfo) => {
  await titleButton(page, 'Mi Nexus'); await ready(page, 'CustomizeScene');
  page.once('dialog', d => d.accept('Luca Rayo'));
  await choice(page, 'Cambiar nombre');
  await choice(page, 'Coral'); await choice(page, 'Lazo'); await choice(page, 'Rosa');
  await choice(page, 'Ámbar 🔒');
  expect(await page.evaluate(() => window.__nexusTest.scene.getScene('CustomizeScene').look.outfit)).toBe('coral');
  await page.screenshot({ path:testInfo.outputPath('wardrobe.png') });
  await choice(page, 'Guardar y volver'); await ready(page, 'BootScene');
  await start(page);
  expect(await world(page, "return s.nexus.sprite.texture.key;")).toContain('outfit-coral');
  expect(await world(page, 'return s.connectionSystem.color;')).toBe(0xff9fd6);
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => world(page, 'return s.nexus.sprite.texture.key;')).toContain('walk');
  await page.keyboard.up('ArrowRight');
  await world(page, 's.nexus.celebrate();');
  expect(await world(page, 'return s.nexus.sprite.texture.key;')).toContain('celebrate-outfit-coral');
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await world(page, 'return s.nexus.look.name;')).toBe('Luca Rayo');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('los-nexus-progress')));
  await tap(page,65,page.viewportSize().height-185); await ready(page,'CustomizeScene');
  await choice(page,'Violeta'); await choice(page,'Cancelar'); await ready(page,'WorldScene');
  expect(await world(page,'return s.nexus.look.outfit;')).toBe('coral');
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('los-nexus-progress')))).connections).toEqual(progress.connections);
  await page.screenshot({ path:testInfo.outputPath('personalized-world.png') });
});

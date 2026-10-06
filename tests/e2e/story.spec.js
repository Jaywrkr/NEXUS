import { test, expect, start, ready, world, connect, saved, tap, checkpoint } from './helpers.js';

async function visit(page, id) {
  await world(page, `const r = s.residents.find(r => r.id === ${JSON.stringify(id)});
    s.nexus.setPosition(r.x, r.y + 70); s.nexus.body.updateFromGameObject(); s.cameras.main.centerOn(r.x, r.y);`);
  await expect.poll(() => world(page, `return s.progress.snapshot().story?.heard.includes(${JSON.stringify(id)});`)).toBe(true);
  const point = await world(page, `const r = s.residents.find(r => r.id === ${JSON.stringify(id)});return {x:r.x-s.cameras.main.scrollX,y:r.y-s.cameras.main.scrollY};`);
  await tap(page, point.x, point.y);
}

test('chapter introduction is nonblocking and residents remember visits and repaired places', async ({ page }, testInfo) => {
  await start(page);
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('manual');
  const x = await world(page, 'return s.nexus.x;');
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => world(page, 'return s.nexus.x;')).toBeGreaterThan(x + 30);
  await page.keyboard.up('ArrowRight');
  await checkpoint(page, testInfo, 'chapter-introduction');
  await visit(page, 'bombo');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('seco');
  await connect(page, 'fountain-source', 'fountain');
  await visit(page, 'bombo');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('CHOF');
  await checkpoint(page, testInfo, 'bombo-restored');
  await page.reload();
  await ready(page, 'BootScene');
  await start(page, 'Continuar');
  expect((await saved(page)).story.heard).toContain('bombo');
  expect(await world(page, 'return s.storyCard.panel.visible;')).toBe(false);
  await visit(page, 'bombo');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('CHOF');
  const bounds = await world(page, 'const p=s.storyCard.panel.getBounds(),t=s.storyCard.message.getBounds();return {panel:{left:p.left,right:p.right,centerX:p.centerX,centerY:p.centerY},text:{left:t.left,right:t.right}};');
  expect(bounds.text.left).toBeGreaterThan(bounds.panel.left);
  expect(bounds.text.right).toBeLessThan(bounds.panel.right);
  await tap(page, bounds.panel.centerX, bounds.panel.centerY);
  expect(await world(page, 'return s.storyCard.panel.visible;')).toBe(false);
  expect((await saved(page)).connections).toEqual([{ sourceId: 'fountain-source', targetId: 'fountain' }]);
});

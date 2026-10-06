import { test, expect, ready, start, world, connect, tap, checkpoint } from './helpers.js';

async function clue(page) {
  const { width, height } = page.viewportSize();
  await tap(page, width - 62, height - 86);
}

test('requested clues progress to the solution, stay nonblocking and reset for a new task', async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem('los-nexus-progress', JSON.stringify({
    fragmentsCollected: ['plaza-fragment'], connections: [], seenCompletion: false, position: null,
    story: { heard: ['intro'], discoveries: [], chapterSeen: false },
  })));
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await world(page, 'return s.instructionText.text;')).toContain('seco');
  await clue(page);
  expect(await world(page, 'return s.storyCard.speaker.text;')).toBe('Pista 1/3');
  expect(await world(page, 'return s.storyCard.message.text;')).not.toContain('→');
  const x = await world(page, 'return s.nexus.x;');
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => world(page, 'return s.nexus.x;')).toBeGreaterThan(x + 25);
  await page.keyboard.up('ArrowRight');
  await clue(page); await clue(page); await clue(page);
  expect(await world(page, 'return s.storyCard.speaker.text;')).toBe('Pista 3/3');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('→');
  await checkpoint(page, testInfo, 'requested-solution');
  await tap(page, page.viewportSize().width / 2, 95);
  await connect(page, 'fountain-source', 'fountain');
  await clue(page);
  expect(await world(page, 'return s.storyCard.speaker.text;')).toBe('Pista 1/3');
  expect(await world(page, 'return s.storyCard.message.text;')).toContain('anuncio');
  const bounds = await world(page, 'const b=s.storyCard.message.getBounds();return {left:b.left,right:b.right,bottom:b.bottom};');
  expect(bounds.left).toBeGreaterThan(0); expect(bounds.right).toBeLessThan(page.viewportSize().width);
  expect(bounds.bottom).toBeLessThan(page.viewportSize().height - 132);
  await checkpoint(page, testInfo, 'next-task-clue');
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  await clue(page);
  expect(await world(page, 'return s.storyCard.speaker.text;')).toBe('Pista 1/3');
});

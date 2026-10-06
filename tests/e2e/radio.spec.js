import { test, expect, ready, start, world, connect, saved, checkpoint } from './helpers.js';

test('one radio signal switches repeatedly, waits for the antenna and restores the last valid destination', async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem('los-nexus-progress', JSON.stringify({
    fragmentsCollected: ['plaza-fragment', 'fountain-fragment'],
    connections: [{ sourceId: 'beacon-source-a', targetId: 'beacon' }],
    position: { x: 1750, yRatio: 0.8 }, seenCompletion: false,
    story: { heard: ['intro'], discoveries: [], chapterSeen: false },
  })));
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  await connect(page, 'radio-source', 'radio-music');
  expect(await world(page, 'return s.radio.channel;')).toBe(null);
  expect(await world(page, 'return s.connectionSystem.feedbackText.text;')).toContain('dos señales');
  expect((await saved(page)).connections).toHaveLength(1);
  await connect(page, 'beacon-source-b', 'beacon');
  await connect(page, 'radio-source', 'radio-music');
  expect(await world(page, 'return s.radio.music.isActive && !s.radio.news.isActive;')).toBe(true);
  await checkpoint(page, testInfo, 'radio-music');
  await connect(page, 'radio-source', 'radio-music');
  expect((await saved(page)).connections).toHaveLength(3);
  await connect(page, 'radio-source', 'radio-news');
  expect(await world(page, 'return s.radio.news.isActive && !s.radio.music.isActive;')).toBe(true);
  await checkpoint(page, testInfo, 'radio-news');
  await connect(page, 'radio-source', 'radio-music');
  expect((await saved(page)).connections.filter(c => c.sourceId === 'radio-source')).toEqual([{ sourceId: 'radio-source', targetId: 'radio-music' }]);
  expect((await saved(page)).fragmentsCollected).toEqual(['plaza-fragment', 'fountain-fragment']);
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await world(page, 'return s.radio.channel;')).toBe('music');
  await connect(page, 'beacon-source-a', 'radio-music');
  expect(await world(page, 'return s.radio.channel;')).toBe('music');
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('los-nexus-progress'));
    state.connections.push({ sourceId: 'radio-source', targetId: 'radio-news' }, { sourceId: 'radio-source', targetId: 'unknown' });
    localStorage.setItem('los-nexus-progress', JSON.stringify(state));
  });
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  expect(await world(page, 'return s.radio.news.isActive && !s.radio.music.isActive;')).toBe(true);
  await connect(page, 'radio-source', 'radio-music');
  expect((await saved(page)).connections).toHaveLength(3);
  expect(await world(page, 'return s.beacon.isFullyActive;')).toBe(true);
});

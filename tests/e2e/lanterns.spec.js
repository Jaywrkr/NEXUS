import { test, expect, ready, start, world, connect, saved, collect, returnToWorld, checkpoint } from './helpers.js';

for (const route of ['direct', 'curious']) {
  test(`lantern ${route} route reaches the same exit and the party waits for the neighborhood`, async ({ page }, testInfo) => {
    await page.evaluate(() => localStorage.setItem('los-nexus-progress', JSON.stringify({
      fragmentsCollected: ['plaza-fragment', 'fountain-fragment', 'bridge-fragment', 'garden-fragment', 'workshop-fragment'],
      seenCompletion: true, completionCount: 6, connections: [], position: { x: 5000, yRatio: 0.8 },
      story: { heard: ['intro'], discoveries: [], chapterSeen: false },
    })));
    await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
    await connect(page, 'lantern-source', 'lantern-first');
    if (route === 'direct') {
      await connect(page, 'lantern-first', 'lantern-middle');
      await connect(page, 'lantern-middle', 'lantern-last');
    } else {
      await connect(page, 'lantern-first', 'lantern-side-a');
      await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
      expect(await world(page, 'return s.lanterns.sideA.isActive && !s.lanterns.last.isActive;')).toBe(true);
      await connect(page, 'lantern-side-a', 'lantern-side-b');
      await connect(page, 'lantern-side-b', 'lantern-last');
      expect((await saved(page)).story.discoveries).toContain('shy-lantern');
    }
    expect(await world(page, 'return s.lanterns.last.isActive && s.lanterns.fragment.visible;')).toBe(true);
    const connections = (await saved(page)).connections;
    await connect(page, 'lantern-last', 'party-stage');
    expect(await world(page, 'return s.lanterns.stage.isActive;')).toBe(false);
    expect((await saved(page)).connections).toEqual(connections);
    await checkpoint(page, testInfo, `lantern-${route}`);
    await collect(page, 'lanterns.fragment', 'lantern-fragment');
    await returnToWorld(page);
    await connect(page, 'beacon-source-a', 'beacon');
    await connect(page, 'beacon-source-b', 'beacon');
    await connect(page, 'lantern-last', 'party-stage');
    expect(await world(page, 'return s.lanterns.stage.isActive;')).toBe(true);
    await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
    expect(await world(page, 'return s.lanterns.stage.isActive && !s.lanterns.confetti.isActive;')).toBe(true);
    await connect(page, 'party-stage', 'party-confetti');
    expect(await world(page, 'return s.lanterns.confetti.isActive;')).toBe(true);
    // The story can finish before collecting every museum reward.
    expect((await saved(page)).fragmentsCollected).not.toContain('beacon-fragment');
    await checkpoint(page, testInfo, 'party-circuit');
  });
}

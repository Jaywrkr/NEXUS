import { test, expect, start, ready, world, saved, tunnelButton, runningTunnel, checkpoint } from './helpers.js';
import { walkingConnection as link, walkingCollection as collect, walkingTunnel } from './walking.js';

test('walk the entire chapter with real controls and report guided completion time', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const started = Date.now();
  await start(page);
  await link(page, 'energy-source', 'lamp');
  await ready(page, 'CableTunnelScene'); await tunnelButton(page, 'Empezar'); await runningTunnel(page); await walkingTunnel(page);
  await link(page, 'lamp', 'door'); await collect(page, 'plazaFragment', 'plaza-fragment');
  await link(page, 'fountain-source', 'water-pump'); await link(page, 'water-pump', 'water-direct'); await link(page, 'water-direct', 'fountain'); await collect(page, 'fountainFragment', 'fountain-fragment');
  await link(page, 'beacon-source-a', 'beacon'); await link(page, 'beacon-source-b', 'beacon');
  await collect(page, 'beaconFragment', 'beacon-fragment');
  await link(page, 'bridge-source', 'bridge'); await collect(page, 'bridgeFragment', 'bridge-fragment');
  await link(page, 'garden-source', 'garden-sprinkler'); await link(page, 'garden-sprinkler', 'garden-bed');
  await collect(page, 'gardenFragment', 'garden-fragment');
  await link(page, 'toy-source', 'toy-motor'); await link(page, 'toy-motor', 'toy-duck'); await link(page, 'toy-motor', 'toy-bell');
  await link(page, 'toy-duck', 'toy-parade'); await link(page, 'toy-bell', 'toy-parade');
  await collect(page, 'workshop.fragment', 'workshop-fragment');
  await link(page, 'lantern-source', 'lantern-first'); await link(page, 'lantern-first', 'lantern-middle');
  await link(page, 'lantern-middle', 'lantern-last'); await collect(page, 'lanterns.fragment', 'lantern-fragment');
  expect(await world(page, 'return s.fragmentHud.text;')).toBe('★ 7/7');
  await link(page, 'lantern-last', 'party-stage'); await link(page, 'party-stage', 'party-confetti');
  await ready(page, 'EndingScene');
  const result = { project: testInfo.project.name, guidedSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    connections: (await saved(page)).connections.length, memories: (await saved(page)).fragmentsCollected.length,
    caveat: 'Known solutions, no reading pauses or optional exploration; real movement without position fixtures. Not a first human playthrough.' };
  expect(result.connections).toBe(20); expect(result.memories).toBe(7);
  expect((await saved(page)).story.chapterSeen).toBe(true);
  await testInfo.attach('guided-duration', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  console.log(`Guided chapter duration: ${JSON.stringify(result)}`);
  await checkpoint(page, testInfo, 'walked-chapter-ending');
});

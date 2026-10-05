import { test, expect, ready, tap, saved, checkpoint, returnToWorld } from './helpers.js';

const exhibits = [
  ['plaza-fragment', 'Luz de la plaza', '¡La plaza se iluminó!'],
  ['fountain-fragment', 'Gota de la fuente', '¡El agua volvió a fluir!'],
  ['beacon-fragment', 'Señal de la antena', '¡Dos cables, una señal!'],
  ['bridge-fragment', 'Puente de madera', '¡Ya podemos cruzar!'],
  ['garden-fragment', 'Flor del jardín', '¡El jardín volvió a florecer!'],
];

async function openMuseum(page, ids, reduced) {
  // Seed collection states, then exercise the real museum's click/touch inputs.
  await page.evaluate(({ ids, reduced }) => {
    localStorage.setItem('los-nexus-progress', JSON.stringify({
      fragmentsCollected: ids, seenCompletion: ids.length === 5, connections: [], position: null,
    }));
    localStorage.setItem('los-nexus-reduced-effects', String(reduced));
    const game = window.__nexusTest;
    game.scene.stop('MuseumScene');
    game.scene.stop('BootScene');
    game.scene.start('MuseumScene');
  }, { ids, reduced });
  await ready(page, 'MuseumScene');
}

async function museumState(page) {
  return page.evaluate(() => {
    const s = window.__nexusTest.scene.getScene('MuseumScene');
    return {
      empty: s.children.list.filter(o => o.text === 'Vitrina vacía').length,
      texts: s.children.list.filter(o => o.type === 'Text').map(o => o.text),
      exhibits: s.children.list.filter(o => o.type === 'Rectangle' && o.input).map(o => ({ id: o.name, x: o.x, y: o.y })),
      scales: s.children.list.filter(o => o.name.startsWith('souvenir-')).map(o => o.scaleX),
    };
  });
}

for (const reduced of [false, true]) {
  test(`museum souvenirs respond repeatedly with ${reduced ? 'reduced' : 'normal'} effects`, async ({ page }, testInfo) => {
    await openMuseum(page, [], reduced);
    expect((await museumState(page)).empty).toBe(5);
    expect((await museumState(page)).exhibits).toEqual([]);
    await checkpoint(page, testInfo, 'museum-empty');

    await openMuseum(page, [exhibits[0][0]], reduced);
    expect((await museumState(page)).empty).toBe(4);
    expect((await museumState(page)).exhibits.map(o => o.id)).toEqual([exhibits[0][0]]);
    await checkpoint(page, testInfo, 'museum-one-souvenir');

    await openMuseum(page, exhibits.map(e => e[0]), reduced);
    const before = await saved(page);
    expect((await museumState(page)).empty).toBe(0);
    for (const [id, label, memory] of exhibits) {
      const state = await museumState(page);
      expect(state.texts).toContain(label);
      const target = state.exhibits.find(o => o.id === id);
      await tap(page, target.x, target.y);
      // A second tap during the reaction must remain responsive and reset cleanly.
      await tap(page, target.x, target.y);
      expect((await museumState(page)).texts).toContain(memory);
      if (reduced) expect((await museumState(page)).scales).toEqual([1, 1, 1, 1, 1]);
      else await expect.poll(async () => Math.max(...(await museumState(page)).scales)).toBeGreaterThan(1);
      await expect.poll(async () => (await museumState(page)).scales).toEqual([1, 1, 1, 1, 1]);
    }
    expect(await saved(page)).toEqual(before);
    await checkpoint(page, testInfo, 'museum-distinct-souvenirs');
    await returnToWorld(page);
    expect((await saved(page)).fragmentsCollected).toEqual(exhibits.map(e => e[0]));
  });
}

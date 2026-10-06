import { test, expect, ready, world, start, connect, saved, collect, returnToWorld, checkpoint, winTunnel, titleButton, tunnelButton, runningTunnel, failedTunnel, tap, clickObject } from './helpers.js';

const fragmentIds = ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'bridge-fragment', 'garden-fragment', 'workshop-fragment', 'lantern-fragment'];

async function reloadAndContinue(page) {
  await page.reload();
  await ready(page, 'BootScene');
  await start(page, 'Continuar');
}

async function museumLayout(page) {
  const layout = await page.evaluate(() => {
    const s = window.__nexusTest.scene.getScene('MuseumScene');
    return {
      rows: [...new Set(s.children.list.filter(o => o.type === 'Rectangle' && o.name.endsWith('-fragment')).map(o => o.y))].length,
      labels: s.children.list.filter(o => o.type === 'Text').map(o => ({ text: o.text, left: o.getBounds().left, right: o.getBounds().right })),
    };
  });
  expect(layout.rows).toBe(page.viewportSize().height > page.viewportSize().width ? 4 : 1);
  for (const label of layout.labels) {
    expect(label.left, label.text).toBeGreaterThanOrEqual(0);
    expect(label.right, label.text).toBeLessThanOrEqual(page.viewportSize().width);
  }
  return layout.labels.map(label => label.text);
}

test('complete all seven zones, lose and win the tunnel, and revisit the museum', async ({ page, isMobile }, testInfo) => {
  await start(page);
  // Wrong pairs do not unlock objects or create saved connections.
  await connect(page, 'energy-source', 'door');
  expect(await world(page, 'return s.door.isActive;')).toBe(false);
  expect((await saved(page))?.connections ?? []).toEqual([]);

  await connect(page, 'energy-source', 'lamp');
  await ready(page, 'CableTunnelScene');
  await checkpoint(page, testInfo, 'tunnel');
  expect(await page.evaluate(() => window.__nexusTest.scene.isPaused('WorldScene'))).toBe(true);
  await tunnelButton(page, 'Empezar');
  await runningTunnel(page);
  // With no steering the real collision check must fail, not award the lamp.
  await failedTunnel(page);
  expect(await world(page, 'return s.lamp.isActive;')).toBe(false);
  expect((await saved(page)).connections).toEqual([]);

  await checkpoint(page, testInfo, 'tunnel-failed');
  await tunnelButton(page, 'Reintentar');
  await runningTunnel(page);
  await winTunnel(page);
  expect((await saved(page)).connections).toContainEqual({ sourceId: 'energy-source', targetId: 'lamp' });
  await connect(page, 'lamp', 'door');
  expect(await world(page, 'return s.door.isActive && s.plazaFragment.visible;')).toBe(true);
  await collect(page, 'plazaFragment', fragmentIds[0]);
  expect(await museumLayout(page)).toContain('Luz de la plaza');
  await checkpoint(page, testInfo, 'museum-partial');
  await returnToWorld(page, !isMobile);

  await connect(page, 'fountain-source', 'fountain');
  expect(await world(page, 'return s.fountain.isActive && s.fountainFragment.visible;')).toBe(true);
  await collect(page, 'fountainFragment', fragmentIds[1]);
  await returnToWorld(page);

  await connect(page, 'beacon-source-a', 'beacon');
  expect(await world(page, 'return s.beacon.isFullyActive;')).toBe(false);
  await connect(page, 'beacon-source-a', 'beacon');
  expect(await world(page, 'return s.beacon.isFullyActive;')).toBe(false);
  await connect(page, 'beacon-source-b', 'beacon');
  expect(await world(page, 'return s.beacon.isFullyActive && s.beaconFragment.visible;')).toBe(true);
  await collect(page, 'beaconFragment', fragmentIds[2]);
  await returnToWorld(page);

  // Exercise the closed bridge's real physics, then open it and cross it.
  await world(page, 's.nexus.setPosition(2530,s.scale.height*0.75); s.nexus.body.updateFromGameObject();');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  expect(await world(page, 'return s.nexus.x;')).toBeLessThanOrEqual(2547);
  await page.waitForTimeout(400);
  await connect(page, 'bridge-source', 'bridge');
  expect(await world(page, 'return s.bridge.isActive && !s.bridgeBlocker.scene;')).toBe(true);
  await world(page, 's.nexus.setPosition(2530,s.scale.height*0.75); s.nexus.body.updateFromGameObject();');
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => world(page, 'return s.nexus.x;')).toBeGreaterThan(2670);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(400);
  await collect(page, 'bridgeFragment', fragmentIds[3]);
  expect(await museumLayout(page)).not.toContain('¡Colección completa!');
  expect((await saved(page)).seenCompletion).toBe(false);
  await returnToWorld(page);
  await connect(page, 'garden-source', 'garden-sprinkler');
  expect(await world(page, 'return s.sprinkler.isActive && !s.flowerBed.isActive && !s.gardenFragment.visible;')).toBe(true);
  await connect(page, 'garden-sprinkler', 'garden-bed');
  expect(await world(page, 'return s.flowerBed.isActive && s.gardenFragment.visible;')).toBe(true);
  await checkpoint(page, testInfo, 'garden-flowering');
  await collect(page, 'gardenFragment', fragmentIds[4]);
  await returnToWorld(page);
  await connect(page, 'toy-source', 'toy-motor');
  await connect(page, 'toy-motor', 'toy-duck');
  await connect(page, 'toy-motor', 'toy-bell');
  await connect(page, 'toy-duck', 'toy-parade');
  await connect(page, 'toy-bell', 'toy-parade');
  await collect(page, 'workshop.fragment', fragmentIds[5]);
  await returnToWorld(page);
  await connect(page, 'lantern-source', 'lantern-first');
  await connect(page, 'lantern-first', 'lantern-middle');
  await connect(page, 'lantern-middle', 'lantern-last');
  await collect(page, 'lanterns.fragment', fragmentIds[6]);
  expect((await museumLayout(page))).toContain('¡Colección completa!');
  expect((await saved(page)).fragmentsCollected).toEqual(fragmentIds);
  expect((await saved(page)).connections).toHaveLength(16);
  expect((await saved(page)).seenCompletion).toBe(true);
  expect((await saved(page)).completionCount).toBe(7);
  expect(await page.evaluate(() => window.__effectCalls.flash)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__effectCalls.shake)).toBeGreaterThan(0);
  await checkpoint(page, testInfo, 'museum-complete');
  await returnToWorld(page);
  await reloadAndContinue(page);
  expect(await world(page, 'return s.lamp.isActive && s.door.isActive && s.fountain.isActive && s.beacon.isFullyActive && s.bridge.isActive && s.sprinkler.isActive && s.flowerBed.isActive;')).toBe(true);
  expect(await world(page, 'return [s.plazaFragment,s.fountainFragment,s.beaconFragment,s.bridgeFragment,s.gardenFragment].every(f=>!f.visible);')).toBe(true);
  await checkpoint(page, testInfo, 'world-restored');
});

test('resume before collecting, retain a partial antenna and position, and rotate on mobile', async ({ page, isMobile }, testInfo) => {
  await start(page);
  await connect(page, 'fountain-source', 'fountain');
  await connect(page, 'beacon-source-a', 'beacon');
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    const y = page.viewportSize().height - 90;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 90, y, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 130, y, id: 1 }] });
    await page.waitForTimeout(400);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
  }
  await expect.poll(async () => (await saved(page)).position.x).toBeGreaterThan(2100);
  await page.waitForTimeout(700);
  const before = await saved(page);
  expect(before.fragmentsCollected).toEqual([]);
  expect(before.connections).toHaveLength(2);
  await reloadAndContinue(page);
  expect(await world(page, 'return s.fountain.isActive && s.fountainFragment.visible && !s.beacon.isFullyActive;')).toBe(true);
  expect(await world(page, 'return s.nexus.x;')).toBeCloseTo(before.position.x, 0);
  expect(await world(page, 'return s.nexus.y / s.scale.height;')).toBeCloseTo(before.position.yRatio, 2);
  if (isMobile) {
    await Promise.all([
      page.waitForEvent('load'),
      page.setViewportSize({ width: 960, height: 540 }),
    ]);
    await ready(page, 'BootScene');
    await start(page, 'Continuar');
    expect(await world(page, 'return s.scale.height;')).toBe(540);
    expect(await world(page, 'return s.nexus.y / s.scale.height;')).toBeCloseTo(before.position.yRatio, 2);
    expect(await world(page, 'return s.nexus.x;')).toBeCloseTo(before.position.x, 0);
  }
  await connect(page, 'beacon-source-a', 'beacon');
  expect(await world(page, 'return s.beacon.isFullyActive;')).toBe(false);
  await connect(page, 'beacon-source-b', 'beacon');
  expect(await world(page, 'return s.beacon.isFullyActive;')).toBe(true);
  await collect(page, 'beaconFragment', 'beacon-fragment');
  await returnToWorld(page);
  expect(await world(page, 'return s.nexus.x;')).toBeGreaterThan(2200);
  await checkpoint(page, testInfo, 'continued');
});

test('legacy saves migrate and new game confirmation preserves or clears progress', async ({ page }, testInfo) => {
  await page.evaluate(() => localStorage.setItem('los-nexus-progress', JSON.stringify({
    fragmentsCollected: ['plaza-fragment', 'bridge-fragment'], seenCompletion: false,
  })));
  await reloadAndContinue(page);
  expect(await world(page, 'return s.lamp.isActive && s.door.isActive && s.bridge.isActive && !s.plazaFragment.visible && !s.bridgeFragment.visible;')).toBe(true);
  // Reconnecting an already-restored legacy bridge must also be safe.
  await connect(page, 'bridge-source', 'bridge');
  await connect(page, 'bridge-source', 'bridge');
  expect(await world(page, 'return s.bridge.isActive && !s.bridgeBlocker.scene;')).toBe(true);
  // Use a scene fixture to return to the title, then exercise both native dialog outcomes.
  await world(page, "s.scene.start('BootScene');");
  await ready(page, 'BootScene');
  const cancelDialog = page.waitForEvent('dialog');
  await titleButton(page, 'Nueva partida');
  await (await cancelDialog).dismiss();
  await expect.poll(async () => (await saved(page)).fragmentsCollected).toEqual(['plaza-fragment', 'bridge-fragment']);
  await ready(page, 'BootScene');
  const confirmDialog = page.waitForEvent('dialog');
  await titleButton(page, 'Nueva partida');
  await (await confirmDialog).accept();
  await ready(page, 'WorldScene');
  expect(await world(page, 'return s.lamp.isActive || s.bridge.isActive;')).toBe(false);
  expect(await world(page, 'return s.progress.getConnections();')).toEqual([]);
  expect(await world(page, 'return s.progress.getCollectedFragments();')).toEqual([]);
  expect(await world(page, 'return s.nexus.x;')).toBe(480);
  await checkpoint(page, testInfo, 'new-game');
});


test('practice safely, cancel, and retry multiple times without reselecting objects', async ({ page, isMobile }, testInfo) => {
  await start(page);
  await connect(page, 'energy-source', 'lamp');
  await ready(page, 'CableTunnelScene');
  const initialX = await page.evaluate(() => window.__nexusTest.scene.getScene('CableTunnelScene').shipX);
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    const y = page.viewportSize().height - 90;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 90, y, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 130, y, id: 1 }] });
    await page.waitForTimeout(600);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowRight');
  }
  expect(await page.evaluate(() => window.__nexusTest.scene.getScene('CableTunnelScene').shipX)).toBeGreaterThan(initialX + 40);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => {
    const s = window.__nexusTest.scene.getScene('CableTunnelScene');
    return { phase: s.phase, progress: s.progress, finished: s.finished };
  })).toEqual({ phase: 'practice', progress: 0, finished: false });
  expect((await saved(page)).connections).toEqual([]);
  await checkpoint(page, testInfo, 'practice');
  await tunnelButton(page, 'Volver al mundo');
  await ready(page, 'WorldScene');
  expect(await world(page, 'return s.lamp.isActive;')).toBe(false);

  // Every fresh connection offers practice again; keyboard and touch can start.
  await connect(page, 'energy-source', 'lamp');
  await ready(page, 'CableTunnelScene');
  expect(await page.evaluate(() => window.__nexusTest.scene.getScene('CableTunnelScene').phase)).toBe('practice');
  if (isMobile) await tunnelButton(page, 'Empezar');
  else await page.keyboard.press('Space');
  await runningTunnel(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await failedTunnel(page);
    const failedProgress = await page.evaluate(() => window.__nexusTest.scene.getScene('CableTunnelScene').progress);
    expect(await world(page, 'return s.lamp.isActive;')).toBe(false);
    expect((await saved(page)).connections).toEqual([]);
    if (isMobile) await tunnelButton(page, 'Reintentar');
    else await page.keyboard.press('Space');
    await runningTunnel(page);
    expect(await page.evaluate(() => window.__nexusTest.scene.isPaused('WorldScene'))).toBe(true);
    // Observe the actual rewind; progress advances while the browser processes inputs.
    expect(await page.evaluate(() => window.__nexusTest.scene.getScene('CableTunnelScene').progress)).toBeLessThan(failedProgress);
  }
  await failedTunnel(page);
  await checkpoint(page, testInfo, 'retry-menu');
  if (isMobile) await tunnelButton(page, 'Volver al mundo');
  else await page.keyboard.press('Escape');
  await ready(page, 'WorldScene');
  expect((await saved(page)).connections).toEqual([]);
  expect(await world(page, 'return s.connectionSystem.hasSelection();')).toBe(false);
});


test('hints wait for inactivity and soft effects persist without changing rewards', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await ready(page, 'BootScene');
  const effectsLabel = () => page.evaluate(() => window.__nexusTest.scene.getScene('BootScene').children.list.find(o => o.type === 'Text' && o.text.startsWith('Efectos suaves:')).text);
  expect(await effectsLabel()).toBe('Efectos suaves: Sí');
  // Explicit choice overrides the OS and survives reload.
  await tap(page, page.viewportSize().width / 2, page.viewportSize().height - 65);
  expect(await effectsLabel()).toBe('Efectos suaves: No');
  await page.reload();
  await ready(page, 'BootScene');
  expect(await effectsLabel()).toBe('Efectos suaves: No');
  await tap(page, page.viewportSize().width / 2, page.viewportSize().height - 65);
  expect(await effectsLabel()).toBe('Efectos suaves: Sí');
  await start(page);
  expect(await world(page, 'return s.connectionSystem.hintRing.visible;')).toBe(false);
  await expect.poll(() => world(page, 'return s.connectionSystem.hintObject?.id;'), { timeout: 15_000 }).toBe('energy-source');
  expect(await world(page, 'return s.connectionSystem.hintRing.scaleX;')).toBe(1);
  await checkpoint(page, testInfo, 'source-hint');
  await clickObject(page, 'energy-source');
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(true);
  expect(await world(page, 'return s.connectionSystem.hintRing.visible;')).toBe(false);
  await expect.poll(() => world(page, 'return s.connectionSystem.hintObject?.id;'), { timeout: 15_000 }).toBe('lamp');
  await checkpoint(page, testInfo, 'target-hint');
  await clickObject(page, 'lamp');
  await ready(page, 'CableTunnelScene');
  await tunnelButton(page, 'Empezar');
  await runningTunnel(page);
  await failedTunnel(page);
  expect(await page.evaluate(() => window.__effectCalls)).toEqual({ flash: 0, shake: 0 });
  await tunnelButton(page, 'Reintentar');
  await runningTunnel(page);
  await winTunnel(page);
  expect((await saved(page)).connections).toContainEqual({ sourceId: 'energy-source', targetId: 'lamp' });
  expect(await page.evaluate(() => window.__effectCalls)).toEqual({ flash: 0, shake: 0 });
  expect(await world(page, 'return s.connectionSystem.hintRing.visible;')).toBe(false);

  // Restore four collected zones and finish the bridge to exercise world celebration.
  await world(page, 's.scene.stop();');
  await page.waitForFunction(() => !window.__nexusTest.scene.isActive('WorldScene'));
  await page.evaluate(() => localStorage.setItem('los-nexus-progress', JSON.stringify({
    fragmentsCollected: ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'garden-fragment', 'workshop-fragment', 'lantern-fragment'],
    connections: [], position: { x: 2530, yRatio: 0.8 }, seenCompletion: false,
  })));
  await reloadAndContinue(page);
  await expect.poll(() => world(page, 'return s.connectionSystem.hintObject?.id;'), { timeout: 15_000 }).toBe('bridge-source');
  await connect(page, 'bridge-source', 'bridge');
  expect(await world(page, 'return s.connectionSystem.hintRing.visible;')).toBe(false);
  await collect(page, 'bridgeFragment', 'bridge-fragment');
  expect((await saved(page)).seenCompletion).toBe(true);
  expect(await page.evaluate(() => window.__effectCalls)).toEqual({ flash: 0, shake: 0 });
  await returnToWorld(page);
  await page.waitForTimeout(10_200);
  expect(await world(page, 'return s.connectionSystem.hintRing.visible;')).toBe(false);
  await world(page, "s.scene.start('BootScene');");
  await ready(page, 'BootScene');
  page.once('dialog', dialog => dialog.accept());
  await titleButton(page, 'Nueva partida');
  await ready(page, 'WorldScene');
  expect(await page.evaluate(() => localStorage.getItem('los-nexus-reduced-effects'))).toBe('true');
  expect(await world(page, 'return s.progress.getCollectedFragments();')).toEqual([]);
});

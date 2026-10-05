import { test as base, expect } from '@playwright/test';

// Expose the Phaser instance only in the intercepted dev response. Production
// source stays unchanged; inputs, scene transitions and physics still run normally.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.route('**/src/main.ts*', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      expect(body).toContain('new Phaser.Game(gameConfig)');
      await route.fulfill({ response, body: body.replace('new Phaser.Game(gameConfig)', 'window.__nexusTest = new Phaser.Game(gameConfig)') });
    });
    await page.goto('/');
    await ready(page, 'BootScene');
    await use(page);
    expect(errors, 'No runtime errors or failed resource loads').toEqual([]);
  },
});
export { expect };

export async function ready(page, name) {
  await page.waitForFunction((name) => {
    const game = window.__nexusTest;
    return game?.scene.isActive(name) && !game.scene.getScene(name).cameras.main.fadeEffect.isRunning;
  }, name);
}

export function world(page, expression) {
  return page.evaluate(`(() => { const s = window.__nexusTest.scene.getScene('WorldScene'); ${expression} })()`);
}

export async function tap(page, x, y) {
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

export async function titleButton(page, label) {
  const point = await page.evaluate((label) => {
    const text = window.__nexusTest.scene.getScene('BootScene').children.list.find((o) => o.type === 'Text' && o.text === label);
    if (!text) throw new Error(`Missing title button: ${label}`);
    return { x: text.x, y: text.y };
  }, label);
  await tap(page, point.x, point.y);
}

export async function start(page, label = 'Jugar') {
  await titleButton(page, label);
  await ready(page, 'WorldScene');
}

// Position fixtures shorten travel between zones; connection clicks and collection
// overlaps use the real input and physics pipelines, never completion callbacks.
export async function near(page, id, sourceId) {
  await world(page, `const target = s.connectables.find(o => o.id === ${JSON.stringify(id)});
    const source = s.connectables.find(o => o.id === ${JSON.stringify(sourceId)});
    s.nexus.setPosition(source ? (source.x + target.x) / 2 : target.x, s.scale.height * 0.8);
    s.nexus.body.updateFromGameObject();
    s.cameras.main.centerOn(s.nexus.x, s.nexus.y);`);
  await expect.poll(() => world(page, 'return Math.abs(s.cameras.main.midPoint.x - Math.max(s.scale.width / 2, Math.min(2950 - s.scale.width / 2, s.nexus.x)));')).toBeLessThan(1);
}

export async function clickObject(page, id) {
  const point = await world(page, `const o = s.connectables.find(o => o.id === ${JSON.stringify(id)});
    return { x: o.x - s.cameras.main.scrollX, y: o.y - s.cameras.main.scrollY };`);
  expect(point.x).toBeGreaterThan(0);
  expect(point.x).toBeLessThan(page.viewportSize().width);
  await tap(page, point.x, point.y);
}

export async function connect(page, source, target) {
  await near(page, target, source);
  await clickObject(page, source);
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(true);
  await clickObject(page, target);
  await expect.poll(() => world(page, 'return s.connectionSystem.hasSelection();')).toBe(false);
}

export function saved(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('los-nexus-progress')));
}

export async function collect(page, field, id) {
  await world(page, `s.nexus.setPosition(s.${field}.x, s.${field}.y); s.nexus.body.updateFromGameObject();`);
  await ready(page, 'MuseumScene');
  expect((await saved(page)).fragmentsCollected).toContain(id);
}

export async function returnToWorld(page, keyboard = false) {
  if (keyboard) await page.keyboard.press('Space');
  else {
    const { width, height } = page.viewportSize();
    await tap(page, width / 2, height - 80);
  }
  await ready(page, 'WorldScene');
}

export async function checkpoint(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

export async function winTunnel(page) {
  const mobile = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const touch = mobile ? await page.context().newCDPSession(page) : null;
  const center = { x: 90, y: page.viewportSize().height - 90 };
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, id: 1 }] });
  const held = new Set();
  try {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const status = await page.evaluate(() => {
        const s = window.__nexusTest.scene.getScene('CableTunnelScene');
        if (!s.scene.isActive() || s.finished) return null;
        const aim = s.tubeCenterAt(s.progress + 40);
        return { dx: aim.x - s.shipX, dy: aim.y - s.shipY };
      });
      if (!status) break;
      if (touch) {
        const magnitude = Math.hypot(status.dx, status.dy);
        const factor = magnitude > 12 ? 40 / magnitude : 0;
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x + status.dx * factor, y: center.y + status.dy * factor, id: 1 }] });
      } else {
        const desired = new Set();
        if (Math.abs(status.dx) > 12) desired.add(status.dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        if (Math.abs(status.dy) > 12) desired.add(status.dy > 0 ? 'ArrowDown' : 'ArrowUp');
        for (const key of held) if (!desired.has(key)) { await page.keyboard.up(key); held.delete(key); }
        for (const key of desired) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
      }
      await page.waitForTimeout(100);
    }
  } finally {
    for (const key of held) await page.keyboard.up(key);
    if (touch) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
    }
  }
  await ready(page, 'WorldScene');
  expect(await world(page, 'return s.lamp.isActive;'), 'Steering must actually win the tunnel').toBe(true);
}

export async function tunnelButton(page, label) {
  const point = await page.evaluate((label) => {
    const s = window.__nexusTest.scene.getScene('CableTunnelScene');
    const text = s.children.list.find(o => o.type === 'Text' && o.text === label);
    if (!text) throw new Error(`Missing tunnel button: ${label}`);
    return { x: text.x, y: text.y };
  }, label);
  await tap(page, point.x, point.y);
}

export async function runningTunnel(page) {
  await page.waitForFunction(() => {
    const s = window.__nexusTest.scene.getScene('CableTunnelScene');
    return s.scene.isActive() && s.phase === 'running' && !s.cameras.main.fadeEffect.isRunning;
  });
}

export async function failedTunnel(page) {
  await page.waitForFunction(() => window.__nexusTest.scene.getScene('CableTunnelScene').phase === 'failed');
}

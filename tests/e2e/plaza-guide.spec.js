import { test, expect, start, world, clickObject, ready, tunnelButton, runningTunnel, checkpoint, returnToWorld } from './helpers.js';
import { walkTo, walkingTunnel } from './walking.js';

test('first plaza teaches movement, origin, destination and reward in order', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await start(page);
  const lesson = () => world(page, 'return s.plazaGuide.text.text;');
  await expect.poll(lesson).toContain('1/6');
  await checkpoint(page, testInfo, 'plaza-first-step');
  const miga = await world(page, "const r=s.residents.find(r=>r.id==='miga');return{x:r.x,y:r.y+50};");
  await walkTo(page, miga.x, miga.y);
  await expect.poll(lesson).toContain('2/6');
  await expect.poll(() => world(page,'return Math.abs(s.cameras.main.midPoint.x-Math.max(s.scale.width/2,s.nexus.x));')).toBeLessThan(1);
  await clickObject(page, 'energy-source');
  await expect.poll(lesson).toContain('3/6');
  await clickObject(page, 'energy-source');
  await expect.poll(lesson).toContain('2/6');
  await clickObject(page, 'energy-source');
  await walkTo(page, 580, await world(page,'return s.scale.height*.75;'));
  await expect.poll(() => world(page,'return Math.abs(s.cameras.main.midPoint.x-Math.max(s.scale.width/2,s.nexus.x));')).toBeLessThan(1);
  await clickObject(page, 'lamp');
  await ready(page, 'CableTunnelScene');
  await tunnelButton(page, 'Empezar'); await runningTunnel(page); await walkingTunnel(page);
  await expect.poll(lesson).toContain('4/6');
  await page.reload(); await ready(page, 'BootScene'); await start(page, 'Continuar');
  await expect.poll(lesson).toContain('4/6');
  // Follow the character with real movement; on a phone the door starts offscreen.
  await walkTo(page, 830, await world(page,'return s.scale.height*.75;'));
  await expect.poll(() => world(page,'return Math.abs(s.cameras.main.midPoint.x-Math.max(s.scale.width/2,s.nexus.x));')).toBeLessThan(1);
  await clickObject(page, 'lamp'); await expect.poll(lesson).toContain('5/6');
  await clickObject(page, 'door'); await expect.poll(lesson).toContain('6/6');
  await checkpoint(page, testInfo, 'plaza-reward-step');
  const fragment = await world(page,'return{x:s.plazaFragment.x,y:s.plazaFragment.y};');
  await walkTo(page, fragment.x, fragment.y); await ready(page,'MuseumScene');
  await returnToWorld(page);
  expect(await world(page,'return s.plazaGuide.panel.visible;')).toBe(false);
  expect(await world(page,'return s.instructionText.text;')).toContain('seca');
});

test('plaza scenery reacts to movement and reduced effects keep it still', async ({ page }, testInfo) => {
  await start(page);
  expect(await world(page,"return s.residents.find(r=>r.id==='miga').list.some(o=>o.type==='Image'&&o.texture.key==='plaza-sprites');")).toBe(true);
  expect(await world(page,'return s.plazaAtmosphere.birds.every(b=>!b.art.input);')).toBe(true);
  const plant = await world(page,'return {x:s.plazaAtmosphere.plants[1].art.x-20,y:s.plazaAtmosphere.plants[1].art.y-34};');
  await walkTo(page, plant.x, plant.y);
  expect(await world(page,'return s.plazaAtmosphere.plants.every(p=>Number.isFinite(p.spring.value));')).toBe(true);
  expect(await world(page,'return s.plazaAtmosphere.birds.some(b=>b.fleeUntil>0);')).toBe(true);
  await checkpoint(page,testInfo,'plaza-living-scenery');
  await page.evaluate(()=>localStorage.setItem('los-nexus-reduced-effects','true'));
  await page.reload();await ready(page,'BootScene');await start(page,'Continuar');
  await expect.poll(()=>world(page,'return s.plazaAtmosphere.plants.every(p=>p.art.angle===0);')).toBe(true);
  expect(await world(page,'return s.plazaAtmosphere.birds.every(b=>b.art.x===b.home.x&&b.art.y===b.home.y&&!b.art.anims.isPlaying);')).toBe(true);
  await checkpoint(page,testInfo,'plaza-reduced-effects');
});

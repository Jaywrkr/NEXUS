import { test, expect, start, ready, world, connect, connectWater, saved, near, clickObject, checkpoint, collect, returnToWorld, tap } from './helpers.js';
import { walkTo } from './walking.js';

async function restore(page, connections, fragmentsCollected = []) {
  await page.evaluate(({connections,fragmentsCollected}) => localStorage.setItem('los-nexus-progress', JSON.stringify({
    connections, fragmentsCollected, position: {x:1460,yRatio:.84}, story:{heard:['miga','bombo'],discoveries:[],chapterSeen:false},
  })), {connections,fragmentsCollected});
  await page.reload(); await ready(page,'BootScene'); await start(page,'Continuar');
}
const path = route => [{sourceId:'fountain-source',targetId:'water-pump'},
  {sourceId:'water-pump',targetId:`water-${route}`},{sourceId:`water-${route}`,targetId:'fountain'}];

test('water requires a pump and supports two reversible pressure routes', async ({page},testInfo) => {
  await start(page);
  await near(page,'water-pump'); await clickObject(page,'water-pump');
  expect(await world(page,'return s.connectionSystem.hasSelection();')).toBe(false);
  await connect(page,'fountain-source','fountain');
  expect(await world(page,'return s.connectionSystem.feedbackText.text;')).toContain('agua, no electricidad');
  expect(await world(page,'return s.fountain.pressure;')).toBe(0);
  expect((await saved(page)).connections).toHaveLength(0);
  // The visible socket and high fountain spout used to lie outside their hit areas.
  await near(page,'water-pump','fountain-source');
  const socket=await world(page,"const o=s.water.source;return{x:o.x-38-s.cameras.main.scrollX,y:o.y-s.cameras.main.scrollY};");
  await tap(page,socket.x,socket.y);
  expect(await world(page,'return s.connectionSystem.selectedSourceId;')).toBe('fountain-source');
  await clickObject(page,'water-pump');
  await connect(page,'water-pump','water-direct');
  await near(page,'fountain','water-direct'); await clickObject(page,'water-direct');
  const spout=await world(page,'return{x:s.fountain.x-s.cameras.main.scrollX,y:s.fountain.y-55-s.cameras.main.scrollY};');
  await tap(page,spout.x,spout.y);
  expect(await world(page,'return s.fountain.pressure;')).toBe(3);
  expect((await saved(page)).connections).toEqual(path('direct'));
  await checkpoint(page,testInfo,'water-direct-3bar');
  await connect(page,'water-pump','water-regulated');
  expect(await world(page,'return s.water.direct.isActive;')).toBe(false);
  expect(await world(page,'return s.fountain.pressure;')).toBe(0);
  expect((await saved(page)).connections).toEqual(path('regulated').slice(0,2));
  await connect(page,'water-regulated','fountain');
  expect(await world(page,'return s.fountain.pressure;')).toBe(2);
  await checkpoint(page,testInfo,'water-regulated-2bar');
  await page.reload(); await ready(page,'BootScene'); await start(page,'Continuar');
  expect(await world(page,'return s.fountain.pressure;')).toBe(2);
  expect((await saved(page)).connections).toEqual(path('regulated'));
  await connect(page,'water-pump','water-direct'); await connect(page,'water-direct','fountain');
  expect(await world(page,'return s.fountain.pressure;')).toBe(3);
  expect((await saved(page)).connections).toEqual(path('direct'));
});

test('legacy rewards restore silently and a changed route survives reload; partial routes stay partial', async ({page}) => {
  const old=[{sourceId:'fountain-source',targetId:'fountain'}];
  await restore(page,old,['fountain-fragment']);
  expect(await world(page,'return s.fountain.pressure;')).toBe(3);
  expect((await saved(page)).connections).toEqual(old);
  expect((await saved(page)).fragmentsCollected).toEqual(['fountain-fragment']);
  await connect(page,'water-pump','water-regulated'); await connect(page,'water-regulated','fountain');
  expect((await saved(page)).connections).toEqual(path('regulated'));
  await page.reload(); await ready(page,'BootScene'); await start(page,'Continuar');
  expect(await world(page,'return s.fountain.pressure;')).toBe(2);
  await restore(page,path('regulated').slice(0,2),['fountain-fragment']);
  expect(await world(page,'return s.water.pump.isActive && s.water.regulated.isActive;')).toBe(true);
  expect(await world(page,'return s.fountain.pressure;')).toBe(0);
});

test('water machinery has solid feet and Nexus walks, faces and stops in the correct pose', async ({page},testInfo) => {
  await restore(page,path('direct').slice(0,2));
  const pump=await world(page,'return {x:s.water.pump.x,y:s.water.pump.y,ground:s.water.pump.groundY};');
  await walkTo(page,pump.x,pump.y+95);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1100); await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(250);
  expect(await world(page,'return s.nexus.groundY;')).toBeGreaterThanOrEqual(pump.ground);
  expect(await world(page,'return s.nexus.sprite.texture.key;')).toBe('nexus-idle-back');
  expect(await world(page,'return s.nexus.depth>s.water.pump.depth;')).toBe(true);
  await checkpoint(page,testInfo,'water-solid-pump-back-idle');
  await page.keyboard.down('ArrowLeft');
  await expect.poll(()=>world(page,'return s.nexus.sprite.texture.key;')).toMatch(/^nexus-walk-side-/);
  await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(500);
  expect(await world(page,'return s.nexus.sprite.texture.key;')).toBe('nexus-idle-side');
  expect(await world(page,'return s.nexus.visual.scaleX;')).toBe(-1);
  await checkpoint(page,testInfo,'water-side-idle');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(300); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(500);
  expect(await world(page,'return s.nexus.sprite.texture.key;')).toBe('nexus-idle');
});

test('repeated route switches respond in the input event and scene audio is released at the museum', async ({page},testInfo) => {
  await page.addInitScript(()=>{
    const Native=window.AudioContext; window.__contexts=[];
    window.AudioContext=class extends Native { constructor(...args){super(...args);window.__contexts.push(this);} };
    window.__lastInput=0; window.__connectionTimes=[]; window.__longTasks=[];
    document.addEventListener('pointerdown',()=>window.__lastInput=performance.now(),true);
    if(PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list=>{
      for(const entry of list.getEntries()) window.__longTasks.push({start:entry.startTime,duration:entry.duration});
    }).observe({type:'longtask',buffered:true});
  });
  await page.reload(); await ready(page,'BootScene'); await start(page);
  await world(page,"s.events.on('connection-made',()=>window.__connectionTimes.push(performance.now()-window.__lastInput));");
  const sampleStart=await page.evaluate(()=>performance.now());
  await connectWater(page);
  for(const route of ['regulated','direct','regulated','direct']){
    await connect(page,'water-pump',`water-${route}`); await connect(page,`water-${route}`,'fountain');
    expect(await world(page,'return s.fountain.pressure;')).toBe(route==='direct'?3:2);
  }
  await page.waitForTimeout(700);
  expect(await world(page,'return s.audio.voices.size;')).toBe(0);
  const live=await world(page,'return s.audio.ctx.state;'); expect(live).toBe('running');
  await collect(page,'fountainFragment','fountain-fragment');
  await expect.poll(()=>page.evaluate(()=>window.__contexts.filter(c=>c.state!=='closed').length)).toBeLessThanOrEqual(1);
  await returnToWorld(page);
  expect(await world(page,'return s.fountain.pressure;')).toBe(3);
  const metrics=await page.evaluate(sampleStart=>({
    connectionDispatchMs:window.__connectionTimes,
    longTasks:window.__longTasks.filter(t=>t.start>=sampleStart),
    contexts:{created:window.__contexts.length,closed:window.__contexts.filter(c=>c.state==='closed').length},
    caveat:'Software Chromium in cloud; measures dispatch and resource lifecycle, not mobile GPU frame rate.',
  }),sampleStart);
  expect(metrics.connectionDispatchMs).toHaveLength(11);
  expect(metrics.connectionDispatchMs.every(Number.isFinite)).toBe(true);
  expect(Math.max(...metrics.connectionDispatchMs), 'Connection dispatch must not block its input event for a quarter second').toBeLessThan(250);
  await testInfo.attach('water-responsiveness',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});
});

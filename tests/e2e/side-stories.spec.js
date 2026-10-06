import { test, expect, ready, tap, start, world } from './helpers.js';
async function openJournal(page) {
  await tap(page,65,page.viewportSize().height-230); await ready(page,'JournalScene');
}
async function openStory(page,id) {
  const p=await page.evaluate(id=>{ const o=window.__nexusTest.scene.getScene('JournalScene').children.list.find(o=>o.name===`story-${id}`);return{x:o.x,y:o.y};},id);
  await tap(page,p.x,p.y); await ready(page,'SideStoryScene');
}
async function click(page,id) {
  const p=await page.evaluate(id=>{const o=window.__nexusTest.scene.getScene('SideStoryScene').machines.get(id);return{x:o.x,y:o.y};},id);
  await tap(page,p.x,p.y);
}
async function connect(page,a,b) {
  await click(page,a);await click(page,b);
  await expect.poll(()=>page.evaluate(()=>window.__nexusTest.scene.getScene('SideStoryScene').connection.hasSelection())).toBe(false);
}
async function sceneButton(page,label) {
  const p=await page.evaluate(label=>{const s=window.__nexusTest.scene.getScene('SideStoryScene');const t=s.children.list.find(o=>o.type==='Text'&&o.text===label);return{x:t.x,y:t.y};},label);
  await tap(page,p.x,p.y);
}
async function active(page,id){return page.evaluate(id=>window.__nexusTest.scene.getScene('SideStoryScene').machines.get(id).isActive,id);}
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('los-nexus-progress')));}
async function completed(page,id){return (await saved(page)).story?.discoveries.includes(`side-finished-${id}`)??false;}

test('three secondary stories preserve partial signals, offer six endings and unlock cosmetics',async({page},testInfo)=>{
  test.setTimeout(180_000);
  await start(page);await openJournal(page);
  expect(await page.evaluate(()=>window.__nexusTest.scene.getScene('JournalScene').children.list.filter(o=>o.name.startsWith('story-')&&o.input).length)).toBe(0);
  // Seed chapter eligibility; every secondary cable below uses real click/touch input.
  await page.evaluate(()=>{localStorage.setItem('los-nexus-progress',JSON.stringify({fragmentsCollected:['plaza-fragment','garden-fragment','workshop-fragment'],connections:[{sourceId:'fountain-source',targetId:'fountain'}],seenCompletion:false,position:{x:480,yRatio:.7}}));window.__nexusTest.scene.getScene('JournalScene').scene.restart();});
  await ready(page,'JournalScene');await openStory(page,'mail');
  await connect(page,'source','finish');expect(await active(page,'finish')).toBe(false);
  await connect(page,'source','sorter');await connect(page,'sorter','translator');
  await sceneButton(page,'Volver al diario');await ready(page,'JournalScene');await openStory(page,'mail');
  expect(await active(page,'translator')).toBe(true);
  await connect(page,'translator','kind');await connect(page,'kind','finish');
  expect(await completed(page,'mail')).toBe(true);
  await page.screenshot({path:testInfo.outputPath('mail-diplomatic.png')});
  await sceneButton(page,'Repetir');await ready(page,'SideStoryScene');
  expect(await active(page,'finish')).toBe(false);
  expect((await saved(page)).connections).toContainEqual({sourceId:'fountain-source',targetId:'fountain'});
  await connect(page,'source','sorter');await connect(page,'sorter','translator');await connect(page,'translator','loud');await connect(page,'loud','finish');
  expect((await saved(page)).story.discoveries).toContain('side-ending-mail-kind');
  expect((await saved(page)).story.discoveries).toContain('side-ending-mail-loud');
  await sceneButton(page,'Volver al diario');await ready(page,'JournalScene');await openStory(page,'toys');
  await connect(page,'source','engine');await connect(page,'engine','laugh');await connect(page,'laugh','judge');
  await connect(page,'laugh','judge');expect(await active(page,'judge')).toBe(false);
  await sceneButton(page,'Volver al diario');await ready(page,'JournalScene');await openStory(page,'toys');
  expect(await active(page,'judge')).toBe(false);
  await connect(page,'engine','brake');await connect(page,'brake','judge');await connect(page,'judge','finish');
  expect(await completed(page,'toys')).toBe(true);
  await sceneButton(page,'Repetir');await ready(page,'SideStoryScene');
  await connect(page,'source','engine');await connect(page,'engine','brake');await connect(page,'engine','sleep');await connect(page,'sleep','judge');await connect(page,'brake','judge');await connect(page,'judge','finish');
  await sceneButton(page,'Volver al diario');await ready(page,'JournalScene');await openStory(page,'toys');
  expect(await active(page,'brake')).toBe(true);expect(await active(page,'judge')).toBe(true);expect(await active(page,'finish')).toBe(true);
  await sceneButton(page,'Volver al diario');await ready(page,'JournalScene');await openStory(page,'flowers');
  await connect(page,'source','conductor');await connect(page,'conductor','rhythm');await connect(page,'rhythm','stage');
  expect(await active(page,'stage')).toBe(false);
  await connect(page,'conductor','aroma');await connect(page,'aroma','stage');await connect(page,'stage','moon');
  expect(await completed(page,'flowers')).toBe(true);
  await page.screenshot({path:testInfo.outputPath('flowers-concert.png')});
  await sceneButton(page,'Repetir');await ready(page,'SideStoryScene');
  await connect(page,'source','conductor');await connect(page,'conductor','aroma');await connect(page,'conductor','rhythm');await connect(page,'aroma','stage');await connect(page,'rhythm','stage');await connect(page,'stage','sun');
  const p=await saved(page);expect(p.story.discoveries.filter(id=>id.startsWith('side-ending-'))).toHaveLength(6);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('los-nexus-appearance')).unlocked)).toEqual(['mail','toys','flowers']);
  await sceneButton(page,'Volver al diario');await ready(page,'JournalScene');await page.screenshot({path:testInfo.outputPath('journal-complete.png')});
  const back=await page.evaluate(()=>{const s=window.__nexusTest.scene.getScene('JournalScene');const t=s.children.list.find(o=>o.text==='Volver al barrio');return{x:t.x,y:t.y};});
  await tap(page,back.x,back.y);await ready(page,'WorldScene');
  expect(await world(page,'return s.fountain.isActive;')).toBe(true);
  await tap(page,65,page.viewportSize().height-185);await ready(page,'CustomizeScene');
  const labels=await page.evaluate(()=>window.__nexusTest.scene.getScene('CustomizeScene').children.list.filter(o=>o.type==='Text').map(o=>o.text));
  expect(labels).toContain('Ámbar');expect(labels).toContain('Pato');expect(labels).toContain('Corona');
  for (const label of ['Ámbar','Pato','Corona','Guardar y volver']) {
    const point=await page.evaluate(label=>{const s=window.__nexusTest.scene.getScene('CustomizeScene');const t=s.children.list.find(o=>o.type==='Text'&&o.text===label);return{x:t.x,y:t.y};},label);
    await tap(page,point.x,point.y);
  }
  await ready(page,'WorldScene');
  expect(await world(page,'return s.nexus.look.outfit;')).toBe('amber');
  expect(await world(page,'return s.nexus.look.accessory;')).toBe('crown');
  await page.reload();await ready(page,'BootScene');await start(page,'Continuar');
  expect(await world(page,'return s.nexus.look.accessory;')).toBe('crown');
  await openJournal(page);
  expect((await saved(page)).story.discoveries.filter(id=>id.startsWith('side-ending-'))).toHaveLength(6);
});

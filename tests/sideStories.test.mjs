import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressSystem } from '../src/systems/ProgressSystem.ts';
import { SIDE_STORIES, storyAvailable, storyEndings } from '../src/data/sideStories.ts';
const state=()=>({fragmentsCollected:[],connections:[],position:null,seenCompletion:false});
test('secondary stories accept repaired legacy places and count only their six named endings',()=>{
  const old=state();old.fragmentsCollected=['plaza-fragment','garden-fragment','workshop-fragment'];
  assert.ok(SIDE_STORIES.every(s=>storyAvailable(s,old)));
  const fresh=state();assert.ok(SIDE_STORIES.every(s=>!storyAvailable(s,fresh)));
  fresh.story={heard:[],chapterSeen:false,discoveries:['side-ending-mail-kind','side-ending-mail-loud','side-ending-mail-fake','side-ending-mail-kind']};
  assert.equal(storyEndings('mail',fresh),2);assert.equal(storyEndings('toys',fresh),0);
});
test('choosing a proposal preserves a source branch and replay preserves the main adventure and earned history',()=>{
  const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const p=new ProgressSystem();p.saveConnection('fountain-source','fountain');p.saveConnection('side-toys-engine','side-toys-brake');
  p.saveExclusiveConnection('side-toys-engine','side-toys-sleep',['side-toys-laugh','side-toys-sleep']);
  assert.ok(p.getConnections().some(c=>c.targetId==='side-toys-brake'));
  p.markDiscovery('side-ending-toys-sleep');p.restartStory('toys');
  assert.deepEqual(p.getConnections(),[{sourceId:'fountain-source',targetId:'fountain'}]);
  assert.ok(p.snapshot().story.discoveries.includes('side-ending-toys-sleep'));
});

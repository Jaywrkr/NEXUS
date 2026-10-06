import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from '../src/systems/AudioSystem.ts';
class Node {
  disconnected = false; onended = null;
  frequency = {value:0}; gain = {setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
  connect(){} disconnect(){this.disconnected=true;} start(){} stop(){}
}
test('audio releases voices on completion and closes its scene context', async () => {
  const previousAudio=globalThis.AudioContext, previousStorage=globalThis.localStorage;
  let context, shutdown;
  globalThis.localStorage={getItem:()=>null};
  globalThis.AudioContext=class {state='running';currentTime=0;destination={};nodes=[];
    constructor(){context=this;}
    createOscillator(){const n=new Node();this.nodes.push(n);return n;}
    createGain(){const n=new Node();this.nodes.push(n);return n;}
    close(){this.state='closed';return Promise.resolve();}
  };
  try {
    const audio=new AudioSystem({events:{once:(_event,cb)=>shutdown=cb}});
    audio.playSuccess(); assert.equal(audio.voices.size,2);
    context.nodes[0].onended(); assert.equal(audio.voices.size,1);
    assert.equal(context.nodes[0].disconnected,true); assert.equal(context.nodes[1].disconnected,true);
    shutdown(); assert.equal(context.state,'closed'); assert.equal(audio.voices.size,0);
    assert.ok(context.nodes.every(n=>n.disconnected)); audio.playCollect(); assert.equal(audio.ctx,null);
  } finally {globalThis.AudioContext=previousAudio;globalThis.localStorage=previousStorage;}
});
test('unavailable sound never prevents a game action', () => {
  const previousAudio=globalThis.AudioContext, previousStorage=globalThis.localStorage;
  globalThis.localStorage={getItem:()=>null};globalThis.AudioContext=class {constructor(){throw new Error('No audio device');}};
  try {assert.doesNotThrow(()=>new AudioSystem().playSuccess());}
  finally {globalThis.AudioContext=previousAudio;globalThis.localStorage=previousStorage;}
});

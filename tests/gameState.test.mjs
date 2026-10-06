import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameState, saveGameState, clearGameState } from '../src/data/gameState.ts';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const key = 'los-nexus-progress';

test('old saves retain fragments and completion without new fields', () => {
  storage.set(key, JSON.stringify({ fragmentsCollected: ['plaza-fragment'], seenCompletion: true }));
  assert.deepEqual(loadGameState(), {
    fragmentsCollected: ['plaza-fragment'], seenCompletion: true, connections: [], position: null,
  });
});

test('connections and relative position survive saving and loading', () => {
  const state = {
    fragmentsCollected: [], seenCompletion: false,
    connections: [{ sourceId: 'beacon-source-a', targetId: 'beacon' }],
    position: { x: 1980, yRatio: 0.7 },
  };
  saveGameState(state);
  assert.deepEqual(loadGameState(), state);
});

test('expanded collection completion survives saving and rejects malformed counts', () => {
  const state = { fragmentsCollected: ['garden-fragment'], seenCompletion: true,
    completionCount: 5, connections: [], position: null };
  saveGameState(state);
  assert.deepEqual(loadGameState(), state);
  for (const completionCount of [-1, 1.5, '5', null]) {
    storage.set(key, JSON.stringify({ ...state, completionCount }));
    assert.equal(loadGameState().completionCount, undefined);
    assert.equal(loadGameState().seenCompletion, true);
    assert.deepEqual(loadGameState().fragmentsCollected, ['garden-fragment']);
  }
});

test('optional chapter state survives reload and normalizes malformed story fields', () => {
  const base = { fragmentsCollected: [], seenCompletion: false, connections: [], position: null };
  const story = { heard: ['intro', 'miga'], discoveries: ['singing-door'], chapterSeen: true };
  saveGameState({ ...base, story });
  assert.deepEqual(loadGameState().story, story);
  storage.set(key, JSON.stringify({ ...base, story: { heard: ['intro', 8, 'intro'], discoveries: null, chapterSeen: 'yes' } }));
  assert.deepEqual(loadGameState().story, { heard: ['intro'], discoveries: [], chapterSeen: false });
  for (const value of [null, 8, []]) {
    storage.set(key, JSON.stringify({ ...base, story: value }));
    assert.equal(loadGameState().story, undefined);
  }
});

test('invalid or incomplete saves cannot supply unusable coordinates or arrays', () => {
  for (const value of ['null', '{', '42']) {
    storage.set(key, value);
    assert.deepEqual(loadGameState(), { fragmentsCollected: [], seenCompletion: false, connections: [], position: null });
  }
  storage.set(key, JSON.stringify({
    fragmentsCollected: ['plaza-fragment', 9, 'plaza-fragment'], seenCompletion: 'false',
    connections: [null, 7, { sourceId: 3 }, { sourceId: 'a', targetId: 'b' }],
    position: { x: '1900', yRatio: 0.7 },
  }));
  assert.deepEqual(loadGameState(), {
    fragmentsCollected: ['plaza-fragment'], seenCompletion: false,
    connections: [{ sourceId: 'a', targetId: 'b' }], position: null,
  });
});

test('reset starts fresh without sharing mutable default arrays', () => {
  clearGameState();
  const first = loadGameState();
  first.fragmentsCollected.push('plaza-fragment');
  first.connections.push({ sourceId: 'a', targetId: 'b' });
  assert.deepEqual(loadGameState(), { fragmentsCollected: [], seenCompletion: false, connections: [], position: null });
  saveGameState(first);
  clearGameState();
  assert.equal(storage.has(key), false);
  assert.deepEqual(loadGameState(), { fragmentsCollected: [], seenCompletion: false, connections: [], position: null });
});

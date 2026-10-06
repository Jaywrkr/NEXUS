import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterObjective, residentLine, RESIDENTS, connectionSurprise } from '../src/data/chapter.ts';

const state = (connections = [], fragmentsCollected = []) => ({ connections, fragmentsCollected, seenCompletion: false, position: null });
test('objectives retain the partial steps and accept legacy collected rewards', () => {
  assert.match(chapterObjective(state()), /lámpara/);
  assert.match(chapterObjective(state([{ sourceId: 'energy-source', targetId: 'lamp' }])), /puerta/);
  assert.match(chapterObjective(state([], ['plaza-fragment', 'fountain-fragment', 'beacon-fragment', 'bridge-fragment'])), /aspersor/);
});
test('a repeated antenna input is not a completed announcement', () => {
  const vera = RESIDENTS.find(r => r.id === 'vera');
  const connection = { sourceId: 'beacon-source-a', targetId: 'beacon' };
  assert.equal(residentLine(vera, state([connection, connection])), vera.request);
  assert.equal(residentLine(vera, state([connection, { sourceId: 'beacon-source-b', targetId: 'beacon' }])), vera.restored);
});

test('specific wrong pairs have original responses while unknown pairs stay ordinary', () => {
  assert.equal(connectionSurprise('energy-source', 'door').id, 'singing-door');
  assert.equal(connectionSurprise('garden-source', 'garden-bed').id, 'salad-decree');
  assert.equal(connectionSurprise('door', 'lamp'), undefined);
});

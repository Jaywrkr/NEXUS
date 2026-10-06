import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreWaterConnections, waterPath, waterPressure } from '../src/data/waterCircuit.ts';
test('legacy water connections replay the physical route without rewriting the save', () => {
  const old = [{ sourceId:'fountain-source', targetId:'fountain' }, {sourceId:'lamp',targetId:'door'}];
  const copy = structuredClone(old);
  assert.deepEqual(restoreWaterConnections(old, false), [old[1], ...waterPath('direct')]);
  assert.deepEqual(old, copy);
});
test('a collected legacy fountain restores but a modern partial route stays partial', () => {
  assert.deepEqual(restoreWaterConnections([], true), waterPath('direct'));
  const partial = waterPath('regulated').slice(0,2);
  assert.deepEqual(restoreWaterConnections(partial, true), partial);
  assert.deepEqual(restoreWaterConnections([], false), []);
  assert.equal(waterPressure('direct'), 3); assert.equal(waterPressure('regulated'), 2); assert.equal(waterPressure(null), 0);
});

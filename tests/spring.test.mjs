import test from 'node:test';
import assert from 'node:assert/strict';
import { stepSpring } from '../src/utils/dampedSpring.ts';

test('decorative springs settle and stay stable after suspended or irregular frames', () => {
  const smooth = { value: 0, velocity: 80 }, irregular = { value: 0, velocity: 80 };
  for (let i=0;i<300;i++) stepSpring(smooth, 5, 1000/60);
  for (let i=0;i<150;i++) stepSpring(irregular, 5, 1000/30);
  assert.ok(Math.abs(smooth.value-5)<.01);
  assert.ok(Math.abs(smooth.value-irregular.value)<.01);
  stepSpring(irregular, 0, 60_000);
  assert.ok(Number.isFinite(irregular.value) && Math.abs(irregular.value)<10);
  const before = {...irregular}; stepSpring(irregular, 1, NaN);
  assert.deepEqual(irregular,before);
});

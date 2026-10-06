import test from 'node:test';
import assert from 'node:assert/strict';
import { EffectsSettings } from '../src/systems/EffectsSettings.ts';

const storage = new Map();
let systemReduced = false;
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
globalThis.window = { matchMedia: () => ({ matches: systemReduced }) };

test('default follows the operating system preference', () => {
  storage.clear();
  systemReduced = false;
  assert.equal(EffectsSettings.isReduced(), false);
  systemReduced = true;
  assert.equal(EffectsSettings.isReduced(), true);
});

test('explicit choices override the system in both directions', () => {
  systemReduced = true;
  EffectsSettings.setReduced(false);
  assert.equal(EffectsSettings.isReduced(), false);
  systemReduced = false;
  EffectsSettings.setReduced(true);
  assert.equal(EffectsSettings.isReduced(), true);
});

test('malformed preference falls back to the system and leaves game progress intact', () => {
  storage.set('los-nexus-progress', '{"fragmentsCollected":["plaza-fragment"]}');
  storage.set('los-nexus-reduced-effects', 'unknown');
  systemReduced = true;
  assert.equal(EffectsSettings.isReduced(), true);
  EffectsSettings.setReduced(false);
  assert.equal(storage.get('los-nexus-progress'), '{"fragmentsCollected":["plaza-fragment"]}');
});

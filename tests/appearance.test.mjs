import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppearance, loadAppearance, saveAppearance, unlockAppearance } from '../src/data/appearance.ts';

test('appearance validates damaged saves, unicode names and locked choices', () => {
  assert.deepEqual(normalizeAppearance({ name: '\n ', outfit: 'unknown', accessory: 'crown', cable: 'fake', unlocked: ['fake'] }),
    { name: 'Nexus', outfit: 'turquoise', accessory: 'none', cable: 'cyan', unlocked: [] });
  const p = normalizeAppearance({ name: '🐰'.repeat(20), outfit: 'amber', accessory: 'duck', cable: 'pink', unlocked: ['mail', 'toys', 'mail'] });
  assert.equal(Array.from(p.name).length, 16);
  assert.equal(p.outfit, 'amber'); assert.equal(p.accessory, 'duck');
  assert.deepEqual(p.unlocked, ['mail', 'toys']);
});
test('appearance and earned styles persist independently from a new adventure', () => {
  const entries = new Map();
  globalThis.localStorage = { getItem: k => entries.get(k) ?? null, setItem: (k,v) => entries.set(k,v), removeItem: k => entries.delete(k) };
  saveAppearance({ name: 'Luca', outfit: 'coral', accessory: 'bow', cable: 'gold', unlocked: [] });
  unlockAppearance('mail'); unlockAppearance('mail');
  localStorage.removeItem('los-nexus-progress');
  assert.equal(loadAppearance().outfit, 'coral');
  assert.deepEqual(loadAppearance().unlocked, ['mail']);
  entries.set('los-nexus-appearance', 'invalid json');
  assert.equal(loadAppearance().name, 'Nexus');
});

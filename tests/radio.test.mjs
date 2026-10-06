import test from 'node:test';
import assert from 'node:assert/strict';
import { radioChannel } from '../src/data/radio.ts';

test('radio selects the last valid channel without treating arbitrary saved wires as a choice', () => {
  const state = { connections: [
    { sourceId: 'radio-source', targetId: 'radio-music' },
    { sourceId: 'radio-source', targetId: 'radio-news' },
    { sourceId: 'radio-source', targetId: 'unknown' },
    { sourceId: 'lamp', targetId: 'radio-music' },
  ] };
  assert.equal(radioChannel(state), 'news');
  assert.equal(radioChannel({ connections: state.connections.slice(-2) }), null);
  assert.equal(radioChannel({ connections: [...state.connections, state.connections[0]] }), 'music');
});

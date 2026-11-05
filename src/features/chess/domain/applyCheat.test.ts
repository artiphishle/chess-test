import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPresets } from '../../templates/domain/createPresets.ts';
import { applyCheat } from './applyCheat.ts';
import { createGameState } from './createGameState.ts';

const state = createGameState(createPresets()[0], { w: {}, b: {} });

void test('SAN-like cheat places a queen without changing the turn', () => {
  const next = applyCheat(state, 'w', 'Qf4');
  assert.deepEqual(next.board[4]?.[5], { color: 'w', kind: 'Q' });
  assert.equal(next.turn, state.turn);
  assert.equal(next.history.length, state.history.length + 1);
  assert.deepEqual(state.board[4]?.[5], null);
});

void test('cheat captures opponents, but never own pieces or kings', () => {
  const next = applyCheat(state, 'w', 'Qxd7');
  assert.deepEqual(next.board[1]?.[3], { color: 'w', kind: 'Q' });
  assert.throws(() => applyCheat(state, 'w', 'Qd2'), /own piece/);
  assert.throws(() => applyCheat(state, 'w', 'Qe8'), /king/);
});

void test('cheat rejects bad and out-of-bounds SAN', () => {
  assert.throws(() => applyCheat(state, 'b', 'Qz4'), /Invalid/);
  assert.throws(() => applyCheat(state, 'b', 'Qf12'), /outside/);
  assert.throws(() => applyCheat(state, 'b', 'O-O'), /Invalid/);
  assert.throws(() => applyCheat(state, 'b', { kind: 'Q' }), /Invalid/);
});

void test('capturing a home-rank rook revokes its castling side', () => {
  const next = applyCheat(state, 'b', 'Qa1');
  assert.equal(next.castling.w.Q, false);
  assert.equal(next.castling.w.K, true);
});

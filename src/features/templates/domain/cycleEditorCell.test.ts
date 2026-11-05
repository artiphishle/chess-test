import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Cell } from '../../../types/chess.ts';
import { cycleEditorCell } from './cycleEditorCell.ts';

void test('taps cycle empty through six fixed pieces and back to empty', () => {
  const first = cycleEditorCell(null, 'tap');
  assert.deepEqual(first, { color: 'w', kind: 'P' });
  const second = cycleEditorCell(first, 'tap');
  const third = cycleEditorCell(second, 'tap');
  assert.equal(second?.kind, 'N');
  assert.equal(third?.kind, 'B');
  assert.equal(
    [0, 1, 2, 3].reduce<Cell>((cell) => cycleEditorCell(cell, 'tap'), third),
    null,
  );
});

void test('holds cycle white, black, choice coin and white without resetting fixed piece kind', () => {
  const black = cycleEditorCell(null, 'hold');
  assert.deepEqual(black, { color: 'b', kind: 'P' });
  const coin = cycleEditorCell(black, 'hold');
  assert.equal(coin?.kind, 'coin');
  assert.equal(coin?.color, 'b');
  assert.deepEqual(cycleEditorCell(coin, 'hold'), { color: 'w', kind: 'P' });
  assert.deepEqual(cycleEditorCell({ color: 'w', kind: 'B' }, 'hold'), { color: 'b', kind: 'B' });
});

void test('coin taps cycle option presets and owner color without removing coin', () => {
  const first = cycleEditorCell({ color: 'b', kind: 'P' }, 'hold');
  const nb = cycleEditorCell(first, 'tap');
  assert.deepEqual(nb, { kind: 'coin', color: 'b', options: ['N', 'B'] });
  const major = cycleEditorCell(nb, 'tap');
  assert.deepEqual(major, { kind: 'coin', color: 'b', options: ['R', 'Q'] });
  const promotion = cycleEditorCell(major, 'tap');
  const white = cycleEditorCell(promotion, 'tap');
  assert.equal(white?.color, 'w');
  assert.equal(white?.kind, 'coin');
});

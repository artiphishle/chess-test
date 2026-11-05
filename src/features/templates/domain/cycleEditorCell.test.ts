import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Cell } from '../../../types/chess.ts';
import { cycleEditorCell } from './cycleEditorCell.ts';

void test('first short tap sets a white pawn, then cycles pieces before becoming empty', () => {
  const pawn = cycleEditorCell(null, 'tap', 'w');
  assert.deepEqual(pawn, { color: 'w', kind: 'P' });
  const knight = cycleEditorCell(pawn, 'tap', 'w');
  const bishop = cycleEditorCell(knight, 'tap', 'w');
  assert.deepEqual(knight, { color: 'w', kind: 'N' });
  assert.deepEqual(bishop, { color: 'w', kind: 'B' });
  assert.equal([0, 1, 2, 3].reduce<Cell>((cell) => cycleEditorCell(cell, 'tap', 'w'), bishop), null);
});

void test('black mode remains black for all taps including on previously white or empty cells', () => {
  const black = cycleEditorCell({ color: 'w', kind: 'P' }, 'hold', 'b');
  assert.deepEqual(black, { color: 'b', kind: 'P' });
  assert.deepEqual(cycleEditorCell(black, 'tap', 'b'), { color: 'b', kind: 'N' });
  assert.deepEqual(cycleEditorCell(null, 'tap', 'b'), { color: 'b', kind: 'P' });
  assert.deepEqual(cycleEditorCell({ color: 'w', kind: 'B' }, 'tap', 'b'), { color: 'b', kind: 'P' });
});

void test('hold transitions from fixed black piece through coin and back to white piece', () => {
  const coin = cycleEditorCell({ color: 'b', kind: 'B' }, 'hold', 'coin');
  assert.equal(coin?.kind, 'coin');
  assert.equal(coin?.color, 'b');
  assert.deepEqual(cycleEditorCell(coin, 'hold', 'w'), { color: 'w', kind: 'P' });
});

void test('coin-mode short taps cycle presets without changing coin color', () => {
  const first = cycleEditorCell({ color: 'b', kind: 'P' }, 'hold', 'coin');
  const second = cycleEditorCell(first, 'tap', 'coin');
  assert.deepEqual(second, { kind: 'coin', color: 'b', options: ['N', 'B'] });
  const third = cycleEditorCell(second, 'tap', 'coin');
  assert.deepEqual(third, { kind: 'coin', color: 'b', options: ['R', 'Q'] });
  const fourth = cycleEditorCell(third, 'tap', 'coin');
  const wrapped = cycleEditorCell(fourth, 'tap', 'coin');
  assert.equal(wrapped?.color, 'b');
  assert.equal(wrapped?.kind, 'coin');
});

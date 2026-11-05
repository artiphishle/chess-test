import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Template } from '../../../types/chess.ts';
import { createPresets } from './createPresets.ts';
import { resizeTemplate } from './resizeTemplate.ts';

const standard = createPresets()[0]!;

void test('widening keeps the rooks on both edges and fills both pawn lines', () => {
  const resized = resizeTemplate(standard, 10, 8);
  assert.deepEqual(
    resized.cells[0]?.map((cell) => cell?.kind),
    ['R', 'N', 'B', 'N', 'Q', 'K', 'N', 'B', 'N', 'R'],
  );
  assert.deepEqual(
    resized.cells[7]?.map((cell) => cell?.kind),
    ['R', 'N', 'B', 'N', 'Q', 'K', 'N', 'B', 'N', 'R'],
  );
  assert.equal(resized.cells[1]?.filter((cell) => cell?.kind === 'P').length, 10);
  assert.equal(resized.cells[6]?.filter((cell) => cell?.kind === 'P').length, 10);
});

void test('shrinking removes minor pieces before royal pair and keeps pawn lines full', () => {
  const resized = resizeTemplate(standard, 6, 8);
  assert.deepEqual(
    resized.cells[7]?.map((cell) => cell?.kind),
    ['R', 'N', 'Q', 'K', 'N', 'R'],
  );
  assert.equal(resized.cells[6]?.filter((cell) => cell?.kind === 'P').length, 6);
  assert.deepEqual(
    resizeTemplate(resized, 8, 8).cells[7]?.map((cell) => cell?.kind),
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  );
});

void test('white home rows follow the bottom edge when adding/removing ranks', () => {
  for (const height of [6, 10]) {
    const resized = resizeTemplate(standard, 8, height);
    assert.equal(resized.cells[0]?.[0]?.kind, 'R');
    assert.equal(resized.cells[1]?.[0]?.kind, 'P');
    assert.equal(resized.cells[height - 2]?.[0]?.kind, 'P');
    assert.equal(resized.cells[height - 1]?.[0]?.kind, 'R');
  }
});

void test('keeps unrelated cells in place and clips those falling outside the boundary', () => {
  const empty: Template = { ...standard, cells: standard.cells.map(() => Array(8).fill(null)) };
  const custom = {
    ...empty,
    cells: empty.cells.map((row, y) =>
      y === 3
        ? row.map((cell, x) => (x === 7 ? { color: 'w' as const, kind: 'B' as const } : cell))
        : row,
    ),
  };
  assert.equal(resizeTemplate(custom, 6, 6).cells[3]?.[5], null);
  assert.deepEqual(resizeTemplate(custom, 10, 10).cells[3]?.[7], { color: 'w', kind: 'B' });
  assert.strictEqual(resizeTemplate(custom, 25, 6), custom);
});

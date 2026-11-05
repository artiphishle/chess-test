import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BOARD_DIMENSIONS, BOARD_DIMENSION_OPTIONS } from '../constants/boardDimensions.ts';
import { createPresets } from './createPresets.ts';
import { validateTemplate } from './validateTemplate.ts';

void test('board-size dropdowns and validation share inclusive limits from constants', () => {
  const { min, max } = BOARD_DIMENSIONS;
  const [standard] = createPresets();
  assert.equal(max, 24);
  assert.deepEqual(
    BOARD_DIMENSION_OPTIONS,
    Array.from({ length: max - min + 1 }, (_, index) => min + index),
  );
  for (const dimension of ['width', 'height'] as const) {
    assert.throws(() => validateTemplate({ ...standard, [dimension]: min - 1 }), /between/);
    assert.throws(() => validateTemplate({ ...standard, [dimension]: max + 1 }), /between/);
  }
  const valid = validateTemplate({
    ...standard,
    width: max,
    height: max,
    cells: Array.from({ length: max }, () => Array.from({ length: max }, () => null)),
  });
  assert.equal(valid.width, max);
  assert.equal(valid.height, max);
});

void test('random turn is valid but unrecognized starting sides are rejected', () => {
  const [standard] = createPresets();
  assert.equal(validateTemplate({ ...standard, turn: 'random' }).turn, 'random');
  assert.throws(() => validateTemplate({ ...standard, turn: 'neither' }), /Invalid side/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BOARD_THEMES } from './boardThemes.ts';

void test('all seven board designs have stable branding identifiers and artwork', () => {
  assert.equal(BOARD_THEMES.length, 7);
  assert.equal(new Set(BOARD_THEMES.map((entry) => entry.id)).size, 7);
  assert.equal(new Set(BOARD_THEMES.map((entry) => entry.icon)).size, 7);
  for (const entry of BOARD_THEMES) {
    assert.match(entry.accent, /^#[a-f0-9]{6}$/);
    assert.match(entry.icon, /^\/brand\/symbol-[1-7]\.svg$/);
  }
});

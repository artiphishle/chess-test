import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { BOARD_THEMES } from './boardThemes.ts';

void test('all seven board designs expose original outlined symbols and wordmarks', () => {
  assert.equal(BOARD_THEMES.length, 7);
  assert.equal(new Set(BOARD_THEMES.map((entry) => entry.id)).size, 7);
  assert.equal(new Set(BOARD_THEMES.map((entry) => entry.icon)).size, 7);
  assert.equal(new Set(BOARD_THEMES.map((entry) => entry.wordmark)).size, 7);

  for (const entry of BOARD_THEMES) {
    assert.match(entry.accent, /^#[a-f0-9]{6}$/);
    assert.match(entry.icon, /^\/brand\/symbol-[1-7]\.svg$/);
    assert.match(entry.wordmark, /^\/brand\/wordmark-[1-7]\.svg$/);

    for (const asset of [entry.icon, entry.wordmark]) {
      const source = readFileSync(`public${asset}`, 'utf8');
      assert.match(source, /<svg\b/);
      assert.match(source, /<path\b/);
      assert.doesNotMatch(source, /<text\b/);
    }
  }
});

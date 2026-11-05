import { expect, test } from 'bun:test';

import { BOARD_THEMES } from './boardThemes.ts';

test('all seven board designs have a stable original-brand palette and icon', () => {
  expect(BOARD_THEMES).toHaveLength(7);
  expect(new Set(BOARD_THEMES.map((entry) => entry.id)).size).toBe(7);
  expect(new Set(BOARD_THEMES.map((entry) => entry.icon)).size).toBe(7);
  for (const entry of BOARD_THEMES) {
    expect(entry.accent).toMatch(/^#[a-f0-9]{6}$/);
    expect(entry.icon).toMatch(/^\/brand\/symbol-[1-7]\.svg$/);
  }
});

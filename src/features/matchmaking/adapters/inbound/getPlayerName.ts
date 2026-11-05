'use client';

const key = 'chess-test-player-name';

/*** Read the player's browser-local display name without trusting it as server identity. */
export function getPlayerName(): string {
  const stored = window.localStorage.getItem(key)?.trim().slice(0, 32);
  return stored || 'Gast';
}

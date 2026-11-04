'use client';

const storageKey = 'chess-test-tab-id';

/*** Preserve one opaque UUID for this browser tab while isolating its match from sibling tabs. */
export function getPlayerTabId(): string {
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(existing)) {
    return existing;
  }
  const id = window.crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, id);
  return id;
}

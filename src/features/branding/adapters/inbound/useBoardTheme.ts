'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { BOARD_THEMES } from '../../constants/boardThemes.ts';

const storageKey = 'grossmeister-board-theme';

/*** Share one persisted presentation selection between the editor, site chrome, and browser tabs. */
export function useBoardTheme() {
  const index = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const cycleTheme = useCallback((step: number) => {
    const next = (getSnapshot() + step + BOARD_THEMES.length) % BOARD_THEMES.length;
    window.localStorage.setItem(storageKey, String(next));
    window.dispatchEvent(new Event(storageKey));
  }, []);
  return {
    index,
    theme: BOARD_THEMES.at(index) ?? BOARD_THEMES[0],
    cycleTheme,
  };
}

/*** Read a validated saved board style; old experimental styles map to the first design. */
function getSnapshot(): number {
  const stored = window.localStorage.getItem(storageKey);
  const parsed = stored === null ? 0 : Number(stored);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < BOARD_THEMES.length ? parsed : 0;
}

/*** Preserve a stable initial server/client hydration snapshot. */
function getServerSnapshot(): number {
  return 0;
}

/*** Notify subscribers for local changes and other tabs' storage updates. */
function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(storageKey, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(storageKey, listener);
  };
}

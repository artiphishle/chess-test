'use client';

import { type ReactNode, useCallback, useSyncExternalStore } from 'react';

import type { PieceSet } from '../../../../types/chessPresentation.ts';
import { PIECE_SETS } from '../../constants/pieceSets.ts';
import { pieceSetContext } from './pieceSetContext.ts';

const storageKey = 'chess-test-piece-set';

/*** Store a local SVG style without changing the server-authoritative chess configuration. */
export function PieceSetProvider({ children }: { readonly children: ReactNode }) {
  const pieceSet = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selectPieceSet = useCallback((next: PieceSet) => {
    window.localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event(storageKey));
  }, []);
  return (
    <pieceSetContext.Provider value={{ pieceSet, selectPieceSet }}>
      {children}
    </pieceSetContext.Provider>
  );
}

/*** Read persisted piece art with a safe default for server-side rendering. */
function getSnapshot(): PieceSet {
  const stored = window.localStorage.getItem(storageKey);
  return PIECE_SETS.find((entry) => entry === stored) ?? 'chessnut';
}

/*** Provide a stable SSR snapshot until the browser can read its own preference. */
function getServerSnapshot(): PieceSet {
  return 'chessnut';
}

/*** Subscribe to local style changes and updates from other browser tabs. */
function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(storageKey, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(storageKey, listener);
  };
}

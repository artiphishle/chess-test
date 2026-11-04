'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import type { PieceSet } from '../../../../types/chessPresentation.ts';
import { pieceSetContext } from './pieceSetContext.ts';

const storageKey = 'chess-test-piece-set';

/*** Store and distribute per-browser piece styles independently of a live game's rules. */
export function PieceSetProvider({ children }: { readonly children: ReactNode }) {
  const [pieceSet, setPieceSet] = useState<PieceSet>('chessnut');
  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'chessnut' || stored === 'alpha' || stored === 'companion') {
      setPieceSet(stored);
    }
  }, []);
  const selectPieceSet = useCallback((next: PieceSet) => {
    setPieceSet(next);
    window.localStorage.setItem(storageKey, next);
  }, []);
  return (
    <pieceSetContext.Provider value={{ pieceSet, selectPieceSet }}>
      {children}
    </pieceSetContext.Provider>
  );
}

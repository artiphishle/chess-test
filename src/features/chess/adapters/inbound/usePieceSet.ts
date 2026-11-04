'use client';

import { useContext } from 'react';

import type { PieceSetSettings } from '../../../../types/chessPresentation.ts';
import { pieceSetContext } from './pieceSetContext.ts';

/*** Read the active visual SVG set without modifying the match configuration. */
export function usePieceSet(): PieceSetSettings {
  const settings = useContext(pieceSetContext);
  if (!settings) throw new Error('PieceSetProvider is missing');
  return settings;
}

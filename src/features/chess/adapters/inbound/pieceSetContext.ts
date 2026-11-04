'use client';

import { createContext } from 'react';

import type { PieceSetSettings } from '../../../../types/chessPresentation.ts';

/*** Share local-only chess piece artwork preferences across board presentations. */
export const pieceSetContext = createContext<PieceSetSettings | null>(null);

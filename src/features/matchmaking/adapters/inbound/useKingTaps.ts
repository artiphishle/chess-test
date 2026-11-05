'use client';

import { useRef } from 'react';

import type { Color, GameState, Position } from '../../../types/chess.ts';

interface Actions {
  readonly state: GameState | null;
  readonly color: Color;
  readonly onDraw: () => void;
  readonly onResign: () => void;
  readonly onSquare: (position: Position) => void;
}

type Sequence = { color: Color | null; own: number; at: number };

/*** Recognize both-king draw offers and four own-king resignation requests. */
export function useKingTaps({ state, color, onDraw, onResign, onSquare }: Actions) {
  const sequence = useRef<Sequence>({ color: null, own: 0, at: 0 });
  return (position: Position): void => {
    const piece = state?.board[position.y]?.[position.x];
    if (piece?.kind !== 'K') {
      sequence.current = { color: null, own: 0, at: 0 };
      onSquare(position);
      return;
    }
    const now = Date.now();
    const previous = now - sequence.current.at < 2200
      ? sequence.current : { color: null, own: 0, at: 0 };
    if (previous.color && previous.color !== piece.color) {
      sequence.current = { color: null, own: 0, at: 0 };
      onDraw();
      return;
    }
    const own = piece.color === color ? previous.own + 1 : 0;
    sequence.current = { color: piece.color, own, at: now };
    if (own >= 4) {
      sequence.current = { color: null, own: 0, at: 0 };
      onResign();
      return;
    }
    if (own < 2) onSquare(position);
  };
}

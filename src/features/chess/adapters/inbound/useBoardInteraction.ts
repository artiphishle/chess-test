'use client';

import { useMemo, useState } from 'react';

import type { Cell, Move, PieceKind, Position } from '../../../../types/chess.ts';
import type { MatchSnapshot } from '../../../matchmaking/application/createGameService.ts';
import type { MatchSession } from '../../../matchmaking/adapters/inbound/useMatchSession.ts';
import { getLegalMoves } from '../../domain/getLegalMoves.ts';
import { createBoardActions } from './createBoardActions.ts';

export interface BoardInteraction {
  readonly cells: readonly (readonly Cell[])[];
  readonly selected: Position | null;
  readonly promotion: { from: Position; to: Position } | null;
  readonly activeCoin: Position | null;
  readonly legal: readonly Move[];
  readonly onSquare: (position: Position) => void;
  readonly choose: (kind: PieceKind) => void;
  readonly promote: (kind: Move['promotion']) => void;
  readonly cancelPromotion: () => void;
}

/*** Hold transient board selection and delegate authorized commands to the server. */
export function useBoardInteraction(session: MatchSession): BoardInteraction {
  const { match } = session;
  const [selected, setSelected] = useState<Position | null>(null);
  const [promotion, setPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const [activeCoin, setActiveCoin] = useState<Position | null>(null);
  const cells = useMemo(() => visibleCells(match), [match]);
  const legal = useMemo(() => match?.state && match.state.turn === match.color &&
    match.phase === 'playing' && selected ? getLegalMoves(match.state, selected) : [], [match, selected]);
  const actions = createBoardActions({ session, selected, setSelected, promotion, setPromotion,
    activeCoin, setActiveCoin, legal });
  return { cells, selected, promotion, activeCoin, legal, ...actions,
    cancelPromotion: () => setPromotion(null) };
}

/*** Show only the current player's resolved pre-game choices. */
function visibleCells(match: MatchSnapshot | null): readonly (readonly Cell[])[] {
  if (!match) return [];
  if (match.state) return match.state.board;
  return match.template.cells.map((row, y) => row.map((cell, x): Cell => {
    if (cell?.kind !== 'coin' || cell.color !== match.color) return cell;
    const kind = Object.entries(match.choices).find(([key]) => key === `${x}:${y}`)?.[1];
    return kind ? { kind, color: cell.color } : cell;
  }));
}

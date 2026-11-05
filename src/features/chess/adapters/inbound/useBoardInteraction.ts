'use client';

import { useMemo, useState } from 'react';

import type { Cell, Move, PieceKind, Position } from '../../../../types/chess.ts';
import type { MatchSession } from '../../../matchmaking/adapters/inbound/useMatchSession.ts';
import type { MatchSnapshot } from '../../../matchmaking/application/createGameService.ts';
import { getLegalMoves } from '../../domain/getLegalMoves.ts';
import { createBoardActions } from './createBoardActions.ts';

export interface BoardInteraction {
  readonly cells: readonly (readonly Cell[])[];
  readonly selected: Position | null;
  readonly promotion: { from: Position; to: Position } | null;
  readonly choices: Readonly<Record<string, PieceKind>>;
  readonly legal: readonly Move[];
  readonly onSquare: (position: Position) => void;
  readonly confirmChoices: () => void;
  readonly promote: (kind: Move['promotion']) => void;
  readonly cancelPromotion: () => void;
}

/*** Keep local coin cycles editable until one atomic server-side Ready command. */
export function useBoardInteraction(session: MatchSession): BoardInteraction {
  const { match } = session;
  const [selected, setSelected] = useState<Position | null>(null);
  const [promotion, setPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const [draft, setDraft] = useState<Readonly<Record<string, PieceKind>>>({});
  const cells = useMemo(() => visibleCells(match, draft), [match, draft]);
  const legal = useMemo(() => {
    if (!match?.state || match.phase !== 'playing' || !selected) return [];
    if (match.state.turn !== match.color) return [];
    return getLegalMoves(match.state, selected);
  }, [match, selected]);
  const actions = createBoardActions({
    session,
    selected,
    setSelected,
    promotion,
    setPromotion,
    draft,
    setDraft,
    legal,
  });
  return {
    cells,
    selected,
    promotion,
    choices: match?.ready[match.color] ? match.choices : draft,
    legal,
    ...actions,
    cancelPromotion: () => setPromotion(null),
  };
}

/*** Replace only the local player's coins with privately previewed choices. */
function visibleCells(
  match: MatchSnapshot | null,
  draft: Readonly<Record<string, PieceKind>>,
): readonly (readonly Cell[])[] {
  if (!match) return [];
  if (match.state) return match.state.board;
  const choices = match.ready[match.color] ? match.choices : draft;
  return match.template.cells.map((row, y) =>
    row.map((cell, x): Cell => {
      if (cell?.kind !== 'coin' || cell.color !== match.color) return cell;
      const kind = Object.entries(choices).find(([key]) => key === `${x}:${y}`)?.[1];
      return kind === undefined ? cell : { kind, color: cell.color };
    }),
  );
}

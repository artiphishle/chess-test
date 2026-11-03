'use client';

import { useMemo, useState } from 'react';

import type { Cell, Move, PieceKind, Position } from '../../../../types/chess.ts';
import type { MatchSession } from '../../../matchmaking/adapters/inbound/useMatchSession.ts';
import type { MatchSnapshot } from '../../../matchmaking/application/createGameService.ts';
import { getLegalMoves } from '../../domain/getLegalMoves.ts';

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

/*** Keep client board selection separate from server-authoritative move application. */
export function useBoardInteraction(session: MatchSession): BoardInteraction {
  const { match, busy, act } = session;
  const [selected, setSelected] = useState<Position | null>(null);
  const [promotion, setPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const [activeCoin, setActiveCoin] = useState<Position | null>(null);
  const cells = useMemo(() => visibleCells(match), [match]);
  const legal = useMemo(
    () =>
      match?.state?.turn === match?.color && match?.phase === 'playing' && selected
        ? getLegalMoves(match.state, selected)
        : [],
    [match, selected],
  );
  const onSquare = (position: Position): void => {
    if (!match) return;
    if (match.phase === 'setup') {
      const coin = match.template.cells[position.y]?.[position.x];
      if (coin?.kind === 'coin' && coin.color === match.color && !match.ready[match.color])
        setActiveCoin(position);
      return;
    }
    if (match.phase !== 'playing' || match.state?.turn !== match.color || busy) return;
    const piece = match.state.board[position.y]?.[position.x];
    if (piece?.color === match.color) {
      setSelected(position);
      setPromotion(null);
      return;
    }
    if (!selected) return;
    const candidate = legal.filter((move) => move.to.x === position.x && move.to.y === position.y);
    if (candidate.length === 0) {
      setSelected(null);
      return;
    }
    if (candidate.some((move) => move.promotion)) {
      setPromotion({ from: selected, to: position });
      return;
    }
    void act({ action: 'move', move: { from: selected, to: position } }).then((ok) => {
      if (ok) setSelected(null);
    });
  };
  const choose = (kind: PieceKind): void => {
    if (activeCoin)
      void act({ action: 'choose', x: activeCoin.x, y: activeCoin.y, kind }).then((ok) => {
        if (ok) setActiveCoin(null);
      });
  };
  const promote = (kind: Move['promotion']): void => {
    if (promotion)
      void act({ action: 'move', move: { ...promotion, promotion: kind } }).then((ok) => {
        if (ok) {
          setPromotion(null);
          setSelected(null);
        }
      });
  };
  return {
    cells,
    selected,
    promotion,
    activeCoin,
    legal,
    onSquare,
    choose,
    promote,
    cancelPromotion: () => setPromotion(null),
  };
}

/*** Reveal only the current player's unresolved coin decisions during setup. */
function visibleCells(match: MatchSnapshot | null): readonly (readonly Cell[])[] {
  if (!match) return [];
  if (match.state) return match.state.board;
  return match.template.cells.map((row, y) =>
    row.map((cell, x): Cell => {
      if (cell?.kind !== 'coin' || cell.color !== match.color) return cell;
      const kind = match.choices[`${x}:${y}`];
      return kind ? { kind, color: cell.color } : cell;
    }),
  );
}

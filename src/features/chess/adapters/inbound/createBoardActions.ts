'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { Move, PieceKind, Position } from '../../../../types/chess.ts';
import type { MatchSession } from '../../../matchmaking/adapters/inbound/useMatchSession.ts';
import type { BoardInteraction } from './useBoardInteraction.ts';

interface ActionState {
  readonly session: MatchSession;
  readonly selected: Position | null;
  readonly setSelected: Dispatch<SetStateAction<Position | null>>;
  readonly promotion: { from: Position; to: Position } | null;
  readonly setPromotion: Dispatch<SetStateAction<{ from: Position; to: Position } | null>>;
  readonly activeCoin: Position | null;
  readonly setActiveCoin: Dispatch<SetStateAction<Position | null>>;
  readonly legal: readonly Move[];
}

/*** Build board interactions without mixing state presentation with commands. */
export function createBoardActions(
  context: ActionState,
): Pick<BoardInteraction, 'onSquare' | 'choose' | 'promote'> {
  return {
    onSquare: (position) => handleSquare(context, position),
    choose: (kind) => resolveCoin(context, kind),
    promote: (kind) => confirmPromotion(context, kind),
  };
}

/*** Distinguish pre-game coin setup from ordinary turn-bound play. */
function handleSquare(context: ActionState, position: Position): void {
  const { match, busy } = context.session;
  if (!match) return;
  if (match.phase === 'setup') {
    const coin = match.template.cells.at(position.y)?.at(position.x);
    if (coin?.kind === 'coin' && coin.color === match.color && !match.ready[match.color]) {
      context.setActiveCoin(position);
    }
    return;
  }
  if (match.phase !== 'playing' || match.state?.turn !== match.color || busy) return;
  handlePlayingSquare(context, position);
}

/*** Select one friendly piece or apply a legal destination. */
function handlePlayingSquare(context: ActionState, position: Position): void {
  const { selected, legal, session, setSelected, setPromotion } = context;
  const { match } = session;
  if (!match?.state) return;
  const piece = match.state.board.at(position.y)?.at(position.x);
  if (piece?.color === match.color) {
    setSelected(position);
    setPromotion(null);
    return;
  }
  if (!selected) return;
  const moves = legal.filter((move) => move.to.x === position.x && move.to.y === position.y);
  if (moves.length === 0) {
    setSelected(null);
    return;
  }
  if (moves.some((move) => move.promotion)) {
    setPromotion({ from: selected, to: position });
    return;
  }
  void session.act({ action: 'move', move: { from: selected, to: position } }).then((ok) => {
    if (ok) setSelected(null);
  });
}

/*** Save one independently selected piece on an unresolved coin. */
function resolveCoin(context: ActionState, kind: PieceKind): void {
  const { activeCoin, session, setActiveCoin } = context;
  if (!activeCoin) return;
  void session.act({ action: 'choose', x: activeCoin.x, y: activeCoin.y, kind }).then((ok) => {
    if (ok) setActiveCoin(null);
  });
}

/*** Post a legal pawn-promotion move after the player chooses its piece. */
function confirmPromotion(context: ActionState, kind: Move['promotion']): void {
  const { promotion, session, setPromotion, setSelected } = context;
  if (!promotion) return;
  void session.act({ action: 'move', move: { ...promotion, promotion: kind } }).then((ok) => {
    if (ok) {
      setPromotion(null);
      setSelected(null);
    }
  });
}

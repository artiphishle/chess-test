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
  readonly draft: Readonly<Record<string, PieceKind>>;
  readonly setDraft: Dispatch<SetStateAction<Readonly<Record<string, PieceKind>>>>;
  readonly legal: readonly Move[];
}

/*** Bind local selection gestures and commit all owned coins together only on Ready. */
export function createBoardActions(
  context: ActionState,
): Pick<BoardInteraction, 'onSquare' | 'confirmChoices' | 'promote'> {
  return {
    onSquare: (position) => handleSquare(context, position),
    confirmChoices: () => {
      void context.session.act({ action: 'ready', choices: context.draft });
    },
    promote: (kind) => confirmPromotion(context, kind),
  };
}

/*** Cycle setup coins without network latency, or choose a legal move during play. */
function handleSquare(context: ActionState, position: Position): void {
  const { match, busy } = context.session;
  if (!match || busy) return;
  if (match.phase === 'setup') {
    const coin = match.template.cells.at(position.y)?.at(position.x);
    if (coin?.kind !== 'coin' || coin.color !== match.color || match.ready[match.color]) return;
    const key = `${position.x}:${position.y}`;
    context.setDraft((current) => {
      const index = coin.options.indexOf(current[key] ?? coin.options[coin.options.length - 1]!);
      const next = coin.options[(index + 1) % coin.options.length]!;
      return { ...current, [key]: next };
    });
    return;
  }
  if (match.phase !== 'playing' || match.state?.turn !== match.color) return;
  handlePlayingSquare(context, position);
}

/*** Select one friendly piece or play an authorized destination. */
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

/*** Confirm a pawn promotion using the existing server-authorized move boundary. */
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

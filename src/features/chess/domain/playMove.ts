import type { GameState, Move } from '../../../types/chess.ts';
import { applyUnchecked } from './applyUnchecked.ts';
import { getLegalMoves } from './getLegalMoves.ts';
import { stateSignature } from './stateSignature.ts';

/*** Validate and execute one move, never trusting the client-provided destination or promotion. */
export function playMove(state: GameState, move: Move): GameState {
  const accepted = getLegalMoves(state, move.from).find(candidate =>
    candidate.to.x === move.to.x && candidate.to.y === move.to.y && candidate.promotion === move.promotion,
  );
  if (!accepted) throw new Error('Illegal move');
  const next = applyUnchecked(state,accepted);
  return { ...next, history: [...state.history,stateSignature(next)] };
}

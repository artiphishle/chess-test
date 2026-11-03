import type { GameState, Piece, Result } from '../../../types/chess.ts';
import { getLegalMoves } from './getLegalMoves.ts';
import { isKingInCheck } from './isKingInCheck.ts';
import { stateSignature } from './stateSignature.ts';

/*** Decide checkmate and automatic draw outcomes without requiring both kings to exist. */
export function readOutcome(state: GameState): Result | null {
  if (state.halfmove >= 100) return {winner:null,reason:'fifty-moves'};
  if (state.history.filter(signature => signature === stateSignature(state)).length >= 3) return {winner:null,reason:'threefold'};
  const pieces = state.board.flatMap(row => row.filter((piece): piece is Piece => piece !== null));
  if (insufficientMaterial(pieces)) return {winner:null,reason:'insufficient-material'};
  if (getLegalMoves(state).length > 0) return null;
  return isKingInCheck(state.board,state.turn)
    ? {winner:state.turn === 'w' ? 'b' : 'w', reason:'checkmate'}
    : {winner:null,reason:'stalemate'};
}

/*** Recognize only the universally dead basic-material endings. */
function insufficientMaterial(pieces: readonly Piece[]): boolean {
  if (pieces.some(piece => piece.kind !== 'K' && piece.kind !== 'B' && piece.kind !== 'N')) return false;
  if (pieces.filter(piece => piece.kind === 'K').length !== 2) return false;
  return pieces.length <= 3;
}

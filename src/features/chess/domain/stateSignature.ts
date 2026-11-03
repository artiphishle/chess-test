import type { GameState } from '../../../types/chess.ts';

/*** Canonically identify a position for threefold-repetition detection. */
export function stateSignature(state: GameState): string {
  return JSON.stringify({
    board: state.board.map(row => row.map(piece => piece ? piece.color + piece.kind : '.')),
    turn: state.turn, castling: state.castling, enPassant: state.enPassant,
  });
}

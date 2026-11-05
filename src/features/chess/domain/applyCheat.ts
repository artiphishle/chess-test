import type { Color, GameState } from '../../../types/chess.ts';
import { parseCheatPlacement } from './parseCheatPlacement.ts';
import { stateSignature } from './stateSignature.ts';

/*** Place an extra piece without allowing a normal move or overwriting the player's pieces. */
export function applyCheat(state: GameState, color: Color, notation: unknown): GameState {
  const { x, y, kind } = parseCheatPlacement(notation, state.width, state.height);
  const target = state.board.at(y)?.at(x);
  if (target?.color === color) throw new Error('Cannot replace your own piece');
  if (target?.kind === 'K') throw new Error('Cannot capture a king');
  const board = state.board.map((row, atY) =>
    row.map((piece, atX) => (atX === x && atY === y ? { color, kind } : piece)),
  );
  const castling = { w: { ...state.castling.w }, b: { ...state.castling.b } };
  if (target?.kind === 'R' && y === (target.color === 'w' ? state.height - 1 : 0)) {
    const rights = target.color === 'w' ? castling.w : castling.b;
    if (x === 0) rights.Q = false;
    if (x === state.width - 1) rights.K = false;
  }
  const next: GameState = { ...state, board, castling, enPassant: null, halfmove: 0 };
  return { ...next, history: [...state.history, stateSignature(next)] };
}

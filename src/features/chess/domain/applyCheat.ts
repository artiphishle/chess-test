import type { Color, GameState, PieceKind } from '../../../types/chess.ts';
import { stateSignature } from './stateSignature.ts';

/*** Place one piece using SAN-like square notation without granting a normal move. */
export function applyCheat(state: GameState, color: Color, notation: unknown): GameState {
  if (typeof notation !== 'string' || notation.length > 12) throw new Error('Invalid cheat SAN');
  const san = /^([KQRBN])?(?:[a-x1-9])?x?([a-x])(2[0-4]|1[0-9]|[1-9])[+#]?$/.exec(notation.trim());
  if (!san) throw new Error('Invalid cheat SAN');
  const kind: PieceKind = (san[1] ?? 'P') as PieceKind;
  const x = san[2]!.charCodeAt(0) - 97;
  const rank = Number(san[3]);
  const y = state.height - rank;
  if (x >= state.width || y < 0 || y >= state.height) throw new Error('Cheat square outside board');
  const target = state.board[y]?.[x];
  if (target?.color === color) throw new Error('Cannot replace your own piece');
  if (target?.kind === 'K') throw new Error('Cannot capture a king');
  const board = state.board.map((row, atY) =>
    row.map((piece, atX) => atX === x && atY === y ? { color, kind } : piece),
  );
  const castling = {
    w: { ...state.castling.w },
    b: { ...state.castling.b },
  };
  if (target?.kind === 'R' && y === (target.color === 'w' ? state.height - 1 : 0)) {
    const rights = castling[target.color];
    if (x === 0) rights.Q = false;
    if (x === state.width - 1) rights.K = false;
  }
  const next: GameState = { ...state, board, castling, enPassant: null, halfmove: 0 };
  return { ...next, history: [...state.history, stateSignature(next)] };
}

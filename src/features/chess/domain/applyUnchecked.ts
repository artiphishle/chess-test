import type { Castling, Color, GameState, Move, Piece, Position } from '../../../types/chess.ts';

/*** Apply a pseudolegal move without king-safety validation. */
export function applyUnchecked(state: GameState, move: Move): GameState {
  const { from, to } = move;
  const piece = state.board[from.y]?.[from.x];
  if (!piece) throw new Error('No piece at source square');
  const captured = state.board[to.y]?.[to.x] ?? null;
  const enPassantCapture = piece.kind === 'P' && from.x !== to.x && !captured;
  const board = transferPieces(state, move, piece, enPassantCapture);
  const castling = updateCastling(
    state.castling,
    piece,
    from,
    to,
    captured,
    state.width,
    state.height,
  );
  const enPassant =
    piece.kind === 'P' && Math.abs(to.y - from.y) === 2
      ? { x: from.x, y: (from.y + to.y) / 2 }
      : null;
  return {
    ...state,
    board,
    castling,
    enPassant,
    halfmove: piece.kind === 'P' || captured || enPassantCapture ? 0 : state.halfmove + 1,
    turn: piece.color === 'w' ? 'b' : 'w',
  };
}

/*** Apply basic movement and special captures on a new board matrix. */
function transferPieces(
  state: GameState,
  move: Move,
  piece: Piece,
  enPassantCapture: boolean,
): (Piece | null)[][] {
  const { from, to } = move;
  const board = state.board.map((row) => [...row]);
  board[from.y][from.x] = null;
  board[to.y][to.x] = { ...piece, kind: move.promotion ?? piece.kind };
  if (enPassantCapture) board[from.y][to.x] = null;
  if (move.castle) {
    const rookFrom = move.castle === 'K' ? state.width - 1 : 0;
    const rookTo = to.x + (move.castle === 'K' ? -1 : 1);
    board[to.y][rookTo] = board[from.y][rookFrom];
    board[from.y][rookFrom] = null;
  }
  return board;
}

/*** Expire castling rights on king movement, rook movement or corner-rook capture. */
function updateCastling(
  rights: Castling,
  moving: Piece,
  from: Position,
  to: Position,
  target: Piece | null,
  width: number,
  height: number,
): Castling {
  const next = { w: { ...rights.w }, b: { ...rights.b } };
  if (moving.kind === 'K') next[moving.color] = { K: false, Q: false };
  const revoke = (color: Color, point: Position) => {
    if (point.y !== (color === 'w' ? height - 1 : 0)) return;
    if (point.x === 0) next[color].Q = false;
    if (point.x === width - 1) next[color].K = false;
  };
  if (moving.kind === 'R') revoke(moving.color, from);
  if (target?.kind === 'R') revoke(target.color, to);
  return next;
}

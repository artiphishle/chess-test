import type { Castling, Color, GameState, Move, Piece, Position } from '../../../types/chess.ts';

/*** Apply a pseudolegal move without king-safety validation; callers must validate externally. */
export function applyUnchecked(state: GameState, move: Move): GameState {
  const { from } = move;
  const { to } = move;
  const moving = state.board[from.y]?.[from.x];
  if (!moving) throw new Error('No piece at source square');
  const target = state.board[to.y]?.[to.x] ?? null;
  const board = state.board.map((row) => [...row]);
  board[from.y][from.x] = null;
  board[to.y][to.x] = { ...moving, kind: move.promotion ?? moving.kind };
  const enPassantCapture = moving.kind === 'P' && from.x !== to.x && !target;
  if (enPassantCapture) board[from.y][to.x] = null;
  if (move.castle) {
    const rookFrom = move.castle === 'K' ? state.width - 1 : 0;
    const rookTo = to.x + (move.castle === 'K' ? -1 : 1);
    board[to.y][rookTo] = board[from.y][rookFrom];
    board[from.y][rookFrom] = null;
  }
  const castling = updateCastling(
    state.castling,
    moving,
    from,
    to,
    target,
    state.width,
    state.height,
  );
  const enPassant =
    moving.kind === 'P' && Math.abs(to.y - from.y) === 2
      ? { x: from.x, y: (from.y + to.y) / 2 }
      : null;
  return {
    ...state,
    board,
    castling,
    enPassant,
    halfmove: moving.kind === 'P' || target || enPassantCapture ? 0 : state.halfmove + 1,
    turn: moving.color === 'w' ? 'b' : 'w',
  };
}

/*** Expire castling rights when a king moves or an edge rook moves or is captured. */
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

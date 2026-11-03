import type { Castling, Color, GameState, Move, Piece, Position } from '../../../types/chess.ts';

/*** Apply a pseudolegal move without king-safety validation. */
export function applyUnchecked(state: GameState, move: Move): GameState {
  const { from, to } = move;
  const piece = state.board.at(from.y)?.at(from.x);
  if (!piece) throw new Error('No piece at source square');
  const captured = state.board.at(to.y)?.at(to.x) ?? null;
  const enPassantCapture = piece.kind === 'P' && from.x !== to.x && !captured;
  const board = transferPieces(state, move, piece, enPassantCapture);
  const castling = updateCastling(state.castling, piece, from, to, captured, state.width, state.height);
  const enPassant = piece.kind === 'P' && Math.abs(to.y - from.y) === 2
    ? { x: from.x, y: (from.y + to.y) / 2 } : null;
  return {
    ...state, board, castling, enPassant,
    halfmove: piece.kind === 'P' || captured || enPassantCapture ? 0 : state.halfmove + 1,
    turn: piece.color === 'w' ? 'b' : 'w',
  };
}

/*** Move and promote pieces using an immutable board transformation. */
function transferPieces(state: GameState, move: Move, piece: Piece, enPassantCapture: boolean): (Piece | null)[][] {
  const { from, to } = move;
  const rookFrom = move.castle === 'K' ? state.width - 1 : 0;
  const rookTo = to.x + (move.castle === 'K' ? -1 : 1);
  const rook = move.castle ? state.board.at(from.y)?.at(rookFrom) ?? null : null;
  return state.board.map((row, y) => row.map((original, x) => {
    if (y === from.y && x === from.x) return null;
    if (y === to.y && x === to.x) return { ...piece, kind: move.promotion ?? piece.kind };
    if (enPassantCapture && y === from.y && x === to.x) return null;
    if (move.castle && y === from.y && x === rookFrom) return null;
    if (move.castle && y === to.y && x === rookTo) return rook;
    return original;
  }));
}

/*** Expire castling rights when kings or eligible corner rooks move. */
function updateCastling(rights: Castling, moving: Piece, from: Position, to: Position,
  target: Piece | null, width: number, height: number): Castling {
  const next = { w: { ...rights.w }, b: { ...rights.b } };
  const own = moving.color === 'w' ? next.w : next.b;
  if (moving.kind === 'K') { own.K = false; own.Q = false; }
  if (moving.kind === 'R') revokeRookRights(next, moving.color, from, width, height);
  if (target?.kind === 'R') revokeRookRights(next, target.color, to, width, height);
  return next;
}

/*** Revoke only the matching edge-rook right on its original home rank. */
function revokeRookRights(next: { w: { K: boolean; Q: boolean }; b: { K: boolean; Q: boolean } },
  color: Color, point: Position, width: number, height: number): void {
  if (point.y !== (color === 'w' ? height - 1 : 0)) return;
  const own = color === 'w' ? next.w : next.b;
  if (point.x === 0) own.Q = false;
  if (point.x === width - 1) own.K = false;
}

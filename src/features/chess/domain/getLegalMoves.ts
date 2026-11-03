import type { Color, GameState, Move, Piece, Position } from '../../../types/chess.ts';
import { applyUnchecked } from './applyUnchecked.ts';
import { isKingInCheck } from './isKingInCheck.ts';
import { isSquareAttacked } from './isSquareAttacked.ts';

/*** Enumerate legal moves for the player to move on a rectangular board. */
export function getLegalMoves(state: GameState, origin?: Position): readonly Move[] {
  const positions = origin
    ? [origin]
    : state.board.flatMap((row, y) => row.map((_, x) => ({ x, y })));
  return positions.flatMap((from) => {
    const piece = state.board[from.y]?.[from.x];
    return piece?.color === state.turn
      ? pseudoMoves(state, from, piece).filter(
          (move) => !isKingInCheck(applyUnchecked(state, move).board, state.turn),
        )
      : [];
  });
}

const knightSteps = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
] as const;
const kingSteps = [
  [1, 1],
  [1, 0],
  [1, -1],
  [0, 1],
  [0, -1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;
const rookSteps = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const bishopSteps = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/*** Generate candidate moves including special moves, before self-check filtering. */
function pseudoMoves(state: GameState, from: Position, piece: Piece): readonly Move[] {
  if (piece.kind === 'P') return pawnMoves(state, from, piece);
  const candidates = stepMoves(state, from, piece);
  return piece.kind === 'K'
    ? [...candidates, ...castleMoves(state, from, piece.color)]
    : candidates;
}

/*** Enumerate pawn forward steps, attacks and en passant from any board square. */
function pawnMoves(state: GameState, from: Position, pawn: Piece): readonly Move[] {
  const dy = pawn.color === 'w' ? -1 : 1;
  const home = pawn.color === 'w' ? state.height - 2 : 1;
  const next = from.y + dy;
  const moves: Move[] = [];
  if (state.board[next]?.[from.x] === null) {
    moves.push(...withPromotion(state, from, { x: from.x, y: next }, pawn.color));
    if (from.y === home && state.board[next + dy]?.[from.x] === null) {
      moves.push({ from, to: { x: from.x, y: next + dy } });
    }
  }
  for (const x of [from.x - 1, from.x + 1]) {
    if (x < 0 || x >= state.width || next < 0 || next >= state.height) continue;
    if (isPawnCapture(state, from, { x, y: next }, pawn.color)) {
      moves.push(...withPromotion(state, from, { x, y: next }, pawn.color));
    }
  }
  return moves;
}

/*** Identify legal pawn capture targets, including an available en passant square. */
function isPawnCapture(state: GameState, from: Position, to: Position, color: Color): boolean {
  const target = state.board[to.y]?.[to.x];
  if (target) return target.color !== color && target.kind !== 'K';
  const adjacent = state.board[from.y]?.[to.x];
  return (
    state.enPassant?.x === to.x &&
    state.enPassant.y === to.y &&
    adjacent?.kind === 'P' &&
    adjacent.color !== color
  );
}

/*** Expand a pawn arrival into four promotion choices when it reaches the last rank. */
function withPromotion(
  state: GameState,
  from: Position,
  to: Position,
  color: Color,
): readonly Move[] {
  if (to.y !== (color === 'w' ? 0 : state.height - 1)) return [{ from, to }];
  return (['Q', 'R', 'B', 'N'] as const).map((promotion) => ({ from, to, promotion }));
}

/*** Traverse leaper destinations or sliding rays until blocked. */
function stepMoves(state: GameState, from: Position, piece: Piece): readonly Move[] {
  const steps =
    piece.kind === 'N'
      ? knightSteps
      : piece.kind === 'K'
        ? kingSteps
        : piece.kind === 'B'
          ? bishopSteps
          : piece.kind === 'R'
            ? rookSteps
            : [...rookSteps, ...bishopSteps];
  const max = piece.kind === 'N' || piece.kind === 'K' ? 1 : Math.max(state.width, state.height);
  const moves: Move[] = [];
  for (const [dx, dy] of steps) {
    for (let distance = 1; distance <= max; distance++) {
      const x = from.x + dx * distance;
      const y = from.y + dy * distance;
      if (x < 0 || y < 0 || x >= state.width || y >= state.height) break;
      const target = state.board[y]?.[x];
      if (target?.color === piece.color || target?.kind === 'K') break;
      moves.push({ from, to: { x, y } });
      if (target) break;
    }
  }
  return moves;
}

/*** Permit castling only with a valid edge rook, clear corridor and safe king transit. */
function castleMoves(state: GameState, from: Position, color: Color): readonly Move[] {
  const home = color === 'w' ? state.height - 1 : 0;
  if (from.y !== home || isKingInCheck(state.board, color)) return [];
  return (['K', 'Q'] as const).flatMap((side) => castleSide(state, from, color, side));
}

/*** Verify the selected castling side without assuming an 8×8 board. */
function castleSide(
  state: GameState,
  from: Position,
  color: Color,
  side: 'K' | 'Q',
): readonly Move[] {
  if (!state.castling[color][side]) return [];
  const rookX = side === 'K' ? state.width - 1 : 0;
  const dx = side === 'K' ? 1 : -1;
  const to = { x: from.x + dx * 2, y: from.y };
  if (to.x < 0 || to.x >= state.width || Math.abs(rookX - from.x) < 3) return [];
  const rook = state.board[from.y]?.[rookX];
  if (rook?.kind !== 'R' || rook.color !== color) return [];
  const path = Array.from(
    { length: Math.abs(rookX - from.x) - 1 },
    (_, i) => from.x + dx * (i + 1),
  );
  if (!path.every((x) => state.board[from.y]?.[x] === null)) return [];
  const enemy = color === 'w' ? 'b' : 'w';
  if ([from.x + dx, to.x].some((x) => isSquareAttacked(state.board, { x, y: from.y }, enemy)))
    return [];
  return [{ from, to, castle: side }];
}

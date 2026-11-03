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
    const piece =
      from.x >= 0 && from.y >= 0 && from.x < state.width && from.y < state.height
        ? state.board.at(from.y)?.at(from.x)
        : undefined;
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

/*** Enumerate pawn moves including en passant and optional promotion. */
function pawnMoves(state: GameState, from: Position, pawn: Piece): readonly Move[] {
  const next = from.y + (pawn.color === 'w' ? -1 : 1);
  const moves = [...pawnForwardMoves(state, from, pawn.color)];
  for (const x of [from.x - 1, from.x + 1]) {
    if (x < 0 || x >= state.width || next < 0 || next >= state.height) continue;
    if (isPawnCapture(state, from, { x, y: next }, pawn.color)) {
      moves.push(...withPromotion(state, from, { x, y: next }, pawn.color));
    }
  }
  return moves;
}

/*** Generate legal forward pawn steps with home-rank double movement. */
function pawnForwardMoves(state: GameState, from: Position, color: Color): readonly Move[] {
  const dy = color === 'w' ? -1 : 1;
  const home = color === 'w' ? state.height - 2 : 1;
  const next = from.y + dy;
  if (next < 0 || next >= state.height || state.board.at(next)?.at(from.x) !== null) return [];
  const first = withPromotion(state, from, { x: from.x, y: next }, color);
  if (from.y !== home || next + dy < 0 || next + dy >= state.height) return first;
  return state.board.at(next + dy)?.at(from.x) === null
    ? [...first, { from, to: { x: from.x, y: next + dy } }]
    : first;
}

/*** Identify legal pawn capture targets, including an available en passant square. */
function isPawnCapture(state: GameState, from: Position, to: Position, color: Color): boolean {
  const target = state.board.at(to.y)?.at(to.x);
  if (target) return target.color !== color && target.kind !== 'K';
  const adjacent = state.board.at(from.y)?.at(to.x);
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

/*** Choose leaper or slider directions without mixing ray traversal concerns. */
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
  return steps.flatMap(([dx, dy]) => rayMoves(state, from, piece, dx, dy, max));
}

/*** Stop a sliding ray at the first occupied or out-of-bounds square. */
function rayMoves(
  state: GameState,
  from: Position,
  piece: Piece,
  dx: number,
  dy: number,
  max: number,
): readonly Move[] {
  const moves: Move[] = [];
  for (let distance = 1; distance <= max; distance++) {
    const x = from.x + dx * distance;
    const y = from.y + dy * distance;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) break;
    const target = state.board.at(y)?.at(x);
    if (target?.color === piece.color || target?.kind === 'K') break;
    moves.push({ from, to: { x, y } });
    if (target) break;
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
  const rights = color === 'w' ? state.castling.w : state.castling.b;
  if (!(side === 'K' ? rights.K : rights.Q)) return [];
  const rookX = side === 'K' ? state.width - 1 : 0;
  const dx = side === 'K' ? 1 : -1;
  const to = { x: from.x + dx * 2, y: from.y };
  if (to.x < 0 || to.x >= state.width || Math.abs(rookX - from.x) < 3) return [];
  const rook = state.board.at(from.y)?.at(rookX);
  if (rook?.kind !== 'R' || rook.color !== color) return [];
  if (!castlingPathClear(state, from, to, rookX, color)) return [];
  return [{ from, to, castle: side }];
}

/*** Verify empty castling squares and absence of enemy attacks on king transit. */
function castlingPathClear(
  state: GameState,
  from: Position,
  to: Position,
  rookX: number,
  color: Color,
): boolean {
  const dx = to.x > from.x ? 1 : -1;
  const path = Array.from(
    { length: Math.abs(rookX - from.x) - 1 },
    (_, i) => from.x + dx * (i + 1),
  );
  if (!path.every((x) => state.board.at(from.y)?.at(x) === null)) return false;
  const enemy = color === 'w' ? 'b' : 'w';
  return ![from.x + dx, to.x].some((x) => isSquareAttacked(state.board, { x, y: from.y }, enemy));
}

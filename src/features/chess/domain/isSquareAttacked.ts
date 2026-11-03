import type { Board, Color, Piece, Position } from '../../../types/chess.ts';

/*** Determine whether any enemy piece attacks a square, regardless of its own king's safety. */
export function isSquareAttacked(board: Board, target: Position, attacker: Color): boolean {
  return board.some((row, y) => row.some((piece, x) =>
    piece?.color === attacker && pieceAttacks(board, piece, { x, y }, target),
  ));
}

/*** Check the attack shape for one piece type. */
function pieceAttacks(board: Board, piece: Piece, from: Position, target: Position): boolean {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (piece.kind === 'P') return ax === 1 && dy === (piece.color === 'w' ? -1 : 1);
  if (piece.kind === 'N') return (ax === 1 && ay === 2) || (ax === 2 && ay === 1);
  if (piece.kind === 'K') return Math.max(ax, ay) === 1;
  return slidingAttacks(board, piece, from, target);
}

/*** Verify diagonal or orthogonal ray attacks with no occupied intermediate square. */
function slidingAttacks(board: Board, piece: Piece, from: Position, target: Position): boolean {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const straight = (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0);
  const diagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0;
  const compatible = { P: false, N: false, K: false, R: straight, B: diagonal, Q: straight || diagonal }[piece.kind];
  if (!compatible) return false;
  return Array.from({ length: Math.max(Math.abs(dx), Math.abs(dy)) - 1 }, (_, index) => index + 1)
    .every(step => board[from.y + Math.sign(dy) * step]?.[from.x + Math.sign(dx) * step] == null);
}

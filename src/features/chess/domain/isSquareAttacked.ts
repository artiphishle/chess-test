import type { Board, Color, Position } from '../../../types/chess.ts';

/*** Determine whether a side attacks a square, independently of its own king's safety. */
export function isSquareAttacked(board: Board, target: Position, attacker: Color): boolean {
  return board.some((row, y) => row.some((piece, x) => {
    if (piece?.color !== attacker) return false;
    const dx = target.x - x;
    const dy = target.y - y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (piece.kind === 'P') return ax === 1 && dy === (attacker === 'w' ? -1 : 1);
    if (piece.kind === 'N') return (ax === 1 && ay === 2) || (ax === 2 && ay === 1);
    if (piece.kind === 'K') return Math.max(ax, ay) === 1;
    const straight = (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0);
    const diagonal = ax === ay && ax !== 0;
    if (!((piece.kind === 'R' && straight) || (piece.kind === 'B' && diagonal) || (piece.kind === 'Q' && (straight || diagonal)))) return false;
    const steps = Math.max(ax, ay);
    return Array.from({ length: steps - 1 }, (_, i) => i + 1).every(step =>
      board[y + Math.sign(dy) * step]?.[x + Math.sign(dx) * step] == null,
    );
  }));
}

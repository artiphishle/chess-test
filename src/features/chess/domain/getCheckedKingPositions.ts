import type { Board, Position } from '../../../types/chess.ts';
import { isSquareAttacked } from './isSquareAttacked.ts';

/*** Locate every attacked king, including multiple kings on custom rectangular boards. */
export function getCheckedKingPositions(board: Board): readonly Position[] {
  return board.flatMap((row, y) =>
    row.flatMap((piece, x) => {
      if (piece?.kind !== 'K') return [];
      return isSquareAttacked(board, { x, y }, piece.color === 'w' ? 'b' : 'w')
        ? [{ x, y }]
        : [];
    }),
  );
}

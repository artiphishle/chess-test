import type { Cell, Color, PieceKind, Template } from '../../../types/chess.ts';

/*** Supply standard, configurable 10×13 choice-coins and a teaching endgame. */
export function createPresets(): readonly Template[] {
  const standard = createRanked('standard', 'Klassisch 8 × 8', 8, 8, [
    'R',
    'N',
    'B',
    'Q',
    'K',
    'B',
    'N',
    'R',
  ]);
  const wide = createRanked('coins-10x13', 'Choice Coins 10 × 13', 10, 13, [
    'R',
    'C',
    'C',
    'C',
    'Q',
    'K',
    'C',
    'C',
    'C',
    'R',
  ]);
  const endgame: Cell[][] = Array.from({ length: 8 }, () => Array<Cell>(8).fill(null));
  endgame[0]![4] = { color: 'b', kind: 'K' };
  endgame[7]![4] = { color: 'w', kind: 'K' };
  endgame[7]![1] = { color: 'w', kind: 'N' };
  endgame[7]![2] = { color: 'w', kind: 'B' };
  return [
    standard,
    wide,
    {
      id: 'endgame',
      name: 'Matttraining K + B + N',
      width: 8,
      height: 8,
      turn: 'random',
      cells: endgame,
    },
  ];
}

/*** Create symmetrical home ranks with fixed pawns and optional Knight/Bishop coins. */
function createRanked(
  id: string,
  name: string,
  width: number,
  height: number,
  back: readonly ('C' | PieceKind)[],
): Template {
  const cells: Cell[][] = Array.from({ length: height }, () => Array<Cell>(width).fill(null));
  for (const color of ['w', 'b'] as const) {
    const home = color === 'w' ? height - 1 : 0;
    const pawn = color === 'w' ? height - 2 : 1;
    for (let x = 0; x < width; x++) {
      cells[home]![x] =
        back[x] === 'C'
          ? { color, kind: 'coin', options: ['N', 'B'] }
          : { color, kind: back[x] as PieceKind };
      cells[pawn]![x] = { color, kind: 'P' };
    }
  }
  return { id, name, width, height, turn: 'random', cells };
}

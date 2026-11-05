import type { Cell, PieceKind } from '../../../types/chess.ts';

const kinds: readonly PieceKind[] = ['P', 'N', 'B', 'R', 'Q', 'K'];
const coinOptions: readonly (readonly PieceKind[])[] = [
  ['P', 'N', 'B', 'R', 'Q', 'K'],
  ['N', 'B'],
  ['R', 'Q'],
  ['N', 'B', 'R', 'Q'],
];

/*** Cycle fixed pieces on a tap, or toggle their side and coin mode on a hold. */
export function cycleEditorCell(cell: Cell, gesture: 'tap' | 'hold'): Cell {
  if (gesture === 'hold') {
    if (!cell) return { color: 'b', kind: 'P' };
    if (cell.kind === 'coin') return { color: 'w', kind: 'P' };
    return cell.color === 'w'
      ? { ...cell, color: 'b' }
      : { color: 'b', kind: 'coin', options: coinOptions[0]! };
  }
  if (!cell) return { color: 'w', kind: 'P' };
  if (cell.kind === 'coin') {
    const index = coinOptions.findIndex((options) => options.join() === cell.options.join());
    if (index === coinOptions.length - 1) {
      return { ...cell, color: cell.color === 'w' ? 'b' : 'w', options: coinOptions[0]! };
    }
    return { ...cell, options: coinOptions[Math.max(0, index + 1)]! };
  }
  const next = kinds.indexOf(cell.kind) + 1;
  return next < kinds.length ? { ...cell, kind: kinds[next]! } : null;
}

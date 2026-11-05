import type { Cell, PieceKind } from '../../../types/chess.ts';
import type { EditorMode } from '../../../types/editor.ts';

const kinds: readonly PieceKind[] = ['P', 'N', 'B', 'R', 'Q', 'K'];
const coinOptions: readonly (readonly PieceKind[])[] = [
  ['P', 'N', 'B', 'R', 'Q', 'K'],
  ['N', 'B'],
  ['R', 'Q'],
  ['N', 'B', 'R', 'Q'],
];

/*** Place in the selected editor mode; short taps never change mode or piece color. */
export function cycleEditorCell(cell: Cell, gesture: 'tap' | 'hold', mode: EditorMode): Cell {
  if (gesture === 'hold') {
    if (mode === 'coin') {
      return { color: cell?.color ?? 'b', kind: 'coin', options: coinOptions[0]! };
    }
    return { color: mode, kind: cell?.kind && cell.kind !== 'coin' ? cell.kind : 'P' };
  }
  if (mode === 'coin') {
    if (cell?.kind !== 'coin') {
      return { color: cell?.color ?? 'b', kind: 'coin', options: coinOptions[0]! };
    }
    const index = coinOptions.findIndex((options) => options.join() === cell.options.join());
    return { ...cell, options: coinOptions[(index + 1) % coinOptions.length]! };
  }
  if (!cell || cell.kind === 'coin' || cell.color !== mode) return { color: mode, kind: 'P' };
  const next = kinds.indexOf(cell.kind) + 1;
  return next < kinds.length ? { color: mode, kind: kinds[next]! } : null;
}

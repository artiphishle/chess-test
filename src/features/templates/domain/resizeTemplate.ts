import type { Cell, Color, PieceKind, Template } from '../../../types/chess.ts';
import { BOARD_DIMENSIONS } from '../constants/boardDimensions.ts';

/*** Resize a configured board while preserving anchored home ranks and complete pawn lines. */
export function resizeTemplate(template: Template, width: number, height: number): Template {
  if (
    !Number.isInteger(width) || !Number.isInteger(height) ||
    width < BOARD_DIMENSIONS.min || width > BOARD_DIMENSIONS.max ||
    height < BOARD_DIMENSIONS.min || height > BOARD_DIMENSIONS.max
  ) return template;
  if (width === template.width && height === template.height) return template;

  const oldBack = template.cells[template.height - 1];
  const oldPawn = template.cells[template.height - 2];
  const whiteBack = oldBack && isHomeRank(oldBack, 'w') ? oldBack : null;
  const whitePawn = oldPawn && isPawnLine(oldPawn, 'w') ? oldPawn : null;
  const rows = Array.from({ length: height }, (_, y) => {
    const anchored = (whiteBack && y === template.height - 1) ||
      (whitePawn && y === template.height - 2);
    const source = anchored ? undefined : template.cells[y];
    return source ? resizeRank(source, width) : Array<Cell>(width).fill(null);
  });
  if (whitePawn && height >= 3) rows[height - 2] = resizeRank(whitePawn, width);
  if (whiteBack) rows[height - 1] = resizeRank(whiteBack, width);
  return { ...template, width, height, cells: rows };
}

/*** Keep complete pawn lines filled after a horizontal board resize. */
function isPawnLine(row: readonly Cell[], color: Color): boolean {
  return row.length > 0 && row.every((cell) => cell?.kind === 'P' && cell.color === color);
}

/*** Recognize a conventional home rank without rewriting custom chess layouts. */
function isHomeRank(row: readonly Cell[], color: Color): boolean {
  if (row.length < 4) return false;
  if (row[0]?.kind !== 'R' || row.at(-1)?.kind !== 'R') return false;
  if (row[0].color !== color || row.at(-1)?.color !== color) return false;
  const queen = row.findIndex((cell) => cell?.kind === 'Q' && cell.color === color);
  const king = row.findIndex((cell) => cell?.kind === 'K' && cell.color === color);
  return queen > 0 && king === queen + 1 &&
    row.every((cell) => cell !== null && cell.color === color);
}

/*** Preserve ordinary cells; reflow only pawn lines and recognizable home ranks. */
function resizeRank(row: readonly Cell[], width: number): Cell[] {
  if (isPawnLine(row, 'w') || isPawnLine(row, 'b')) {
    return Array.from({ length: width }, () => row[0]!);
  }
  const color = row[0]?.color;
  if (color && isHomeRank(row, color)) return resizeHomeRank(row, width, color);
  return Array.from({ length: width }, (_, x) => row[x] ?? null);
}

/*** Anchor the rooks to both edges and grow/shrink the minor-piece flanks at the royal pair. */
function resizeHomeRank(row: readonly Cell[], width: number, color: Color): Cell[] {
  const rook: Cell = { color, kind: 'R' };
  const queen: Cell = { color, kind: 'Q' };
  const king: Cell = { color, kind: 'K' };
  if (width === 2) return [rook, rook];
  if (width === 3) return [rook, king, rook];
  const qi = row.findIndex((cell) => cell?.kind === 'Q' && cell.color === color);
  const ki = qi + 1;
  const slots = width - 4;
  const left = resizeFlank(row.slice(1, qi), Math.ceil(slots / 2), color, 'left');
  const right = resizeFlank(row.slice(ki + 1, -1), Math.floor(slots / 2), color, 'right');
  return [rook, ...left, queen, king, ...right, rook];
}

/*** Extend from the royal side with alternating knights and bishops, retaining original coins. */
function resizeFlank(
  cells: readonly Cell[],
  count: number,
  color: Color,
  side: 'left' | 'right',
): Cell[] {
  const kept = side === 'left' ? cells.slice(0, count) : cells.slice(-count || cells.length);
  if (count === 0) return [];
  if (kept.length >= count) return [...kept];
  const extra = Array.from({ length: count - kept.length }, (_, i): Cell => {
    const anchor = side === 'left' ? kept.at(-1) : kept[0];
    if (anchor?.kind === 'coin') return anchor;
    const previous = i === 0 ? anchor : null;
    const last = previous?.kind === 'N' || previous?.kind === 'B'
      ? previous.kind
      : i % 2 === 0 ? 'B' : 'N';
    const kind: PieceKind = last === 'B' ? 'N' : 'B';
    return { color, kind };
  });
  return side === 'left' ? [...kept, ...extra] : [...extra.reverse(), ...kept];
}

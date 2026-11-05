import type { Cell, Color, PieceKind, Template } from '../../../types/chess.ts';
import { BOARD_DIMENSIONS } from '../constants/boardDimensions.ts';

const colors: readonly string[] = ['w', 'b'];
const kinds: readonly string[] = ['P', 'N', 'B', 'R', 'Q', 'K'];

/*** Validate a complete untrusted starting configuration before accepting it for matchmaking. */
export function validateTemplate(value: unknown): Template {
  if (!isRecord(value)) throw new Error('Invalid template');
  const { width, height, turn, name, id, cells } = value;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    Number(width) < BOARD_DIMENSIONS.min ||
    Number(height) < BOARD_DIMENSIONS.min ||
    Number(width) > BOARD_DIMENSIONS.max ||
    Number(height) > BOARD_DIMENSIONS.max
  )
    throw new Error(
      `Board must be between ${BOARD_DIMENSIONS.min} × ${BOARD_DIMENSIONS.min} and ${BOARD_DIMENSIONS.max} × ${BOARD_DIMENSIONS.max}`,
    );
  if (
    typeof id !== 'string' ||
    !id ||
    id.length > 100 ||
    typeof name !== 'string' ||
    !name ||
    name.length > 100
  )
    throw new Error('Invalid template identity');
  if (![...colors, 'random'].includes(String(turn))) throw new Error('Invalid side to move');
  if (
    !Array.isArray(cells) ||
    cells.length !== height ||
    !cells.every((row) => Array.isArray(row) && row.length === width && row.every(isCell))
  )
    throw new Error('Invalid board cells');
  return structuredClone(value) as Template;
}

/*** Check a supplied cell, rejecting unrelated object keys and invalid coin options. */
function isCell(value: unknown): value is Cell {
  if (value === null) return true;
  if (!isRecord(value) || !colors.includes(String(value.color))) return false;
  if (value.kind === 'coin')
    return (
      Object.keys(value).sort().join(',') === 'color,kind,options' &&
      Array.isArray(value.options) &&
      value.options.length >= 1 &&
      value.options.length <= 6 &&
      new Set(value.options).size === value.options.length &&
      value.options.every((kind) => kinds.includes(String(kind)))
    );
  return Object.keys(value).sort().join(',') === 'color,kind' && kinds.includes(String(value.kind));
}

/*** Distinguish JSON record data from arrays and null. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import type { PieceKind } from '../../../types/chess.ts';

/*** Resolve an abbreviated SAN piece and target square for nonstandard board dimensions. */
export function parseCheatPlacement(notation: unknown, width: number, height: number) {
  if (typeof notation !== 'string' || notation.length > 12) throw new Error('Invalid cheat SAN');
  const san = /^([KQRBN])?(?:[a-x1-9])?x?([a-x])(2[0-4]|1[0-9]|[1-9])[+#]?$/.exec(notation.trim());
  if (!san) throw new Error('Invalid cheat SAN');
  const [, symbol] = san;
  const kind: PieceKind =
    symbol === 'K'
      ? 'K'
      : symbol === 'Q'
        ? 'Q'
        : symbol === 'R'
          ? 'R'
          : symbol === 'B'
            ? 'B'
            : symbol === 'N'
              ? 'N'
              : 'P';
  const x = san[2].charCodeAt(0) - 97;
  const y = height - Number(san[3]);
  if (x >= width || y < 0 || y >= height) throw new Error('Cheat square outside board');
  return { x, y, kind };
}

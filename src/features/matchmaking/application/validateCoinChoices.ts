import type { Color, PieceKind, Template } from '../../../types/chess.ts';

/*** Validate exact owner-only coin assignments before locking setup. */
export function validateCoinChoices(
  template: Template,
  color: Color,
  value: unknown,
): Record<string, PieceKind> {
  if (!isRecord(value)) throw new Error('Invalid coin choices');
  const submitted = Object.entries(value);
  const required = template.cells.flatMap((row, y) =>
    row.flatMap((cell, x) =>
      cell?.kind === 'coin' && cell.color === color
        ? [{ key: `${x}:${y}`, options: cell.options }]
        : [],
    ),
  );
  if (submitted.length !== required.length) throw new Error('Incomplete coin choices');
  return Object.fromEntries(required.map(({ key, options }) => {
    const kind = submitted.find(([id]) => id === key)?.[1];
    const allowed = options.find((option) => option === kind);
    if (!allowed) throw new Error('Choice not allowed');
    return [key, allowed];
  }));
}

/*** Restrict untrusted JSON choice payloads to plain key-value objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

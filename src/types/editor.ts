import type { Color, PieceKind } from './chess.ts';

export type EditorPalette =
  | Readonly<{ type: 'erase' }>
  | Readonly<{ type: 'piece'; color: Color; kind: PieceKind }>
  | Readonly<{ type: 'coin'; color: Color; options: readonly PieceKind[] }>;

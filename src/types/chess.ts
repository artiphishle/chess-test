export type Color = 'w' | 'b';
export type PieceKind = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';
export type Piece = Readonly<{ kind: PieceKind; color: Color }>;
type Coin = Readonly<{ kind: 'coin'; color: Color; options: readonly PieceKind[] }>;
export type Cell = Piece | Coin | null;
export type Position = Readonly<{ x: number; y: number }>;
export type Template = Readonly<{
  id: string;
  name: string;
  width: number;
  height: number;
  turn: Color;
  cells: readonly (readonly Cell[])[];
}>;
type Rights = Readonly<{ K: boolean; Q: boolean }>;
export type Castling = Readonly<{ w: Rights; b: Rights }>;
export type Move = Readonly<{
  from: Position;
  to: Position;
  promotion?: 'N' | 'B' | 'R' | 'Q';
  castle?: 'K' | 'Q';
}>;
export type Board = readonly (readonly (Piece | null)[])[];
export type GameState = Readonly<{
  board: Board;
  width: number;
  height: number;
  turn: Color;
  castling: Castling;
  enPassant: Position | null;
  halfmove: number;
  history: readonly string[];
}>;
export type Result = Readonly<{
  winner: Color | null;
  reason: 'checkmate' | 'stalemate' | 'fifty-moves' | 'threefold' | 'insufficient-material';
}>;

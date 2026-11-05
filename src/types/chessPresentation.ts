/*** Keep local chess presentation preferences separate from server-authoritative game configuration. */
export type PieceSet = 'chessnut' | 'alpha' | 'companion' | 'cburnett' | 'merida' | 'staunty' | 'fantasy' | 'spatial';

export interface PieceSetSettings {
  readonly pieceSet: PieceSet;
  readonly selectPieceSet: (next: PieceSet) => void;
}

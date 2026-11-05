import type {
  Board,
  Castling,
  Color,
  GameState,
  Piece,
  PieceKind,
  Template,
} from '../../../types/chess.ts';
import { stateSignature } from './stateSignature.ts';

/*** Resolve all choice coins into immutable starting pieces once both players are ready. */
export function createGameState(
  template: Template,
  choices: Readonly<Record<Color, Readonly<Record<string, PieceKind>>>>,
  randomTurn: Color = 'w',
): GameState {
  const board: Board = template.cells.map((row, y) =>
    row.map((cell, x): Piece | null => {
      if (!cell) return null;
      if (cell.kind !== 'coin') return cell;
      const available = cell.color === 'w' ? choices.w : choices.b;
      const kind = Object.entries(available).find(([key]) => key === `${x}:${y}`)?.[1];
      if (!kind || !cell.options.includes(kind))
        throw new Error('Unresolved or invalid choice coin');
      return { color: cell.color, kind };
    }),
  );
  const rights = (color: Color) => {
    const y = color === 'w' ? template.height - 1 : 0;
    const row = board.at(y) ?? [];
    const kingCount = row.filter((piece) => piece?.color === color && piece.kind === 'K').length;
    return {
      K:
        kingCount === 1 &&
        row.at(template.width - 1)?.color === color &&
        row.at(template.width - 1)?.kind === 'R',
      Q: kingCount === 1 && row.at(0)?.color === color && row.at(0)?.kind === 'R',
    };
  };
  const castling: Castling = { w: rights('w'), b: rights('b') };
  const state: GameState = {
    board,
    width: template.width,
    height: template.height,
    turn: template.turn === 'random' ? randomTurn : template.turn,
    castling,
    enPassant: null,
    halfmove: 0,
    history: [],
  };
  return { ...state, history: [stateSignature(state)] };
}

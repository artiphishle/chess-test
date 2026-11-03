'use client';

import type { Cell, Position } from '../../../../types/chess.ts';

interface Props {
  readonly cells: readonly (readonly Cell[])[];
  readonly width: number;
  readonly height: number;
  readonly flipped?: boolean;
  readonly selected?: Position | null;
  readonly hints?: readonly Position[];
  readonly disabled?: boolean;
  readonly onSquare: (position: Position) => void;
}

/*** Render accessible rectangular chess grids with optional black orientation. */
export function ChessBoard({ cells, width, height, flipped = false, selected, hints = [], disabled = false, onSquare }: Props) {
  const rows = Array.from({ length: height }, (_, index) => flipped ? height - 1 - index : index);
  const cols = Array.from({ length: width }, (_, index) => flipped ? width - 1 - index : index);
  return <div className="board-scroll"><div className="chess-board" role="grid" aria-label={`${width} mal ${height} Schachbrett`}
    style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`, width: `max(100%, ${width * 36}px)`, maxWidth: `${width * 68}px` }}>
    {rows.flatMap(y => cols.map(x => <Square key={`${x}:${y}`} cell={cells.at(y)?.at(x) ?? null}
      position={{ x, y }} selected={selected} hinted={hints.some(target => target.x === x && target.y === y)}
      disabled={disabled} onSquare={onSquare} />))}
  </div></div>;
}

interface SquareProps {
  readonly cell: Cell;
  readonly position: Position;
  readonly selected?: Position | null;
  readonly hinted: boolean;
  readonly disabled: boolean;
  readonly onSquare: (position: Position) => void;
}

/*** Preserve square accessibility while distinguishing coins from resolved pieces. */
function Square({ cell, position, selected, hinted, disabled, onSquare }: SquareProps) {
  const { x, y } = position;
  const active = selected?.x === x && selected.y === y;
  const label = cell?.kind === 'coin' ? `Choice Coin ${cell.options.join('/')}`
    : cell ? `${cell.color === 'w' ? 'Weiss' : 'Schwarz'} ${cell.kind}` : 'leer';
  return <button type="button" aria-label={`Feld ${x + 1},${y + 1}: ${label}`} aria-pressed={active}
    className={`square ${(x + y) % 2 === 0 ? 'light' : 'dark'}${active ? ' selected' : ''}${hinted ? ' legal' : ''}`}
    disabled={disabled} onClick={() => onSquare(position)}>
    {cell?.kind === 'coin' ? <span className="coin" title={cell.options.join('/')}>C</span>
      : cell ? <span className={`chess-piece ${cell.color === 'w' ? 'white-piece' : 'black-piece'}`}>{pieceGlyph(cell)}</span> : null}
    {hinted ? <span className="legal-dot" /> : null}
  </button>;
}

/*** Resolve the symbolic chess piece without computed object lookups. */
function pieceGlyph(piece: Exclude<Cell, null | { kind: 'coin' }>): string {
  const white = piece.color === 'w';
  switch (piece.kind) {
    case 'K': return white ? '♔' : '♚';
    case 'Q': return white ? '♕' : '♛';
    case 'R': return white ? '♖' : '♜';
    case 'B': return white ? '♗' : '♝';
    case 'N': return white ? '♘' : '♞';
    case 'P': return white ? '♙' : '♟';
  }
}

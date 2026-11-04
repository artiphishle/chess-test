'use client';

import type { Cell, Position } from '../../../../types/chess.ts';
import { ChessPiece } from './ChessPiece.tsx';

interface Props {
  readonly cells: readonly (readonly Cell[])[];
  readonly width: number;
  readonly height: number;
  readonly flipped?: boolean;
  readonly selected?: Position | null;
  readonly hints?: readonly Position[];
  readonly checkedKings?: readonly Position[];
  readonly disabled?: boolean;
  readonly onSquare: (position: Position) => void;
}

/*** Render accessible rectangular chess grids with optional black orientation. */
export function ChessBoard({
  cells,
  width,
  height,
  flipped = false,
  selected,
  hints = [],
  checkedKings = [],
  disabled = false,
  onSquare,
}: Props) {
  const rows = Array.from({ length: height }, (_, index) => (flipped ? height - 1 - index : index));
  const cols = Array.from({ length: width }, (_, index) => (flipped ? width - 1 - index : index));
  return (
    <div className="board-scroll">
      <div
        className="chess-board"
        role="grid"
        aria-label={`${width} mal ${height} Schachbrett`}
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
          width: `max(100%, ${width * 40}px)`,
          maxWidth: `${width * 68}px`,
        }}
      >
        {rows.flatMap((y) =>
          cols.map((x) => (
            <Square
              key={`${x}:${y}`}
              cell={cells.at(y)?.at(x) ?? null}
              position={{ x, y }}
              selected={selected}
              hinted={hints.some((target) => target.x === x && target.y === y)}
              checked={checkedKings.some((target) => target.x === x && target.y === y)}
              disabled={disabled}
              onSquare={onSquare}
            />
          )),
        )}
      </div>
    </div>
  );
}

interface SquareProps {
  readonly cell: Cell;
  readonly position: Position;
  readonly selected?: Position | null;
  readonly hinted: boolean;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onSquare: (position: Position) => void;
}

/*** Preserve square accessibility while distinguishing coins from resolved pieces. */
function Square({ cell, position, selected, hinted, checked, disabled, onSquare }: SquareProps) {
  const { x, y } = position;
  const active = selected?.x === x && selected.y === y;
  const label =
    cell?.kind === 'coin'
      ? `Choice Coin ${cell.options.join('/')}`
      : cell
        ? `${cell.color === 'w' ? 'Weiss' : 'Schwarz'} ${cell.kind}`
        : 'leer';
  return (
    <button
      type="button"
      aria-label={`Feld ${x + 1},${y + 1}: ${label}${checked ? ', im Schach' : ''}`}
      aria-pressed={active}
      className={`square ${(x + y) % 2 === 0 ? 'light' : 'dark'}${active ? ' selected' : ''}${hinted ? ' legal' : ''}${checked ? ' in-check' : ''}`}
      disabled={disabled}
      onClick={() => onSquare(position)}
    >
      {cell?.kind === 'coin' ? (
        <span className="coin" title={cell.options.join('/')}>
          C
        </span>
      ) : cell ? (
        <ChessPiece piece={cell} />
      ) : null}
      {hinted ? <span className="legal-dot" /> : null}
    </button>
  );
}

'use client';

import type { Cell, Position } from '../../../../types/chess.ts';
import { ChessPiece } from './ChessPiece.tsx';
import { useSquareGesture } from './useSquareGesture.ts';

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
  readonly onSquareLong?: (position: Position) => void;
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
  onSquareLong,
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
              onSquareLong={onSquareLong}
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
  readonly onSquareLong?: (position: Position) => void;
}

/*** Render one square and delegate gesture timing to the interaction hook. */
function Square({
  cell,
  position,
  selected,
  hinted,
  checked,
  disabled,
  onSquare,
  onSquareLong,
}: SquareProps) {
  const active = selected?.x === position.x && selected.y === position.y;
  const presentation = getSquarePresentation({ cell, position, active, hinted, checked });
  const gesture = useSquareGesture(position, onSquare, onSquareLong);
  return (
    <button
      type="button"
      aria-label={presentation.label}
      aria-pressed={active}
      className={presentation.className}
      disabled={disabled}
      {...gesture}
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

interface SquarePresentation {
  readonly cell: Cell;
  readonly position: Position;
  readonly active: boolean;
  readonly hinted: boolean;
  readonly checked: boolean;
}

/*** Keep checked-king accessibility labels consistent with the square's visual status. */
function getSquarePresentation({ cell, position, active, hinted, checked }: SquarePresentation) {
  const { x, y } = position;
  const pieceLabel =
    cell?.kind === 'coin'
      ? `Choice Coin ${cell.options.join('/')}`
      : cell
        ? `${cell.color === 'w' ? 'Weiss' : 'Schwarz'} ${cell.kind}`
        : 'leer';
  return {
    label: `Feld ${x + 1},${y + 1}: ${pieceLabel}${checked ? ', im Schach' : ''}`,
    className: `square ${(x + y) % 2 === 0 ? 'light' : 'dark'}${active ? ' selected' : ''}${hinted ? ' legal' : ''}${checked ? ' in-check' : ''}`,
  };
}

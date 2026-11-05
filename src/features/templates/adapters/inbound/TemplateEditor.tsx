'use client';

import type { Cell, Position, Template } from '../../../../types/chess.ts';
import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import { BOARD_DIMENSIONS } from '../../constants/boardDimensions.ts';
import { cycleEditorCell } from '../../domain/cycleEditorCell.ts';

interface Props {
  readonly template: Template;
  readonly templates: readonly Template[];
  readonly onSelect: (template: Template) => void;
  readonly onUpdate: (template: Template) => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (id: string) => void;
}

/*** Edit presets, board dimensions, turns and pieces directly around the chessboard. */
export function TemplateEditor({ template, templates, onSelect, onUpdate, onSave, onDelete }: Props) {
  const resize = (width: number, height: number): void => {
    if (width < BOARD_DIMENSIONS.min || height < BOARD_DIMENSIONS.min) return;
    if (width > BOARD_DIMENSIONS.max || height > BOARD_DIMENSIONS.max) return;
    onUpdate({
      ...template,
      width,
      height,
      cells: Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => template.cells[y]?.[x] ?? null),
      ),
    });
  };
  const place = (position: Position, gesture: 'tap' | 'hold'): void => {
    onUpdate({
      ...template,
      cells: template.cells.map((row, y) =>
        y === position.y
          ? row.map((cell, x) => (x === position.x ? cycleEditorCell(cell, gesture) : cell))
          : row,
      ),
    });
  };
  const blank = (): void => {
    onSelect({
      id: 'new',
      name: 'Eigenes Brett',
      width: 8,
      height: 8,
      turn: 'w',
      cells: Array.from({ length: 8 }, () => Array<Cell>(8).fill(null)),
    });
  };
  return (
    <section className="panel board-panel editor-board" aria-label="Brett konfigurieren">
      <div className="editor-toolbar">
        <label className="editor-preset">
          Vorlage
          <select
            value={templates.some((entry) => entry.id === template.id) ? template.id : 'new'}
            onChange={(event) => {
              if (event.target.value === 'new') blank();
              else {
                const found = templates.find((entry) => entry.id === event.target.value);
                if (found) onSelect(found);
              }
            }}
          >
            <option value="new">Eigenes Brett / 8 × 8</option>
            {templates.map((entry) => (
              <option value={entry.id} key={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div className="turn-picker" role="group" aria-label="Wer beginnt?">
          {([
            { value: 'w', label: '⚪', title: 'Weiss beginnt' },
            { value: 'random', label: '🎲', title: 'Zufälliger Beginn' },
            { value: 'b', label: '⚫', title: 'Schwarz beginnt' },
          ] as const).map((item) => (
            <button type="button" key={item.value} aria-pressed={template.turn === item.value}
              title={item.title} aria-label={item.title}
              onClick={() => onUpdate({ ...template, turn: item.value })}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="editor-resize" aria-label="Spalten einstellen">
        <button type="button" disabled={template.width <= BOARD_DIMENSIONS.min}
          aria-label="Spalte entfernen" onClick={() => resize(template.width - 1, template.height)}>−</button>
        <span>{template.width} Spalten</span>
        <button type="button" disabled={template.width >= BOARD_DIMENSIONS.max}
          aria-label="Spalte hinzufügen" onClick={() => resize(template.width + 1, template.height)}>+</button>
      </div>
      <div className="editor-board-and-rows">
        <ChessBoard cells={template.cells} width={template.width} height={template.height}
          onSquare={(position) => place(position, 'tap')}
          onSquareLong={(position) => place(position, 'hold')} />
        <div className="editor-resize vertical" aria-label="Reihen einstellen">
          <button type="button" disabled={template.height >= BOARD_DIMENSIONS.max}
            aria-label="Reihe hinzufügen" onClick={() => resize(template.width, template.height + 1)}>+</button>
          <span>{template.height} Reihen</span>
          <button type="button" disabled={template.height <= BOARD_DIMENSIONS.min}
            aria-label="Reihe entfernen" onClick={() => resize(template.width, template.height - 1)}>−</button>
        </div>
      </div>
      <p className="muted editor-help">
        Tippen: ♙ → ♘ → ♗ → ♖ → ♕ → ♔ → leer. Gedrückt halten: Weiss → Schwarz → Coin → Weiss.
        Coins per Tippen konfigurieren: Frei, Springer/Läufer, Turm/Dame und weitere Varianten.
        Shift + Enter funktioniert als Langdruck.
      </p>
      <details className="editor-save">
        <summary>Eigene Vorlage speichern</summary>
        <label className="field-label">Name
          <input maxLength={100} value={template.name}
            onChange={(event) => onUpdate({ ...template, name: event.target.value })} />
        </label>
        <div className="action-row">
          <button type="button" onClick={() => onSave(template.name.trim() || 'Eigenes Brett')}>Speichern</button>
          <button type="button" onClick={blank}>Leeres Brett</button>
          {templates.some((entry) => entry.id === template.id && !['standard', 'coins-10x13', 'endgame'].includes(entry.id)) ? (
            <button type="button" onClick={() => onDelete(template.id)}>Löschen</button>
          ) : null}
        </div>
      </details>
    </section>
  );
}

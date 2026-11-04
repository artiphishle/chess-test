'use client';

import { Button } from '@ankhorage/zora/web/button';
import type { Cell, Color, Template } from '../../../../types/chess.ts';
import { BOARD_DIMENSIONS, BOARD_DIMENSION_OPTIONS } from '../../constants/boardDimensions.ts';

interface Props {
  readonly template: Template;
  readonly templates: readonly Template[];
  readonly name: string;
  readonly onName: (name: string) => void;
  readonly onSelect: (template: Template) => void;
  readonly onUpdate: (template: Template) => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (id: string) => void;
}

/*** Edit board dimensions and maintain the current saved or unsaved template. */
export function EditorSettings({
  template,
  templates,
  name,
  onName,
  onSelect,
  onUpdate,
  onSave,
  onDelete,
}: Props) {
  const resize = (width: number, height: number): void => {
    if (!Number.isInteger(width) || !Number.isInteger(height)) return;
    if (
      width < BOARD_DIMENSIONS.min ||
      height < BOARD_DIMENSIONS.min ||
      width > BOARD_DIMENSIONS.max ||
      height > BOARD_DIMENSIONS.max
    )
      return;
    onUpdate({
      ...template,
      width,
      height,
      cells: Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => template.cells[y]?.[x] ?? null),
      ),
    });
  };
  const blank = (): void => {
    const next: Template = {
      id: 'new',
      name: 'Neue Vorlage',
      width: template.width,
      height: template.height,
      turn: 'w',
      cells: Array.from({ length: template.height }, () => Array<Cell>(template.width).fill(null)),
    };
    onName(next.name);
    onSelect(next);
  };
  return (
    <>
      <h2>Konfiguration</h2>
      <label className="field-label">
        Vorlage
        <select
          value={templates.some((entry) => entry.id === template.id) ? template.id : ''}
          onChange={(event) => {
            const found = templates.find((item) => item.id === event.target.value);
            if (found) {
              onName(found.name);
              onSelect(found);
            }
          }}
        >
          <option value="" disabled>
            Eigene Änderungen
          </option>
          {templates.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <div className="pair">
        <label className="field-label">
          Breite
          <select
            value={template.width}
            onChange={(event) => resize(Number(event.target.value), template.height)}
          >
            {BOARD_DIMENSION_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Höhe
          <select
            value={template.height}
            onChange={(event) => resize(template.width, Number(event.target.value))}
          >
            {BOARD_DIMENSION_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field-label">
        Zugbeginn
        <select
          value={template.turn}
          onChange={(event) => onUpdate({ ...template, turn: event.target.value as Color })}
        >
          <option value="w">Weiss</option>
          <option value="b">Schwarz</option>
        </select>
      </label>
      <div className="section-separator" />
      <label className="field-label">
        Name der Vorlage
        <input
          maxLength={100}
          value={name}
          onChange={(event) => {
            onName(event.target.value);
            onUpdate({ ...template, name: event.target.value || template.name });
          }}
        />
      </label>
      <div className="action-row">
        <Button onPress={() => onSave(name.trim() || 'Eigene Vorlage')}>Vorlage speichern</Button>
        <Button variant="outline" onPress={blank}>
          Leeres Brett
        </Button>
      </div>
      {template.id !== 'new' &&
      !template.id.startsWith('coins-') &&
      !['standard', 'endgame'].includes(template.id) ? (
        <Button variant="ghost" onPress={() => onDelete(template.id)}>
          Eigene Vorlage löschen
        </Button>
      ) : null}
    </>
  );
}

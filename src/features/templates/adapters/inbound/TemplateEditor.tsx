'use client';

import { useState } from 'react';
import type { Cell, Position, Template } from '../../../../types/chess.ts';
import type { EditorPalette as Palette } from '../../../../types/editor.ts';
import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import { EditorPalette } from './EditorPalette.tsx';
import { EditorSettings } from './EditorSettings.tsx';

interface Props {
  readonly template: Template;
  readonly templates: readonly Template[];
  readonly onSelect: (template: Template) => void;
  readonly onUpdate: (template: Template) => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (id: string) => void;
}

/*** Compose independent configuration controls and an editable chessboard. */
export function TemplateEditor({ template, templates, onSelect, onUpdate, onSave, onDelete }: Props) {
  const [name, setName] = useState(template.name);
  const [palette, setPalette] = useState<Palette>({ type: 'piece', color: 'w', kind: 'P' });
  const place = ({ x, y }: Position): void => {
    const cell: Cell = palette.type === 'erase' ? null : palette.type === 'coin'
      ? { kind: 'coin', color: palette.color, options: [...palette.options] }
      : { kind: palette.kind, color: palette.color };
    onUpdate({ ...template, cells: template.cells.map((row, rank) => rank === y
      ? row.map((existing, file) => file === x ? cell : existing) : [...row]) });
  };
  return <div className="editor-layout">
    <section className="panel editor-controls">
      <EditorSettings template={template} templates={templates} name={name} onName={setName}
        onSelect={onSelect} onUpdate={onUpdate} onSave={onSave} onDelete={onDelete} />
      <div className="section-separator" />
      <EditorPalette active={palette} onSelect={setPalette} />
    </section>
    <section className="panel board-panel"><div className="panel-heading"><h2>Startaufstellung</h2><span>{template.width} × {template.height}</span></div>
      <ChessBoard cells={template.cells} width={template.width} height={template.height} onSquare={place} />
      <p className="muted">Feld anklicken, um die gewählte Figur oder einen Coin zu setzen. Jede Seite darf freie Figuren und Positionen haben.</p>
    </section>
  </div>;
}

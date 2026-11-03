'use client';

import type { TemplateLibrary } from './useTemplateLibrary.ts';

interface Props {
  readonly library: TemplateLibrary;
}

/*** Present saved chess scenarios as independently selectable templates. */
export function TemplatePicker({ library }: Props) {
  const { template, templates } = library;
  return (
    <aside className="panel side-panel">
      <h2>Spielvorlagen</h2>
      <p className="muted">Wähle ein Szenario oder erstelle eine eigene Aufstellung.</p>
      <div className="templates">
        {templates.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={`template-option${template.id === preset.id ? ' active' : ''}`}
            onClick={() => library.setTemplate(preset)}
          >
            <span className="template-symbol">
              {preset.width === 10 ? '◈' : preset.id === 'endgame' ? '♚' : '♜'}
            </span>
            <span>
              <strong>{preset.name}</strong>
              <small>
                {preset.width} × {preset.height} ·{' '}
                {preset.cells.flat().filter((cell) => cell?.kind === 'coin').length} Coins
              </small>
            </span>
            <span>›</span>
          </button>
        ))}
      </div>
      <div className="tip">
        <span>✦</span>
        <div>
          <strong>Choice Coins</strong>
          <p>
            Die beiden Spieler wählen ihre eigenen Figuren vor Beginn. Danach wird die Aufstellung
            gesperrt.
          </p>
        </div>
      </div>
    </aside>
  );
}

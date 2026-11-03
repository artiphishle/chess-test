'use client';

import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';

interface Props { readonly library: TemplateLibrary }

/*** Preview a selected template and its saved alternatives without joining a game. */
export function LobbyPreview({ library }: Props) {
  const { template, templates } = library;
  return <section className="lobby-layout">
    <div className="panel board-panel"><div className="panel-heading"><h2>Brettvorschau</h2><span>{template.name}</span></div>
      <ChessBoard cells={template.cells} width={template.width} height={template.height} onSquare={() => library.setEditing(true)} />
    </div>
    <aside className="panel side-panel"><h2>Spielvorlagen</h2>
      <p className="muted">Wähle ein Szenario oder erstelle eine eigene Aufstellung.</p>
      <div className="templates">{templates.map(preset => <button type="button" key={preset.id}
        className={`template-option${template.id === preset.id ? ' active' : ''}`} onClick={() => library.setTemplate(preset)}>
        <span className="template-symbol">{preset.width === 10 ? '◈' : preset.id === 'endgame' ? '♚' : '♜'}</span>
        <span><strong>{preset.name}</strong><small>{preset.width} × {preset.height} · {preset.cells.flat().filter(cell => cell?.kind === 'coin').length} Coins</small></span>
        <span>›</span>
      </button>)}</div>
      <div className="tip"><span>✦</span><div><strong>Choice Coins</strong>
        <p>Die beiden Spieler wählen ihre eigenen Figuren vor Beginn. Danach wird die Aufstellung gesperrt.</p>
      </div></div>
    </aside>
  </section>;
}

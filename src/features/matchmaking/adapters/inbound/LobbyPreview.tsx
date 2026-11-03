'use client';

import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import { TemplatePicker } from '../../../templates/adapters/inbound/TemplatePicker.tsx';
import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';

interface Props {
  readonly library: TemplateLibrary;
}

/*** Preview the current template without starting or locking a game. */
export function LobbyPreview({ library }: Props) {
  const { template } = library;
  return (
    <section className="lobby-layout">
      <div className="panel board-panel">
        <div className="panel-heading">
          <h2>Brettvorschau</h2>
          <span>{template.name}</span>
        </div>
        <ChessBoard
          cells={template.cells}
          width={template.width}
          height={template.height}
          onSquare={() => library.setEditing(true)}
        />
      </div>
      <TemplatePicker library={library} />
    </section>
  );
}

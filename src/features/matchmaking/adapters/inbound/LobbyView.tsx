'use client';

import { TemplateEditor } from '../../../templates/adapters/inbound/TemplateEditor.tsx';
import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { LobbyHero } from './LobbyHero.tsx';
import { OpenMatches } from './OpenMatches.tsx';
import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly library: TemplateLibrary;
  readonly busy: boolean;
  readonly onPlay: () => void;
  readonly lobby: MatchSession['lobby'];
  readonly mine: MatchSession['matches'];
  readonly onCancel: (matchId: string) => void;
  readonly onJoin: (matchId: string) => void;
}

/*** Keep the editable board visible above the public multi-match lobby. */
export function LobbyView({ library, busy, onPlay, lobby, mine, onJoin, onCancel }: Props) {
  return (
    <div className="lobby-layout">
      <div className="lobby-board-column">
        <TemplateEditor
          template={library.template}
          templates={library.templates}
          onSelect={library.setTemplate}
          onUpdate={library.setTemplate}
          onSave={library.save}
          onDelete={library.remove}
        />
      </div>
      <aside className="lobby-rail" aria-label="Lobby">
        <LobbyHero busy={busy} onPlay={onPlay} />
        <OpenMatches matches={lobby} mine={mine} busy={busy} onJoin={onJoin} onCancel={onCancel} />
      </aside>
    </div>
  );
}

'use client';

import { TemplateEditor } from '../../../templates/adapters/inbound/TemplateEditor.tsx';
import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import type { LobbyMatch } from '../../application/createGameService.ts';
import { LobbyHero } from './LobbyHero.tsx';
import { OpenMatches } from './OpenMatches.tsx';
import { LobbyPreview } from './LobbyPreview.tsx';

interface Props {
  readonly library: TemplateLibrary;
  readonly busy: boolean;
  readonly onPlay: () => void;
  readonly lobby: readonly LobbyMatch[];
  readonly onJoin: (matchId: string) => void;
}

/*** Present a lobby board preview or the unlocked template editor before joining. */
export function LobbyView({ library, busy, onPlay, lobby, onJoin }: Props) {
  return (
    <>
      <LobbyHero library={library} busy={busy} onPlay={onPlay} />
      <OpenMatches matches={lobby} busy={busy} onJoin={onJoin} />
      {library.editing ? (
        <TemplateEditor
          template={library.template}
          templates={library.templates}
          onSelect={library.setTemplate}
          onUpdate={library.setTemplate}
          onSave={library.save}
          onDelete={library.remove}
        />
      ) : (
        <LobbyPreview library={library} />
      )}
    </>
  );
}

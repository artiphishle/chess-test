'use client';

import { TemplateEditor } from '../../../templates/adapters/inbound/TemplateEditor.tsx';
import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { LobbyHero } from './LobbyHero.tsx';
import { LobbyPreview } from './LobbyPreview.tsx';

interface Props {
  readonly library: TemplateLibrary;
  readonly busy: boolean;
  readonly onPlay: () => void;
}

/*** Present a lobby board preview or the unlocked template editor before joining. */
export function LobbyView({ library, busy, onPlay }: Props) {
  return (
    <>
      <LobbyHero library={library} busy={busy} onPlay={onPlay} />
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

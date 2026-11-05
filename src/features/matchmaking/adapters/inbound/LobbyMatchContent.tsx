'use client';

import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { getPlayerName } from './getPlayerName.ts';
import { LobbyView } from './LobbyView.tsx';
import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly session: MatchSession;
  readonly library: TemplateLibrary;
}

/*** Bind lobby offers to the current player identity without adding extra form controls. */
export function LobbyMatchContent({ session, library }: Props) {
  return (
    <LobbyView
      library={library}
      busy={session.busy}
      lobby={session.lobby}
      mine={session.matches.filter((match) => match.phase === 'waiting')}
      onCancel={(matchId) => {
        void session.act({ action: 'leave', matchId });
      }}
      onPlay={() => {
        void session.act({ action: 'create', template: library.template, name: getPlayerName() });
      }}
      onJoin={(matchId) => {
        void session.act({ action: 'join', matchId, name: getPlayerName() });
      }}
    />
  );
}

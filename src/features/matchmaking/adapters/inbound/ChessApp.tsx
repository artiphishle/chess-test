'use client';

import { ZoraProvider } from '@ankhorage/zora/web/runtime';

import { PieceSetProvider } from '../../../chess/adapters/inbound/PieceSetProvider.tsx';
import { useBoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { useTemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { ActiveCoinChoice } from './ActiveCoinChoice.tsx';
import { AppHeader } from './AppHeader.tsx';
import { LobbyView } from './LobbyView.tsx';
import { MatchTabs } from './MatchTabs.tsx';
import { MatchView } from './MatchView.tsx';
import { PromotionDialog } from './PromotionDialog.tsx';
import { useMatchSession } from './useMatchSession.ts';

/*** Compose the Ankhorage chess application from independent domain-facing UI features. */
export function ChessApp() {
  const session = useMatchSession();
  const library = useTemplateLibrary();
  return (
    <ZoraProvider theme={theme} initialMode="dark">
      <PieceSetProvider>
        <main className="app-shell">
          <AppHeader match={session.match} error={session.error} clearError={session.clearError} />
          <div className="page-content">
            <MatchTabs matches={session.matches} activeId={session.activeId} onSelect={session.selectMatch} />
            {session.match ? (
              <ActiveMatchContent key={session.match.id} session={session} />
            ) : (
              <LobbyView
                library={library}
                busy={session.busy}
                lobby={session.lobby}
                mine={session.matches.filter((match) => match.phase === 'waiting')}
                onCancel={(matchId) => {
                  void session.act({ action: 'leave', matchId });
                }}
                onPlay={() => {
                  void session.act({ action: 'create', template: library.template });
                }}
                onJoin={(matchId) => {
                  void session.act({ action: 'join', matchId });
                }}
              />
            )}
          </div>
          <footer>
            ANKHORAGE · CHESS TEST <span>Variable boards. Real chess rules.</span>
          </footer>
        </main>
      </PieceSetProvider>
    </ZoraProvider>
  );
}

/*** Reset transient board selection when switching between unrelated game tabs. */
function ActiveMatchContent({ session }: { readonly session: ReturnType<typeof useMatchSession> }) {
  const interaction = useBoardInteraction(session);
  const match = session.match;
  if (!match) return null;
  return (
    <>
      <MatchView session={session} interaction={interaction} />
      {match.phase === 'setup' ? (
        <ActiveCoinChoice match={match} interaction={interaction} busy={session.busy} />
      ) : null}
      <PromotionDialog interaction={interaction} />
    </>
  );
}

const theme = {
  id: 'chess-test',
  name: 'Chess Test',
  appCategory: 'developer_tools',
  primaryColor: '#b5e0ac',
  harmony: 'analogous',
} as const;

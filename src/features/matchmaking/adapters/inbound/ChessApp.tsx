'use client';

import { ZoraProvider } from '@ankhorage/zora/web/runtime';

import { PieceSetProvider } from '../../../chess/adapters/inbound/PieceSetProvider.tsx';
import { useBoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { useTemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { ActiveCoinChoice } from './ActiveCoinChoice.tsx';
import { AppHeader } from './AppHeader.tsx';
import { LobbyView } from './LobbyView.tsx';
import { MatchView } from './MatchView.tsx';
import { PromotionDialog } from './PromotionDialog.tsx';
import { ResultDialog } from './ResultDialog.tsx';
import { useMatchSession } from './useMatchSession.ts';

/*** Compose the Ankhorage chess application from independent domain-facing UI features. */
export function ChessApp() {
  const session = useMatchSession();
  const library = useTemplateLibrary();
  const interaction = useBoardInteraction(session);
  return (
    <ZoraProvider theme={theme} initialMode="dark">
      <PieceSetProvider>
        <main className="app-shell">
        <AppHeader match={session.match} error={session.error} clearError={session.clearError} />
        <div className="page-content">
          {session.match ? (
            <MatchView session={session} interaction={interaction} />
          ) : (
            <LobbyView
              library={library}
              busy={session.busy}
              onPlay={() => {
                void session.act({ action: 'join', template: library.template });
              }}
            />
          )}
        </div>
        {session.match?.phase === 'setup' ? (
          <ActiveCoinChoice match={session.match} interaction={interaction} busy={session.busy} />
        ) : null}
        <PromotionDialog interaction={interaction} />
        <ResultDialog session={session} />
        <footer>
          ANKHORAGE · CHESS TEST <span>Variable boards. Real chess rules.</span>
        </footer>
        </main>
      </PieceSetProvider>
    </ZoraProvider>
  );
}

const theme = {
  id: 'chess-test',
  name: 'Chess Test',
  appCategory: 'developer_tools',
  primaryColor: '#b5e0ac',
  harmony: 'analogous',
} as const;

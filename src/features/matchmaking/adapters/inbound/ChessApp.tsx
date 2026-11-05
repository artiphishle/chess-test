'use client';

import { ZoraProvider } from '@ankhorage/zora/web/runtime';
import { useCallback } from 'react';

import { PieceSetProvider } from '../../../chess/adapters/inbound/PieceSetProvider.tsx';
import { useBoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { useTemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { AppHeader } from './AppHeader.tsx';
import { LobbyMatchContent } from './LobbyMatchContent.tsx';
import { MatchTabs } from './MatchTabs.tsx';
import { MatchView } from './MatchView.tsx';
import { PromotionDialog } from './PromotionDialog.tsx';
import { sendGameCommandAsync } from './sendGameCommandAsync.ts';
import { useMatchSession } from './useMatchSession.ts';

/*** Compose the Ankhorage chess application from independent domain-facing UI features. */
export function ChessApp() {
  const session = useMatchSession();
  const library = useTemplateLibrary();
  const rename = useCallback((name: string) => {
    void sendGameCommandAsync({ action: 'rename', name }).catch(() => undefined);
  }, []);
  return (
    <ZoraProvider theme={theme} initialMode="dark">
      <PieceSetProvider>
        <main className="app-shell">
          <AppHeader
            match={session.match}
            error={session.error}
            clearError={session.clearError}
            onName={rename}
          />
          <div className="page-content">
            <MatchTabs
              matches={session.matches}
              activeId={session.activeId}
              onSelect={session.selectMatch}
            />
            {session.match ? (
              <ActiveMatchContent
                key={`${session.match.id}:${session.match.phase}`}
                session={session}
              />
            ) : (
              <LobbyMatchContent session={session} library={library} />
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
  const { match } = session;
  if (!match) return null;
  return (
    <>
      <MatchView session={session} interaction={interaction} />
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

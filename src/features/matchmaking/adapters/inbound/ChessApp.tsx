'use client';

import { ZoraProvider } from '@ankhorage/zora/web/runtime';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';

import { useBoardTheme } from '../../../branding/adapters/inbound/useBoardTheme.ts';
import { PieceSetProvider } from '../../../chess/adapters/inbound/PieceSetProvider.tsx';
import { useBoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { useTemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';
import { AppHeader } from './AppHeader.tsx';
import { CommandOverlay } from './CommandOverlay.tsx';
import { ConfirmResignDialog } from './ConfirmResignDialog.tsx';
import { LobbyMatchContent } from './LobbyMatchContent.tsx';
import { MatchTabs } from './MatchTabs.tsx';
import { MatchView } from './MatchView.tsx';
import { PromotionDialog } from './PromotionDialog.tsx';
import { sendGameCommandAsync } from './sendGameCommandAsync.ts';
import { useCommandController } from './useCommandController.ts';
import { useMatchSession } from './useMatchSession.ts';

/*** Compose the Ankhorage chess application from independent domain-facing UI features. */
export function ChessApp() {
  const { theme: boardTheme } = useBoardTheme();
  const session = useMatchSession();
  useBrandFavicon(boardTheme.icon);
  const library = useTemplateLibrary();
  const commands = useCommandController(session);
  const rename = useCallback((name: string) => {
    void sendGameCommandAsync({ action: 'rename', name }).catch(() => undefined);
  }, []);
  return (
    <ZoraProvider theme={{ ...theme, primaryColor: boardTheme.accent }} initialMode="dark">
      <PieceSetProvider>
        <main className="app-shell" data-brand-theme={boardTheme.id}>
          <AppHeader
            match={session.match}
            error={session.error}
            clearError={session.clearError}
            onName={rename}
            onCommands={commands.openCommands}
          />
          <div className="page-content">
            <CurrentMatch
              session={session}
              library={library}
              onResign={commands.requestResign}
            />
          </div>
          {commands.commandsOpen ? (
            <CommandOverlay onClose={commands.closeCommands} onSubmit={commands.submit} />
          ) : null}
          {commands.resigningId ? (
            <ConfirmResignDialog
              busy={session.busy}
              onCancel={commands.cancelResign}
              onConfirm={commands.confirmResign}
            />
          ) : null}
          <AppFooter />
        </main>
      </PieceSetProvider>
    </ZoraProvider>
  );
}

/*** Display lobby and active games under the same compact navigation strip. */
function CurrentMatch({
  session,
  library,
  onResign,
}: {
  readonly session: ReturnType<typeof useMatchSession>;
  readonly library: ReturnType<typeof useTemplateLibrary>;
  readonly onResign: (id: string) => void;
}) {
  return (
    <>
      <MatchTabs
        matches={session.matches}
        activeId={session.activeId}
        onSelect={session.selectMatch}
      />
      {session.match ? (
        <ActiveMatchContent
          key={`${session.match.id}:${session.match.phase}`}
          session={session}
          onResign={onResign}
        />
      ) : (
        <LobbyMatchContent session={session} library={library} />
      )}
    </>
  );
}

/*** Update the browser tab icon whenever the board's brand design changes. */
function useBrandFavicon(iconPath: string): void {
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) {
      icon.href = iconPath;
      return;
    }
    const next = document.createElement('link');
    next.rel = 'icon';
    next.href = iconPath;
    document.head.appendChild(next);
  }, [iconPath]);
}

/*** Reset transient board selection when switching between unrelated game tabs. */
function ActiveMatchContent({
  session,
  onResign,
}: {
  readonly session: ReturnType<typeof useMatchSession>;
  readonly onResign: (id: string) => void;
}) {
  const interaction = useBoardInteraction(session);
  const { match } = session;
  if (!match) return null;
  return (
    <>
      <MatchView session={session} interaction={interaction} onResign={() => onResign(match.id)} />
      <PromotionDialog interaction={interaction} />
    </>
  );
}

const theme = {
  id: 'grossmeister',
  name: 'GrossMeister',
  appCategory: 'developer_tools',
  primaryColor: '#ce1344',
  harmony: 'analogous',
} as const;

/*** Keep the application footer independent from interaction wiring. */
function AppFooter() {
  const { theme: boardTheme } = useBoardTheme();
  return (
    <footer className="brand-footer">
      <div className="footer-brand">
        <Image src={boardTheme.icon} width={42} height={42} alt="" aria-hidden="true" unoptimized />
        <span>© GrossMeister</span>
      </div>
      <span>Schach neu gedacht · grossmeister.ch (in Vorbereitung)</span>
    </footer>
  );
}

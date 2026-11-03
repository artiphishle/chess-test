'use client';

import { Button } from '@ankhorage/zora/web/button';
import type { MatchSession } from './useMatchSession.ts';
import { resultMessage } from './resultMessage.ts';

interface Props { readonly session: MatchSession }

/*** Offer an explicitly agreed rematch or return to unlocked configuration. */
export function FinishedSidebar({ session }: Props) {
  const match = session.match;
  if (!match) return null;
  return <><h2>{resultMessage(match)}</h2><p className="muted">Die Partie ist beendet. Rückkampf oder neue Suche?</p>
    {match.opponentPresent ? <Button disabled={match.rematch[match.color]} onPress={() => { void session.act({ action: 'rematch' }); }}>
      {match.rematch[match.color] ? 'Warte auf Gegner' : 'Rematch'}</Button> : <p className="muted">Dein Gegner hat die Partie verlassen.</p>}
    <Button variant="outline" onPress={() => { void session.leave(); }}>Zur Startseite</Button>
  </>;
}

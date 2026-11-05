'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly session: MatchSession;
  readonly onResign: () => void;
}

/*** Show turn feedback and allow a server-authorized resignation. */
export function PlayingSidebar({ session, onResign }: Props) {
  const { match } = session;
  if (!match) return null;
  return (
    <>
      <h2>Partie läuft</h2>
      <p className="muted">
        {match.state?.turn === match.color ? 'Du bist am Zug.' : 'Dein Gegner ist am Zug.'} Alle
        Züge werden auf dem Server validiert.
      </p>
      {match.drawOffer === match.color ? (
        <p className="muted">Remis angeboten – warte auf den Gegner.</p>
      ) : match.drawOffer ? (
        <p className="hint-text">
          Dein Gegner bietet Remis. /draw oder beide Könige antippen akzeptiert.
        </p>
      ) : null}
      <div className="match-info">
        <div>
          <span>Farbe</span>
          <strong>{match.color === 'w' ? 'Weiss' : 'Schwarz'}</strong>
        </div>
        <div>
          <span>Halbzüge seit Bauer/Schlag</span>
          <strong>{match.state?.halfmove ?? 0}</strong>
        </div>
      </div>
      <Button variant="outline" onPress={onResign}>
        Aufgeben
      </Button>
    </>
  );
}

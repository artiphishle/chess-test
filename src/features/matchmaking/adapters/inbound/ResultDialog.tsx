'use client';

import { Button } from '@ankhorage/zora/web/button';

import { resultMessage } from './resultMessage.ts';
import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly session: MatchSession;
}

/*** Announce an ended game and require both players for a rematch. */
export function ResultDialog({ session }: Props) {
  const { match } = session;
  if (match?.phase !== 'finished' || !match.result) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Spielergebnis">
      <div className="result-modal">
        <div className="result-symbol">{match.result.winner === null ? '½' : '♛'}</div>
        <span className="eyebrow">SPIEL BEENDET</span>
        <h2>{resultMessage(match)}</h2>
        <p>Grund: {match.result.reason}</p>
        {match.opponentPresent ? (
          <Button
            disabled={match.rematch[match.color]}
            onPress={() => {
              void session.act({ action: 'rematch' });
            }}
          >
            {match.rematch[match.color] ? 'Warte auf Gegner' : '↻ Rematch'}
          </Button>
        ) : null}
        <Button
          variant="outline"
          onPress={() => {
            void session.leave();
          }}
        >
          Zur Startseite
        </Button>
      </div>
    </div>
  );
}

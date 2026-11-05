'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { LobbyMatch, MatchSnapshot } from '../../application/createGameService.ts';

interface Props {
  readonly matches: readonly LobbyMatch[];
  readonly mine: readonly MatchSnapshot[];
  readonly busy: boolean;
  readonly onJoin: (matchId: string) => void;
  readonly onCancel: (matchId: string) => void;
}

/*** Display independent anonymous waiting games with explicit seat claims. */
export function OpenMatches({ matches, mine, busy, onJoin, onCancel }: Props) {
  return (
    <section className="panel open-matches" aria-label="Offene Partien">
      <div className="open-matches-heading">
        <h2>Offene Partien</h2>
        <span>{matches.length} verfügbar</span>
      </div>
      {matches.length === 0 ? (
        <p className="muted">Noch keine offenen Partien. Erstelle die erste!</p>
      ) : (
        <div className="open-matches-list">
          {matches.map((match) => {
            const owned = mine.some((entry) => entry.id === match.id);
            return (
              <div className="open-match" key={match.id}>
                <div>
                  <strong>
                    {match.name}
                    {owned ? ' · Deine Partie' : ''}
                  </strong>
                  <small>
                    {match.hostName} · {match.width} × {match.height} · {match.coins} Choice Coins
                  </small>
                </div>
                <Button
                  variant={owned ? 'outline' : undefined}
                  disabled={busy}
                  onPress={() => (owned ? onCancel(match.id) : onJoin(match.id))}
                >
                  {owned ? 'Zurückziehen' : 'Beitreten'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

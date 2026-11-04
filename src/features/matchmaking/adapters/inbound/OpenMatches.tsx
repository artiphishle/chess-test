'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { LobbyMatch } from '../../application/createGameService.ts';

interface Props {
  readonly matches: readonly LobbyMatch[];
  readonly busy: boolean;
  readonly onJoin: (matchId: string) => void;
}

/*** Display independent anonymous waiting games with explicit seat claims. */
export function OpenMatches({ matches, busy, onJoin }: Props) {
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
          {matches.map((match) => (
            <div className="open-match" key={match.id}>
              <div>
                <strong>{match.name}</strong>
                <small>
                  {match.width} × {match.height} · {match.coins} Choice Coins
                </small>
              </div>
              <Button disabled={busy} onPress={() => onJoin(match.id)}>
                Beitreten
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

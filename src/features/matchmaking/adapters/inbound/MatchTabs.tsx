'use client';

import type { MatchSnapshot } from '../../application/createGameService.ts';

interface Props {
  readonly matches: readonly MatchSnapshot[];
  readonly activeId: string | null;
  readonly onSelect: (id: string | null) => void;
}

/*** Keep the lobby reachable while each joined game has its own accessible tab. */
export function MatchTabs({ matches, activeId, onSelect }: Props) {
  const opened = matches.filter((match) => match.phase !== 'waiting');
  return (
    <nav className="match-tabs" role="tablist" aria-label="Lobby und Partien">
      <button
        type="button"
        role="tab"
        aria-selected={activeId === null}
        className={activeId === null ? 'match-tab active' : 'match-tab'}
        onClick={() => onSelect(null)}
      >
        Lobby
      </button>
      {opened.map((match) => (
        <button
          type="button"
          role="tab"
          key={match.id}
          aria-selected={activeId === match.id}
          className={activeId === match.id ? 'match-tab active' : 'match-tab'}
          onClick={() => onSelect(match.id)}
          title={match.template.name}
        >
          <span className="match-tab-name">{match.template.name}</span>
          <span className="match-tab-info">
            {match.template.width} × {match.template.height}
            {match.phase === 'playing' && match.state?.turn === match.color ? ' · Dein Zug' : ''}
            {match.phase === 'finished' ? ' · Beendet' : ''}
          </span>
        </button>
      ))}
    </nav>
  );
}

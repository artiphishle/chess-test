'use client';

import { useBoardTheme } from '../../../branding/adapters/inbound/useBoardTheme.ts';
import { PieceSetSelect } from '../../../chess/adapters/inbound/PieceSetSelect.tsx';
import type { MatchSnapshot } from '../../application/createGameService.ts';
import { PlayerNameEditor } from './PlayerNameEditor.tsx';

interface Props {
  readonly match: MatchSnapshot | null;
  readonly error: string;
  readonly clearError: () => void;
  readonly onName: (name: string) => void;
  readonly onCommands: () => void;
}

/*** Show the brand and authoritative matchmaking phase. */
export function AppHeader({ match, error, clearError, onName, onCommands }: Props) {
  const status = readHeaderStatus(match);
  const { theme: boardTheme } = useBoardTheme();
  return (
    <>
      <header className="app-header">
        <a className="brand" href="/" aria-label="GrossMeister Startseite">
          <span className="brand-wordmark" role="img" aria-label="GM GrossMeister" />
          <span className="brand-theme-name">{boardTheme.name}</span>
        </a>
        <div className="header-controls">
          <PlayerNameEditor onName={onName} />
          <button
            type="button"
            className="command-trigger"
            aria-label="Befehle öffnen"
            title="Befehle (/)"
            onClick={onCommands}
          >
            /
          </button>
          <PieceSetSelect />
          <div className="header-status">
            <span className="status-light" />
            {status}
          </div>
        </div>
      </header>
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <button type="button" onClick={clearError} aria-label="Schliessen">
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}

/*** Read the visible phase label without mixing game state into the header tree. */
function readHeaderStatus(match: MatchSnapshot | null): string {
  return match?.phase === 'waiting'
    ? 'Spielersuche'
    : match?.phase === 'setup'
      ? 'Vorbereitung'
      : match?.phase === 'playing'
        ? 'Live-Partie'
        : match
          ? 'Spiel beendet'
          : 'Bereit zum Spielen';
}

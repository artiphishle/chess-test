'use client';

import { PieceSetSelect } from '../../../chess/adapters/inbound/PieceSetSelect.tsx';
import type { MatchSnapshot } from '../../application/createGameService.ts';
import { PlayerNameEditor } from './PlayerNameEditor.tsx';

interface Props {
  readonly match: MatchSnapshot | null;
  readonly error: string;
  readonly clearError: () => void;
  readonly onName: (name: string) => void;
}

/*** Show the brand and authoritative matchmaking phase. */
export function AppHeader({ match, error, clearError, onName }: Props) {
  const status =
    match?.phase === 'waiting'
      ? 'Spielersuche'
      : match?.phase === 'setup'
        ? 'Vorbereitung'
        : match?.phase === 'playing'
          ? 'Live-Partie'
          : match
            ? 'Spiel beendet'
            : 'Bereit zum Spielen';
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">♞</div>
          <div>
            <strong>
              CHESS<span>TEST</span>
            </strong>
            <p>Experimentelle Spielkonfigurationen</p>
          </div>
        </div>
        <div className="header-controls">
          <PlayerNameEditor onName={onName} />
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

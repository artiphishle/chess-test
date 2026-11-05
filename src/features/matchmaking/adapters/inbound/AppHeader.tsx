'use client';

import { useEffect, useState } from 'react';

import { PieceSetSelect } from '../../../chess/adapters/inbound/PieceSetSelect.tsx';
import { getPlayerName } from './getPlayerName.ts';
import type { MatchSnapshot } from '../../application/createGameService.ts';

interface Props {
  readonly match: MatchSnapshot | null;
  readonly error: string;
  readonly clearError: () => void;
  readonly onName: (name: string) => void;
}

/*** Show the brand and authoritative matchmaking phase. */
export function AppHeader({ match, error, clearError, onName }: Props) {
  const [name, setName] = useState('Gast');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setName(getPlayerName()));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!name.trim()) return;
    const delay = setTimeout(() => onName(name.trim()), 600);
    return () => clearTimeout(delay);
  }, [name, onName]);
  const changeName = (value: string): void => {
    const next = value.slice(0, 32);
    setName(next);
    window.localStorage.setItem('chess-test-player-name', next);
  };
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
          <div className="player-name">
            {editing ? (
              <input
                aria-label="Spielername"
                maxLength={32}
                value={name}
                onChange={(event) => changeName(event.target.value)}
                onBlur={() => {
                  if (!name.trim()) changeName('Gast');
                  setEditing(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={`Spielername bearbeiten: ${name}`}
                title="Spielername bearbeiten"
              >
                {name} <span aria-hidden="true">✎</span>
              </button>
            )}
          </div>
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

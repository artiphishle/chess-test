'use client';

import { useCallback, useState } from 'react';

import type { LobbyMatch, MatchSnapshot } from '../../application/createGameService.ts';
import { sendGameCommandAsync } from './sendGameCommandAsync.ts';
import { useMatchPolling } from './useMatchPolling.ts';

export interface MatchSession {
  readonly match: MatchSnapshot | null;
  readonly matches: readonly MatchSnapshot[];
  readonly lobby: readonly LobbyMatch[];
  readonly activeId: string | null;
  readonly selectMatch: (matchId: string | null) => void;
  readonly busy: boolean;
  readonly error: string;
  readonly clearError: () => void;
  readonly act: (command: Record<string, unknown>) => Promise<boolean>;
  readonly leave: () => Promise<void>;
}

/*** Bind match-scoped actions to the selected tab while keeping the lobby independent. */
export function useMatchSession(): MatchSession {
  const polling = useMatchPolling();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = useCallback(
    async (command: Record<string, unknown>): Promise<boolean> => {
      const matchId = typeof command.matchId === 'string' ? command.matchId : polling.activeId;
      const payload =
        command.action === 'create' || command.action === 'join'
          ? command
          : { ...command, matchId };
      polling.beginMutation();
      setBusy(true);
      setError('');
      try {
        const match = await sendGameCommandAsync(payload);
        if (command.action === 'join' && match) polling.setActiveId(match.id);
        if (command.action === 'leave') {
          polling.setMatches((previous) => previous.filter((entry) => entry.id !== matchId));
          polling.setActiveId((current) => (current === matchId ? null : current));
        } else if (match) {
          polling.setMatches((previous) => [
            ...previous.filter((entry) => entry.id !== match.id),
            match,
          ]);
        }
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Verbindung fehlgeschlagen');
        return false;
      } finally {
        setBusy(false);
        polling.endMutation();
      }
    },
    [polling],
  );
  return {
    match: polling.matches.find((entry) => entry.id === polling.activeId) ?? null,
    matches: polling.matches,
    lobby: polling.lobby,
    activeId: polling.activeId,
    selectMatch: polling.setActiveId,
    busy,
    error,
    clearError: () => setError(''),
    act,
    leave: async () => { await act({ action: 'leave' }); },
  };
}

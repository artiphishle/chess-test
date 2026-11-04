'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { LobbyMatch, MatchSnapshot } from '../../application/createGameService.ts';
import { fetchMatchAsync } from './fetchMatchAsync.ts';
import { sendGameCommandAsync } from './sendGameCommandAsync.ts';

export interface MatchSession {
  readonly match: MatchSnapshot | null;
  readonly lobby: readonly LobbyMatch[];
  readonly busy: boolean;
  readonly error: string;
  readonly clearError: () => void;
  readonly act: (command: Record<string, unknown>) => Promise<boolean>;
  readonly leave: () => Promise<void>;
}

/*** Poll and mutate the current player's authoritative server session. */
export function useMatchSession(): MatchSession {
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [lobby, setLobby] = useState<readonly LobbyMatch[]>([]);
  const mutationGeneration = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const generation = mutationGeneration.current;
      const current = await fetchMatchAsync();
      if (generation !== mutationGeneration.current) return;
      setMatch(current.match);
      setLobby(current.lobby);
    } catch {
      /* A transient polling failure must not discard the active match. */
    }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh();
    }, 0);
    const interval = window.setInterval(() => {
      void refresh();
    }, 1200);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);
  const act = useCallback(
    async (command: Record<string, unknown>): Promise<boolean> => {
      mutationGeneration.current += 1;
      setBusy(true);
      setError('');
      try {
        setMatch(await sendGameCommandAsync(command));
        await refresh();
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Verbindung fehlgeschlagen');
        await refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );
  const leave = useCallback(async (): Promise<void> => {
    await act({ action: 'leave' });
  }, [act]);
  return { match, lobby, busy, error, clearError: () => setError(''), act, leave };
}

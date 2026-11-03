'use client';

import { useCallback, useEffect, useState } from 'react';

import type { MatchSnapshot } from '../../application/createGameService.ts';
import { fetchMatchAsync } from './fetchMatchAsync.ts';
import { sendGameCommandAsync } from './sendGameCommandAsync.ts';

export interface MatchSession {
  readonly match: MatchSnapshot | null;
  readonly busy: boolean;
  readonly error: string;
  readonly clearError: () => void;
  readonly act: (command: Record<string, unknown>) => Promise<boolean>;
  readonly leave: () => Promise<void>;
}

/*** Poll and mutate the current player's authoritative server session. */
export function useMatchSession(): MatchSession {
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setMatch(await fetchMatchAsync());
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
  const act = useCallback(async (command: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      setMatch(await sendGameCommandAsync(command));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verbindung fehlgeschlagen');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  const leave = useCallback(async (): Promise<void> => {
    await act({ action: 'leave' });
  }, [act]);
  return { match, busy, error, clearError: () => setError(''), act, leave };
}

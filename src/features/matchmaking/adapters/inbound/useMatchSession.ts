'use client';

import { useCallback, useEffect, useState } from 'react';

import type { MatchSnapshot } from '../../application/createGameService.ts';

export interface MatchSession {
  readonly match: MatchSnapshot | null;
  readonly busy: boolean;
  readonly error: string;
  readonly clearError: () => void;
  readonly act: (command: Record<string, unknown>) => Promise<boolean>;
  readonly leave: () => Promise<void>;
}

/*** Synchronize one anonymous browser session with the Next.js game API. */
export function useMatchSession(): MatchSession {
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/game', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) {
        const data = (await response.json()) as { match: MatchSnapshot | null };
        setMatch(data.match);
      }
    } catch {
      /* A transient polling failure must not discard the match. */
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
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(command),
      });
      const data = (await response.json()) as { match: MatchSnapshot | null; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? 'Serverfehler');
      setMatch(data.match);
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

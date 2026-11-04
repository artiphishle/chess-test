'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { LobbyMatch, MatchSnapshot } from '../../application/createGameService.ts';
import { fetchMatchAsync } from './fetchMatchAsync.ts';

/*** Keep each player's public lobby and multiple games synchronized without stale poll writes. */
export function useMatchPolling() {
  const [matches, setMatches] = useState<readonly MatchSnapshot[]>([]);
  const [lobby, setLobby] = useState<readonly LobbyMatch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const request = useRef(0);
  const mutating = useRef(false);
  const opened = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const serial = ++request.current;
    try {
      const next = await fetchMatchAsync();
      if (serial !== request.current) return;
      setMatches(next.matches);
      setLobby(next.lobby);
      const playable = next.matches.filter((match) => match.phase !== 'waiting');
      const newlyJoined = playable.find((match) => !opened.current.has(match.id));
      opened.current = new Set(playable.map((match) => match.id));
      setActiveId((current) => {
        if (current && playable.some((match) => match.id === current)) return current;
        return newlyJoined?.id ?? null;
      });
    } catch {
      /* Temporary network failures must not remove live game tabs. */
    }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 1200);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);
  const beginMutation = useCallback(() => {
    mutating.current = true;
    request.current += 1;
  }, []);
  const endMutation = useCallback(() => {
    mutating.current = false;
    void refresh();
  }, [refresh]);
  return { matches, lobby, activeId, setActiveId, setMatches, refresh, beginMutation, endMutation };
}

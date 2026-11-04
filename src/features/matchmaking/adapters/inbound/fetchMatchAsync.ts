import type { LobbyMatch, MatchSnapshot } from '../../application/createGameService.ts';
import { getPlayerTabId } from './getPlayerTabId.ts';

/*** Refresh the current anonymous player's session without a cache. */
export async function fetchMatchAsync(): Promise<{
  matches: readonly MatchSnapshot[];
  lobby: readonly LobbyMatch[];
}> {
  const response = await fetch('/api/game', {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'x-chess-tab-id': getPlayerTabId() },
  });
  if (!response.ok) throw new Error('Match polling temporarily unavailable');
  return (await response.json()) as {
    matches: readonly MatchSnapshot[];
    lobby: readonly LobbyMatch[];
  };
}

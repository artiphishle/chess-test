import type { MatchSnapshot } from '../../application/createGameService.ts';

/*** Refresh the current anonymous player's session without a cache. */
export async function fetchMatchAsync(): Promise<MatchSnapshot | null> {
  const response = await fetch('/api/game', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Match polling temporarily unavailable');
  const data = await response.json() as { match: MatchSnapshot | null };
  return data.match;
}

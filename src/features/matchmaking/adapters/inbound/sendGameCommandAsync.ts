import type { MatchSnapshot } from '../../application/createGameService.ts';

/*** Post one chess command with the current anonymous browser session cookie. */
export async function sendGameCommandAsync(command: Record<string, unknown>): Promise<MatchSnapshot | null> {
  const response = await fetch('/api/game', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    credentials: 'same-origin', body: JSON.stringify(command),
  });
  const data = await response.json() as { match: MatchSnapshot | null; error?: string };
  if (!response.ok || data.error) throw new Error(data.error ?? 'Serverfehler');
  return data.match;
}

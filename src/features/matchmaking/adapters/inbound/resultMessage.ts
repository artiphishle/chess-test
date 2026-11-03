import type { MatchSnapshot } from '../../application/createGameService.ts';

/*** Present the result according to the viewing player's assigned color. */
export function resultMessage(match: MatchSnapshot): string {
  if (match.result?.winner === null) return 'Unentschieden';
  return match.result?.winner === match.color ? 'Du hast gewonnen!' : 'Dein Gegner hat gewonnen.';
}

import type { Match } from '../../../types/match.ts';
import type { LobbyMatch } from './createGameService.ts';

/*** Map a waiting record to its intentionally public lobby representation. */
export function toLobbyMatch(match: Match): LobbyMatch {
  return {
    id: match.id,
    name: match.template.name,
    width: match.template.width,
    height: match.template.height,
    coins: match.template.cells.flat().filter((cell) => cell?.kind === 'coin').length,
    createdAt: match.createdAt,
    hostName: match.players.w,
  };
}

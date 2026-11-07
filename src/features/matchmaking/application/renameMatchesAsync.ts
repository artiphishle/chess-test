import type { Match } from '../../../types/match.ts';
import type { GameRepository } from '../ports/gameRepository.ts';
import { validatePlayerName } from './validatePlayerName.ts';

/*** Rename every match seat currently owned by the authenticated player. */
export function renameMatchesAsync(repository: GameRepository) {
  return async (playerId: string, proposedName: unknown): Promise<void> => {
    const name = validatePlayerName(proposedName, 'Gast');
    const matches = await repository.findByPlayerAsync(playerId);
    await Promise.all(matches.map((match) => renameMatchAsync(repository, match, playerId, name)));
  };
}

/*** Persist one optimistic player-name change without affecting an opponent seat. */
async function renameMatchAsync(
  repository: GameRepository,
  match: Match,
  playerId: string,
  name: string,
): Promise<void> {
  const expectedVersion = match.version;
  if (match.white === playerId) match.players.w = name;
  if (match.black === playerId) match.players.b = name;
  match.version += 1;
  if (!(await repository.saveAsync(match, expectedVersion)))
    throw new Error('Match changed; retry rename');
}

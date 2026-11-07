import type { Match } from '../../../types/match.ts';
import type { GameRepository } from '../ports/gameRepository.ts';

/*** Store matches in one persistent Node process for local and single-instance operation. */
export function createInProcessGameRepository(): GameRepository {
  const matches = new Map<string, Match>();
  return {
    createAsync(match) {
      matches.set(match.id, structuredClone(match));
      return Promise.resolve();
    },
    findByIdAsync(matchId) {
      return Promise.resolve(clone(matches.get(matchId)));
    },
    findByPlayerAsync(playerId) {
      return Promise.resolve(
        [...matches.values()]
          .filter((match) => match.white === playerId || match.black === playerId)
          .map((match) => structuredClone(match)),
      );
    },
    findWaitingAsync() {
      return Promise.resolve(
        [...matches.values()]
          .filter((match) => match.phase === 'waiting' && match.black === null)
          .map((match) => structuredClone(match)),
      );
    },
    claimSeatAsync(input) {
      const current = matches.get(input.matchId);
      if (!canClaim(current, input)) return Promise.resolve(null);
      matches.set(input.matchId, structuredClone(input.claimed));
      return Promise.resolve(structuredClone(input.claimed));
    },
    saveAsync(match, expectedVersion) {
      const current = matches.get(match.id);
      if (current?.version !== expectedVersion) return Promise.resolve(false);
      matches.set(match.id, structuredClone(match));
      return Promise.resolve(true);
    },
    deleteAsync(matchId, expectedVersion) {
      const current = matches.get(matchId);
      if (current?.version !== expectedVersion) return Promise.resolve(false);
      matches.delete(matchId);
      return Promise.resolve(true);
    },
  };
}

/*** Verify the one-seat invariant before mutating the process-local record. */
function canClaim(
  current: Match | undefined,
  input: Parameters<GameRepository['claimSeatAsync']>[0],
): boolean {
  return (
    current?.version === input.expectedVersion &&
    current.phase === 'waiting' &&
    current.black === null &&
    current.white !== input.playerId
  );
}

/*** Copy persisted state so callers cannot mutate repository-owned records. */
function clone(match: Match | undefined): Match | null {
  return match ? structuredClone(match) : null;
}

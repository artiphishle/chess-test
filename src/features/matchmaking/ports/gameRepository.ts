import type { Match } from '../../../types/match.ts';

/*** Persist and atomically claim authoritative match records. */
export interface GameRepository {
  createAsync(match: Match): Promise<void>;
  findByIdAsync(matchId: string): Promise<Match | null>;
  findByPlayerAsync(playerId: string): Promise<readonly Match[]>;
  findWaitingAsync(): Promise<readonly Match[]>;
  claimSeatAsync(input: {
    readonly matchId: string;
    readonly playerId: string;
    readonly playerName: string;
    readonly expectedVersion: number;
    readonly claimed: Match;
  }): Promise<Match | null>;
  saveAsync(match: Match, expectedVersion: number): Promise<boolean>;
  deleteAsync(matchId: string, expectedVersion: number): Promise<boolean>;
}

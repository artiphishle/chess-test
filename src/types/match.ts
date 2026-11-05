import type { Color, GameState, Move, PieceKind, Result, Template } from './chess.ts';

/*** Server lifecycle state of one independently authorized game. */
export type MatchPhase = 'waiting' | 'setup' | 'playing' | 'finished';

/*** Terminal game reason, including negotiated and voluntary outcomes. */
export type FinishReason =
  | Result
  | {
      winner: Color | null;
      reason: 'resignation' | 'departure' | 'agreement';
    };

/*** All commands that mutate a live match but not its membership or coin setup. */
export type MatchAction =
  | { action: 'move'; move: Move }
  | { action: 'resign' }
  | { action: 'draw' }
  | { action: 'cheat'; notation: unknown };

/*** Mutable session data owned exclusively by the single-process game service. */
export interface Match {
  id: string;
  white: string;
  black: string | null;
  template: Template;
  phase: MatchPhase;
  choices: Record<Color, Record<string, PieceKind>>;
  ready: Record<Color, boolean>;
  rematch: Record<Color, boolean>;
  state: GameState | null;
  result: FinishReason | null;
  drawOffer: Color | null;
  cheatUsed: boolean;
  createdAt: number;
  lastHostSeenAt: number;
  players: { w: string; b: string | null };
}

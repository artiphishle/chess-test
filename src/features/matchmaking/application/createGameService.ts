import type { Color, GameState, Move, PieceKind, Result, Template } from '../../../types/chess.ts';
import { createGameState } from '../../chess/domain/createGameState.ts';
import { playMove } from '../../chess/domain/playMove.ts';
import { readOutcome } from '../../chess/domain/readOutcome.ts';
import { validateTemplate } from '../../templates/domain/validateTemplate.ts';

type Phase = 'waiting' | 'setup' | 'playing' | 'finished';
type Command =
  | { action: 'join'; template: unknown }
  | { action: 'choose'; x: number; y: number; kind: PieceKind }
  | { action: 'ready' }
  | { action: 'move'; move: Move }
  | { action: 'resign' }
  | { action: 'rematch' }
  | { action: 'leave' };
type FinishReason = Result | { winner: Color | null; reason: 'resignation' | 'departure' };
interface Match {
  id: string;
  white: string;
  black: string | null;
  template: Template;
  phase: Phase;
  choices: Record<Color, Record<string, PieceKind>>;
  ready: Record<Color, boolean>;
  rematch: Record<Color, boolean>;
  state: GameState | null;
  result: FinishReason | null;
  createdAt: number;
}
export interface MatchSnapshot {
  readonly id: string;
  readonly color: Color;
  readonly phase: Phase;
  readonly template: Template;
  readonly choices: Readonly<Record<string, PieceKind>>;
  readonly ready: Readonly<Record<Color, boolean>>;
  readonly rematch: Readonly<Record<Color, boolean>>;
  readonly opponentPresent: boolean;
  readonly state: GameState | null;
  readonly result: FinishReason | null;
}

/*** Create the single-process authoritative matchmaking and game service. */
export function createGameService(ids: () => string, clock: () => number = Date.now) {
  return new InProcessGameService(ids, clock);
}

/*** Isolate mutable session mappings at the application boundary. */
class InProcessGameService {
  private readonly matches = new Map<string, Match>();
  private readonly sessions = new Map<string, string>();
  private readonly queue: string[] = [];
  private readonly ids: () => string;
  private readonly clock: () => number;
  constructor(ids: () => string, clock: () => number) { this.ids = ids; this.clock = clock; }

  /*** Resolve only the player whose opaque session token matches a current participant. */
  private resolve(token: string): { match: Match; color: Color } | null {
    const id = this.sessions.get(token);
    const match = id ? this.matches.get(id) : undefined;
    if (!match) return null;
    if (match.white === token) return { match, color: 'w' };
    if (match.black === token) return { match, color: 'b' };
    return null;
  }

  /*** Read a player-specific snapshot without leaking an opponent's unresolved choices. */
  snapshot(token: string): MatchSnapshot | null {
    const active = this.resolve(token);
    if (!active) return null;
    const { match, color } = active;
    return {
      id: match.id,
      color,
      phase: match.phase,
      template: match.template,
      choices: { ...match.choices[color] },
      ready: { ...match.ready },
      rematch: { ...match.rematch },
      opponentPresent: Boolean(color === 'w' ? match.black : match.white),
      state: match.state,
      result: match.result,
    };
  }

  /*** Pair the oldest live waiting player, or queue a locked template copy. */
  join(previousToken: string | undefined, proposedTemplate: unknown): { token: string; match: MatchSnapshot } {
    if (previousToken) {
      const previous = this.snapshot(previousToken);
      if (previous) return { token: previousToken, match: previous };
    }
    const template = validateTemplate(proposedTemplate);
    const token = this.ids();
    const waiting = this.queue.map(id => this.matches.get(id)).find(match =>
      match?.phase === 'waiting' && match.black === null && this.clock() - match.createdAt < 900_000,
    );
    if (waiting) {
      waiting.black = token;
      this.sessions.set(token, waiting.id);
      this.setup(waiting);
    } else {
      const match: Match = {
        id: this.ids(), white: token, black: null, template, phase: 'waiting',
        choices: { w: {}, b: {} }, ready: { w: false, b: false },
        rematch: { w: false, b: false }, state: null, result: null, createdAt: this.clock(),
      };
      this.matches.set(match.id, match);
      this.queue.push(match.id);
      this.sessions.set(token, match.id);
    }
    const snapshot = this.snapshot(token);
    if (!snapshot) throw new Error('Could not create a match');
    return { token, match: snapshot };
  }

  /*** Route a player-authorized command to one strictly scoped transition. */
  execute(token: string, command: Exclude<Command, { action: 'join' }>): MatchSnapshot | null {
    const active = this.resolve(token);
    if (!active) throw new Error('No active session');
    const { match, color } = active;
    switch (command.action) {
      case 'choose': this.choose(match, color, command); break;
      case 'ready': this.readyUp(match, color); break;
      case 'move': this.move(match, color, command.move); break;
      case 'resign': this.resign(match, color); break;
      case 'rematch': this.rematch(match, color); break;
      case 'leave': this.leave(match, color, token); return null;
      default: throw new Error('Unknown command');
    }
    return this.snapshot(token);
  }

  /*** Reject invalid coins and freeze every individual choice when ready. */
  private choose(match: Match, color: Color, choice: { x: number; y: number; kind: PieceKind }): void {
    if (match.phase !== 'setup' || match.ready[color]) throw new Error('Choices are locked');
    const { x, y, kind } = choice;
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Invalid coin position');
    const cell = match.template.cells[y]?.[x];
    if (cell?.kind !== 'coin' || cell.color !== color || !cell.options.includes(kind)) throw new Error('Choice not allowed');
    match.choices[color][`${x}:${y}`] = kind;
  }

  /*** Confirm every owned coin has resolved before allowing the opening move. */
  private readyUp(match: Match, color: Color): void {
    if (match.phase !== 'setup' || match.ready[color]) throw new Error('Not in setup');
    const missing = match.template.cells.some((row, y) => row.some((cell, x) =>
      cell?.kind === 'coin' && cell.color === color && !match.choices[color][`${x}:${y}`],
    ));
    if (missing) throw new Error('Resolve every choice coin first');
    match.ready[color] = true;
    if (match.ready.w && match.ready.b) this.start(match);
  }

  /*** Validate every requested move with the headless engine on the server. */
  private move(match: Match, color: Color, move: Move): void {
    if (match.phase !== 'playing' || match.state?.turn !== color) throw new Error('Not your turn');
    match.state = playMove(match.state, move);
    match.result = readOutcome(match.state);
    if (match.result) match.phase = 'finished';
  }

  /*** End a game by voluntary resignation. */
  private resign(match: Match, color: Color): void {
    if (match.phase !== 'playing' && match.phase !== 'setup') throw new Error('Not an active match');
    match.result = { winner: opposite(color), reason: 'resignation' };
    match.phase = 'finished';
  }

  /*** Create a rematch only when both connected players explicitly accept. */
  private rematch(match: Match, color: Color): void {
    if (match.phase !== 'finished' || !match.white || !match.black) throw new Error('Rematch unavailable');
    match.rematch[color] = true;
    if (match.rematch.w && match.rematch.b) this.setup(match);
  }

  /*** Unbind a departing player and award the opponent a result when applicable. */
  private leave(match: Match, color: Color, token: string): void {
    if (match.phase === 'playing' || match.phase === 'setup') {
      match.result = { winner: opposite(color), reason: 'departure' };
      match.phase = 'finished';
    }
    if (match.phase === 'waiting') this.matches.delete(match.id);
    if (color === 'w') match.white = '';
    else match.black = null;
    this.sessions.delete(token);
  }

  /*** Restore independent choices and preserve the immutable template for rematches. */
  private setup(match: Match): void {
    match.choices = { w: {}, b: {} };
    match.ready = { w: false, b: false };
    match.rematch = { w: false, b: false };
    match.result = null;
    match.state = null;
    match.phase = 'setup';
    for (const color of ['w', 'b'] as const) {
      match.ready[color] = !match.template.cells.some(row => row.some(cell => cell?.kind === 'coin' && cell.color === color));
    }
    if (match.ready.w && match.ready.b) this.start(match);
  }

  /*** Enter play, or finish immediately for an already terminal custom position. */
  private start(match: Match): void {
    match.state = createGameState(match.template, match.choices);
    match.result = readOutcome(match.state);
    match.phase = match.result ? 'finished' : 'playing';
  }
}

/*** Swap chess colors without exposing authorization or transport concerns. */
function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

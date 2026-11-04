import type { Color, GameState, Move, PieceKind, Result, Template } from '../../../types/chess.ts';
import { createGameState } from '../../chess/domain/createGameState.ts';
import { playMove } from '../../chess/domain/playMove.ts';
import { readOutcome } from '../../chess/domain/readOutcome.ts';
import { validateTemplate } from '../../templates/domain/validateTemplate.ts';

type Phase = 'waiting' | 'setup' | 'playing' | 'finished';
type Command =
  | { action: 'create'; template: unknown }
  | { action: 'join'; matchId: string }
  | { action: 'choose'; x: number; y: number; kind: PieceKind }
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
export interface LobbyMatch {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly coins: number;
  readonly createdAt: number;
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
  private readonly sessions = new Map<string, Set<string>>();
  private readonly ids: () => string;
  private readonly clock: () => number;
  constructor(ids: () => string, clock: () => number) {
    this.ids = ids;
    this.clock = clock;
  }

  /*** Link one anonymous participant to a specific game without replacing other seats. */
  private addSession(token: string, matchId: string): void {
    const joined = this.sessions.get(token) ?? new Set<string>();
    joined.add(matchId);
    this.sessions.set(token, joined);
  }

  /*** Release a single game association while keeping the player's other games. */
  private removeSession(token: string, matchId: string): void {
    const joined = this.sessions.get(token);
    joined?.delete(matchId);
    if (joined?.size === 0) this.sessions.delete(token);
  }

  /*** Resolve only an authorized participant in the specifically requested match. */
  private resolve(token: string, matchId: string): { match: Match; color: Color } | null {
    if (!this.sessions.get(token)?.has(matchId)) return null;
    const match = this.matches.get(matchId);
    if (!match) return null;
    if (match.white === token) return { match, color: 'w' };
    if (match.black === token) return { match, color: 'b' };
    return null;
  }

  /*** Return every game authorized for this player, including waiting offers. */
  games(token: string): readonly MatchSnapshot[] {
    this.expireWaiting();
    return [...(this.sessions.get(token) ?? [])].flatMap((matchId) => {
      const match = this.snapshot(token, matchId);
      return match ? [match] : [];
    });
  }

  /*** Return one player-scoped snapshot without leaking the rival's private coin choices. */
  snapshot(token: string, matchId: string): MatchSnapshot | null {
    const active = this.resolve(token, matchId);
    if (!active) return null;
    const { match, color } = active;
    return {
      id: match.id,
      color,
      phase: match.phase,
      template: match.template,
      choices: { ...(color === 'w' ? match.choices.w : match.choices.b) },
      ready: { ...match.ready },
      rematch: { ...match.rematch },
      opponentPresent: Boolean(color === 'w' ? match.black : match.white),
      state: match.state,
      result: match.result,
    };
  }

  /*** Drop expired waiting offers and release their session identities. */
  private expireWaiting(): void {
    for (const [id, match] of this.matches) {
      if (match.phase !== 'waiting' || this.clock() - match.createdAt < 900_000) continue;
      this.matches.delete(id);
      this.removeSession(match.white, id);
    }
  }

  /*** Read only public offers, without exposing any player or unresolved-coin identities. */
  lobby(): readonly LobbyMatch[] {
    this.expireWaiting();
    return [...this.matches.values()]
      .filter((match) => match.phase === 'waiting' && match.black === null)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((match) => ({
        id: match.id,
        name: match.template.name,
        width: match.template.width,
        height: match.template.height,
        coins: match.template.cells.flat().filter((cell) => cell?.kind === 'coin').length,
        createdAt: match.createdAt,
      }));
  }

  /*** Create a distinct public offer from an immutable validated template snapshot. */
  create(
    previousToken: string | undefined,
    proposedTemplate: unknown,
  ): { token: string; match: MatchSnapshot } {
    const template = validateTemplate(proposedTemplate);
    const token = previousToken ?? this.ids();
    const match: Match = {
      id: this.ids(),
      white: token,
      black: null,
      template,
      phase: 'waiting',
      choices: { w: {}, b: {} },
      ready: { w: false, b: false },
      rematch: { w: false, b: false },
      state: null,
      result: null,
      createdAt: this.clock(),
    };
    this.matches.set(match.id, match);
    this.addSession(token, match.id);
    const snapshot = this.snapshot(token, match.id);
    if (!snapshot) throw new Error('Could not create a match');
    return { token, match: snapshot };
  }

  /*** Claim the named waiting game exactly once in the authoritative process. */
  join(
    previousToken: string | undefined,
    matchId: string,
  ): { token: string; match: MatchSnapshot } {
    const previous = previousToken ? this.snapshot(previousToken, matchId) : null;
    if (previous) return { token: previousToken as string, match: previous };
    this.expireWaiting();
    const waiting = this.matches.get(matchId);
    if (waiting?.phase !== 'waiting' || waiting.black !== null)
      throw new Error('Partie nicht mehr verfügbar');
    const token = previousToken ?? this.ids();
    if (waiting.white === token) throw new Error('Eigene Partie kann nicht beigetreten werden');
    waiting.black = token;
    this.addSession(token, waiting.id);
    this.setup(waiting);
    const snapshot = this.snapshot(token, waiting.id);
    if (!snapshot) throw new Error('Could not join the match');
    return { token, match: snapshot };
  }

  /*** Route a player-authorized command to one strictly scoped transition. */
  execute(
    token: string,
    matchId: string,
    command: Exclude<Command, { action: 'create' | 'join' }>,
  ): MatchSnapshot | null {
    const active = this.resolve(token, matchId);
    if (!active) throw new Error('No active session');
    const { match, color } = active;
    switch (command.action) {
      case 'choose':
        this.choose(match, color, command);
        break;
      case 'move':
        this.move(match, color, command.move);
        break;
      case 'resign':
        this.resign(match, color);
        break;
      case 'rematch':
        this.rematch(match, color);
        break;
      case 'leave':
        this.leave(match, color, token);
        return null;
      default:
        throw new Error('Unknown command');
    }
    return this.snapshot(token, matchId);
  }

  /*** Reject invalid coins and freeze every individual choice when ready. */
  private choose(
    match: Match,
    color: Color,
    choice: { x: number; y: number; kind: PieceKind },
  ): void {
    if (match.phase !== 'setup' || isReady(match.ready, color))
      throw new Error('Choices are locked');
    const { x, y, kind } = choice;
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Invalid coin position');
    const cell = match.template.cells.at(y)?.at(x);
    if (cell?.kind !== 'coin' || cell.color !== color || !cell.options.includes(kind))
      throw new Error('Choice not allowed');
    const choices = color === 'w' ? match.choices.w : match.choices.b;
    const key = `${x}:${y}`;
    if (Object.hasOwn(choices, key)) throw new Error('Coin already resolved');
    Object.assign(choices, { [key]: kind });
    this.finishSetupIfResolved(match, color, choices);
  }

  /*** Mark one side ready and start automatically when all its coins are resolved. */
  private finishSetupIfResolved(
    match: Match,
    color: Color,
    choices: Readonly<Record<string, PieceKind>>,
  ): void {
    if (!areAllCoinsResolved(match.template, color, choices)) return;
    if (color === 'w') match.ready.w = true;
    else match.ready.b = true;
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
    if (match.phase !== 'playing' && match.phase !== 'setup')
      throw new Error('Not an active match');
    match.result = { winner: opposite(color), reason: 'resignation' };
    match.phase = 'finished';
  }

  /*** Create a rematch only when both connected players explicitly accept. */
  private rematch(match: Match, color: Color): void {
    if (match.phase !== 'finished' || !match.white || !match.black)
      throw new Error('Rematch unavailable');
    if (color === 'w') match.rematch.w = true;
    else match.rematch.b = true;
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
    this.removeSession(token, match.id);
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
      const ready = !match.template.cells.some((row) =>
        row.some((cell) => cell?.kind === 'coin' && cell.color === color),
      );
      if (color === 'w') match.ready.w = ready;
      else match.ready.b = ready;
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

/*** Read the current player's ready flag without computed-property access. */
function isReady(ready: Readonly<Record<Color, boolean>>, color: Color): boolean {
  return color === 'w' ? ready.w : ready.b;
}

/*** Detect completion of only the acting player's unresolved choice coins. */
function areAllCoinsResolved(
  template: Template,
  color: Color,
  choices: Readonly<Record<string, PieceKind>>,
): boolean {
  return template.cells.every((row, y) =>
    row.every(
      (cell, x) =>
        cell?.kind !== 'coin' || cell.color !== color || Object.hasOwn(choices, `${x}:${y}`),
    ),
  );
}

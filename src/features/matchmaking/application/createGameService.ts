import type { Color, GameState, Move, PieceKind, Result, Template } from '../../../types/chess.ts';
import { createGameState } from '../../chess/domain/createGameState.ts';
import { playMove } from '../../chess/domain/playMove.ts';
import { readOutcome } from '../../chess/domain/readOutcome.ts';
import { validateTemplate } from '../../templates/domain/validateTemplate.ts';

type Phase = 'waiting' | 'setup' | 'playing' | 'finished';
type Command =
  | { action: 'create'; template: unknown }
  | { action: 'join'; matchId: string }
  | { action: 'ready'; choices: unknown }
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
  lastHostSeenAt: number;
  players: { w: string; b: string | null };
}
export interface LobbyMatch {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly coins: number;
  readonly createdAt: number;
  readonly hostName: string;
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
  readonly players: Readonly<{ w: string; b: string | null }>;
  readonly state: GameState | null;
  readonly result: FinishReason | null;
}

/*** Create the single-process authoritative matchmaking and game service. */
export function createGameService(
  ids: () => string,
  clock: () => number = Date.now,
  random: () => number = Math.random,
) {
  return new InProcessGameService(ids, clock, random);
}

/*** Isolate mutable session mappings at the application boundary. */
class InProcessGameService {
  private readonly matches = new Map<string, Match>();
  private readonly sessions = new Map<string, Set<string>>();
  private readonly ids: () => string;
  private readonly clock: () => number;
  private readonly random: () => number;
  constructor(ids: () => string, clock: () => number, random: () => number) {
    this.ids = ids;
    this.clock = clock;
    this.random = random;
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
      if (!match) return [];
      const owned = this.matches.get(matchId);
      if (owned?.phase === 'waiting' && owned.white === token) owned.lastHostSeenAt = this.clock();
      return [match];
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
      players: { ...match.players },
      state: match.state,
      result: match.result,
    };
  }

  /*** Drop expired waiting offers and release their session identities. */
  private expireWaiting(): void {
    for (const [id, match] of this.matches) {
      if (match.phase !== 'waiting' || this.clock() - match.lastHostSeenAt < 90_000) continue;
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
        hostName: match.players.w,
      }));
  }

  /*** Create a distinct public offer from an immutable validated template snapshot. */
  create(
    previousToken: string | undefined,
    proposedTemplate: unknown,
    name?: unknown,
  ): { token: string; match: MatchSnapshot } {
    const template = validateTemplate(proposedTemplate);
    const displayName = validateName(name, 'Spieler Weiss');
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
      lastHostSeenAt: this.clock(),
      players: { w: displayName, b: null },
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
    name?: unknown,
  ): { token: string; match: MatchSnapshot } {
    this.expireWaiting();
    const displayName = validateName(name, 'Spieler Schwarz');
    const waiting = this.matches.get(matchId);
    if (previousToken && waiting?.white === previousToken)
      throw new Error('Eigene Partie kann nicht beigetreten werden');
    if (previousToken) {
      const previous = this.snapshot(previousToken, matchId);
      if (previous) return { token: previousToken, match: previous };
    }
    if (waiting?.phase !== 'waiting' || waiting.black !== null)
      throw new Error('Partie nicht mehr verfügbar');
    const token = previousToken ?? this.ids();
    waiting.black = token;
    waiting.players.b = displayName;
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
      case 'ready':
        this.confirmChoices(match, color, command.choices);
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

  /*** Atomically validate and freeze the entire owned coin selection at Ready. */
  private confirmChoices(match: Match, color: Color, value: unknown): void {
    if (match.phase !== 'setup' || match.ready[color]) throw new Error('Choices are locked');
    const selected = validateCoinChoices(match.template, color, value);
    if (color === 'w') match.choices.w = selected;
    else match.choices.b = selected;
    match.ready[color] = true;
    if (match.ready.w && match.ready.b) this.start(match);
  }

  /*** Rename only games currently owned by the authorized tab. */
  rename(token: string, proposedName: unknown): void {
    if (!this.sessions.has(token)) throw new Error('No active session');
    const name = validateName(proposedName, 'Gast');
    for (const id of this.sessions.get(token) ?? []) {
      const match = this.matches.get(id);
      if (!match) continue;
      if (match.white === token) match.players.w = name;
      if (match.black === token) match.players.b = name;
    }
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
    const randomTurn: Color = this.random() < 0.5 ? 'w' : 'b';
    match.state = createGameState(match.template, match.choices, randomTurn);
    match.result = readOutcome(match.state);
    match.phase = match.result ? 'finished' : 'playing';
  }
}

/*** Swap chess colors without exposing authorization or transport concerns. */
function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

/*** Reject extra, missing, foreign, or out-of-range coin assignments. */
function validateCoinChoices(
  template: Template,
  color: Color,
  value: unknown,
): Record<string, PieceKind> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid coin choices');
  const provided = value as Record<string, unknown>;
  const required = template.cells.flatMap((row, y) =>
    row.flatMap((cell, x) =>
      cell?.kind === 'coin' && cell.color === color
        ? [{ key: `${x}:${y}`, options: cell.options }]
        : [],
    ),
  );
  if (Object.keys(provided).length !== required.length) throw new Error('Incomplete coin choices');
  return Object.fromEntries(required.map(({ key, options }) => {
    const kind = provided[key];
    if (typeof kind !== 'string' || !options.includes(kind as PieceKind))
      throw new Error('Choice not allowed');
    return [key, kind as PieceKind];
  }));
}

/*** Accept small, non-control-character player names only. */
function validateName(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new Error('Invalid player name');
  const name = value.trim();
  if (!name || name.length > 32 || /[\x00-\x1f\x7f]/.test(name))
    throw new Error('Invalid player name');
  return name;
}

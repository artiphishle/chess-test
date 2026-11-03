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
  result: (Result | { winner: Color | null; reason: 'resignation' | 'departure' }) | null;
  createdAt: number;
}
export type MatchSnapshot = Readonly<{
  id: string;
  color: Color;
  phase: Phase;
  template: Template;
  choices: Readonly<Record<string, PieceKind>>;
  ready: Readonly<Record<Color, boolean>>;
  rematch: Readonly<Record<Color, boolean>>;
  opponentPresent: boolean;
  state: GameState | null;
  result: Match['result'];
}>;

/*** Provide atomic in-process anonymous matchmaking, setup, moves and rematches. */
export function createGameService(ids: () => string, clock: () => number = Date.now) {
  const matches = new Map<string, Match>();
  const sessions = new Map<string, string>();
  const queue: string[] = [];
  const resolve = (token: string): { match: Match; color: Color } | null => {
    const id = sessions.get(token);
    const match = id ? matches.get(id) : null;
    if (!match) return null;
    if (match.white === token) return { match, color: 'w' };
    if (match.black === token) return { match, color: 'b' };
    return null;
  };
  const snapshot = (token: string): MatchSnapshot | null => {
    const active = resolve(token);
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
  };
  const bothReady = (match: Match): boolean => match.ready.w && match.ready.b;
  const start = (match: Match): void => {
    match.state = createGameState(match.template, match.choices);
    match.result = readOutcome(match.state);
    match.phase = match.result ? 'finished' : 'playing';
  };
  const setup = (match: Match): void => {
    match.choices = { w: {}, b: {} };
    match.ready = { w: false, b: false };
    match.rematch = { w: false, b: false };
    match.result = null;
    match.state = null;
    match.phase = 'setup';
    for (const color of ['w', 'b'] as const) {
      const hasCoins = match.template.cells.some((row) =>
        row.some((cell) => cell?.kind === 'coin' && cell.color === color),
      );
      match.ready[color] = !hasCoins;
    }
    if (bothReady(match)) start(match);
  };
  const join = (
    previousToken: string | undefined,
    template: unknown,
  ): { token: string; match: MatchSnapshot } => {
    const active = previousToken ? resolve(previousToken) : null;
    if (active) {
      return { token: previousToken!, match: snapshot(previousToken!)! };
    }
    const valid = validateTemplate(template);
    const token = ids();
    const waiting = queue
      .map((id) => matches.get(id))
      .find((candidate): candidate is Match =>
        Boolean(
          candidate &&
          candidate.phase === 'waiting' &&
          candidate.black === null &&
          clock() - candidate.createdAt < 15 * 60 * 1000,
        ),
      );
    if (waiting) {
      waiting.black = token;
      sessions.set(token, waiting.id);
      setup(waiting);
    } else {
      const match: Match = {
        id: ids(),
        white: token,
        black: null,
        template: valid,
        phase: 'waiting',
        choices: { w: {}, b: {} },
        ready: { w: false, b: false },
        rematch: { w: false, b: false },
        state: null,
        result: null,
        createdAt: clock(),
      };
      matches.set(match.id, match);
      queue.push(match.id);
      sessions.set(token, match.id);
    }
    return { token, match: snapshot(token)! };
  };
  const execute = (
    token: string,
    command: Exclude<Command, { action: 'join' }>,
  ): MatchSnapshot | null => {
    const active = resolve(token);
    if (!active) throw new Error('No active session');
    const { match, color } = active;
    const other: Color = color === 'w' ? 'b' : 'w';
    if (command.action === 'leave') {
      if (match.phase === 'playing' || match.phase === 'setup') {
        match.result = { winner: other, reason: 'departure' };
        match.phase = 'finished';
      }
      if (match.phase === 'waiting') matches.delete(match.id);
      if (color === 'w') match.white = '';
      else match.black = null;
      sessions.delete(token);
      return null;
    }
    if (command.action === 'choose') {
      if (match.phase !== 'setup' || match.ready[color]) throw new Error('Choices are locked');
      const { x, y, kind } = command;
      if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Invalid coin position');
      const cell = match.template.cells[y]?.[x];
      if (cell?.kind !== 'coin' || cell.color !== color || !cell.options.includes(kind))
        throw new Error('Choice not allowed');
      match.choices[color][`${x}:${y}`] = kind;
    } else if (command.action === 'ready') {
      if (match.phase !== 'setup' || match.ready[color]) throw new Error('Not in setup');
      const missing = match.template.cells.some((row, y) =>
        row.some(
          (cell, x) =>
            cell?.kind === 'coin' && cell.color === color && !match.choices[color][`${x}:${y}`],
        ),
      );
      if (missing) throw new Error('Resolve every choice coin first');
      match.ready[color] = true;
      if (bothReady(match)) start(match);
    } else if (command.action === 'move') {
      if (match.phase !== 'playing' || !match.state || match.state.turn !== color)
        throw new Error('Not your turn');
      match.state = playMove(match.state, command.move);
      match.result = readOutcome(match.state);
      if (match.result) match.phase = 'finished';
    } else if (command.action === 'resign') {
      if (match.phase !== 'playing' && match.phase !== 'setup')
        throw new Error('Not an active match');
      match.result = { winner: other, reason: 'resignation' };
      match.phase = 'finished';
    } else if (command.action === 'rematch') {
      if (match.phase !== 'finished' || !match.white || !match.black)
        throw new Error('Rematch unavailable');
      match.rematch[color] = true;
      if (match.rematch.w && match.rematch.b) setup(match);
    } else {
      throw new Error('Unknown command');
    }
    return snapshot(token);
  };
  return { join, execute, snapshot };
}

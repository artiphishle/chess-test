import type { Color, PieceKind, Template } from '../../../types/chess.ts';
import type { FinishReason, Match, MatchAction, MatchPhase } from '../../../types/match.ts';
import { createGameState } from '../../chess/domain/createGameState.ts';
import { readOutcome } from '../../chess/domain/readOutcome.ts';
import { validateTemplate } from '../../templates/domain/validateTemplate.ts';
import type { GameRepository } from '../ports/gameRepository.ts';
import { applyMatchAction } from './applyMatchAction.ts';
import { renameMatchesAsync } from './renameMatchesAsync.ts';
import { toLobbyMatch } from './toLobbyMatch.ts';
import { validateCoinChoices } from './validateCoinChoices.ts';
import { validatePlayerName } from './validatePlayerName.ts';

type Command =
  | { action: 'create'; template: unknown }
  | { action: 'join'; matchId: string }
  | { action: 'ready'; choices: unknown }
  | MatchAction
  | { action: 'rematch' }
  | { action: 'leave' };

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
  readonly phase: MatchPhase;
  readonly template: Template;
  readonly choices: Readonly<Record<string, PieceKind>>;
  readonly ready: Readonly<Record<Color, boolean>>;
  readonly rematch: Readonly<Record<Color, boolean>>;
  readonly opponentPresent: boolean;
  readonly players: Readonly<{ w: string; b: string | null }>;
  readonly state: Match['state'];
  readonly result: FinishReason | null;
  readonly drawOffer: Color | null;
  readonly cheatUsed: boolean;
  readonly version: number;
}

/*** Create the repository-backed authoritative matchmaking application service. */
export function createGameService(
  repository: GameRepository,
  ids: () => string,
  clock: () => number = Date.now,
  random: () => number = Math.random,
) {
  const dependencies = { repository, ids, clock, random };
  return {
    gamesAsync: readGamesAsync(dependencies),
    snapshotAsync: readSnapshotAsync(repository),
    lobbyAsync: readLobbyAsync(repository, clock),
    createAsync: createMatchAsync(dependencies),
    joinAsync: joinMatchAsync(dependencies),
    executeAsync: executeMatchAsync(repository, random),
    renameAsync: renameMatchesAsync(repository),
  };
}

interface ServiceDependencies {
  readonly repository: GameRepository;
  readonly ids: () => string;
  readonly clock: () => number;
  readonly random: () => number;
}

/*** Bind player game reads to the repository-backed service. */
function readGamesAsync({ repository, clock }: ServiceDependencies) {
  return async (playerId: string): Promise<readonly MatchSnapshot[]> => {
    await expireWaitingAsync(repository, clock);
    return (await repository.findByPlayerAsync(playerId)).flatMap((match) => {
      const snapshot = toSnapshot(match, playerId);
      return snapshot ? [snapshot] : [];
    });
  };
}

/*** Bind a player-scoped match read to the repository. */
function readSnapshotAsync(repository: GameRepository) {
  return async (playerId: string, matchId: string): Promise<MatchSnapshot | null> => {
    const match = await repository.findByIdAsync(matchId);
    return match ? toSnapshot(match, playerId) : null;
  };
}

/*** Bind public lobby reads while removing abandoned offers. */
function readLobbyAsync(repository: GameRepository, clock: () => number) {
  return async (): Promise<readonly LobbyMatch[]> => {
    await expireWaitingAsync(repository, clock);
    return (await repository.findWaitingAsync()).map(toLobbyMatch);
  };
}

/*** Bind creation and compatible auto-match transitions. */
function createMatchAsync({ repository, ids, clock, random }: ServiceDependencies) {
  return async (
    playerId: string,
    proposedTemplate: unknown,
    name?: unknown,
  ): Promise<MatchSnapshot> => {
    await expireWaitingAsync(repository, clock);
    const template = validateTemplate(proposedTemplate);
    const playerName = validatePlayerName(name, 'Spieler Weiss');
    const compatible = (await repository.findWaitingAsync()).find(
      (match) =>
        match.white !== playerId && JSON.stringify(match.template) === JSON.stringify(template),
    );
    if (compatible) {
      const claimed = prepareClaim(compatible, playerId, playerName, random);
      const won = await repository.claimSeatAsync({
        matchId: compatible.id,
        playerId,
        playerName,
        expectedVersion: compatible.version,
        claimed,
      });
      if (won) return requireSnapshot(won, playerId);
    }
    const match = createWaitingMatch(ids(), playerId, playerName, template, clock());
    await repository.createAsync(match);
    return requireSnapshot(match, playerId);
  };
}

/*** Bind an explicit waiting-seat claim to a distinct authenticated player. */
function joinMatchAsync({ repository, clock, random }: ServiceDependencies) {
  return async (playerId: string, matchId: string, name?: unknown): Promise<MatchSnapshot> => {
    await expireWaitingAsync(repository, clock);
    const match = await repository.findByIdAsync(matchId);
    if (match?.phase !== 'waiting' || match.black !== null)
      throw new Error('Partie nicht mehr verfügbar');
    if (match.white === playerId) throw new Error('Eigene Partie kann nicht beigetreten werden');
    const claimed = prepareClaim(
      match,
      playerId,
      validatePlayerName(name, 'Spieler Schwarz'),
      random,
    );
    const won = await repository.claimSeatAsync({
      matchId,
      playerId,
      playerName: claimed.players.b ?? 'Spieler Schwarz',
      expectedVersion: match.version,
      claimed,
    });
    if (!won) throw new Error('Partie nicht mehr verfügbar');
    return requireSnapshot(won, playerId);
  };
}

/*** Bind serialized game transitions to an authorized player seat. */
function executeMatchAsync(repository: GameRepository, random: () => number) {
  return async (
    playerId: string,
    matchId: string,
    command: Exclude<Command, { action: 'create' | 'join' }>,
  ): Promise<MatchSnapshot | null> => {
    const match = await repository.findByIdAsync(matchId);
    const color = match ? readColor(match, playerId) : null;
    if (!match || !color) throw new Error('No active session');
    const expectedVersion = match.version;
    if (command.action === 'leave') {
      if (!(await leaveAsync(repository, match, color, expectedVersion)))
        throw new Error('Match changed; retry the command');
      return null;
    }
    if (command.action === 'ready') confirmChoices(match, color, command.choices, random);
    else if (command.action === 'rematch') rematch(match, color, random);
    else applyMatchAction(match, color, command);
    match.version += 1;
    if (!(await repository.saveAsync(match, expectedVersion)))
      throw new Error('Match changed; retry the command');
    return requireSnapshot(match, playerId);
  };
}

/*** Convert the stored match to a player-scoped view without revealing rival coin choices. */
function toSnapshot(match: Match, playerId: string): MatchSnapshot | null {
  const color = readColor(match, playerId);
  if (!color) return null;
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
    drawOffer: match.drawOffer,
    cheatUsed: match.cheatUsed,
    version: match.version,
  };
}

/*** Resolve a player's sole seat in one match; one identity can never occupy both seats. */
function readColor(match: Match, playerId: string): Color | null {
  if (match.white === playerId) return 'w';
  return match.black === playerId ? 'b' : null;
}

/*** Fail closed if an internal transition attempts to return an unauthorized snapshot. */
function requireSnapshot(match: Match, playerId: string): MatchSnapshot {
  const snapshot = toSnapshot(match, playerId);
  if (!snapshot) throw new Error('Could not authorize match participant');
  return snapshot;
}

/*** Materialize an independently durable waiting offer from validated immutable input. */
function createWaitingMatch(
  id: string,
  playerId: string,
  playerName: string,
  template: Template,
  now: number,
): Match {
  return {
    id,
    white: playerId,
    black: null,
    template,
    phase: 'waiting',
    choices: { w: {}, b: {} },
    ready: { w: false, b: false },
    rematch: { w: false, b: false },
    state: null,
    result: null,
    drawOffer: null,
    cheatUsed: false,
    createdAt: now,
    lastHostSeenAt: now,
    players: { w: playerName, b: null },
    version: 1,
  };
}

/*** Atomically prepare a claimed seat from the persisted waiting record. */
function prepareClaim(
  match: Match,
  playerId: string,
  playerName: string,
  random: () => number,
): Match {
  const claimed = structuredClone(match);
  claimed.black = playerId;
  claimed.players.b = playerName;
  claimed.version += 1;
  setup(claimed, random);
  return claimed;
}

/*** Remove abandoned offers without disturbing any other concurrent games owned by the host. */
async function expireWaitingAsync(repository: GameRepository, clock: () => number): Promise<void> {
  const expired = (await repository.findWaitingAsync()).filter(
    (match) => clock() - match.lastHostSeenAt >= 90_000,
  );
  await Promise.all(expired.map((match) => repository.deleteAsync(match.id, match.version)));
}

/*** Atomically validate and freeze the entire owned coin selection at Ready. */
function confirmChoices(match: Match, color: Color, value: unknown, random: () => number): void {
  const ready = color === 'w' ? match.ready.w : match.ready.b;
  if (match.phase !== 'setup' || ready) throw new Error('Choices are locked');
  const choices = validateCoinChoices(match.template, color, value);
  if (color === 'w') {
    match.choices.w = choices;
    match.ready.w = true;
  } else {
    match.choices.b = choices;
    match.ready.b = true;
  }
  if (match.ready.w && match.ready.b) start(match, random);
}

/*** Create a rematch only after both already-authorized opponents accept. */
function rematch(match: Match, color: Color, random: () => number): void {
  if (match.phase !== 'finished' || !match.white || !match.black)
    throw new Error('Rematch unavailable');
  if (color === 'w') match.rematch.w = true;
  else match.rematch.b = true;
  if (match.rematch.w && match.rematch.b) setup(match, random);
}

/*** Restore per-game setup state while retaining the immutable template and participant seats. */
function setup(match: Match, random: () => number): void {
  match.choices = { w: {}, b: {} };
  match.ready = { w: hasNoCoins(match.template, 'w'), b: hasNoCoins(match.template, 'b') };
  match.rematch = { w: false, b: false };
  match.result = null;
  match.drawOffer = null;
  match.cheatUsed = false;
  match.state = null;
  match.phase = 'setup';
  if (match.ready.w && match.ready.b) start(match, random);
}

function hasNoCoins(template: Template, color: Color): boolean {
  return !template.cells.some((row) =>
    row.some((cell) => cell?.kind === 'coin' && cell.color === color),
  );
}

function start(match: Match, random: () => number): void {
  match.state = createGameState(match.template, match.choices, random() < 0.5 ? 'w' : 'b');
  match.result = readOutcome(match.state);
  match.phase = match.result ? 'finished' : 'playing';
}

/*** Release a seat or delete a waiting offer while preserving the opponent's result. */
async function leaveAsync(
  repository: GameRepository,
  match: Match,
  color: Color,
  expectedVersion: number,
): Promise<boolean> {
  if (match.phase === 'waiting') return repository.deleteAsync(match.id, expectedVersion);
  if (match.phase === 'playing' || match.phase === 'setup') {
    match.result = { winner: color === 'w' ? 'b' : 'w', reason: 'departure' };
    match.phase = 'finished';
  }
  if (color === 'w') {
    match.white = '';
    match.players.w = '';
  } else {
    match.black = null;
    match.players.b = null;
  }
  match.version += 1;
  return repository.saveAsync(match, expectedVersion);
}

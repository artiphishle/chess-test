import { createPostgresAdapter, type PostgresAdapter } from '@ankhorage/db-postgres';

import type { Match } from '../../../types/match.ts';
import type { GameRepository } from '../ports/gameRepository.ts';

const table = 'chess_matches';

interface StoredMatch {
  readonly id: string;
  readonly white: string;
  readonly black: string | null;
  readonly phase: Match['phase'];
  readonly templateSignature: string;
  readonly version: number;
  readonly createdAt: number;
  readonly snapshot: Match;
}

/*** Create the durable PostgreSQL implementation of the matchmaking repository port. */
export function createPostgresGameRepository(connectionString: string): GameRepository {
  return createPostgresGameRepositoryFromAdapter(createPostgresAdapter({ connectionString }));
}

/*** Adapt the published PostgreSQL adapter without exposing database details to application policy. */
function createPostgresGameRepositoryFromAdapter(adapter: PostgresAdapter): GameRepository {
  const ready = initializeAsync(adapter);
  return {
    createAsync: (match) => createAsync(adapter, ready, match),
    findByIdAsync: (matchId) => findByIdAsync(adapter, ready, matchId),
    findByPlayerAsync: (playerId) => findByPlayerAsync(adapter, ready, playerId),
    findWaitingAsync: () => findWaitingAsync(adapter, ready),
    claimSeatAsync: (input) => claimSeatAsync(adapter, ready, input),
    saveAsync: (match, expectedVersion) => saveAsync(adapter, ready, match, expectedVersion),
    deleteAsync: (matchId, expectedVersion) =>
      deleteAsync(adapter, ready, matchId, expectedVersion),
  };
}

/*** Persist one new durable match record. */
async function createAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
  match: Match,
): Promise<void> {
  await ready;
  requireSuccess(
    await adapter.insert<StoredMatch>({ table, values: toStored(match) }),
    'Could not persist match',
  );
}

/*** Read one durable match snapshot. */
async function findByIdAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
  matchId: string,
): Promise<Match | null> {
  await ready;
  return (
    requireSuccess(
      await adapter.findById<StoredMatch>({ table, id: matchId }),
      'Could not read match',
    )?.snapshot ?? null
  );
}

/*** Read every game where the player owns either seat. */
async function findByPlayerAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
  playerId: string,
): Promise<readonly Match[]> {
  await ready;
  const [white, black] = await Promise.all([
    adapter.select<StoredMatch>({
      table,
      filters: [{ field: 'white', operator: 'eq', value: playerId }],
    }),
    adapter.select<StoredMatch>({
      table,
      filters: [{ field: 'black', operator: 'eq', value: playerId }],
    }),
  ]);
  return [
    ...requireSuccess(white, 'Could not read player matches'),
    ...requireSuccess(black, 'Could not read player matches'),
  ].map((match) => match.snapshot);
}

/*** Read public waiting offers in creation order. */
async function findWaitingAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
): Promise<readonly Match[]> {
  await ready;
  const result = await adapter.select<StoredMatch>({
    table,
    filters: [{ field: 'phase', operator: 'eq', value: 'waiting' }],
    sort: [{ field: 'createdAt', direction: 'asc' }],
  });
  return requireSuccess(result, 'Could not read waiting matches').map((match) => match.snapshot);
}

/*** Claim a seat in one transaction with an optimistic version predicate. */
async function claimSeatAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
  input: Parameters<GameRepository['claimSeatAsync']>[0],
): Promise<Match | null> {
  await ready;
  const result = await adapter.transaction?.(async (transaction) => {
    const stored = requireSuccess(
      await transaction.findById<StoredMatch>({ table, id: input.matchId }),
      'Could not read match while claiming a seat',
    );
    if (
      stored?.version !== input.expectedVersion ||
      stored.phase !== 'waiting' ||
      stored.black !== null ||
      stored.white === input.playerId
    )
      return null;
    const updated = await transaction.update<StoredMatch>({
      table,
      values: toStored(input.claimed),
      filters: [
        { field: 'id', operator: 'eq', value: input.matchId },
        { field: 'version', operator: 'eq', value: input.expectedVersion },
      ],
    });
    return requireSuccess(updated, 'Could not claim match seat').length === 1
      ? input.claimed
      : null;
  });
  if (!result) throw new Error('PostgreSQL transactions are required for durable matches');
  return requireSuccess(result, 'Could not claim match seat');
}

/*** Save a versioned durable match snapshot. */
async function saveAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
  match: Match,
  expectedVersion: number,
): Promise<boolean> {
  await ready;
  const result = await adapter.update<StoredMatch>({
    table,
    values: toStored(match),
    filters: [
      { field: 'id', operator: 'eq', value: match.id },
      { field: 'version', operator: 'eq', value: expectedVersion },
    ],
  });
  return requireSuccess(result, 'Could not save match').length === 1;
}

/*** Delete only the unchanged waiting match selected by the caller. */
async function deleteAsync(
  adapter: PostgresAdapter,
  ready: Promise<void>,
  matchId: string,
  expectedVersion: number,
): Promise<boolean> {
  await ready;
  const result = await adapter.delete({
    table,
    filters: [
      { field: 'id', operator: 'eq', value: matchId },
      { field: 'version', operator: 'eq', value: expectedVersion },
    ],
  });
  return requireSuccess(result, 'Could not delete match').length === 1;
}

/*** Create the minimal durable record shape through the public adapter schema API. */
async function initializeAsync(adapter: PostgresAdapter): Promise<void> {
  const result = await adapter.createCollection({
    name: table,
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'text', required: true },
      { name: 'white', type: 'text', required: true },
      { name: 'black', type: 'text' },
      { name: 'phase', type: 'text', required: true },
      { name: 'templateSignature', type: 'text', required: true },
      { name: 'version', type: 'number', required: true },
      { name: 'createdAt', type: 'number', required: true },
      { name: 'snapshot', type: 'json', required: true },
    ],
  });
  if (!result.ok) throw new Error(result.error.message);
}

/*** Keep queryable claim predicates aligned with the serialized immutable match snapshot. */
function toStored(match: Match): StoredMatch {
  return {
    id: match.id,
    white: match.white,
    black: match.black,
    phase: match.phase,
    templateSignature: JSON.stringify(match.template),
    version: match.version,
    createdAt: match.createdAt,
    snapshot: match,
  };
}

/*** Convert the published adapter's typed result into the application's error boundary. */
function requireSuccess<T>(
  result:
    | { readonly ok: true; readonly data: T }
    | { readonly ok: false; readonly error: { readonly message: string } },
  message: string,
): T {
  if (!result.ok) throw new Error(`${message}: ${result.error.message}`);
  return result.data;
}

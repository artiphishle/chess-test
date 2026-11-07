import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PostgresAdapter } from '@ankhorage/db-postgres';

import { createPostgresGameRepository } from './postgresGameRepository.ts';

type CreateCollection = PostgresAdapter['createCollection'];
type CollectionDefinition = Parameters<CreateCollection>[0];
type AdminResult = Awaited<ReturnType<CreateCollection>>;

void test('two repository instances accept an existing shared PostgreSQL table', async () => {
  const database = createDatabase();
  const first = createPostgresGameRepository('postgres://test', database.adapter());
  const second = createPostgresGameRepository('postgres://test', database.adapter());

  await Promise.all([first.findWaitingAsync(), second.findWaitingAsync()]);

  assert.equal(database.createAttempts, 2);
});

void test('PostgreSQL bootstrap rejects DDL errors other than an existing table', async () => {
  const repository = createPostgresGameRepository(
    'postgres://test',
    createAdapter(() =>
      Promise.resolve({
        ok: false,
        error: { code: '42501', message: 'permission denied for schema public' },
      }),
    ),
  );

  await assert.rejects(() => repository.findWaitingAsync(), /permission denied/);
});

/*** Model one shared database that permits the first table creation and rejects later attempts. */
function createDatabase(): {
  readonly adapter: () => PostgresAdapter;
  readonly createAttempts: number;
} {
  let exists = false;
  let createAttempts = 0;
  return {
    adapter: () =>
      createAdapter(() => {
        createAttempts += 1;
        if (exists)
          return Promise.resolve({
            ok: false,
            error: { code: '42P07', message: 'relation "chess_matches" already exists' },
          });
        exists = true;
        return Promise.resolve({ ok: true, executed: true });
      }),
    get createAttempts() {
      return createAttempts;
    },
  };
}

/*** Provide the minimal successful PostgreSQL boundary used by repository bootstrap tests. */
function createAdapter(
  createCollection: (input: CollectionDefinition) => Promise<AdminResult>,
): PostgresAdapter {
  const adapter: PostgresAdapter = {
    capabilities: {
      transactions: true,
      returning: true,
      realtime: false,
      schemaGeneration: true,
      directExecution: true,
    },
    close: () => Promise.resolve(),
    createCollection,
    deleteCollection: () => Promise.resolve({ ok: true, executed: true }),
    generateCreateCollectionSql: () => ({ ok: true, executed: false }),
    generateDeleteCollectionSql: () => ({ ok: true, executed: false }),
    select: () => Promise.resolve({ ok: true, data: [] }),
    findById: () => Promise.resolve({ ok: true, data: null }),
    insert: () => Promise.resolve({ ok: true, data: [] }),
    update: () => Promise.resolve({ ok: true, data: [] }),
    delete: () => Promise.resolve({ ok: true, data: [] }),
    transaction: async (run) => ({ ok: true, data: await run(adapter) }),
  };
  return adapter;
}

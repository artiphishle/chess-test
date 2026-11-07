import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPresets } from '../../templates/domain/createPresets.ts';
import { createGameApi } from './createGameApi.ts';

const cookieA = 'chess_session=11111111-1111-4111-8111-111111111111';
const cookieB = 'chess_session=22222222-2222-4222-8222-222222222222';

/*** Dispatch an API write as one browser identity without a tab-derived actor header. */
function post(body: Record<string, unknown>, cookie?: string) {
  return createGameApi().dispatchAsync({
    operationId: 'game.write',
    method: 'POST',
    params: {},
    query: {},
    headers: cookie ? { cookie } : {},
    body,
  });
}

/*** Read the match payload without coupling assertions to transport runtime internals. */
function match(response: { readonly body?: unknown }) {
  return (
    response.body as { readonly match: { readonly id: string; readonly phase: string } | null }
  ).match;
}

void test('HTTP mints an HttpOnly cookie and rejects self-join from another tab of that cookie', async () => {
  const [template] = createPresets();
  const minted = await post({ action: 'create', template });
  assert.match(String(minted.headers['set-cookie']), /HttpOnly/);
  const offered = match(await post({ action: 'create', template }, cookieA));
  assert.ok(offered);
  const selfJoin = await post({ action: 'join', matchId: offered.id }, cookieA);
  assert.equal(selfJoin.status, 409);
});

void test('HTTP synchronizes join and move state by cookie identity without a tab header', async () => {
  const [template] = createPresets();
  const offered = match(await post({ action: 'create', template }, cookieA));
  assert.ok(offered);
  const joined = match(await post({ action: 'join', matchId: offered.id }, cookieB));
  assert.ok(joined);
  const moved = await post(
    { action: 'move', matchId: offered.id, move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } } },
    cookieA,
  );
  assert.equal(moved.status, 200);
});

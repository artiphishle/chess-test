import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ApiHandlerResponse } from '@ankhorage/api';

import { createPresets } from '../../templates/domain/createPresets.ts';
import type { MatchSnapshot } from '../application/createGameService.ts';
import { createGameApi } from './createGameApi.ts';

const api = createGameApi();
const cookieChrome = 'chess_session=11111111-1111-4111-8111-111111111111';
const cookieSafari = 'chess_session=22222222-2222-4222-8222-222222222222';
const cookieSecondMatch = 'chess_session=66666666-6666-4666-8666-666666666666';
const chromeTab1 = '33333333-3333-4333-8333-333333333333';
const chromeTab2 = '44444444-4444-4444-8444-444444444444';
const safariTab = '55555555-5555-4555-8555-555555555555';

/*** Read the player-scoped response from a normalized HTTP operation. */
function match(response: ApiHandlerResponse): MatchSnapshot | null {
  return (response.body as { match: MatchSnapshot | null }).match;
}

/*** Execute a browser-tab-scoped request through the actual Ankhorage API runtime. */
function post(cookie: string, tab: string, body: Record<string, unknown>) {
  return api.dispatchAsync({
    operationId: 'game.write',
    method: 'POST',
    params: {},
    query: {},
    headers: { cookie, 'x-chess-tab-id': tab },
    body,
  });
}

/*** Fetch only the authorized player's own game snapshot. */
function get(cookie: string, tab: string) {
  return api.dispatchAsync({
    operationId: 'game.read',
    method: 'GET',
    params: {},
    query: {},
    headers: { cookie, 'x-chess-tab-id': tab },
  });
}

void test('two same-browser tabs pair as White and Black while Safari waits', async () => {
  const [preset] = createPresets();
  const white = await post(cookieChrome, chromeTab1, { action: 'join', template: preset });
  const black = await post(cookieChrome, chromeTab2, { action: 'join', template: preset });
  const whiteMatch = match(white);
  const blackMatch = match(black);
  assert.ok(whiteMatch);
  assert.ok(blackMatch);
  assert.equal(whiteMatch.color, 'w');
  assert.equal(blackMatch.color, 'b');
  assert.equal(blackMatch.id, whiteMatch.id);
  assert.equal(match(await get(cookieChrome, chromeTab1))?.color, 'w');
  assert.equal(match(await get(cookieChrome, chromeTab2))?.color, 'b');
  assert.equal(match(await get(cookieSafari, safariTab)), null);

  const spectator = await post(cookieSafari, safariTab, { action: 'join', template: preset });
  assert.equal(match(spectator)?.phase, 'waiting');
  assert.notEqual(match(spectator)?.id, whiteMatch.id);
  await post(cookieSafari, safariTab, { action: 'leave' });
});

void test('only the correct tab moves its own color, with alternating turns', async () => {
  const [preset] = createPresets();
  await post(cookieSecondMatch, chromeTab1, { action: 'join', template: preset });
  await post(cookieSecondMatch, chromeTab2, { action: 'join', template: preset });
  const moveWhite = { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } };
  const moveBlack = { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } };

  assert.equal(
    (await post(cookieSecondMatch, chromeTab2, { action: 'move', move: moveBlack })).status,
    409,
  );
  const white = await post(cookieSecondMatch, chromeTab1, {
    action: 'move',
    move: moveWhite,
  });
  assert.equal(white.status, 200);
  assert.equal(match(white)?.state?.turn, 'b');
  const black = await post(cookieSecondMatch, chromeTab2, {
    action: 'move',
    move: moveBlack,
  });
  assert.equal(black.status, 200);
  assert.equal(match(black)?.state?.turn, 'w');
  assert.equal(match(await get(cookieSecondMatch, chromeTab1))?.state?.board[3][4]?.color, 'b');

  assert.equal(match(await get(cookieSafari, chromeTab1)), null);
  const stolen = await post(cookieSafari, chromeTab1, {
    action: 'move',
    move: moveWhite,
  });
  assert.equal(stolen.status, 409);

  const departure = await post(cookieSecondMatch, chromeTab1, { action: 'leave' });
  assert.equal(departure.status, 200);
  assert.equal(departure.headers['set-cookie'], undefined);
  assert.equal(match(await get(cookieSecondMatch, chromeTab2))?.result?.winner, 'b');
});

void test('missing tab identity is rejected on writes', async () => {
  const response = await api.dispatchAsync({
    operationId: 'game.write',
    method: 'POST',
    params: {},
    query: {},
    headers: { cookie: cookieChrome },
    body: { action: 'join', template: {} },
  });
  assert.equal(response.status, 400);
});

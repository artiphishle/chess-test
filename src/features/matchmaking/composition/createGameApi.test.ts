import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ApiHandlerResponse } from '@ankhorage/api';

import type { MatchSnapshot } from '../application/createGameService.ts';
import { createGameApi } from './createGameApi.ts';

const cookieChrome = 'chess_session=11111111-1111-4111-8111-111111111111';
const cookieSafari = 'chess_session=22222222-2222-4222-8222-222222222222';
const chromeTab1 = '33333333-3333-4333-8333-333333333333';
const chromeTab2 = '44444444-4444-4444-8444-444444444444';
const safariTab = '55555555-5555-4555-8555-555555555555';

function match(response: ApiHandlerResponse): MatchSnapshot | null {
  return (response.body as { match: MatchSnapshot | null }).match;
}

void test('two Chrome tabs are separate players while Safari waits for another game', async () => {
  const api = createGameApi();
  const post = (cookie: string, tab: string, body: Record<string, unknown>) =>
    api.dispatchAsync({
      operationId: 'game.write',
      method: 'POST',
      params: {},
      query: {},
      headers: { cookie, 'x-chess-tab-id': tab },
      body,
    });
  const get = (cookie: string, tab: string) =>
    api.dispatchAsync({
      operationId: 'game.read',
      method: 'GET',
      params: {},
      query: {},
      headers: { cookie, 'x-chess-tab-id': tab },
    });

  const { createPresets } = await import('../../templates/domain/createPresets.ts');
  const preset = createPresets()[0];

  const white = await post(cookieChrome, chromeTab1, { action: 'join', template: preset });
  const black = await post(cookieChrome, chromeTab2, { action: 'join', template: preset });
  assert.equal(match(white)?.color, 'w');
  assert.equal(match(black)?.color, 'b');
  assert.equal(match(black)?.id, match(white)?.id);
  assert.equal(match(await get(cookieChrome, chromeTab1))?.color, 'w');
  assert.equal(match(await get(cookieChrome, chromeTab2))?.color, 'b');
  assert.equal(match(await get(cookieSafari, safariTab)), null);

  const spectator = await post(cookieSafari, safariTab, { action: 'join', template: preset });
  assert.equal(match(spectator)?.phase, 'waiting');
  assert.notEqual(match(spectator)?.id, match(white)?.id);

  const blackTooEarly = await post(cookieChrome, chromeTab2, {
    action: 'move',
    move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
  });
  assert.equal(blackTooEarly.status, 409);

  const whiteMoved = await post(cookieChrome, chromeTab1, {
    action: 'move',
    move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } },
  });
  assert.equal(whiteMoved.status, 200);
  assert.equal(match(whiteMoved)?.state?.turn, 'b');
  const blackMoved = await post(cookieChrome, chromeTab2, {
    action: 'move',
    move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
  });
  assert.equal(blackMoved.status, 200);
  assert.equal(match(blackMoved)?.state?.turn, 'w');
  assert.equal(match(await get(cookieChrome, chromeTab1))?.state?.board[3]?.[4]?.color, 'b');

  const wrongBrowser = await get(cookieSafari, chromeTab1);
  assert.equal(match(wrongBrowser), null);
  const wrongBrowserMove = await post(cookieSafari, chromeTab1, {
    action: 'move',
    move: { from: { x: 4, y: 6 }, to: { x: 4, y: 5 } },
  });
  assert.equal(wrongBrowserMove.status, 409);

  const departure = await post(cookieChrome, chromeTab1, { action: 'leave' });
  assert.equal(departure.status, 200);
  assert.equal(departure.headers['set-cookie'], undefined);
  assert.equal(match(await get(cookieChrome, chromeTab2))?.result?.winner, 'b');
});

void test('missing tab identity is rejected on writes', async () => {
  const api = createGameApi();
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

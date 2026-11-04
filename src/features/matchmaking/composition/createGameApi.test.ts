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
  const white = await post(cookieChrome, chromeTab1, { action: 'create', template: preset });
  const whiteMatch = match(white);
  assert.ok(whiteMatch);
  const black = await post(cookieChrome, chromeTab2, { action: 'join', matchId: whiteMatch.id });
  const blackMatch = match(black);
  assert.ok(blackMatch);
  assert.equal(whiteMatch.color, 'w');
  assert.equal(blackMatch.color, 'b');
  assert.equal(blackMatch.id, whiteMatch.id);
  assert.equal(match(await get(cookieChrome, chromeTab1))?.color, 'w');
  assert.equal(match(await get(cookieChrome, chromeTab2))?.color, 'b');
  assert.equal(match(await get(cookieSafari, safariTab)), null);

  const spectator = await post(cookieSafari, safariTab, { action: 'create', template: preset });
  assert.equal(match(spectator)?.phase, 'waiting');
  assert.notEqual(match(spectator)?.id, whiteMatch.id);
  await post(cookieSafari, safariTab, { action: 'leave' });
});

void test('only the correct tab moves its own color, with alternating turns', async () => {
  const [preset] = createPresets();
  const offer = await post(cookieSecondMatch, chromeTab1, { action: 'create', template: preset });
  const created = match(offer);
  assert.ok(created);
  await post(cookieSecondMatch, chromeTab2, { action: 'join', matchId: created.id });
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

void test('public lobby lists multiple 10x13 offers and grants only the first claimant', async () => {
  const [, wide] = createPresets();
  const cookieA = 'chess_session=aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const cookieB = 'chess_session=bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const cookieC = 'chess_session=ccccccc1-cccc-4ccc-8ccc-cccccccccccc';
  const cookieD = 'chess_session=ddddddd1-dddd-4ddd-8ddd-dddddddddddd';
  const hostA = await post(cookieA, chromeTab1, { action: 'create', template: wide });
  const hostB = await post(cookieB, chromeTab1, {
    action: 'create',
    template: { ...wide, name: 'Second wide board' },
  });
  const offerA = match(hostA);
  const offerB = match(hostB);
  assert.ok(offerA);
  assert.ok(offerB);
  const publicView = await api.dispatchAsync({
    operationId: 'game.read',
    method: 'GET',
    params: {},
    query: {},
    headers: {},
  });
  const payload = publicView.body as {
    match: MatchSnapshot | null;
    lobby: readonly { id: string; name: string; width: number; height: number; coins: number }[];
  };
  assert.equal(payload.match, null);
  assert.ok(payload.lobby.some((offer) => offer.id === offerA.id && offer.coins === 12));
  assert.ok(payload.lobby.some((offer) => offer.id === offerB.id && offer.width === 10));
  const [first, second] = await Promise.all([
    post(cookieC, chromeTab1, { action: 'join', matchId: offerA.id }),
    post(cookieD, chromeTab1, { action: 'join', matchId: offerA.id }),
  ]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1);
  assert.equal([first.status, second.status].filter((status) => status === 409).length, 1);
  assert.equal(match(await get(cookieA, chromeTab1))?.phase, 'setup');
  const refreshed = await get(cookieB, chromeTab2);
  const remaining = (refreshed.body as { lobby: readonly { id: string }[] }).lobby;
  assert.ok(remaining.some((offer) => offer.id === offerB.id));
  assert.ok(!remaining.some((offer) => offer.id === offerA.id));
  await post(cookieA, chromeTab1, { action: 'leave' });
  await post(cookieB, chromeTab1, { action: 'leave' });
  await post(cookieC, chromeTab1, { action: 'leave' });
  await post(cookieD, chromeTab1, { action: 'leave' });
});

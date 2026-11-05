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

/*** Read all games authorized to this browser tab, not just one selected match. */
function games(response: ApiHandlerResponse): readonly MatchSnapshot[] {
  return (response.body as { matches: readonly MatchSnapshot[] }).matches;
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
  assert.equal(games(await get(cookieChrome, chromeTab1))[0]?.color, 'w');
  assert.equal(games(await get(cookieChrome, chromeTab2))[0]?.color, 'b');
  assert.deepEqual(games(await get(cookieSafari, safariTab)), []);

  const spectator = await post(cookieSafari, safariTab, { action: 'create', template: preset });
  assert.equal(match(spectator)?.phase, 'waiting');
  assert.notEqual(match(spectator)?.id, whiteMatch.id);
  await post(cookieSafari, safariTab, { action: 'leave', matchId: match(spectator)?.id });
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
    (
      await post(cookieSecondMatch, chromeTab2, {
        action: 'move',
        matchId: created.id,
        move: moveBlack,
      })
    ).status,
    409,
  );
  const white = await post(cookieSecondMatch, chromeTab1, {
    action: 'move',
    matchId: created.id,
    move: moveWhite,
  });
  assert.equal(white.status, 200);
  assert.equal(match(white)?.state?.turn, 'b');
  const black = await post(cookieSecondMatch, chromeTab2, {
    action: 'move',
    matchId: created.id,
    move: moveBlack,
  });
  assert.equal(black.status, 200);
  assert.equal(match(black)?.state?.turn, 'w');
  assert.equal(games(await get(cookieSecondMatch, chromeTab1))[0]?.state?.board[3][4]?.color, 'b');

  assert.deepEqual(games(await get(cookieSafari, chromeTab1)), []);
  const stolen = await post(cookieSafari, chromeTab1, {
    action: 'move',
    matchId: created.id,
    move: moveWhite,
  });
  assert.equal(stolen.status, 409);

  const departure = await post(cookieSecondMatch, chromeTab1, {
    action: 'leave',
    matchId: created.id,
  });
  assert.equal(departure.status, 200);
  assert.equal(departure.headers['set-cookie'], undefined);
  assert.equal(games(await get(cookieSecondMatch, chromeTab2))[0]?.result?.winner, 'b');
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
    matches: readonly MatchSnapshot[];
    lobby: readonly { id: string; name: string; width: number; height: number; coins: number }[];
  };
  assert.deepEqual(payload.matches, []);
  assert.ok(payload.lobby.some((offer) => offer.id === offerA.id && offer.coins === 12));
  assert.ok(payload.lobby.some((offer) => offer.id === offerB.id && offer.width === 10));
  const [first, second] = await Promise.all([
    post(cookieC, chromeTab1, { action: 'join', matchId: offerA.id }),
    post(cookieD, chromeTab1, { action: 'join', matchId: offerA.id }),
  ]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1);
  assert.equal([first.status, second.status].filter((status) => status === 409).length, 1);
  assert.equal(games(await get(cookieA, chromeTab1))[0]?.phase, 'setup');
  const refreshed = await get(cookieB, chromeTab2);
  const remaining = (refreshed.body as { lobby: readonly { id: string }[] }).lobby;
  assert.ok(remaining.some((offer) => offer.id === offerB.id));
  assert.ok(!remaining.some((offer) => offer.id === offerA.id));
  await post(cookieA, chromeTab1, { action: 'leave', matchId: offerA.id });
  await post(cookieB, chromeTab1, { action: 'leave', matchId: offerB.id });
  await post(cookieC, chromeTab1, { action: 'leave', matchId: offerA.id });
});

void test('one tab owns three offers and receives multiple match tabs after separate guests join', async () => {
  const [standard, wide] = createPresets();
  const host = 'chess_session=aaaaaa91-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const guestOne = 'chess_session=bbbbbb91-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const guestTwo = 'chess_session=cccccc91-cccc-4ccc-8ccc-cccccccccccc';
  const created = await Promise.all([
    post(host, chromeTab1, { action: 'create', template: standard }),
    post(host, chromeTab1, { action: 'create', template: wide }),
    post(host, chromeTab1, { action: 'create', template: { ...wide, name: 'Extra offer' } }),
  ]);
  const ids = created.map((response) => match(response)?.id);
  assert.ok(ids.every((id) => typeof id === 'string'));
  assert.equal(games(await get(host, chromeTab1)).length, 3);
  await post(guestOne, chromeTab1, { action: 'join', matchId: ids[0] });
  await post(guestTwo, chromeTab1, { action: 'join', matchId: ids[1] });
  const all = games(await get(host, chromeTab1));
  assert.equal(all.filter((entry) => entry.phase !== 'waiting').length, 2);
  assert.equal(all.filter((entry) => entry.phase === 'waiting').length, 1);
  assert.equal(
    (await post(guestOne, chromeTab1, { action: 'resign', matchId: ids[1] })).status,
    409,
  );
  const played = await post(host, chromeTab1, {
    action: 'move',
    matchId: ids[0],
    move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } },
  });
  assert.equal(played.status, 200);
  assert.equal(
    games(await get(host, chromeTab1)).find((entry) => entry.id === ids[0])?.state?.turn,
    'b',
  );
  assert.equal(
    games(await get(host, chromeTab1)).find((entry) => entry.id === ids[1])?.phase,
    'setup',
  );
  await post(host, chromeTab1, { action: 'leave', matchId: ids[2] });
  assert.equal(games(await get(host, chromeTab1)).length, 2);
  await post(host, chromeTab1, { action: 'leave', matchId: ids[0] });
  await post(host, chromeTab1, { action: 'leave', matchId: ids[1] });
  await post(guestOne, chromeTab1, { action: 'leave', matchId: ids[0] });
  await post(guestTwo, chromeTab1, { action: 'leave', matchId: ids[1] });
});

void test('HTTP rejects foreign coin data, keeps choices private, and starts after both Ready', async () => {
  const hostCookie = 'chess_session=fa000001-1111-4111-8111-111111111111';
  const guestCookie = 'chess_session=fa000002-2222-4222-8222-222222222222';
  const [, template] = createPresets();
  const host = match(await post(hostCookie, chromeTab1, { action: 'create', template }));
  assert.ok(host);
  await post(guestCookie, safariTab, { action: 'join', matchId: host.id });
  const invalid = await post(guestCookie, safariTab, {
    action: 'ready',
    matchId: host.id,
    choices: { '1:12': 'N' },
  });
  assert.equal(invalid.status, 409);
  const columns = [1, 2, 3, 6, 7, 8];
  const white = Object.fromEntries(columns.map((x) => [`${x}:12`, 'N']));
  const black = Object.fromEntries(columns.map((x) => [`${x}:0`, 'B']));
  const own = await post(hostCookie, chromeTab1, {
    action: 'ready',
    matchId: host.id,
    choices: white,
  });
  assert.equal(own.status, 200);
  assert.deepEqual(games(await get(guestCookie, safariTab))[0]?.choices, {});
  const other = await post(guestCookie, safariTab, {
    action: 'ready',
    matchId: host.id,
    choices: black,
  });
  assert.equal(other.status, 200);
  assert.equal(games(await get(hostCookie, chromeTab1))[0]?.phase, 'playing');
  await post(hostCookie, chromeTab1, { action: 'leave', matchId: host.id });
  await post(guestCookie, safariTab, { action: 'leave', matchId: host.id });
});

void test('HTTP display names propagate only across the authenticated participant games', async () => {
  const hostCookie = 'chess_session=fa000003-3333-4333-8333-333333333333';
  const guestCookie = 'chess_session=fa000004-4444-4444-8444-444444444444';
  const [template] = createPresets();
  const host = match(
    await post(hostCookie, chromeTab1, {
      action: 'create',
      template,
      name: 'Host Name',
    }),
  );
  assert.ok(host);
  const guest = match(
    await post(guestCookie, safariTab, {
      action: 'join',
      matchId: host.id,
      name: 'Guest Name',
    }),
  );
  assert.ok(guest);
  assert.deepEqual(guest.players, { w: 'Host Name', b: 'Guest Name' });
  const renamed = await post(hostCookie, chromeTab1, {
    action: 'rename',
    name: 'Renamed Host',
  });
  assert.equal(renamed.status, 200);
  assert.equal(games(await get(guestCookie, safariTab))[0]?.players.w, 'Renamed Host');
  await post(hostCookie, chromeTab1, { action: 'leave', matchId: host.id });
  await post(guestCookie, safariTab, { action: 'leave', matchId: host.id });
});

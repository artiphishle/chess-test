import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPresets } from '../../templates/domain/createPresets.ts';
import { createInProcessGameRepository } from '../adapters/inProcessGameRepository.ts';
import { createGameService } from './createGameService.ts';

/*** Create deterministic durable-match application instances for authorization coverage. */
function service() {
  const ids = ['match-1', 'match-2', 'match-3'];
  return createGameService(
    createInProcessGameRepository(),
    () => ids.shift() ?? 'extra',
    () => 0,
    () => 0,
  );
}

void test('one cookie identity cannot occupy both seats across tabs and browsers', async () => {
  const games = service();
  const [standard] = createPresets();
  const waiting = await games.createAsync('player-a', standard);
  await assert.rejects(() => games.joinAsync('player-a', waiting.id), /Eigene Partie/);
  assert.equal((await games.gamesAsync('player-a')).length, 1);
  const joined = await games.joinAsync('player-b', waiting.id);
  assert.equal(joined.color, 'b');
  assert.equal((await games.snapshotAsync('player-a', waiting.id))?.color, 'w');
});

void test('auto-match accepts only another player with the same immutable template snapshot', async () => {
  const games = service();
  const [standard, wide] = createPresets();
  const waiting = await games.createAsync('host', standard);
  const own = await games.createAsync('host', standard);
  assert.equal(own.phase, 'waiting');
  const incompatible = await games.createAsync('guest', wide);
  assert.equal(incompatible.phase, 'waiting');
  const matched = await games.createAsync('guest', standard);
  assert.equal(matched.id, waiting.id);
  assert.equal(matched.color, 'b');
});

void test('parallel games remain isolated and each player can participate in both', async () => {
  const games = service();
  const [standard] = createPresets();
  const first = await games.createAsync('white', standard);
  const second = await games.createAsync('white', {
    ...structuredClone(standard),
    name: 'Second game',
  });
  await games.joinAsync('black', first.id);
  await games.joinAsync('black', second.id);
  const moved = await games.executeAsync('white', first.id, {
    action: 'move',
    move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } },
  });
  assert.equal(moved?.state?.turn, 'b');
  assert.equal((await games.snapshotAsync('white', second.id))?.state?.turn, 'w');
  assert.equal((await games.gamesAsync('white')).length, 2);
  assert.equal((await games.gamesAsync('black')).length, 2);
});

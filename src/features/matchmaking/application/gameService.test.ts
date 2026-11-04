import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPresets } from '../../templates/domain/createPresets.ts';
import { validateTemplate } from '../../templates/domain/validateTemplate.ts';
import { createGameService } from './createGameService.ts';

const sessions = () => {
  let counter = 0;
  return createGameService(() => `test-${++counter}`);
};

void test('first two anonymous players pair; next pair gets another game', () => {
  const service = sessions();
  const presets = createPresets();
  const a = service.create(undefined, presets[0]);
  assert.equal(a.match.phase, 'waiting');
  const b = service.join(undefined, a.match.id);
  assert.equal(b.match.color, 'b');
  assert.equal(b.match.id, a.match.id);
  assert.equal(b.match.template.id, presets[0]?.id);
  assert.equal(b.match.phase, 'playing');
  const c = service.create(undefined, presets[0]);
  assert.notEqual(c.match.id, a.match.id);
});

void test('queued template is copied, locked and cannot be modified from another session', () => {
  const service = sessions();
  const preset = structuredClone(createPresets()[0]);
  const queued = service.create(undefined, preset);
  (preset.cells as unknown[][])[0][0] = null;
  assert.equal(service.snapshot(queued.token, queued.match.id)?.template.cells[0]?.[0]?.kind, 'R');
  const rival = service.join(undefined, queued.match.id);
  assert.equal(service.snapshot(rival.token, rival.match.id)?.template.cells[0]?.[0]?.kind, 'R');
  assert.throws(
    () => service.execute(queued.token, queued.match.id, { action: 'choose', x: 1, y: 0, kind: 'N' }),
    /locked/,
  );
});

void test('choice coins are private, independent and cannot be changed once selected', () => {
  const service = sessions();
  const [, preset] = createPresets();
  const white = service.create(undefined, preset);
  const black = service.join(undefined, white.match.id);
  assert.equal(white.match.phase, 'waiting');
  assert.equal(black.match.phase, 'setup');
  assert.throws(
    () => service.execute(white.token, white.match.id, { action: 'choose', x: 0, y: 0, kind: 'B' }),
    /not allowed/,
  );
  service.execute(white.token, white.match.id, { action: 'choose', x: 1, y: 12, kind: 'N' });
  const rival = service.snapshot(black.token, black.match.id);
  assert.ok(rival);
  assert.deepEqual(rival.choices, {});
  assert.equal(rival.template.cells[12][1]?.kind, 'coin');
  assert.throws(
    () => service.execute(white.token, white.match.id, { action: 'choose', x: 1, y: 12, kind: 'B' }),
    /already resolved/,
  );
});

void test('completing both players coins starts automatically and locks every choice', () => {
  const service = sessions();
  const [, preset] = createPresets();
  const white = service.create(undefined, preset);
  const black = service.join(undefined, white.match.id);
  for (const x of [1, 2, 3, 6, 7, 8]) {
    service.execute(white.token, white.match.id, { action: 'choose', x, y: 12, kind: 'N' });
  }
  const waiting = service.snapshot(white.token, white.match.id);
  assert.ok(waiting);
  assert.equal(waiting.phase, 'setup');
  assert.deepEqual(waiting.ready, { w: true, b: false });
  assert.throws(
    () => service.execute(white.token, white.match.id, { action: 'choose', x: 1, y: 12, kind: 'B' }),
    /locked/,
  );
  for (const x of [1, 2, 3, 6, 7, 8]) {
    service.execute(black.token, black.match.id, { action: 'choose', x, y: 0, kind: 'B' });
  }
  const result = service.snapshot(white.token, white.match.id);
  assert.ok(result);
  assert.ok(result.state);
  assert.equal(result.phase, 'playing');
  assert.equal(result.state.board[12][1]?.kind, 'N');
  assert.equal(result.state.board[0][1]?.kind, 'B');
  assert.equal(result.template.cells[12][1]?.kind, 'coin');
});

void test('server blocks moving out of turn, illegal moves, and opponent moves', () => {
  const service = sessions();
  const a = service.create(undefined, createPresets()[0]);
  const b = service.join(undefined, a.match.id);
  assert.throws(
    () =>
      service.execute(b.token, b.match.id, {
        action: 'move',
        move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
      }),
    /Not your turn/,
  );
  assert.throws(
    () =>
      service.execute(a.token, a.match.id, {
        action: 'move',
        move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
      }),
    /Illegal move/,
  );
  assert.equal(
    service.execute(a.token, a.match.id, { action: 'move', move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } } })
      ?.state?.turn,
    'b',
  );
});

void test('resignation, rematch and departures enforce match ownership', () => {
  const service = sessions();
  const a = service.create(undefined, createPresets()[0]);
  const b = service.join(undefined, a.match.id);
  assert.equal(service.execute(a.token, a.match.id, { action: 'resign' })?.result?.winner, 'b');
  assert.equal(service.execute(a.token, a.match.id, { action: 'rematch' })?.phase, 'finished');
  assert.equal(service.execute(b.token, b.match.id, { action: 'rematch' })?.phase, 'playing');
  assert.equal(service.execute(b.token, b.match.id, { action: 'leave' }), null);
  assert.equal(service.snapshot(a.token, a.match.id)?.result?.winner, 'w');
  assert.throws(() => service.execute(b.token, b.match.id, { action: 'resign' }), /No active session/);
});

void test('validate rejects malformed boards and forbidden coin choice values', () => {
  assert.throws(() => validateTemplate({ ...createPresets()[0], width: 33 }), /between/);
  const [, preset] = createPresets();
  const cells = preset.cells.map((row) => [...row]);
  cells[12][1] = { kind: 'coin', color: 'w', options: ['N', 'Z' as 'N'] };
  assert.throws(() => validateTemplate({ ...preset, cells }), /Invalid board/);
});

void test('automatic setup supports asymmetric and custom free-coin choices', () => {
  const service = sessions();
  const preset = structuredClone(createPresets()[0]);
  const cells = preset.cells.map((row) => [...row]);
  cells[7][1] = { kind: 'coin', color: 'w', options: ['P', 'N', 'B', 'R', 'Q', 'K'] };
  cells[0][1] = { kind: 'coin', color: 'b', options: ['P', 'N', 'B', 'R', 'Q', 'K'] };
  const free = { ...preset, cells };
  const white = service.create(undefined, free);
  const black = service.join(undefined, white.match.id);
  assert.equal(black.match.phase, 'setup');
  assert.throws(
    () => service.execute(white.token, white.match.id, { action: 'choose', x: 1, y: 0, kind: 'Q' }),
    /not allowed/,
  );
  service.execute(black.token, black.match.id, { action: 'choose', x: 1, y: 0, kind: 'Q' });
  assert.equal(service.snapshot(black.token, black.match.id)?.ready.b, true);
  assert.equal(service.snapshot(white.token, white.match.id)?.phase, 'setup');
  service.execute(white.token, white.match.id, { action: 'choose', x: 1, y: 7, kind: 'R' });
  assert.equal(service.snapshot(white.token, white.match.id)?.phase, 'playing');
  assert.equal(service.snapshot(white.token, white.match.id)?.state?.board[7]?.[1]?.kind, 'R');
  assert.equal(service.snapshot(white.token, white.match.id)?.state?.board[0]?.[1]?.kind, 'Q');
  assert.throws(
    () => service.execute(black.token, black.match.id, { action: 'choose', x: 1, y: 0, kind: 'N' }),
    /locked/,
  );
});

void test('rematch reopens each player coin selection and keeps the original template', () => {
  const service = sessions();
  const [, coinTemplate] = createPresets();
  const white = service.create(undefined, coinTemplate);
  const black = service.join(undefined, white.match.id);
  for (const x of [1, 2, 3, 6, 7, 8]) {
    service.execute(white.token, white.match.id, { action: 'choose', x, y: 12, kind: 'N' });
    service.execute(black.token, black.match.id, { action: 'choose', x, y: 0, kind: 'B' });
  }
  assert.equal(service.execute(white.token, white.match.id, { action: 'resign' })?.phase, 'finished');
  service.execute(white.token, white.match.id, { action: 'rematch' });
  const pending = service.execute(black.token, black.match.id, { action: 'rematch' });
  assert.equal(pending?.phase, 'setup');
  assert.ok(pending);
  assert.deepEqual(pending.choices, {});
  assert.deepEqual(pending.ready, { w: false, b: false });
  assert.equal(pending.template.cells[12][1]?.kind, 'coin');
});

void test('public lobby contains many independent custom 10x13 offers and no private choices', () => {
  const service = sessions();
  const [, wide] = createPresets();
  const offers = Array.from({ length: 20 }, (_, i) =>
    service.create(`host-${i}`, { ...wide, name: `Wide ${i}` }),
  );
  const lobby = service.lobby();
  assert.equal(lobby.length, 20);
  assert.equal(lobby[0]?.width, 10);
  assert.equal(lobby[0]?.height, 13);
  assert.equal(lobby[0]?.coins, 12);
  assert.deepEqual(Object.keys(lobby[0] ?? {}).sort(), [
    'coins',
    'createdAt',
    'height',
    'id',
    'name',
    'width',
  ]);
  const selected = offers.at(12);
  assert.ok(selected);
  const visitor = service.join('visitor', selected.match.id);
  assert.equal(visitor.match.id, selected.match.id);
  assert.equal(visitor.match.color, 'b');
  assert.equal(visitor.match.phase, 'setup');
  assert.equal(service.lobby().length, 19);
  assert.ok(service.lobby().some((match) => match.id === offers[13]?.match.id));
  assert.equal(service.snapshot(selected.token, selected.match.id)?.template.name, 'Wide 12');
  assert.throws(() => service.join('late-visitor', selected.match.id), /nicht mehr verfügbar/);
  assert.equal(service.join('visitor', selected.match.id).match.id, selected.match.id);
});

void test('claiming an already filled game never assigns two opponents', () => {
  const service = sessions();
  const [standard] = createPresets();
  const offer = service.create('white', standard);
  const black = service.join('black', offer.match.id);
  assert.equal(black.match.phase, 'playing');
  assert.throws(() => service.join('racer', offer.match.id), /nicht mehr verfügbar/);
  assert.equal(service.snapshot('racer', offer.match.id), null);
  assert.equal(service.snapshot('white', offer.match.id)?.id, black.match.id);
  assert.equal(service.snapshot('black', offer.match.id)?.color, 'b');
});

void test('expired and cancelled public offers cannot be claimed', () => {
  let now = 10;
  let nextId = 0;
  const service = createGameService(
    () => `id-${++nextId}`,
    () => now,
  );
  const [standard] = createPresets();
  const cancelled = service.create('owner-a', standard);
  assert.equal(service.execute('owner-a', cancelled.match.id, { action: 'leave' }), null);
  assert.throws(() => service.join('guest-a', cancelled.match.id), /nicht mehr verfügbar/);
  const expired = service.create('owner-b', standard);
  now += 900_001;
  assert.deepEqual(service.lobby(), []);
  assert.equal(service.snapshot('owner-b', expired.match.id), null);
  assert.throws(() => service.join('guest-b', expired.match.id), /nicht mehr verfügbar/);
});

void test('one player hosts three games and can participate in all after independent joins', () => {
  const service = sessions();
  const [standard, wide] = createPresets();
  const first = service.create('host', standard);
  const second = service.create('host', wide);
  const third = service.create('host', { ...wide, name: 'Third offer' });
  assert.equal(service.games('host').length, 3);
  assert.equal(service.lobby().length, 3);
  assert.ok(service.games('host').every((match) => match.phase === 'waiting'));
  const challengerTwo = service.join('guest-two', second.match.id);
  assert.equal(service.games('host').filter((match) => match.phase === 'setup').length, 1);
  assert.equal(service.lobby().length, 2);
  const challengerOne = service.join('guest-one', first.match.id);
  assert.equal(service.games('host').filter((match) => match.phase !== 'waiting').length, 2);
  assert.equal(service.games('host').find((match) => match.id === third.match.id)?.phase, 'waiting');
  assert.equal(service.games('guest-one')[0]?.id, first.match.id);
  assert.equal(service.games('guest-two')[0]?.id, second.match.id);
  assert.throws(
    () => service.execute('guest-one', second.match.id, { action: 'leave' }),
    /No active session/,
  );
  assert.equal(service.execute('host', third.match.id, { action: 'leave' }), null);
  assert.deepEqual(service.games('host').map((match) => match.id), [first.match.id, second.match.id]);
  assert.equal(service.snapshot(challengerOne.token, first.match.id)?.phase, 'playing');
  assert.equal(service.snapshot(challengerTwo.token, second.match.id)?.phase, 'setup');
});

void test('leaving a finished game preserves other games and their independent turns', () => {
  const service = sessions();
  const [standard] = createPresets();
  const a = service.create('host', standard);
  const b = service.create('host', standard);
  service.join('guest-a', a.match.id);
  service.join('guest-b', b.match.id);
  const move = { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } };
  service.execute('host', b.match.id, { action: 'move', move });
  assert.equal(service.snapshot('host', b.match.id)?.state?.turn, 'b');
  assert.equal(service.snapshot('host', a.match.id)?.state?.turn, 'w');
  assert.equal(service.execute('host', a.match.id, { action: 'leave' }), null);
  assert.equal(service.games('host').length, 1);
  assert.equal(service.games('host')[0]?.id, b.match.id);
  assert.equal(service.snapshot('guest-a', a.match.id)?.result?.winner, 'b');
  assert.throws(() => service.execute('host', a.match.id, { action: 'move', move }), /No active/);
});

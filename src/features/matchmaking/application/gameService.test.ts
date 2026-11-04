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
  const a = service.join(undefined, presets[0]);
  assert.equal(a.match.phase, 'waiting');
  const b = service.join(undefined, presets[2]);
  assert.equal(b.match.color, 'b');
  assert.equal(b.match.id, a.match.id);
  assert.equal(b.match.template.id, presets[0]?.id);
  assert.equal(b.match.phase, 'playing');
  const c = service.join(undefined, presets[0]);
  assert.notEqual(c.match.id, a.match.id);
});

void test('queued template is copied, locked and cannot be modified from another session', () => {
  const service = sessions();
  const preset = structuredClone(createPresets()[0]);
  const queued = service.join(undefined, preset);
  (preset.cells as unknown[][])[0][0] = null;
  assert.equal(service.snapshot(queued.token)?.template.cells[0]?.[0]?.kind, 'R');
  const rival = service.join(undefined, createPresets()[1]);
  assert.equal(service.snapshot(rival.token)?.template.cells[0]?.[0]?.kind, 'R');
  assert.throws(
    () => service.execute(queued.token, { action: 'choose', x: 1, y: 0, kind: 'N' }),
    /locked/,
  );
});

void test('choice coins are private, independently resolved and immutable after ready', () => {
  const service = sessions();
  const [, preset] = createPresets();
  const a = service.join(undefined, preset);
  const b = service.join(undefined, preset);
  assert.equal(a.match.phase, 'waiting');
  assert.equal(b.match.phase, 'setup');
  assert.throws(
    () => service.execute(a.token, { action: 'choose', x: 0, y: 0, kind: 'B' }),
    /not allowed/,
  );
  assert.equal(service.snapshot(a.token)?.ready.w, false);
  assert.equal(service.snapshot(a.token)?.ready.b, false);
  service.execute(a.token, { action: 'choose', x: 1, y: 12, kind: 'N' });
  assert.equal(service.snapshot(b.token)?.choices['1:12'], undefined);
  assert.equal(service.snapshot(b.token)?.template.cells[12]?.[1]?.kind, 'coin');
  assert.throws(
    () => service.execute(a.token, { action: 'choose', x: 1, y: 12, kind: 'B' }),
    /already resolved/,
  );
  for (const x of [2, 3, 6, 7, 8]) {
    service.execute(a.token, { action: 'choose', x, y: 12, kind: 'N' });
  }
  assert.equal(service.snapshot(a.token)?.phase, 'setup');
  assert.equal(service.snapshot(a.token)?.ready.w, true);
  assert.equal(service.snapshot(a.token)?.ready.b, false);
  assert.throws(
    () => service.execute(a.token, { action: 'choose', x: 1, y: 12, kind: 'B' }),
    /locked/,
  );
  for (const x of [1, 2, 3, 6, 7, 8]) {
    service.execute(b.token, { action: 'choose', x, y: 0, kind: 'B' });
  }
  const state = service.snapshot(a.token);
  assert.ok(state?.state);
  assert.equal(state.phase, 'playing');
  assert.equal(state.state.board[12]?.[1]?.kind, 'N');
  assert.equal(state.state.board[0]?.[1]?.kind, 'B');
  assert.equal(state.template.cells[12]?.[1]?.kind, 'coin');
});

void test('server blocks moving out of turn, illegal moves, and opponent moves', () => {
  const service = sessions();
  const a = service.join(undefined, createPresets()[0]);
  const b = service.join(undefined, createPresets()[0]);
  assert.throws(
    () =>
      service.execute(b.token, {
        action: 'move',
        move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
      }),
    /Not your turn/,
  );
  assert.throws(
    () =>
      service.execute(a.token, {
        action: 'move',
        move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
      }),
    /Illegal move/,
  );
  assert.equal(
    service.execute(a.token, { action: 'move', move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } } })
      ?.state?.turn,
    'b',
  );
});

void test('resignation, rematch and departures enforce match ownership', () => {
  const service = sessions();
  const a = service.join(undefined, createPresets()[0]);
  const b = service.join(undefined, createPresets()[0]);
  assert.equal(service.execute(a.token, { action: 'resign' })?.result?.winner, 'b');
  assert.equal(service.execute(a.token, { action: 'rematch' })?.phase, 'finished');
  assert.equal(service.execute(b.token, { action: 'rematch' })?.phase, 'playing');
  assert.equal(service.execute(b.token, { action: 'leave' }), null);
  assert.equal(service.snapshot(a.token)?.result?.winner, 'w');
  assert.throws(() => service.execute(b.token, { action: 'resign' }), /No active session/);
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
  cells[7]![1] = { kind: 'coin', color: 'w', options: ['P', 'N', 'B', 'R', 'Q', 'K'] };
  cells[0]![1] = { kind: 'coin', color: 'b', options: ['P', 'N', 'B', 'R', 'Q', 'K'] };
  const free = { ...preset, cells };
  const white = service.join(undefined, free);
  const black = service.join(undefined, free);
  assert.equal(black.match.phase, 'setup');
  assert.throws(
    () => service.execute(white.token, { action: 'choose', x: 1, y: 0, kind: 'Q' }),
    /not allowed/,
  );
  service.execute(black.token, { action: 'choose', x: 1, y: 0, kind: 'Q' });
  assert.equal(service.snapshot(black.token)?.ready.b, true);
  assert.equal(service.snapshot(white.token)?.phase, 'setup');
  service.execute(white.token, { action: 'choose', x: 1, y: 7, kind: 'R' });
  assert.equal(service.snapshot(white.token)?.phase, 'playing');
  assert.equal(service.snapshot(white.token)?.state?.board[7]?.[1]?.kind, 'R');
  assert.equal(service.snapshot(white.token)?.state?.board[0]?.[1]?.kind, 'Q');
  assert.throws(
    () => service.execute(black.token, { action: 'choose', x: 1, y: 0, kind: 'N' }),
    /locked/,
  );
});

void test('rematch reopens each player coin selection and keeps the original template', () => {
  const service = sessions();
  const coinTemplate = createPresets()[1];
  const white = service.join(undefined, coinTemplate);
  const black = service.join(undefined, coinTemplate);
  for (const x of [1, 2, 3, 6, 7, 8]) {
    service.execute(white.token, { action: 'choose', x, y: 12, kind: 'N' });
    service.execute(black.token, { action: 'choose', x, y: 0, kind: 'B' });
  }
  assert.equal(service.execute(white.token, { action: 'resign' })?.phase, 'finished');
  service.execute(white.token, { action: 'rematch' });
  const pending = service.execute(black.token, { action: 'rematch' });
  assert.equal(pending?.phase, 'setup');
  assert.deepEqual(pending?.choices, {});
  assert.deepEqual(pending?.ready, { w: false, b: false });
  assert.equal(pending?.template.cells[12]?.[1]?.kind, 'coin');
});

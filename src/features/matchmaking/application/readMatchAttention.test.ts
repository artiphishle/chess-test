import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Cell } from '../../../types/chess.ts';
import { getCheckedKingPositions } from '../../chess/domain/getCheckedKingPositions.ts';
import { createPresets } from '../../templates/domain/createPresets.ts';
import { createGameService } from './createGameService.ts';
import { readMatchAttention } from './readMatchAttention.ts';

void test('each game indicates its own turn independently of the selected UI tab', () => {
  let next = 0;
  const service = createGameService(() => `match-${++next}`);
  const [standard] = createPresets();
  const first = service.create('host', standard);
  const second = service.create('host', standard);
  assert.equal(readMatchAttention(first.match), null);
  service.join('guest-first', first.match.id);
  service.join('guest-second', second.match.id);
  const beforeFirst = service.snapshot('host', first.match.id);
  const beforeSecond = service.snapshot('host', second.match.id);
  assert.ok(beforeFirst);
  assert.ok(beforeSecond);
  assert.equal(readMatchAttention(beforeFirst), 'turn');
  assert.equal(readMatchAttention(beforeSecond), 'turn');
  service.execute('host', first.match.id, {
    action: 'move',
    move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } },
  });
  const afterFirst = service.snapshot('host', first.match.id);
  const afterSecond = service.snapshot('host', second.match.id);
  const guestFirst = service.snapshot('guest-first', first.match.id);
  assert.ok(afterFirst);
  assert.ok(afterSecond);
  assert.ok(guestFirst);
  assert.equal(readMatchAttention(afterFirst), null);
  assert.equal(readMatchAttention(afterSecond), 'turn');
  assert.equal(readMatchAttention(guestFirst), 'turn');
});

void test('10x13 check highlights the attacked king and prioritizes the check tab badge', () => {
  const [, wide] = createPresets();
  const cells: Cell[][] = Array.from({ length: wide.height }, () =>
    Array<Cell>(wide.width).fill(null),
  );
  cells[wide.height - 1][4] = { color: 'w', kind: 'K' };
  cells[0][0] = { color: 'b', kind: 'K' };
  cells[6][4] = { color: 'b', kind: 'R' };
  const service = createGameService(() => 'unused');
  const white = service.create('host', { ...wide, cells });
  service.join('visitor', white.match.id);
  const whiteState = service.snapshot('host', white.match.id);
  const blackState = service.snapshot('visitor', white.match.id);
  assert.ok(whiteState?.state);
  assert.ok(blackState?.state);
  assert.deepEqual(getCheckedKingPositions(whiteState.state.board), [{ x: 4, y: wide.height - 1 }]);
  assert.equal(readMatchAttention(whiteState), 'check');
  assert.equal(readMatchAttention(blackState), null);
  service.execute('host', white.match.id, {
    action: 'move',
    move: { from: { x: 4, y: wide.height - 1 }, to: { x: 3, y: wide.height - 1 } },
  });
  const resolved = service.snapshot('host', white.match.id);
  assert.ok(resolved?.state);
  assert.deepEqual(getCheckedKingPositions(resolved.state.board), []);
});

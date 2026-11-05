import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PieceKind, Template } from '../../../types/chess.ts';
import { createPresets } from '../../templates/domain/createPresets.ts';
import { validateTemplate } from '../../templates/domain/validateTemplate.ts';
import { createGameService } from './createGameService.ts';

const [standard, wide] = createPresets();

/*** Create an independent service with deterministic IDs. */
function sessions() {
  const counter = { value: 0 };
  return createGameService(() => `test-${++counter.value}`);
}

/*** Build only the selected side's coin assignments. */
function coinChoices(template: Template, color: 'w' | 'b', kind: PieceKind) {
  return Object.fromEntries(
    template.cells.flatMap((row, y) =>
      row.flatMap((cell, x) =>
        cell?.kind === 'coin' && cell.color === color ? [[`${x}:${y}`, kind] as const] : [],
      ),
    ),
  );
}

void test('multiple public offers belong to their own owner and first claimant', () => {
  const service = sessions();
  const a = service.create('host', standard);
  const b = service.create('host', wide);
  const c = service.create('host', standard);
  assert.equal(service.lobby().length, 3);
  assert.equal(service.join('guest', a.match.id).match.phase, 'playing');
  assert.equal(service.games('host').length, 3);
  assert.equal(service.lobby().length, 2);
  assert.throws(() => service.join('racer', a.match.id), /nicht mehr verfügbar/);
  assert.throws(() => service.join('host', b.match.id), /Eigene Partie/);
  service.execute('host', c.match.id, { action: 'leave' });
  assert.equal(service.lobby().length, 1);
});

void test('a queued template remains an immutable snapshot', () => {
  const service = sessions();
  const template = structuredClone(standard);
  const offer = service.create('host', template);
  (template.cells as unknown[][])[0]![0] = null;
  assert.equal(service.snapshot('host', offer.match.id)?.template.cells[0]?.[0]?.kind, 'R');
});

void test('owned coin choices are sent atomically, private, and locked only after Ready', () => {
  const service = sessions();
  const white = service.create('white', wide);
  const black = service.join('black', white.match.id);
  assert.equal(black.match.phase, 'setup');
  const selectedWhite = coinChoices(wide, 'w', 'N');
  const selectedBlack = coinChoices(wide, 'b', 'B');
  assert.equal(Object.keys(selectedWhite).length, 6);
  assert.throws(() => service.execute('white', white.match.id, {
    action: 'ready', choices: { ...selectedWhite, '1:0': 'N' },
  }), /Incomplete/);
  assert.throws(() => service.execute('white', white.match.id, {
    action: 'ready', choices: { ...selectedWhite, '1:12': 'Q' },
  }), /not allowed/);
  assert.deepEqual(service.snapshot('white', white.match.id)?.choices, {});
  const own = service.execute('white', white.match.id, {
    action: 'ready', choices: selectedWhite,
  });
  assert.equal(own?.ready.w, true);
  assert.equal(own?.phase, 'setup');
  assert.deepEqual(service.snapshot('black', white.match.id)?.choices, {});
  assert.throws(() => service.execute('white', white.match.id, {
    action: 'ready', choices: selectedWhite,
  }), /locked/);
  const done = service.execute('black', white.match.id, {
    action: 'ready', choices: selectedBlack,
  });
  assert.equal(done?.phase, 'playing');
  assert.equal(done?.state?.board[12]?.[1]?.kind, 'N');
  assert.equal(done?.state?.board[0]?.[1]?.kind, 'B');
  assert.equal(done?.template.cells[12]?.[1]?.kind, 'coin');
});

void test('free coins permit any piece and reject foreign coordinates', () => {
  const service = sessions();
  const cells = standard.cells.map((row) => [...row]);
  cells[7]![1] = { kind: 'coin', color: 'w', options: ['P', 'N', 'B', 'R', 'Q', 'K'] };
  cells[0]![1] = { kind: 'coin', color: 'b', options: ['P', 'N', 'B', 'R', 'Q', 'K'] };
  const template = { ...standard, cells };
  const offer = service.create('white', template);
  service.join('black', offer.match.id);
  assert.throws(() => service.execute('white', offer.match.id, {
    action: 'ready', choices: { '1:0': 'Q' },
  }), /not allowed/);
  service.execute('white', offer.match.id, { action: 'ready', choices: { '1:7': 'R' } });
  const done = service.execute('black', offer.match.id, {
    action: 'ready', choices: { '1:0': 'Q' },
  });
  assert.equal(done?.state?.board[7]?.[1]?.kind, 'R');
  assert.equal(done?.state?.board[0]?.[1]?.kind, 'Q');
});

void test('normal turns remain server-authoritative and replays reset choices', () => {
  const service = sessions();
  const offer = service.create('a', standard);
  service.join('b', offer.match.id);
  assert.throws(() => service.execute('b', offer.match.id, {
    action: 'move', move: { from: { x: 4, y: 1 }, to: { x: 4, y: 3 } },
  }), /Not your turn/);
  assert.equal(service.execute('a', offer.match.id, {
    action: 'move', move: { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } },
  })?.state?.turn, 'b');
  service.execute('a', offer.match.id, { action: 'resign' });
  assert.equal(service.execute('a', offer.match.id, { action: 'rematch' })?.phase, 'finished');
  assert.equal(service.execute('b', offer.match.id, { action: 'rematch' })?.phase, 'playing');
  assert.throws(() => service.execute('outsider', offer.match.id, { action: 'resign' }), /No active/);
  const coinOffer = service.create('a', wide);
  service.join('c', coinOffer.match.id);
  service.execute('a', coinOffer.match.id, { action: 'ready', choices: coinChoices(wide, 'w', 'N') });
  service.execute('c', coinOffer.match.id, { action: 'ready', choices: coinChoices(wide, 'b', 'B') });
  service.execute('a', coinOffer.match.id, { action: 'resign' });
  service.execute('a', coinOffer.match.id, { action: 'rematch' });
  const reset = service.execute('c', coinOffer.match.id, { action: 'rematch' });
  assert.equal(reset?.phase, 'setup');
  assert.deepEqual(reset?.ready, { w: false, b: false });
  assert.deepEqual(reset?.choices, {});
});

void test('random starts are decided server-side with injected randomness', () => {
  const template: Template = { ...standard, turn: 'random' };
  const one = createGameService(() => 'id-one', () => 0, () => 0);
  const two = createGameService(() => 'id-two', () => 0, () => 0.9);
  const a = one.create('a', template);
  const b = two.create('a', template);
  assert.equal(one.join('b', a.match.id).match.state?.turn, 'w');
  assert.equal(two.join('b', b.match.id).match.state?.turn, 'b');
  assert.equal(validateTemplate(template).turn, 'random');
});

void test('names are visible, autosave compatible and safely validated', () => {
  const service = sessions();
  const a = service.create('a', standard, 'Ersteller');
  const second = service.create('a', wide, 'Ersteller');
  assert.equal(service.lobby()[0]?.hostName, 'Ersteller');
  assert.equal(service.join('b', a.match.id, 'Gast B').match.players.b, 'Gast B');
  service.rename('a', 'Neuer Name');
  assert.equal(service.snapshot('b', a.match.id)?.players.w, 'Neuer Name');
  assert.equal(service.snapshot('a', second.match.id)?.players.w, 'Neuer Name');
  assert.equal(service.lobby()[0]?.hostName, 'Neuer Name');
  assert.throws(() => service.rename('outsider', 'Hacker'), /No active/);
  assert.throws(() => service.rename('a', 'x'.repeat(33)), /Invalid player name/);
  assert.throws(() => service.create('other', standard, '\n'), /Invalid player name/);
});

void test('lobby presence holds active offers and cleans up absent hosts', () => {
  const now = { value: 0 };
  const counter = { value: 0 };
  const service = createGameService(() => `id-${++counter.value}`, () => now.value);
  const live = service.create('live', standard);
  const silent = service.create('silent', standard);
  now.value = 70_000;
  assert.equal(service.games('live').length, 1);
  now.value = 100_000;
  assert.deepEqual(service.lobby().map((offer) => offer.id), [live.match.id]);
  assert.equal(service.snapshot('silent', silent.match.id), null);
  assert.throws(() => service.join('late', silent.match.id), /nicht mehr verfügbar/);
  now.value = 159_000;
  assert.equal(service.lobby().length, 1);
  now.value = 161_000;
  assert.equal(service.lobby().length, 0);
});

void test('server rejects invalid dimensions and coin values', () => {
  const service = sessions();
  assert.throws(() => service.create('a', { ...standard, width: 35 }), /between/);
  const cells = wide.cells.map((row) => [...row]);
  cells[12]![1] = { kind: 'coin', color: 'w', options: ['N', 'Z' as 'N'] };
  assert.throws(() => validateTemplate({ ...wide, cells }), /Invalid board/);
});

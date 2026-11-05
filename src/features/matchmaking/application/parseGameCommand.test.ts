import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseGameCommand } from './parseGameCommand.ts';

void test('slash commands parse with or without the leading slash', () => {
  assert.deepEqual(parseGameCommand('/help'), { kind: 'help' });
  assert.deepEqual(parseGameCommand('draw'), { kind: 'draw' });
  assert.deepEqual(parseGameCommand('/resign'), { kind: 'resign' });
  assert.deepEqual(parseGameCommand(' /CHEAT Qf4 '), { kind: 'cheat', notation: 'Qf4' });
});
void test('invalid command arguments cannot fall through to game actions', () => {
  assert.equal(parseGameCommand('/draw now').kind, 'invalid');
  assert.equal(parseGameCommand('/cheat').kind, 'invalid');
  assert.equal(parseGameCommand('/unknown').kind, 'invalid');
  assert.equal(parseGameCommand('a'.repeat(100)).kind, 'invalid');
});

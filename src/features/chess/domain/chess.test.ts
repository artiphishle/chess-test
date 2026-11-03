import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Cell, Color, PieceKind, Template } from '../../../types/chess.ts';
import { createPresets } from '../../templates/domain/createPresets.ts';
import { createGameState } from './createGameState.ts';
import { getLegalMoves } from './getLegalMoves.ts';
import { isKingInCheck } from './isKingInCheck.ts';
import { playMove } from './playMove.ts';
import { readOutcome } from './readOutcome.ts';

const choices: Record<Color, Record<string, PieceKind>> = { w: {}, b: {} };
const empty = (width = 8, height = 8): Template => ({
  id: 'free',
  name: 'Free',
  width,
  height,
  turn: 'w',
  cells: Array.from({ length: height }, () => Array<Cell>(width).fill(null)),
});
const change = (
  template: Template,
  points: readonly { x: number; y: number; color: Color; kind: PieceKind }[],
  turn: Color = 'w',
): Template => {
  const cells = template.cells.map((row) => [...row]);
  for (const { x, y, color, kind } of points) cells[y][x] = { color, kind };
  return { ...template, cells, turn };
};

test('standard chess has 20 legal opening moves and normal alternating turns', () => {
  const state = createGameState(createPresets()[0], choices);
  assert.equal(getLegalMoves(state).length, 20);
  const after = playMove(state, { from: { x: 4, y: 6 }, to: { x: 4, y: 4 } });
  assert.equal(after.turn, 'b');
  assert.deepEqual(after.enPassant, { x: 4, y: 5 });
  assert.equal(getLegalMoves(after).length, 20);
});

test('10×13 coins are independent, fully resolved and immutable', () => {
  const preset = createPresets()[1];
  assert.equal(preset.width, 10);
  assert.equal(preset.height, 13);
  assert.equal(preset.cells[12].filter((cell) => cell?.kind === 'coin').length, 6);
  const resolved: Record<Color, Record<string, PieceKind>> = { w: {}, b: {} };
  for (const color of ['w', 'b'] as const)
    for (let x = 0; x < 10; x++) {
      const y = color === 'w' ? 12 : 0;
      if (preset.cells[y]?.[x]?.kind === 'coin') resolved[color][`${x}:${y}`] = x % 2 ? 'B' : 'N';
    }
  const state = createGameState(preset, resolved);
  assert.equal(state.board[12]?.[1]?.kind, 'B');
  assert.equal(state.board[0]?.[2]?.kind, 'N');
  assert.equal(preset.cells[12]?.[1]?.kind, 'coin');
  assert.throws(() => createGameState(preset, choices), /Unresolved/);
});

test('kingless side plays but only an existing king can be mated', () => {
  const template = change(empty(), [
    { x: 1, y: 7, color: 'w', kind: 'R' },
    { x: 4, y: 0, color: 'b', kind: 'K' },
  ]);
  const state = createGameState(template, choices);
  assert.equal(isKingInCheck(state.board, 'w'), false);
  assert.ok(getLegalMoves(state).length > 0);
  assert.equal(readOutcome(state), null);
});

test('custom K+B+N versus K is a valid configurable training setup', () => {
  const state = createGameState(createPresets()[2], choices);
  assert.equal(state.board.flat().filter(Boolean).length, 4);
  assert.ok(getLegalMoves(state).length > 0);
  assert.equal(readOutcome(state), null);
});

test('checkmate and stalemate are distinguished', () => {
  const mate = change(
    empty(),
    [
      { x: 0, y: 0, color: 'b', kind: 'K' },
      { x: 1, y: 1, color: 'w', kind: 'Q' },
      { x: 2, y: 2, color: 'w', kind: 'K' },
    ],
    'b',
  );
  assert.deepEqual(readOutcome(createGameState(mate, choices)), {
    winner: 'w',
    reason: 'checkmate',
  });
  const stale = change(
    empty(),
    [
      { x: 0, y: 0, color: 'b', kind: 'K' },
      { x: 1, y: 2, color: 'w', kind: 'Q' },
      { x: 2, y: 2, color: 'w', kind: 'K' },
    ],
    'b',
  );
  assert.deepEqual(readOutcome(createGameState(stale, choices)), {
    winner: null,
    reason: 'stalemate',
  });
});

test('en passant captures only immediately after a double pawn move', () => {
  const state = createGameState(
    change(
      empty(),
      [
        { x: 4, y: 7, color: 'w', kind: 'K' },
        { x: 4, y: 0, color: 'b', kind: 'K' },
        { x: 4, y: 3, color: 'w', kind: 'P' },
        { x: 3, y: 1, color: 'b', kind: 'P' },
      ],
      'b',
    ),
    choices,
  );
  const pushed = playMove(state, { from: { x: 3, y: 1 }, to: { x: 3, y: 3 } });
  const captured = playMove(pushed, { from: { x: 4, y: 3 }, to: { x: 3, y: 2 } });
  assert.equal(captured.board[3]?.[3], null);
  assert.equal(captured.board[2]?.[3]?.color, 'w');
});

test('promotion can choose each legal promotion piece and rejects omissions', () => {
  const state = createGameState(
    change(empty(), [
      { x: 4, y: 7, color: 'w', kind: 'K' },
      { x: 4, y: 0, color: 'b', kind: 'K' },
      { x: 0, y: 1, color: 'w', kind: 'P' },
    ]),
    choices,
  );
  assert.equal(getLegalMoves(state, { x: 0, y: 1 }).length, 4);
  assert.throws(() => playMove(state, { from: { x: 0, y: 1 }, to: { x: 0, y: 0 } }), /Illegal/);
  assert.equal(
    playMove(state, { from: { x: 0, y: 1 }, to: { x: 0, y: 0 }, promotion: 'N' }).board[0]?.[0]
      ?.kind,
    'N',
  );
});

test('castling checks transit attacks and revoked rook rights', () => {
  const state = createGameState(
    change(empty(), [
      { x: 4, y: 7, color: 'w', kind: 'K' },
      { x: 0, y: 7, color: 'w', kind: 'R' },
      { x: 7, y: 7, color: 'w', kind: 'R' },
      { x: 4, y: 0, color: 'b', kind: 'K' },
    ]),
    choices,
  );
  assert.equal(getLegalMoves(state, { x: 4, y: 7 }).filter((move) => move.castle).length, 2);
  const castled = playMove(state, { from: { x: 4, y: 7 }, to: { x: 6, y: 7 } });
  assert.equal(castled.board[7]?.[5]?.kind, 'R');
  assert.equal(castled.castling.w.K, false);
  const blocked = createGameState(
    change(empty(), [
      { x: 4, y: 7, color: 'w', kind: 'K' },
      { x: 0, y: 7, color: 'w', kind: 'R' },
      { x: 7, y: 7, color: 'w', kind: 'R' },
      { x: 4, y: 0, color: 'b', kind: 'K' },
      { x: 5, y: 0, color: 'b', kind: 'R' },
    ]),
    choices,
  );
  assert.equal(getLegalMoves(blocked, { x: 4, y: 7 }).filter((move) => move.castle).length, 1);
});

test('no player can capture a king or leave their own king attacked', () => {
  const state = createGameState(
    change(empty(), [
      { x: 4, y: 7, color: 'w', kind: 'K' },
      { x: 4, y: 6, color: 'w', kind: 'R' },
      { x: 4, y: 0, color: 'b', kind: 'R' },
      { x: 7, y: 0, color: 'b', kind: 'K' },
    ]),
    choices,
  );
  assert.ok(getLegalMoves(state, { x: 4, y: 6 }).every((move) => move.to.x === 4));
  assert.throws(() => playMove(state, { from: { x: 4, y: 6 }, to: { x: 3, y: 6 } }), /Illegal/);
});

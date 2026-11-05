import type { Color } from '../../../types/chess.ts';
import type { Match, MatchAction } from '../../../types/match.ts';
import { applyCheat } from '../../chess/domain/applyCheat.ts';
import { playMove } from '../../chess/domain/playMove.ts';
import { readOutcome } from '../../chess/domain/readOutcome.ts';

/*** Apply one participant-authorized game transition inside the server-owned match boundary. */
export function applyMatchAction(match: Match, color: Color, command: MatchAction): void {
  switch (command.action) {
    case 'move':
      play(match, color, command.move);
      break;
    case 'resign':
      resign(match, color);
      break;
    case 'draw':
      draw(match, color);
      break;
    case 'cheat':
      cheat(match, color, command.notation);
      break;
  }
}

/*** Validate and execute a normal move; any move withdraws a pending draw offer. */
function play(
  match: Match,
  color: Color,
  move: Extract<MatchAction, { action: 'move' }>['move'],
): void {
  if (match.phase !== 'playing' || match.state?.turn !== color) throw new Error('Not your turn');
  match.state = playMove(match.state, move);
  match.drawOffer = null;
  match.result = readOutcome(match.state);
  if (match.result) match.phase = 'finished';
}

/*** Award the game to the opposing player upon voluntary resignation. */
function resign(match: Match, color: Color): void {
  if (match.phase !== 'playing' && match.phase !== 'setup') throw new Error('Not an active match');
  match.result = { winner: color === 'w' ? 'b' : 'w', reason: 'resignation' };
  match.drawOffer = null;
  match.phase = 'finished';
}

/*** Require two opposing participants to agree before completing a draw. */
function draw(match: Match, color: Color): void {
  if (match.phase !== 'playing') throw new Error('Draw unavailable');
  const opponent: Color = color === 'w' ? 'b' : 'w';
  if (match.drawOffer === opponent) {
    match.result = { winner: null, reason: 'agreement' };
    match.phase = 'finished';
    match.drawOffer = null;
    return;
  }
  match.drawOffer = match.drawOffer === color ? null : color;
}

/*** Enforce the single shared cheat allowance and broadcast the resulting position. */
function cheat(match: Match, color: Color, notation: unknown): void {
  if (match.phase !== 'playing' || !match.state) throw new Error('Cheat unavailable');
  if (match.cheatUsed) throw new Error('Cheat already used in this match');
  const next = applyCheat(match.state, color, notation);
  match.state = next;
  match.cheatUsed = true;
  match.drawOffer = null;
  match.result = readOutcome(next);
  if (match.result) match.phase = 'finished';
}

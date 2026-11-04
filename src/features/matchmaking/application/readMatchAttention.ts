import { isKingInCheck } from '../../chess/domain/isKingInCheck.ts';
import type { MatchSnapshot } from './createGameService.ts';

/*** Indicate a player's turn and prioritize check without using the active UI tab. */
export function readMatchAttention(match: MatchSnapshot): 'turn' | 'check' | null {
  const { state } = match;
  if (match.phase !== 'playing' || !state || state.turn !== match.color) return null;
  return isKingInCheck(state.board, match.color) ? 'check' : 'turn';
}

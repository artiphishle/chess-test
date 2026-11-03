import type { Board, Color, GameState, Move, Piece, Position } from '../../../types/chess.ts';
import { applyUnchecked } from './applyUnchecked.ts';
import { isKingInCheck } from './isKingInCheck.ts';
import { isSquareAttacked } from './isSquareAttacked.ts';

const knightSteps = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]] as const;
const kingSteps = [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]] as const;
const rookSteps = [[1,0],[-1,0],[0,1],[0,-1]] as const;
const bishopSteps = [[1,1],[1,-1],[-1,1],[-1,-1]] as const;

/*** Enumerate legal moves for the player to move on a rectangular board. */
export function getLegalMoves(state: GameState, origin?: Position): readonly Move[] {
  const positions = origin ? [origin] : state.board.flatMap((row,y) => row.map((_,x) => ({x,y})));
  return positions.flatMap(from => {
    const piece = state.board[from.y]?.[from.x];
    return piece?.color === state.turn ? pseudoMoves(state, from, piece).filter(move =>
      !isKingInCheck(applyUnchecked(state, move).board, state.turn),
    ) : [];
  });
}

/*** Generate candidate moves including special moves, before self-check filtering. */
function pseudoMoves(state: GameState, from: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const add = (to: Position): boolean => {
    if (to.x < 0 || to.x >= state.width || to.y < 0 || to.y >= state.height) return false;
    const target = state.board[to.y]?.[to.x];
    if (target?.color === piece.color || target?.kind === 'K') return false;
    if (piece.kind === 'P' && to.y === (piece.color === 'w' ? 0 : state.height - 1)) {
      for (const promotion of ['Q','R','B','N'] as const) moves.push({ from, to, promotion });
    } else moves.push({ from, to });
    return target === null || target === undefined;
  };
  const steps = piece.kind === 'N' ? knightSteps : piece.kind === 'K' ? kingSteps :
    piece.kind === 'B' ? bishopSteps : piece.kind === 'R' ? rookSteps : [...rookSteps, ...bishopSteps];
  if (piece.kind === 'P') {
    const direction = piece.color === 'w' ? -1 : 1;
    const ahead = from.y + direction;
    if (state.board[ahead]?.[from.x] === null) {
      add({ x: from.x, y: ahead });
      const home = piece.color === 'w' ? state.height - 2 : 1;
      if (from.y === home && state.board[ahead + direction]?.[from.x] === null) add({ x: from.x, y: ahead + direction });
    }
    for (const x of [from.x - 1, from.x + 1]) {
      const other = state.board[ahead]?.[x];
      if ((other && other.color !== piece.color && other.kind !== 'K') ||
        (state.enPassant?.x === x && state.enPassant.y === ahead &&
          state.board[from.y]?.[x]?.kind === 'P' && state.board[from.y]?.[x]?.color !== piece.color)) add({ x, y: ahead });
    }
    return moves;
  }
  for (const [dx,dy] of steps) {
    const max = piece.kind === 'N' || piece.kind === 'K' ? 1 : Math.max(state.width,state.height);
    for (let n = 1; n <= max; n++) {
      if (!add({x:from.x+dx*n,y:from.y+dy*n})) break;
    }
  }
  if (piece.kind === 'K') moves.push(...castleMoves(state, from, piece.color));
  return moves;
}

/*** Permit castling only with an unmoved edge rook, a clear corridor and safe king transit. */
function castleMoves(state: GameState, from: Position, color: Color): Move[] {
  const home = color === 'w' ? state.height - 1 : 0;
  if (from.y !== home || isKingInCheck(state.board,color)) return [];
  return (['K','Q'] as const).flatMap(side => {
    if (!state.castling[color][side]) return [];
    const rookX = side === 'K' ? state.width - 1 : 0;
    const dx = side === 'K' ? 1 : -1;
    const to = {x:from.x+dx*2,y:from.y};
    if (rookX === from.x || to.x < 0 || to.x >= state.width || Math.abs(rookX-from.x)<3) return [];
    const rook = state.board[home]?.[rookX];
    if (rook?.kind !== 'R' || rook.color !== color) return [];
    const path = Array.from({length:Math.abs(rookX-from.x)-1},(_,i)=>from.x+dx*(i+1));
    if (!path.every(x => state.board[home]?.[x] === null)) return [];
    if ([from.x+dx,to.x].some(x => isSquareAttacked(state.board,{x,y:home},color === 'w'?'b':'w'))) return [];
    return [{from,to,castle:side}];
  });
}

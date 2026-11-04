'use client';

import Image from 'next/image';

import type { Piece } from '../../../../types/chess.ts';
import { usePieceSet } from './usePieceSet.ts';

/*** Render crisp SVG pieces using a bundled permissive set or optional upstream artwork. */
export function ChessPiece({ piece }: { readonly piece: Piece }) {
  const { pieceSet } = usePieceSet();
  const code = `${piece.color}${piece.kind}`;
  const src =
    pieceSet === 'chessnut'
      ? `/pieces/chessnut/${code}.svg`
      : `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${pieceSet}/${code}.svg`;
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={96}
      height={96}
      unoptimized
      loading="eager"
      className="chess-piece-image"
      draggable={false}
    />
  );
}

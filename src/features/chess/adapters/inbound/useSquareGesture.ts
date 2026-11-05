'use client';

import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useEffect, useRef } from 'react';

import type { Position } from '../../../../types/chess.ts';

/*** Separate pointer holds and keyboard alternatives from ordinary square clicks. */
export function useSquareGesture(
  position: Position,
  onSquare: (position: Position) => void,
  onSquareLong?: (position: Position) => void,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consumed = useRef(false);
  const cancel = (): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (!onSquareLong || (event.pointerType === 'mouse' && event.button !== 0)) return;
      consumed.current = false;
      cancel();
      timer.current = setTimeout(() => {
        consumed.current = true;
        onSquareLong(position);
      }, 500);
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      if (onSquareLong) event.preventDefault();
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.shiftKey && event.key === 'Enter' && onSquareLong) {
        event.preventDefault();
        consumed.current = true;
        onSquareLong(position);
      }
    },
    onClick: () => {
      if (consumed.current) {
        consumed.current = false;
        return;
      }
      onSquare(position);
    },
  };
}

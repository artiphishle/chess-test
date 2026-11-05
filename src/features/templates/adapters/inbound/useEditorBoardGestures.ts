'use client';

import { useRef, type MouseEvent, type PointerEvent } from 'react';

interface GestureActions {
  readonly onResize: (columns: number, ranks: number) => void;
  readonly onBoardStyle: () => void;
  readonly onPieceStyle: () => void;
  readonly onFlip: () => void;
  readonly onSave: () => void;
  readonly onTemplates: () => void;
}

type Point = Readonly<{ x: number; y: number }>;
type Pointer = { start: Point; point: Point; pointerType: string };
type Dual = { x: number; y: number; angle: number };

const threshold = 44;

/*** Translate editor-only pointer motions into semantic actions, separate from square taps. */
export function useEditorBoardGestures(actions: GestureActions) {
  const pointers = useRef(new Map<number, Pointer>());
  const previousDual = useRef<Dual | null>(null);
  const twoFinger = useRef(false);
  const moved = useRef(false);
  const suppressed = useRef(false);
  const mouseAngle = useRef<number | null>(null);
  const mouseRotation = useRef(0);

  const reset = (): void => {
    pointers.current.clear();
    previousDual.current = null;
    twoFinger.current = false;
    moved.current = false;
    mouseAngle.current = null;
    mouseRotation.current = 0;
  };

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>): void => {
      pointers.current.set(event.pointerId, {
        start: { x: event.clientX, y: event.clientY },
        point: { x: event.clientX, y: event.clientY },
        pointerType: event.pointerType,
      });
      if (pointers.current.size === 2 && event.pointerType === 'touch') {
        twoFinger.current = true;
        previousDual.current = readDual([...pointers.current.values()]);
        event.currentTarget.classList.add('multi-touch');
      }
      if (event.pointerType === 'mouse' && event.button === 0) {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseAngle.current = Math.atan2(
          event.clientY - (rect.top + rect.height / 2),
          event.clientX - (rect.left + rect.width / 2),
        );
      }
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>): void => {
      const pointer = pointers.current.get(event.pointerId);
      if (!pointer) return;
      pointer.point = { x: event.clientX, y: event.clientY };
      if (Math.hypot(pointer.point.x - pointer.start.x, pointer.point.y - pointer.start.y) > 14) {
        moved.current = true;
        suppressed.current = true;
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }
      if (twoFinger.current && pointers.current.size === 2) {
        const dual = readDual([...pointers.current.values()]);
        const previous = previousDual.current;
        if (previous) {
          const xSteps = Math.trunc((dual.x - previous.x) / threshold);
          const ySteps = Math.trunc((dual.y - previous.y) / threshold);
          if (xSteps || ySteps) {
            actions.onResize(xSteps, ySteps);
            previousDual.current = {
              ...previous,
              x: previous.x + xSteps * threshold,
              y: previous.y + ySteps * threshold,
            };
          }
          const angleDelta = normalizeAngle(dual.angle - previous.angle);
          if (Math.abs(angleDelta) > 0.65) {
            actions.onFlip();
            previousDual.current = { ...(previousDual.current ?? dual), angle: dual.angle };
          }
        }
        return;
      }
      if (event.pointerType === 'mouse' && event.buttons === 1 && mouseAngle.current !== null) {
        const rect = event.currentTarget.getBoundingClientRect();
        const next = Math.atan2(
          event.clientY - (rect.top + rect.height / 2),
          event.clientX - (rect.left + rect.width / 2),
        );
        mouseRotation.current += normalizeAngle(next - mouseAngle.current);
        mouseAngle.current = next;
        if (Math.abs(mouseRotation.current) > Math.PI * 1.7) {
          actions.onFlip();
          mouseRotation.current = 0;
          suppressed.current = true;
        }
      }
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>): void => {
      const pointer = pointers.current.get(event.pointerId);
      if (!pointer) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - pointer.start.x;
      const dy = event.clientY - pointer.start.y;
      pointers.current.delete(event.pointerId);
      if (twoFinger.current) {
        if (pointers.current.size === 0) {
          if (!moved.current) actions.onTemplates();
          const board = event.currentTarget;
          requestAnimationFrame(() => board.classList.remove('multi-touch'));
          reset();
        }
        return;
      }
      if (
        pointer.pointerType === 'touch' &&
        Math.abs(dx) > 65 &&
        Math.abs(dx) > Math.abs(dy) * 1.35
      ) {
        if (dx < 0) actions.onBoardStyle();
        else actions.onPieceStyle();
      } else if (
        pointer.start.x > rect.left + rect.width * 0.3 &&
        pointer.start.x < rect.right - rect.width * 0.3 &&
        pointer.start.y > rect.top + rect.height * 0.3 &&
        pointer.start.y < rect.bottom - rect.height * 0.3 &&
        event.clientY > rect.bottom &&
        dy > rect.height * 0.3 &&
        Math.abs(dx) < rect.width * 0.2
      ) {
        actions.onSave();
      }
      if (!pointers.current.size) reset();
    },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>): void => {
      pointers.current.delete(event.pointerId);
      if (!pointers.current.size) {
        event.currentTarget.classList.remove('multi-touch');
        reset();
      }
    },
    onClickCapture: (event: MouseEvent<HTMLDivElement>): void => {
      if (!suppressed.current) return;
      suppressed.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

/*** Read the two-dimensional finger spread and their rotation. */
function readDual(pointers: readonly Pointer[]): Dual {
  const first = pointers[0]!.point;
  const second = pointers[1]!.point;
  return {
    x: Math.abs(second.x - first.x),
    y: Math.abs(second.y - first.y),
    angle: Math.atan2(second.y - first.y, second.x - first.x),
  };
}

/*** Wrap an angle difference so crossing a full turn cannot create a spurious flip. */
function normalizeAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

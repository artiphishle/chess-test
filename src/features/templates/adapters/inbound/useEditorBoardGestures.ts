'use client';

import { useRef, type MouseEvent, type PointerEvent } from 'react';

interface GestureActions {
  readonly onResize: (columns: number, ranks: number) => void;
  readonly onSave: () => void;
  readonly onTemplates: () => void;
}

type Point = Readonly<{ x: number; y: number }>;
type Pointer = { start: Point; point: Point; pointerType: string };
type Dual = { x: number; y: number };
const threshold = 44;

/*** Recognize pinch, double-finger template tap and pull-to-save without modifying squares. */
export function useEditorBoardGestures(actions: GestureActions) {
  const pointers = useRef(new Map<number, Pointer>());
  const previousDual = useRef<Dual | null>(null);
  const twoFinger = useRef(false);
  const moved = useRef(false);
  const suppressed = useRef(false);
  const reset = (): void => {
    pointers.current.clear();
    previousDual.current = null;
    twoFinger.current = false;
    moved.current = false;
  };

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>): void => {
      if (!pointers.current.size) suppressed.current = false;
      pointers.current.set(event.pointerId, {
        start: { x: event.clientX, y: event.clientY },
        point: { x: event.clientX, y: event.clientY },
        pointerType: event.pointerType,
      });
      if (pointers.current.size === 2 && event.pointerType === 'touch') {
        twoFinger.current = true;
        suppressed.current = true;
        previousDual.current = readDual([...pointers.current.values()]);
        event.currentTarget.classList.add('multi-touch');
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
      if (!twoFinger.current || pointers.current.size !== 2) return;
      const dual = readDual([...pointers.current.values()]);
      const previous = previousDual.current;
      if (!previous) return;
      const columns = Math.trunc((dual.x - previous.x) / threshold);
      const ranks = Math.trunc((dual.y - previous.y) / threshold);
      if (columns || ranks) {
        actions.onResize(columns, ranks);
        previousDual.current = {
          x: previous.x + columns * threshold,
          y: previous.y + ranks * threshold,
        };
      }
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>): void => {
      const pointer = pointers.current.get(event.pointerId);
      if (!pointer) return;
      const rect = event.currentTarget.getBoundingClientRect();
      pointers.current.delete(event.pointerId);
      if (twoFinger.current) {
        if (!pointers.current.size) {
          if (!moved.current) actions.onTemplates();
          const node = event.currentTarget;
          requestAnimationFrame(() => node.classList.remove('multi-touch'));
          reset();
        }
        return;
      }
      const dx = event.clientX - pointer.start.x;
      const dy = event.clientY - pointer.start.y;
      if (
        pointer.pointerType === 'touch' &&
        pointer.start.x > rect.left + rect.width * 0.3 &&
        pointer.start.x < rect.right - rect.width * 0.3 &&
        pointer.start.y > rect.top + rect.height * 0.3 &&
        pointer.start.y < rect.bottom - rect.height * 0.3 &&
        event.clientY > rect.bottom &&
        dy > rect.height * 0.3 &&
        Math.abs(dx) < rect.width * 0.2
      )
        actions.onSave();
      if (!pointers.current.size) reset();
    },
    onPointerCancel: (event: PointerEvent<HTMLDivElement>): void => {
      pointers.current.delete(event.pointerId);
      suppressed.current = true;
      if (!pointers.current.size) {
        event.currentTarget.classList.remove('multi-touch');
        reset();
      }
    },
    onClickCapture: (event: MouseEvent<HTMLDivElement>): void => {
      if (!suppressed.current || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

/*** Measure the horizontal and vertical spread of two fingertips. */
function readDual(pointers: readonly Pointer[]): Dual {
  const first = pointers[0]!.point;
  const second = pointers[1]!.point;
  return { x: Math.abs(second.x - first.x), y: Math.abs(second.y - first.y) };
}

'use client';

import { useRef } from 'react';

interface Props {
  readonly label: string;
  readonly onActivate: () => void;
}

/*** Offer an invisible, accessible double-tap target beside the central turn selector. */
export function HiddenDoubleTapZone({ label, onActivate }: Props) {
  const last = useRef(0);
  return (
    <button
      type="button"
      className="editor-invisible-zone"
      aria-label={label}
      title={label}
      onClick={() => {
        const now = Date.now();
        if (now - last.current < 380) {
          last.current = 0;
          onActivate();
          return;
        }
        last.current = now;
      }}
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';

interface Props {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly busy: boolean;
}

/*** Require an explicit yes for resignation and treat escape or outside clicks as no. */
export function ConfirmResignDialog({ onCancel, onConfirm, busy }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
      if (event.key === 'Enter' && !busy) {
        event.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, onConfirm]);
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) onCancel();
      }}
    >
      <section
        className="result-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Partie aufgeben"
      >
        <h2>Partie wirklich aufgeben?</h2>
        <p>Der Gegner gewinnt. Enter bestätigt, Escape bricht ab.</p>
        <div className="action-row">
          <button type="button" disabled={busy} ref={confirmRef} onClick={onConfirm}>
            Ja, aufgeben
          </button>
          <button type="button" onClick={onCancel}>
            Nein
          </button>
        </div>
      </section>
    </div>
  );
}

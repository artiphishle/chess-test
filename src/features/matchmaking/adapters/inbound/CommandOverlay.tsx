'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';

import { CommandHelp } from './CommandHelp.tsx';

interface Props {
  readonly onClose: () => void;
  readonly onSubmit: (value: string) => Promise<'close' | 'help' | 'keep'>;
}

/*** Focus the slash-command input and keep optional device help in the same overlay. */
export function CommandOverlay({ onClose, onSubmit }: Props) {
  const [value, setValue] = useState('/');
  const [help, setHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const result = await onSubmit(value);
    if (result === 'help') setHelp(true);
    if (result === 'close') onClose();
  };
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="command-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Befehl eingeben"
        onSubmit={(event) => void submit(event)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <input
          ref={inputRef}
          aria-label="Slash-Befehl"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setHelp(false);
          }}
        />
        {help ? <CommandHelp /> : <p className="muted">/help · /draw · /resign · /cheat Qf4</p>}
      </form>
    </div>
  );
}

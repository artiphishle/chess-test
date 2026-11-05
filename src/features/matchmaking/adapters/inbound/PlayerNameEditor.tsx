'use client';

import { usePlayerNameEditor } from './usePlayerNameEditor.ts';

/*** Render only the in-header name control; persistence belongs to its hook. */
export function PlayerNameEditor({ onName }: { readonly onName: (name: string) => void }) {
  const { name, editing, setEditing, changeName } = usePlayerNameEditor(onName);
  return (
    <div className="player-name">
      {editing ? (
        <input
          aria-label="Spielername"
          maxLength={32}
          value={name}
          onChange={(event) => changeName(event.target.value)}
          onBlur={() => {
            if (!name.trim()) changeName('Gast');
            setEditing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Spielername bearbeiten: ${name}`}
          title="Spielername bearbeiten"
        >
          {name} <span aria-hidden="true">✎</span>
        </button>
      )}
    </div>
  );
}

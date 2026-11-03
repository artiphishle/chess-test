'use client';

import { useState } from 'react';
import type { Color, PieceKind } from '../../../../types/chess.ts';
import type { EditorPalette } from '../../../../types/editor.ts';

interface Props {
  readonly color: Color;
  readonly active: EditorPalette;
  readonly onSelect: (palette: EditorPalette) => void;
}

/*** Offer predefined and custom bounded coin choices in the editor. */
export function CoinPalette({ color, active, onSelect }: Props) {
  const [custom, setCustom] = useState<readonly PieceKind[]>(['N', 'B']);
  const [preset, setPreset] = useState('Knight / Bishop');
  const choose = (name: string, options: readonly PieceKind[]): void => {
    if (options.length) {
      setPreset(name);
      onSelect({ type: 'coin', color, options });
    }
  };
  const toggle = (kind: PieceKind, checked: boolean): void => {
    const options = checked ? [...custom, kind] : custom.filter((piece) => piece !== kind);
    if (!options.length) return;
    setCustom(options);
    if (preset === 'Custom') onSelect({ type: 'coin', color, options });
  };
  return (
    <>
      <h3>Choice Coins</h3>
      <div className="chip-group">
        {Object.entries(coinPresets).map(([name, options]) => (
          <button
            type="button"
            key={name}
            className={active.type === 'coin' && preset === name ? 'active' : ''}
            onClick={() => choose(name, options)}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          className={active.type === 'coin' && preset === 'Custom' ? 'active' : ''}
          onClick={() => choose('Custom', custom)}
        >
          Custom
        </button>
      </div>
      <div className="custom-options" aria-label="Custom Coin Figuren">
        {pieceKinds.map((kind) => (
          <label key={kind}>
            <input
              type="checkbox"
              checked={custom.includes(kind)}
              onChange={(event) => toggle(kind, event.target.checked)}
            />
            {kind}
          </label>
        ))}
      </div>
    </>
  );
}

const coinPresets: Readonly<Record<string, readonly PieceKind[]>> = {
  'Knight / Bishop': ['N', 'B'],
  Free: ['P', 'N', 'B', 'R', 'Q', 'K'],
  Minor: ['N', 'B'],
  Major: ['R', 'Q'],
  Promotion: ['N', 'B', 'R', 'Q'],
};
const pieceKinds: readonly PieceKind[] = ['P', 'N', 'B', 'R', 'Q', 'K'];

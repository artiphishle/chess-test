'use client';

import { usePieceSet } from './usePieceSet.ts';

/*** Expose a persistent per-browser SVG style switch without touching any game setup. */
export function PieceSetSelect() {
  const { pieceSet, selectPieceSet } = usePieceSet();
  return (
    <label className="piece-set-select">
      Figuren
      <select
        aria-label="Figurendesign"
        value={pieceSet}
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (value === 'chessnut' || value === 'alpha' || value === 'companion') {
            selectPieceSet(value);
          }
        }}
      >
        <option value="chessnut">Chessnut</option>
        <option value="alpha">Alpha (privat)</option>
        <option value="companion">Companion</option>
      </select>
    </label>
  );
}

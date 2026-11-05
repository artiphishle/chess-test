'use client';

import { PIECE_SETS } from '../../constants/pieceSets.ts';
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
          const { value } = event.currentTarget;
          const selected = PIECE_SETS.find((entry) => entry === value);
          if (selected) selectPieceSet(selected);
        }}
      >
        {PIECE_SETS.map((set) => <option key={set} value={set}>{set}</option>)}
      </select>
    </label>
  );
}

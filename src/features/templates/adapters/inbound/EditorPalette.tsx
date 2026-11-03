'use client';

import { useState } from 'react';
import type { Color, PieceKind } from '../../../../types/chess.ts';
import type { EditorPalette as Palette } from '../../../../types/editor.ts';
import { CoinPalette } from './CoinPalette.tsx';

interface Props { readonly active: Palette; readonly onSelect: (palette: Palette) => void }

/*** Select a side, a fixed piece or an extensible Choice Coin placement tool. */
export function EditorPalette({ active, onSelect }: Props) {
  const [color, setColor] = useState<Color>('w');
  const changeColor = (next: Color): void => {
    setColor(next);
    if (active.type !== 'erase') onSelect({ ...active, color: next });
  };
  return <><h3>Figuren setzen</h3>
    <div className="segmented">
      <button type="button" aria-pressed={color === 'w'} onClick={() => changeColor('w')}>Weiss</button>
      <button type="button" aria-pressed={color === 'b'} onClick={() => changeColor('b')}>Schwarz</button>
    </div>
    <div className="palette">{pieceKinds.map(kind => <button type="button" key={kind}
      className={active.type === 'piece' && active.color === color && active.kind === kind ? 'active' : ''}
      onClick={() => onSelect({ type: 'piece', color, kind })} aria-label={`Setze ${kind}`}>{kind}</button>)}
      <button type="button" className={active.type === 'erase' ? 'active' : ''} onClick={() => onSelect({ type: 'erase' })}>×</button>
    </div>
    <CoinPalette color={color} active={active} onSelect={onSelect} />
  </>;
}

const pieceKinds: readonly PieceKind[] = ['P', 'N', 'B', 'R', 'Q', 'K'];

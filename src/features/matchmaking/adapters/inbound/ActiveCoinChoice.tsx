'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { PieceKind } from '../../../../types/chess.ts';
import { ChessPiece } from '../../../chess/adapters/inbound/ChessPiece.tsx';
import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import type { MatchSnapshot } from '../../application/createGameService.ts';

interface Props {
  readonly match: MatchSnapshot;
  readonly interaction: BoardInteraction;
  readonly busy: boolean;
}

/*** Resolve only an owned open choice coin in an accessible modal dialog. */
export function ActiveCoinChoice({ match, interaction, busy }: Props) {
  const selected = interaction.activeCoin;
  const coin = selected ? match.template.cells[selected.y]?.[selected.x] : null;
  if (
    match.phase !== 'setup' ||
    match.ready[match.color] ||
    !selected ||
    coin?.kind !== 'coin' ||
    coin.color !== match.color ||
    Object.hasOwn(match.choices, `${selected.x}:${selected.y}`)
  )
    return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Choice Coin Figur wählen"
    >
      <div className="result-modal coin-modal">
        <span className="eyebrow">
          CHOICE COIN · {selected.x + 1} / {selected.y + 1}
        </span>
        <h2>Figur wählen</h2>
        <p>Welche Figur soll auf diesem Feld stehen?</p>
        <div className="coin-option-grid">
          {coin.options.map((kind) => (
            <button
              className="coin-option"
              key={kind}
              type="button"
              disabled={busy}
              onClick={() => interaction.choose(kind)}
            >
              <ChessPiece piece={{ color: match.color, kind }} />
              <span>{pieceName(kind)}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" disabled={busy} onPress={interaction.cancelCoin}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

/*** Label the six standard pieces without trusting dynamic object keys. */
function pieceName(kind: PieceKind): string {
  switch (kind) {
    case 'P':
      return 'Bauer';
    case 'N':
      return 'Springer';
    case 'B':
      return 'Läufer';
    case 'R':
      return 'Turm';
    case 'Q':
      return 'Dame';
    case 'K':
      return 'König';
  }
}

'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';

interface Props {
  readonly interaction: BoardInteraction;
}

/*** Offer precisely the four legal pawn-promotion pieces before posting a move. */
export function PromotionDialog({ interaction }: Props) {
  if (!interaction.promotion) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Bauernumwandlung">
      <div className="result-modal">
        <h2>Bauernumwandlung</h2>
        <p>Wähle die neue Figur.</p>
        <div className="chip-group">
          {(['Q', 'R', 'B', 'N'] as const).map((kind) => (
            <button key={kind} type="button" onClick={() => interaction.promote(kind)}>
              {names[kind]}
            </button>
          ))}
        </div>
        <Button variant="ghost" onPress={interaction.cancelPromotion}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

const names = { Q: 'Dame', R: 'Turm', B: 'Läufer', N: 'Springer' } as const;

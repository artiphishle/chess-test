'use client';

import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import type { MatchSnapshot } from '../../application/createGameService.ts';

interface Props {
  readonly match: MatchSnapshot;
  readonly interaction: BoardInteraction;
}

/*** Render the individually allowed pieces of the currently selected coin. */
export function ActiveCoinChoice({ match, interaction }: Props) {
  const selected = interaction.activeCoin;
  const coin = selected ? match.template.cells[selected.y]?.[selected.x] : null;
  if (coin?.kind !== 'coin')
    return <p className="hint-text">Wähle einen Deiner Coins direkt auf dem Brett.</p>;
  return (
    <div className="coin-choice">
      <h3>
        Coin {selected?.x} / {selected?.y}
      </h3>
      <div className="chip-group">
        {coin.options.map((kind) => (
          <button type="button" key={kind} onClick={() => interaction.choose(kind)}>
            {kind}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly session: MatchSession;
  readonly interaction: BoardInteraction;
}

/*** Let each player cycle private coin choices, then lock them explicitly before play. */
export function SetupSidebar({ session, interaction }: Props) {
  const { match } = session;
  if (!match) return null;
  const ownReady = match.ready[match.color];
  const opponentReady = match.ready[match.color === 'w' ? 'b' : 'w'];
  const coins = match.template.cells.flatMap((row, y) =>
    row.flatMap((cell, x) =>
      cell?.kind === 'coin' && cell.color === match.color ? [`${x}:${y}`] : [],
    ),
  );
  const resolved = coins.filter((key) => Object.hasOwn(interaction.choices, key)).length;
  return (
    <>
      <h2>Deine Choice Coins</h2>
      <p className="muted">
        Tippe mehrfach auf Deine Coins: Springer → Läufer → Springer. Erst «Bereit» fixiert alle
        Figuren. Die gegnerische Auswahl bleibt bis zum Spielstart verborgen.
      </p>
      <div className="ready-status">
        <strong>{resolved} / {coins.length} Figuren gewählt</strong>
        <div>Du: {ownReady ? 'Bereit ✓' : 'Wählst Figuren'}</div>
        <div>Gegner: {opponentReady ? 'Bereit ✓' : 'Wählt Figuren'}</div>
      </div>
      <Button disabled={session.busy || ownReady || resolved !== coins.length}
        onPress={interaction.confirmChoices}>
        {ownReady ? 'Auswahl bestätigt ✓' : 'Bereit – Auswahl bestätigen'}
      </Button>
      <Button variant="ghost" disabled={session.busy}
        onPress={() => { void session.leave(); }}>Zurück zum Start</Button>
    </>
  );
}

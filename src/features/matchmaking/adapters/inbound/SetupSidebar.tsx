'use client';

import { Button } from '@ankhorage/zora/web/button';
import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { ActiveCoinChoice } from './ActiveCoinChoice.tsx';
import type { MatchSession } from './useMatchSession.ts';

interface Props { readonly session: MatchSession; readonly interaction: BoardInteraction }

/*** Let the player resolve owned choice coins and confirm the setup. */
export function SetupSidebar({ session, interaction }: Props) {
  const match = session.match;
  if (!match) return null;
  const ownReady = match.ready[match.color];
  const opponentReady = match.ready[match.color === 'w' ? 'b' : 'w'];
  const missing = match.template.cells.some((row, y) => row.some((cell, x) =>
    cell?.kind === 'coin' && cell.color === match.color && !match.choices[`${x}:${y}`]));
  return (
    <>
      <h2>Choice Coins auflösen</h2>
      <p className="muted">Wähle jeden Deiner Coins auf dem Brett und bestimme die Figur. Jeder Coin kann unabhängig gewählt werden.</p>
      <div className="ready-status">Du: {ownReady ? 'Bereit' : 'Wählst Figuren'} · Gegner: {opponentReady ? 'Bereit' : 'Wählt Figuren'}</div>
      <ActiveCoinChoice match={match} interaction={interaction} />
      <Button disabled={session.busy || ownReady || missing} onPress={() => { void session.act({ action: 'ready' }); }}>
        Auswahl bestätigen
      </Button>
      {ownReady ? <p className="muted">Deine Auswahl ist gesperrt. Warte auf Deinen Gegner.</p> : null}
      <Button variant="ghost" onPress={() => { void session.leave(); }}>Zurück zum Start</Button>
    </>
  );
}

'use client';

import { Button } from '@ankhorage/zora/web/button';
import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import type { MatchSession } from './useMatchSession.ts';

interface Props { readonly session: MatchSession; readonly interaction: BoardInteraction }

/*** Let a player independently resolve owned Choice Coins and confirm the selection. */
export function SetupSidebar({ session, interaction }: Props) {
  const match = session.match;
  if (!match) return null;
  const selected = interaction.activeCoin;
  const coin = selected ? match.template.cells[selected.y]?.[selected.x] : null;
  const missing = match.template.cells.some((row, y) => row.some((cell, x) =>
    cell?.kind === 'coin' && cell.color === match.color && !match.choices[`${x}:${y}`]));
  return <><h2>Choice Coins auflösen</h2>
    <p className="muted">Wähle jeden Deiner Coins auf dem Brett und bestimme die Figur. Jeder Coin kann unabhängig gewählt werden.</p>
    <div className="ready-status">Du: {match.ready[match.color] ? 'Bereit' : 'Wählst Figuren'} · Gegner: {match.ready[match.color === 'w' ? 'b' : 'w'] ? 'Bereit' : 'Wählt Figuren'}</div>
    {coin?.kind === 'coin' ? <div className="coin-choice"><h3>Coin {selected?.x} / {selected?.y}</h3>
      <div className="chip-group">{coin.options.map(kind => <button type="button" key={kind} onClick={() => interaction.choose(kind)}>{kind}</button>)}</div>
    </div> : <p className="hint-text">Wähle einen Deiner Coins direkt auf dem Brett.</p>}
    <Button disabled={session.busy || match.ready[match.color] || missing} onPress={() => { void session.act({ action: 'ready' }); }}>Auswahl bestätigen</Button>
    {match.ready[match.color] ? <p className="muted">Deine Auswahl ist gesperrt. Warte auf Deinen Gegner.</p> : null}
    <Button variant="ghost" onPress={() => { void session.leave(); }}>Zurück zum Start</Button>
  </>;
}

'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly session: MatchSession;
}

/*** Show automatic choice-coin progress without requiring an additional ready command. */
export function SetupSidebar({ session }: Props) {
  const { match } = session;
  if (!match) return null;
  const ownReady = match.ready[match.color];
  const opponentReady = match.ready[match.color === 'w' ? 'b' : 'w'];
  const coins = match.template.cells.flatMap((row, y) =>
    row.flatMap((cell, x) =>
      cell?.kind === 'coin' && cell.color === match.color ? [`${x}:${y}`] : [],
    ),
  );
  const resolved = coins.filter((key) => Object.hasOwn(match.choices, key)).length;
  return (
    <>
      <h2>Deine Choice Coins</h2>
      <p className="muted">
        Tippe auf einen Deiner offenen Coins auf dem Brett. Wähle die Figur im Dialog. Bereits
        eingesetzte Figuren bleiben für diese Partie fixiert.
      </p>
      <div className="ready-status">
        <strong>
          {resolved} / {coins.length} Figuren gewählt
        </strong>
        <div>Du: {ownReady ? 'Bereit ✓' : 'Wählst Figuren'}</div>
        <div>Gegner: {opponentReady ? 'Bereit ✓' : 'Wählt Figuren'}</div>
      </div>
      <p className="muted">
        {ownReady
          ? 'Deine Auswahl ist abgeschlossen. Die Partie startet automatisch, sobald Dein Gegner fertig ist.'
          : 'Sobald alle Deine Coins ersetzt sind, bist Du automatisch bereit.'}
      </p>
      <Button
        variant="ghost"
        disabled={session.busy}
        onPress={() => {
          void session.leave();
        }}
      >
        Zurück zum Start
      </Button>
    </>
  );
}

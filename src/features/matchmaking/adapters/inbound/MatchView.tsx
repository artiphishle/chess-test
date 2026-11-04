'use client';

import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { MatchSidebar } from './MatchSidebar.tsx';
import type { MatchSession } from './useMatchSession.ts';

interface Props {
  readonly session: MatchSession;
  readonly interaction: BoardInteraction;
}

/*** Display the live board with color orientation and a phase-specific sidebar. */
export function MatchView({ session, interaction }: Props) {
  const { match } = session;
  if (!match) return null;
  const title = {
    waiting: 'Warte auf Gegner',
    setup: 'Figuren wählen',
    playing: 'Deine Partie',
    finished: 'Partie beendet',
  }[match.phase];
  return (
    <section className="match-layout">
      <div className="panel board-panel">
        <div className="panel-heading">
          <h2>{title}</h2>
          <span>
            {match.template.width} × {match.template.height}
          </span>
        </div>
        <ChessBoard
          cells={interaction.cells}
          width={match.template.width}
          height={match.template.height}
          flipped={match.color === 'b'}
          selected={match.phase === 'setup' ? interaction.activeCoin : interaction.selected}
          hints={interaction.legal.map((move) => move.to)}
          onSquare={interaction.onSquare}
        />
        <div className="board-footer">
          <span>Du spielst {match.color === 'w' ? 'Weiss ♔' : 'Schwarz ♚'}</span>
          <span>
            {match.phase === 'playing'
              ? `${match.state?.turn === 'w' ? 'Weiss' : 'Schwarz'} am Zug`
              : match.template.name}
          </span>
        </div>
      </div>
      <MatchSidebar session={session} />
    </section>
  );
}

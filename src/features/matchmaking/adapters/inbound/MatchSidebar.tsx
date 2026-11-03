'use client';

import type { BoardInteraction } from '../../../chess/adapters/inbound/useBoardInteraction.ts';
import { FinishedSidebar } from './FinishedSidebar.tsx';
import { PlayingSidebar } from './PlayingSidebar.tsx';
import { SetupSidebar } from './SetupSidebar.tsx';
import type { MatchSession } from './useMatchSession.ts';
import { WaitingSidebar } from './WaitingSidebar.tsx';

interface Props {
  readonly session: MatchSession;
  readonly interaction: BoardInteraction;
}

/*** Route game phase presentation without giving it authority over state transitions. */
export function MatchSidebar({ session, interaction }: Props) {
  const phase = session.match?.phase;
  return (
    <aside className="panel side-panel">
      {phase === 'waiting' ? <WaitingSidebar leave={session.leave} /> : null}
      {phase === 'setup' ? <SetupSidebar session={session} interaction={interaction} /> : null}
      {phase === 'playing' ? <PlayingSidebar session={session} /> : null}
      {phase === 'finished' ? <FinishedSidebar session={session} /> : null}
    </aside>
  );
}

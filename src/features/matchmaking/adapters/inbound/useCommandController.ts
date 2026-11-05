'use client';

import { useCallback, useState } from 'react';

import { parseGameCommand } from '../../application/parseGameCommand.ts';
import type { MatchSession } from './useMatchSession.ts';
import { useSlashShortcut } from './useSlashShortcut.ts';

type Status = 'close' | 'help' | 'keep';

/*** Coordinate slash commands and confirmation without bypassing server-side game authority. */
export function useCommandController(session: MatchSession) {
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [resigningId, setResigningId] = useState<string | null>(null);
  const openCommands = useCallback(() => setCommandsOpen(true), []);
  const closeCommands = useCallback(() => setCommandsOpen(false), []);
  const cancelResign = useCallback(() => setResigningId(null), []);
  const requestResign = useCallback((id: string) => setResigningId(id), []);

  useSlashShortcut(!commandsOpen && !resigningId, openCommands);

  const submit = useCallback(async (text: string): Promise<Status> => {
    const command = parseGameCommand(text);
    if (command.kind === 'help') return 'help';
    if (command.kind === 'invalid') return 'keep';
    const { match } = session;
    if (match?.phase !== 'playing') return 'keep';
    if (command.kind === 'resign') {
      requestResign(match.id);
      return 'close';
    }
    const payload = command.kind === 'draw'
      ? { action: 'draw', matchId: match.id }
      : { action: 'cheat', notation: command.notation, matchId: match.id };
    return await session.act(payload) ? 'close' : 'keep';
  }, [requestResign, session]);

  const confirmResign = useCallback(() => {
    if (!resigningId || session.busy) return;
    const id = resigningId;
    setResigningId(null);
    void session.act({ action: 'resign', matchId: id });
  }, [resigningId, session]);

  return {
    commandsOpen,
    resigningId,
    openCommands,
    closeCommands,
    cancelResign,
    requestResign,
    confirmResign,
    submit,
  };
}

export type ParsedGameCommand =
  | Readonly<{ kind: 'help' }>
  | Readonly<{ kind: 'draw' }>
  | Readonly<{ kind: 'resign' }>
  | Readonly<{ kind: 'cheat'; notation: string }>
  | Readonly<{ kind: 'invalid'; message: string }>;

/*** Interpret a slash command without turning unknown text into server actions. */
export function parseGameCommand(text: string): ParsedGameCommand {
  const input = text.trim();
  if (input.length > 64) return { kind: 'invalid', message: 'Befehl ist zu lang' };
  const match = /^\/?(help|draw|resign|cheat)(?:\s+(.*))?$/i.exec(input);
  if (!match) return { kind: 'invalid', message: 'Unbekannter Befehl. /help zeigt alle Befehle.' };
  const command = match[1]!.toLowerCase();
  const argument = match[2]?.trim();
  if (command === 'cheat') return argument
    ? { kind: 'cheat', notation: argument }
    : { kind: 'invalid', message: 'Schreib z. B. /cheat Qf4' };
  if (argument) return { kind: 'invalid', message: 'Dieser Befehl erwartet keine Argumente.' };
  if (command === 'help' || command === 'draw' || command === 'resign') return { kind: command };
  return { kind: 'invalid', message: 'Unbekannter Befehl.' };
}

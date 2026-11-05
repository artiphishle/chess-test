/*** Reject oversized anonymous display names and ASCII control characters. */
export function validatePlayerName(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new Error('Invalid player name');
  const name = value.trim();
  if (!name || name.length > 32 || [...name].some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  })) throw new Error('Invalid player name');
  return name;
}

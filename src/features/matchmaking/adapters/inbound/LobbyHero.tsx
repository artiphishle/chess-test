'use client';

import { Button } from '@ankhorage/zora/web/button';

interface Props {
  readonly busy: boolean;
  readonly onPlay: () => void;
}

/*** Launch an immutable configured game while leaving the editor in the lobby. */
export function LobbyHero({ busy, onPlay }: Props) {
  return (
    <section className="panel lobby-create-panel">
      <span className="eyebrow">GROSSMEISTER · LOBBY</span>
      <h1>Dein nächstes Spiel.</h1>
      <p className="muted">Brett gestalten und eine Partie für andere Spieler eröffnen.</p>
      <Button onPress={onPlay} disabled={busy}>
        ♟ Partie erstellen
      </Button>
    </section>
  );
}

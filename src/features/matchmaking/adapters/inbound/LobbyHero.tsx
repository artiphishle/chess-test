'use client';

import { Button } from '@ankhorage/zora/web/button';

interface Props {
  readonly busy: boolean;
  readonly onPlay: () => void;
}

/*** Launch an immutable configured game while leaving the editor in the lobby. */
export function LobbyHero({ busy, onPlay }: Props) {
  return (
    <section className="compact-hero">
      <div><span className="eyebrow">ANKHORAGE LAB / CHESS</span>
        <h1>Schach. <em>Ohne Grenzen.</em></h1>
        <p className="muted">Brett gestalten, Partie anbieten, gemeinsam spielen.</p>
      </div>
      <Button onPress={onPlay} disabled={busy}>♟ Partie erstellen</Button>
    </section>
  );
}

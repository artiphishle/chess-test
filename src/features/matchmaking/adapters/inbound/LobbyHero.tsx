'use client';

import { Button } from '@ankhorage/zora/web/button';

import type { TemplateLibrary } from '../../../templates/adapters/inbound/useTemplateLibrary.ts';

interface Props {
  readonly library: TemplateLibrary;
  readonly busy: boolean;
  readonly onPlay: () => void;
}

/*** Explain the anonymous chess experiment and expose the Play action. */
export function LobbyHero({ library, busy, onPlay }: Props) {
  const coins = library.template.cells.flat().filter((cell) => cell?.kind === 'coin').length;
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">ANKHORAGE LAB / CHESS</div>
        <h1>
          Schach. <em>Ohne Grenzen.</em>
        </h1>
        <p>
          Ändere die Brettgrösse, stelle eigene Armeen zusammen und fordere den nächsten anonymen
          Spieler heraus. Keine Anmeldung.
        </p>
        <div className="hero-actions">
          <Button onPress={onPlay} disabled={busy}>
            ♟ Spielen
          </Button>
          <Button variant="outline" onPress={() => library.setEditing((value) => !value)}>
            {library.editing ? 'Vorschau' : 'Konfigurieren'}
          </Button>
        </div>
      </div>
      <div className="hero-stats">
        <div>
          <b>
            {library.template.width} × {library.template.height}
          </b>
          <span>Brettformat</span>
        </div>
        <div>
          <b>{coins}</b>
          <span>Choice Coins</span>
        </div>
        <div>
          <b>2</b>
          <span>Spieler</span>
        </div>
      </div>
    </section>
  );
}

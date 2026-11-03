'use client';

import { Button } from '@ankhorage/zora/web/button';

interface Props {
  readonly leave: () => Promise<void>;
}

/*** Explain the live queue and allow the first player to cancel. */
export function WaitingSidebar({ leave }: Props) {
  return (
    <>
      <div className="pulsing-icon">♟</div>
      <h2>Gegner gesucht …</h2>
      <p className="muted">
        Die nächste Person, die auf «Spielen» klickt, spielt mit Deiner Startkonfiguration.
      </p>
      <Button
        variant="outline"
        onPress={() => {
          void leave();
        }}
      >
        Suche abbrechen
      </Button>
    </>
  );
}

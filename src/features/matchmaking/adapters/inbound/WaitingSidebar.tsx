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
      <h2>Partie in der Lobby</h2>
      <p className="muted">
        Deine Startaufstellung ist gesperrt. Andere Spieler sehen das Angebot in der Lobby und können beitreten.
      </p>
      <Button
        variant="outline"
        onPress={() => {
          void leave();
        }}
      >
        Partie zurückziehen
      </Button>
    </>
  );
}

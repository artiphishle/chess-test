'use client';

import { useEffect, useState } from 'react';

type Device = 'touch' | 'mac' | 'desktop';

/*** Show the command and gesture cheat sheet for this device only. */
export function CommandHelp() {
  const [device, setDevice] = useState<Device | null>(null);
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setDevice(coarse ? 'touch' : /Macintosh|Mac OS X/.test(navigator.userAgent) ? 'mac' : 'desktop');
  }, []);
  if (!device) return null;
  const modifier = device === 'mac' ? '⌘' : 'Ctrl';
  const items: readonly [string, string][] = [
    ['/help', 'Befehle und Gesten anzeigen'],
    ['/draw', 'Remis anbieten oder gegnerisches Angebot annehmen'],
    ['/resign', 'Aufgabe mit Bestätigung'],
    ['/cheat Qf4', 'Einmal pro Partie eine Dame auf f4 setzen'],
    ['2 Könige tippen', 'Remis anbieten oder annehmen'],
    ['4× eigenen König tippen', 'Aufgeben – nach Bestätigung'],
    ...(device === 'touch' ? [
      ['Pinch', 'Reihen und Spalten verändern'],
      ['Zwei-Finger-Tap', 'Vorlagen öffnen'],
      ['Zwei-Finger-Drehung', 'Brett drehen'],
      ['Nach links wischen', 'Brettfarbe wechseln'],
      ['Nach rechts wischen', 'Figurenset wechseln'],
      ['Aus Brettmitte nach unten ziehen', 'Vorlage speichern'],
    ] as const : [
      ['/', 'Befehl eingeben'],
      [`${modifier} + ← / →`, 'Spalten entfernen / hinzufügen'],
      [`${modifier} + ↑ / ↓`, 'Reihen hinzufügen / entfernen'],
      ['Trackpad-Pinch', 'Reihen und Spalten gleichzeitig ändern'],
      ['← / →', 'Brettfarbe / Figurenset wechseln'],
      [`${modifier} + F`, 'Brett drehen'],
      [`${modifier} + S`, 'Vorlage speichern'],
      [`${modifier} + T`, 'Vorlagen öffnen (browserabhängig)'],
      ['Mauskreis', 'Brett drehen'],
    ] as const),
  ];
  return (
    <div className="command-help" aria-label="Befehlshilfe">
      <h3>Cheatsheet</h3>
      <dl>
        {items.map(([command, meaning]) => (
          <div key={command}>
            <dt><code>{command}</code></dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

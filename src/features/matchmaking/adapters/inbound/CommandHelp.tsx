'use client';

import { useSyncExternalStore } from 'react';

type Device = 'touch' | 'mac' | 'desktop';

/*** Show only the commands and input methods available on the current device. */
export function CommandHelp() {
  const device = useSyncExternalStore(subscribe, getDevice, getServerDevice);
  if (!device) return null;
  const modifier = device === 'mac' ? '⌘' : 'Ctrl';
  const shared: readonly [string, string][] = [
    ['/help', 'Diese Übersicht öffnen'],
    ['/draw', 'Remis anbieten oder annehmen'],
    ['/resign', 'Partie aufgeben (mit Bestätigung)'],
    ['/cheat Qf4', 'Einmal pro Partie eine Dame auf f4 setzen'],
    ['Beide Könige tippen', 'Remis anbieten oder annehmen'],
    ['4× eigenen König tippen', 'Aufgeben bestätigen'],
  ];
  const touch: readonly [string, string][] = [
    ['Pinch auf dem Brett', 'Reihen und Spalten verändern'],
    ['Zwei-Finger-Tap aufs Brett', 'Vorlagen öffnen'],
    ['Doppel-Tap links unter dem Brett', 'Brettfarbe wechseln'],
    ['Doppel-Tap rechts unter dem Brett', 'Figurenset wechseln'],
    ['Aus Brettmitte nach unten ziehen', 'Vorlage speichern'],
  ];
  const desktop: readonly [string, string][] = [
    ['/', 'Befehlseingabe öffnen'],
    [`${modifier} + ← / →`, 'Spalten entfernen / hinzufügen'],
    [`${modifier} + ↑ / ↓`, 'Reihen hinzufügen / entfernen'],
    ['Trackpad-Pinch', 'Reihen und Spalten gleichzeitig verändern'],
    ['Doppelklick links/rechts unter dem Brett', 'Brettfarbe / Figurenset wechseln'],
    ['← / →', 'Brettfarbe / Figurenset wechseln'],
    [`${modifier} + F`, 'Brett drehen'],
    [`${modifier} + S`, 'Vorlage speichern'],
    [`${modifier} + T`, 'Vorlagen öffnen (browserabhängig)'],
  ];
  return (
    <div className="command-help" aria-label="Befehlshilfe">
      <h3>Cheatsheet</h3>
      <dl>
        {[...shared, ...(device === 'touch' ? touch : desktop)].map(([command, meaning]) => (
          <div key={command}>
            <dt><code>{command}</code></dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/*** Device class is fixed for the lifetime of this browser tab. */
function subscribe(): () => void {
  return () => undefined;
}

/*** Read OS modifier and primary input device only after hydration. */
function getDevice(): Device {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const mac = /Macintosh|Mac OS X/.test(navigator.userAgent);
  return touch ? 'touch' : mac ? 'mac' : 'desktop';
}

/*** Avoid leaking client-only device assumptions into server-rendered help. */
function getServerDevice(): Device | null {
  return null;
}

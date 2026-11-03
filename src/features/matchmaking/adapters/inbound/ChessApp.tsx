'use client';

import { Button } from '@ankhorage/zora/web/button';
import { ZoraProvider } from '@ankhorage/zora/web/runtime';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Cell, Move, PieceKind, Position, Template } from '../../../../types/chess.ts';
import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import { getLegalMoves } from '../../../chess/domain/getLegalMoves.ts';
import { TemplateEditor } from '../../../templates/adapters/inbound/TemplateEditor.tsx';
import { createPresets } from '../../../templates/domain/createPresets.ts';
import type { MatchSnapshot } from '../../application/createGameService.ts';

interface ApiResponse {
  match: MatchSnapshot | null;
  error?: string;
}
interface Promotion {
  from: Position;
  to: Position;
}
const theme = {
  id: 'chess-test',
  name: 'Chess Test',
  appCategory: 'developer_tools',
  primaryColor: '#b5e0ac',
  harmony: 'analogous',
} as const;
const pieces: readonly PieceKind[] = ['P', 'N', 'B', 'R', 'Q', 'K'];
const names: Readonly<Record<PieceKind, string>> = {
  P: 'Bauer',
  N: 'Springer',
  B: 'Läufer',
  R: 'Turm',
  Q: 'Dame',
  K: 'König',
};
const presets = createPresets();

/*** Present the anonymous multiplayer lobby, constrained setup and chessboard editor. */
export function ChessApp() {
  const [template, setTemplate] = useState<Template>(presets[0]);
  const [saved, setSaved] = useState<readonly Template[]>([]);
  const [editing, setEditing] = useState(false);
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Position | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [activeCoin, setActiveCoin] = useState<Position | null>(null);
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('chess-test-templates') ?? '[]') as unknown;
      if (Array.isArray(parsed))
        setSaved(
          parsed.filter(
            (entry): entry is Template =>
              typeof entry === 'object' && entry !== null && 'id' in entry && 'cells' in entry,
          ),
        );
    } catch {
      setSaved([]);
    }
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/game', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) {
        const data = (await response.json()) as ApiResponse;
        setMatch(data.match);
      }
    } catch {
      /* Transient polling failures do not discard an active board. */
    }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1200);
    return () => window.clearInterval(interval);
  }, [refresh]);
  const act = useCallback(async (command: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(command),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || data.error) throw new Error(data.error ?? 'Serverfehler');
      setMatch(data.match);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verbindung fehlgeschlagen');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  const leave = async () => {
    await act({ action: 'leave' });
    setSelected(null);
    setPromotion(null);
    setActiveCoin(null);
  };
  const saveTemplate = (name: string) => {
    const next: Template = { ...template, id: crypto.randomUUID(), name };
    const updated = [...saved, next];
    setSaved(updated);
    setTemplate(next);
    setEditing(false);
    localStorage.setItem('chess-test-templates', JSON.stringify(updated));
  };
  const deleteTemplate = (id: string) => {
    const updated = saved.filter((entry) => entry.id !== id);
    setSaved(updated);
    localStorage.setItem('chess-test-templates', JSON.stringify(updated));
    setTemplate(presets[0]);
  };
  const setupCells = useMemo(
    () =>
      match?.template.cells.map((row, y) =>
        row.map((cell, x): Cell => {
          if (cell?.kind !== 'coin' || cell.color !== match.color) return cell;
          const kind = match.choices[`${x}:${y}`];
          return kind ? { kind, color: cell.color } : cell;
        }),
      ),
    [match],
  );
  const board = match?.state?.board ?? setupCells ?? template.cells;
  const legal = useMemo(
    () =>
      match?.state && match.phase === 'playing' && match.color === match.state.turn && selected
        ? getLegalMoves(match.state, selected)
        : [],
    [match, selected],
  );
  const onSquare = (position: Position) => {
    if (!match) return;
    if (match.phase === 'setup') {
      const cell = match.template.cells[position.y]?.[position.x];
      if (cell?.kind === 'coin' && cell.color === match.color && !match.ready[match.color])
        setActiveCoin(position);
      return;
    }
    if (match.phase !== 'playing' || !match.state || match.state.turn !== match.color || busy)
      return;
    const piece = match.state.board[position.y]?.[position.x];
    if (piece?.color === match.color) {
      setSelected(position);
      setPromotion(null);
      return;
    }
    if (!selected) return;
    const candidates = legal.filter(
      (candidate) => candidate.to.x === position.x && candidate.to.y === position.y,
    );
    if (!candidates.length) {
      setSelected(null);
      return;
    }
    if (candidates.some((move) => move.promotion)) {
      setPromotion({ from: selected, to: position });
      return;
    }
    void act({ action: 'move', move: { from: selected, to: position } }).then((ok) => {
      if (ok) setSelected(null);
    });
  };
  const choose = (kind: PieceKind) => {
    if (!activeCoin) return;
    void act({ action: 'choose', x: activeCoin.x, y: activeCoin.y, kind }).then((ok) => {
      if (ok) setActiveCoin(null);
    });
  };
  const turnText = match?.state?.turn === 'w' ? 'Weiss' : 'Schwarz';
  const resultText = match?.result
    ? match.result.winner === null
      ? 'Unentschieden'
      : match.result.winner === match.color
        ? 'Du hast gewonnen!'
        : 'Dein Gegner hat gewonnen.'
    : '';
  return (
    <ZoraProvider theme={theme} initialMode="dark">
      <main className="app-shell">
        <header className="app-header">
          <div className="brand">
            <div className="brand-icon">♞</div>
            <div>
              <strong>
                CHESS<span>TEST</span>
              </strong>
              <p>Experimentelle Spielkonfigurationen</p>
            </div>
          </div>
          <div className="header-status">
            <span className="status-light" />
            {match
              ? match.phase === 'waiting'
                ? 'Spielersuche'
                : match.phase === 'setup'
                  ? 'Vorbereitung'
                  : match.phase === 'playing'
                    ? 'Live-Partie'
                    : 'Spiel beendet'
              : 'Bereit zum Spielen'}
          </div>
        </header>
        <div className="page-content">
          {error ? (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => setError('')} aria-label="Schliessen">
                ×
              </button>
            </div>
          ) : null}
          {!match ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">ANKHORAGE LAB / CHESS</div>
                  <h1>
                    Schach. <em>Ohne Grenzen.</em>
                  </h1>
                  <p>
                    Ändere die Brettgrösse, stelle eigene Armeen zusammen und fordere den nächsten
                    anonymen Spieler heraus. Keine Anmeldung.
                  </p>
                  <div className="hero-actions">
                    <Button
                      onPress={() => {
                        void act({ action: 'join', template });
                      }}
                      disabled={busy}
                    >
                      ♟ Spielen
                    </Button>
                    <Button variant="outline" onPress={() => setEditing((value) => !value)}>
                      {editing ? 'Vorschau' : 'Konfigurieren'}
                    </Button>
                  </div>
                </div>
                <div className="hero-stats">
                  <div>
                    <b>
                      {template.width} × {template.height}
                    </b>
                    <span>Brettformat</span>
                  </div>
                  <div>
                    <b>{template.cells.flat().filter((cell) => cell?.kind === 'coin').length}</b>
                    <span>Choice Coins</span>
                  </div>
                  <div>
                    <b>2</b>
                    <span>Spieler</span>
                  </div>
                </div>
              </section>
              {editing ? (
                <TemplateEditor
                  template={template}
                  templates={[...presets, ...saved]}
                  onSelect={setTemplate}
                  onUpdate={setTemplate}
                  onSave={saveTemplate}
                  onDelete={deleteTemplate}
                />
              ) : (
                <section className="lobby-layout">
                  <div className="panel board-panel">
                    <div className="panel-heading">
                      <h2>Brettvorschau</h2>
                      <span>{template.name}</span>
                    </div>
                    <ChessBoard
                      cells={template.cells}
                      width={template.width}
                      height={template.height}
                      onSquare={() => setEditing(true)}
                    />
                  </div>
                  <aside className="panel side-panel">
                    <h2>Spielvorlagen</h2>
                    <p className="muted">
                      Wähle ein Szenario oder erstelle eine eigene Aufstellung.
                    </p>
                    <div className="templates">
                      {[...presets, ...saved].map((preset) => (
                        <button
                          type="button"
                          key={preset.id}
                          className={`template-option${template.id === preset.id ? ' active' : ''}`}
                          onClick={() => setTemplate(preset)}
                        >
                          <span className="template-symbol">
                            {preset.width === 10 ? '◈' : preset.id === 'endgame' ? '♚' : '♜'}
                          </span>
                          <span>
                            <strong>{preset.name}</strong>
                            <small>
                              {preset.width} × {preset.height} ·{' '}
                              {preset.cells.flat().filter((cell) => cell?.kind === 'coin').length}{' '}
                              Coins
                            </small>
                          </span>
                          <span>›</span>
                        </button>
                      ))}
                    </div>
                    <div className="tip">
                      <span>✦</span>
                      <div>
                        <strong>Choice Coins</strong>
                        <p>
                          Die beiden Spieler wählen ihre eigenen Figuren vor Beginn. Danach wird die
                          Aufstellung gesperrt.
                        </p>
                      </div>
                    </div>
                  </aside>
                </section>
              )}
            </>
          ) : (
            <section className="match-layout">
              <div className="panel board-panel">
                <div className="panel-heading">
                  <h2>
                    {match.phase === 'waiting'
                      ? 'Warte auf Gegner'
                      : match.phase === 'setup'
                        ? 'Figuren wählen'
                        : match.phase === 'playing'
                          ? 'Deine Partie'
                          : 'Partie beendet'}
                  </h2>
                  <span>
                    {match.template.width} × {match.template.height}
                  </span>
                </div>
                <ChessBoard
                  cells={board}
                  width={match.template.width}
                  height={match.template.height}
                  flipped={match.color === 'b'}
                  selected={selected}
                  hints={legal.map((move) => move.to)}
                  onSquare={onSquare}
                />
                <div className="board-footer">
                  <span>Du spielst {match.color === 'w' ? 'Weiss ♔' : 'Schwarz ♚'}</span>
                  <span>
                    {match.phase === 'playing' ? `${turnText} am Zug` : match.template.name}
                  </span>
                </div>
              </div>
              <aside className="panel side-panel">
                {match.phase === 'waiting' ? (
                  <>
                    <div className="pulsing-icon">♟</div>
                    <h2>Gegner gesucht …</h2>
                    <p className="muted">
                      Die nächste Person, die auf «Spielen» klickt, spielt mit Deiner gespeicherten
                      Startkonfiguration.
                    </p>
                    <Button variant="outline" onPress={() => void leave()}>
                      Suche abbrechen
                    </Button>
                  </>
                ) : null}
                {match.phase === 'setup' ? (
                  <>
                    <h2>Choice Coins auflösen</h2>
                    <p className="muted">
                      Wähle jeden Deiner Coins auf dem Brett und bestimme die Figur. Jeder Coin kann
                      unabhängig gewählt werden.
                    </p>
                    <div className="ready-status">
                      Du: {match.ready[match.color] ? 'Bereit' : 'Wählst Figuren'} · Gegner:{' '}
                      {match.ready[match.color === 'w' ? 'b' : 'w'] ? 'Bereit' : 'Wählt Figuren'}
                    </div>
                    {activeCoin ? (
                      (() => {
                        const coin = match.template.cells[activeCoin.y]?.[activeCoin.x];
                        return coin?.kind === 'coin' ? (
                          <div className="coin-choice">
                            <h3>
                              Figur für Coin {activeCoin.x + 1}/{activeCoin.y + 1}
                            </h3>
                            <div className="chip-group">
                              {coin.options.map((kind) => (
                                <button type="button" key={kind} onClick={() => choose(kind)}>
                                  {names[kind]}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()
                    ) : (
                      <p className="hint-text">Wähle einen Deiner Coins direkt auf dem Brett.</p>
                    )}
                    <Button
                      disabled={
                        busy ||
                        match.ready[match.color] ||
                        match.template.cells.some((row, y) =>
                          row.some(
                            (cell, x) =>
                              cell?.kind === 'coin' &&
                              cell.color === match.color &&
                              !match.choices[`${x}:${y}`],
                          ),
                        )
                      }
                      onPress={() => void act({ action: 'ready' })}
                    >
                      Auswahl bestätigen
                    </Button>
                    {match.ready[match.color] ? (
                      <p className="muted">Deine Auswahl ist gesperrt. Warte auf Deinen Gegner.</p>
                    ) : null}
                    <Button variant="ghost" onPress={() => void leave()}>
                      Zurück zum Start
                    </Button>
                  </>
                ) : null}
                {match.phase === 'playing' ? (
                  <>
                    <h2>Partie läuft</h2>
                    <p className="muted">
                      {match.state?.turn === match.color
                        ? 'Du bist am Zug.'
                        : 'Dein Gegner ist am Zug.'}{' '}
                      Alle Züge werden auf dem Server validiert.
                    </p>
                    <div className="match-info">
                      <div>
                        <span>Farbe</span>
                        <strong>{match.color === 'w' ? 'Weiss' : 'Schwarz'}</strong>
                      </div>
                      <div>
                        <span>Halbzüge seit Bauer/Schlag</span>
                        <strong>{match.state?.halfmove ?? 0}</strong>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onPress={() => {
                        void act({ action: 'resign' }).then((ok) => {
                          if (ok) void leave();
                        });
                      }}
                    >
                      Aufgeben & zum Start
                    </Button>
                  </>
                ) : null}
                {match.phase === 'finished' ? (
                  <>
                    <h2>{resultText}</h2>
                    <p className="muted">
                      Die Partie ist beendet. Starte einen Rückkampf oder beginne eine neue Suche.
                    </p>
                    {match.opponentPresent ? (
                      <Button
                        disabled={match.rematch[match.color]}
                        onPress={() => void act({ action: 'rematch' })}
                      >
                        {match.rematch[match.color] ? 'Warte auf Gegner' : 'Rematch'}
                      </Button>
                    ) : (
                      <p className="muted">Der Gegner hat die Partie verlassen.</p>
                    )}
                    <Button variant="outline" onPress={() => void leave()}>
                      Zur Startseite
                    </Button>
                  </>
                ) : null}
              </aside>
            </section>
          )}
        </div>
        {promotion ? (
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Bauernumwandlung"
          >
            <div className="result-modal">
              <h2>Bauernumwandlung</h2>
              <p>Wähle die neue Figur.</p>
              <div className="chip-group">
                {(['Q', 'R', 'B', 'N'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      const move: Move = { ...promotion, promotion: kind };
                      void act({ action: 'move', move }).then((ok) => {
                        if (ok) {
                          setPromotion(null);
                          setSelected(null);
                        }
                      });
                    }}
                  >
                    {names[kind]}
                  </button>
                ))}
              </div>
              <Button variant="ghost" onPress={() => setPromotion(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}
        {match?.phase === 'finished' && match.result ? (
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Spielergebnis"
          >
            <div className="result-modal">
              <div className="result-symbol">{match.result.winner === null ? '½' : '♛'}</div>
              <span className="eyebrow">SPIEL BEENDET</span>
              <h2>{resultText}</h2>
              <p>Grund: {match.result.reason}</p>
              {match.opponentPresent ? (
                <Button
                  disabled={match.rematch[match.color]}
                  onPress={() => void act({ action: 'rematch' })}
                >
                  {match.rematch[match.color] ? 'Warte auf Gegner' : '↻ Rematch'}
                </Button>
              ) : null}
              <Button variant="outline" onPress={() => void leave()}>
                Zur Startseite
              </Button>
            </div>
          </div>
        ) : null}
        <footer>
          ANKHORAGE · CHESS TEST <span>Variable boards. Real chess rules.</span>
        </footer>
      </main>
    </ZoraProvider>
  );
}

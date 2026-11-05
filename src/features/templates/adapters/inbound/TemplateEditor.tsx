'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import type { Cell, Position, Template } from '../../../../types/chess.ts';
import { useBoardTheme } from '../../../branding/adapters/inbound/useBoardTheme.ts';
import type { EditorMode } from '../../../../types/editor.ts';
import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import { usePieceSet } from '../../../chess/adapters/inbound/usePieceSet.ts';
import { PIECE_SETS } from '../../../chess/constants/pieceSets.ts';
import { cycleEditorCell } from '../../domain/cycleEditorCell.ts';
import { resizeTemplate } from '../../domain/resizeTemplate.ts';
import { HiddenDoubleTapZone } from './HiddenDoubleTapZone.tsx';
import { useEditorBoardGestures } from './useEditorBoardGestures.ts';

interface Props {
  readonly template: Template;
  readonly templates: readonly Template[];
  readonly onSelect: (template: Template) => void;
  readonly onUpdate: (template: Template) => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (id: string) => void;
}

const sequenceKey = 'chess-test-template-sequence';

/*** Edit the board directly using gestures and keyboard shortcuts without secondary controls. */
export function TemplateEditor({
  template,
  templates,
  onSelect,
  onUpdate,
  onSave,
  onDelete,
}: Props) {
  const { cycleTheme } = useBoardTheme();
  const [mode, setMode] = useState<EditorMode>('w');
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const presetRef = useRef<HTMLSelectElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const wheelDelta = useRef(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const { pieceSet, selectPieceSet } = usePieceSet();

  const resize = useCallback(
    (columns: number, ranks: number) => {
      onUpdate(resizeTemplate(template, template.width + columns, template.height + ranks));
    },
    [onUpdate, template],
  );

  useEffect(() => {
    const node = boardRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      wheelDelta.current += -event.deltaY;
      const steps = Math.trunc(wheelDelta.current / 45);
      if (!steps) return;
      wheelDelta.current -= steps * 45;
      resize(steps, steps);
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [resize]);

  const openSave = useCallback(() => {
    const saved = Number(window.localStorage.getItem(sequenceKey));
    const number = Number.isSafeInteger(saved) && saved >= 0 ? saved + 1 : 1;
    setName(`${template.height}/${template.width} Template ${String(number).padStart(2, '0')}`);
    setSaving(true);
  }, [template.height, template.width]);

  const openTemplates = useCallback(() => {
    const control = presetRef.current;
    if (!control) return;
    control.focus();
    try {
      control.showPicker();
    } catch {
      // The focused native select remains available when the browser blocks showPicker.
    }
  }, []);

  const nextBoardStyle = useCallback(() => cycleTheme(1), [cycleTheme]);
  const nextPieceStyle = useCallback(() => {
    const index = PIECE_SETS.indexOf(pieceSet);
    selectPieceSet(PIECE_SETS[(index + 1) % PIECE_SETS.length]!);
  }, [pieceSet, selectPieceSet]);

  const gestures = useEditorBoardGestures({
    onResize: resize,
    onSave: openSave,
    onTemplates: openTemplates,
  });

  useEffect(() => {
    if (!saving) return;
    const frame = requestAnimationFrame(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [saving]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent): void => {
      if (saving) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
      )
        return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (
        command &&
        !event.altKey &&
        !event.shiftKey &&
        ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)
      ) {
        event.preventDefault();
        if (key === 'arrowleft') resize(-1, 0);
        else if (key === 'arrowright') resize(1, 0);
        else if (key === 'arrowup') resize(0, 1);
        else resize(0, -1);
      } else if (command && ['s', 't', 'f'].includes(key)) {
        event.preventDefault();
        if (key === 's') openSave();
        else if (key === 't') openTemplates();
        else setFlipped((value) => !value);
      } else if (!command && !event.altKey && key === 'arrowleft') {
        event.preventDefault();
        cycleTheme(event.shiftKey ? -1 : 1);
      } else if (!command && !event.altKey && key === 'arrowright') {
        event.preventDefault();
        const index = PIECE_SETS.indexOf(pieceSet);
        selectPieceSet(
          PIECE_SETS[(index + (event.shiftKey ? PIECE_SETS.length - 1 : 1)) % PIECE_SETS.length]!,
        );
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [cycleTheme, saving, openSave, openTemplates, pieceSet, resize, selectPieceSet]);

  const place = (position: Position, gesture: 'tap' | 'hold'): void => {
    const nextMode: EditorMode =
      gesture === 'hold' ? (mode === 'w' ? 'b' : mode === 'b' ? 'coin' : 'w') : mode;
    if (gesture === 'hold') setMode(nextMode);
    onUpdate({
      ...template,
      cells: template.cells.map((row, y) =>
        y === position.y
          ? row.map((cell, x) =>
              x === position.x ? cycleEditorCell(cell, gesture, nextMode) : cell,
            )
          : row,
      ),
    });
  };

  const blank = (): void => {
    onSelect({
      id: 'new',
      name: 'Eigenes Brett',
      width: 8,
      height: 8,
      turn: 'random',
      cells: Array.from({ length: 8 }, () => Array<Cell>(8).fill(null)),
    });
  };

  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave(name.trim() || template.name);
    const saved = Number(window.localStorage.getItem(sequenceKey));
    const number = Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    window.localStorage.setItem(sequenceKey, String(number + 1));
    setSaving(false);
  };

  const turn =
    template.turn === 'random'
      ? { icon: '🎲', next: 'w' as const, label: 'Zufällig – wechseln zu Weiss' }
      : template.turn === 'w'
        ? { icon: '⚪', next: 'b' as const, label: 'Weiss – wechseln zu Schwarz' }
        : { icon: '⚫', next: 'random' as const, label: 'Schwarz – wechseln zu Zufall' };

  return (
    <section className="panel board-panel editor-board" aria-label="Brett konfigurieren">
      <div className="editor-preset-row">
        <select
          ref={presetRef}
          className="editor-preset-select"
          aria-label="Vorlage"
          value={templates.some((entry) => entry.id === template.id) ? template.id : 'new'}
          onChange={(event) => {
            if (event.target.value === 'new') blank();
            else {
              const found = templates.find((entry) => entry.id === event.target.value);
              if (found) onSelect(found);
            }
          }}
        >
          <option value="new">Eigenes Brett</option>
          {templates.map((entry) => (
            <option value={entry.id} key={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>
      <div ref={boardRef} className="editor-interactive" {...gestures}>
        <ChessBoard
          cells={template.cells}
          width={template.width}
          height={template.height}
          flipped={flipped}
          onSquare={(position) => place(position, 'tap')}
          onSquareLong={(position) => place(position, 'hold')}
        />
      </div>
      <div className="editor-turn-row">
        <HiddenDoubleTapZone
          label="Design und Logo wechseln (doppelt tippen)"
          onActivate={nextBoardStyle}
        />
        <button
          type="button"
          className="editor-turn"
          aria-label={turn.label}
          title={turn.label}
          onClick={() => onUpdate({ ...template, turn: turn.next })}
        >
          {turn.icon}
        </button>
        <HiddenDoubleTapZone
          label="Figurenset wechseln (doppelt tippen)"
          onActivate={nextPieceStyle}
        />
      </div>
      {saving ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSaving(false)}>
          <form
            className="editor-save-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Vorlage speichern"
            onSubmit={save}
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={nameRef}
              value={name}
              maxLength={100}
              aria-label="Vorlagenname"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setSaving(false);
                }
              }}
            />
            {templates.some(
              (entry) =>
                entry.id === template.id &&
                !['standard', 'coins-10x13', 'endgame'].includes(entry.id),
            ) ? (
              <button
                type="button"
                className="editor-delete-template"
                onClick={() => {
                  onDelete(template.id);
                  setSaving(false);
                }}
              >
                Vorlage löschen
              </button>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { Template } from '../../../../types/chess.ts';
import { createPresets } from '../../domain/createPresets.ts';

export interface TemplateLibrary {
  readonly template: Template;
  readonly templates: readonly Template[];
  readonly editing: boolean;
  readonly setEditing: (value: boolean | ((previous: boolean) => boolean)) => void;
  readonly setTemplate: (template: Template) => void;
  readonly save: (name: string) => void;
  readonly remove: (id: string) => void;
}

/*** Keep local reusable templates separate from live match snapshots. */
export function useTemplateLibrary(): TemplateLibrary {
  const [template, setTemplate] = useState<Template>(presets[0]);
  const [saved, setSaved] = useState<readonly Template[]>([]);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSaved(loadSavedTemplates()));
    return () => cancelAnimationFrame(frame);
  }, []);
  const persist = (next: readonly Template[]): void => {
    localStorage.setItem('chess-test-templates', JSON.stringify(next));
    setSaved(next);
  };
  const save = (name: string): void => {
    const next = { ...template, id: crypto.randomUUID(), name };
    persist([...saved, next]);
    setTemplate(next);
    setEditing(false);
  };
  const remove = (id: string): void => {
    persist(saved.filter((entry) => entry.id !== id));
    setTemplate(presets[0]);
  };
  return {
    template,
    templates: [...presets, ...saved],
    editing,
    setEditing,
    setTemplate,
    save,
    remove,
  };
}

const presets = createPresets();

/*** Read only plausibly shaped local templates after browser hydration. */
function loadSavedTemplates(): readonly Template[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('chess-test-templates') ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Template =>
        typeof entry === 'object' && entry !== null && 'id' in entry && 'cells' in entry,
    );
  } catch {
    return [];
  }
}

'use client';

import { useEffect, useState } from 'react';
import type { Template } from '../../../../types/chess.ts';
import { createPresets } from '../../domain/createPresets.ts';

export interface TemplateLibrary {
  readonly template: Template;
  readonly templates: readonly Template[];
  readonly setTemplate: (template: Template) => void;
  readonly save: (name: string) => void;
  readonly remove: (id: string) => void;
}

/*** Keep editable local presets independent of every server-locked match snapshot. */
export function useTemplateLibrary(): TemplateLibrary {
  const [template, setTemplate] = useState<Template>(presets[0]!);
  const [saved, setSaved] = useState<readonly Template[]>([]);
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
  };
  const remove = (id: string): void => {
    persist(saved.filter((entry) => entry.id !== id));
    setTemplate(presets[0]!);
  };
  return { template, templates: [...presets, ...saved], setTemplate, save, remove };
}

const presets = createPresets();

/*** Read plausible local template objects without trusting browser storage as validated input. */
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

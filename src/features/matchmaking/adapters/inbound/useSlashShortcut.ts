'use client';

import { useEffect } from 'react';

/*** Register the slash key only when no dialog or input already owns the keyboard. */
export function useSlashShortcut(enabled: boolean, onOpen: () => void): void {
  useEffect(() => {
    if (!enabled) return;
    const keydown = (event: KeyboardEvent): void => {
      if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      onOpen();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [enabled, onOpen]);
}

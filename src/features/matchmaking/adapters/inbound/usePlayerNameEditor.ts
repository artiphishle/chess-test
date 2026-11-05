'use client';

import { useEffect, useState } from 'react';

import { getPlayerName } from './getPlayerName.ts';

/*** Auto-save the anonymous display name and sync owned games after a short pause. */
export function usePlayerNameEditor(onName: (name: string) => void) {
  const [name, setName] = useState('Gast');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setName(getPlayerName()));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!name.trim()) return;
    const delay = setTimeout(() => onName(name.trim()), 600);
    return () => clearTimeout(delay);
  }, [name, onName]);
  const changeName = (value: string): void => {
    const next = value.slice(0, 32);
    setName(next);
    window.localStorage.setItem('chess-test-player-name', next);
  };
  return { name, editing, setEditing, changeName };
}

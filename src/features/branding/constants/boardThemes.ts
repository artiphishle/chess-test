/*** Own the seven GrossMeister presentation variants; game rules never depend on these values. */
export const BOARD_THEMES = [
  { id: 'ruby', name: 'Rubin', accent: '#ce1344', icon: '/brand/symbol-1.svg', wordmark: '/brand/wordmark-1.svg' },
  { id: 'gold', name: 'Gold', accent: '#d8a641', icon: '/brand/symbol-2.svg', wordmark: '/brand/wordmark-2.svg' },
  { id: 'ember', name: 'Orange', accent: '#ff501a', icon: '/brand/symbol-3.svg', wordmark: '/brand/wordmark-3.svg' },
  { id: 'emerald', name: 'Grün', accent: '#39b54a', icon: '/brand/symbol-4.svg', wordmark: '/brand/wordmark-4.svg' },
  { id: 'amethyst', name: 'Violett', accent: '#662d91', icon: '/brand/symbol-5.svg', wordmark: '/brand/wordmark-5.svg' },
  { id: 'navy', name: 'Navy', accent: '#171a49', icon: '/brand/symbol-6.svg', wordmark: '/brand/wordmark-6.svg' },
  { id: 'rose-noir', name: 'Rose Noir', accent: '#ce1344', icon: '/brand/symbol-7.svg', wordmark: '/brand/wordmark-7.svg' },
] as const;

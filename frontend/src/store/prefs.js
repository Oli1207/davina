import { create } from 'zustand';

const read = (k, d) => {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
};

export function applyTheme(theme) {
  const t = theme === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#170d0e' : '#c8102e');
}

export const usePrefs = create((set) => ({
  theme: read('davina-theme', 'light'),
  setTheme(theme) {
    try { localStorage.setItem('davina-theme', theme); } catch { /* navigation privee */ }
    applyTheme(theme);
    set({ theme });
  },
}));

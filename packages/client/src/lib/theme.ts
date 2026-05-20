import { THEME_STORAGE_KEY, THEME_DARK_META_COLOR, THEME_LIGHT_META_COLOR, THEME_LIGHT_HOURS_START, THEME_LIGHT_HOURS_END } from '@mspr/shared';
import type { Theme } from '@mspr/shared';

export function initTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  const hour = new Date().getHours();
  return hour >= THEME_LIGHT_HOURS_START && hour < THEME_LIGHT_HOURS_END ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? THEME_DARK_META_COLOR : THEME_LIGHT_META_COLOR);
  }
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

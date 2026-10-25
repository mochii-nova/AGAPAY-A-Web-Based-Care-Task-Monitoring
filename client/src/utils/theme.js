// Light / dark mode. The choice is 'light', 'dark' or 'system' (follow the computer's setting).
// The page shows it through data-theme="light|dark" on <html>; main.css has the colours.
// index.html runs the same rules before React starts, so the page never flashes white.
import { useSyncExternalStore } from 'react';

const KEY = 'agapay.theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

function readChoice() {
  try {
    const saved = localStorage.getItem(KEY);
    return ['light', 'dark'].includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

let choice = readChoice();

function apply() {
  const dark = choice === 'dark' || (choice === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  listeners.forEach((fn) => fn());
}

// When "System" is chosen and the computer switches between light and dark
darkQuery.addEventListener('change', apply);

export function setTheme(next) {
  choice = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // Still changes for this visit
  }
  apply();
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// The current choice ('light' | 'dark' | 'system'), and re-renders when it changes
export const useTheme = () => useSyncExternalStore(subscribe, () => choice);

// What is showing right now ('light' | 'dark'), also when "system" follows the computer
export const useShownTheme = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme);

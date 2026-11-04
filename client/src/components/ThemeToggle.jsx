import { Moon, Sun } from 'lucide-react';
import { setTheme, useShownTheme } from '../utils/theme';

// Light / Dark switch in the top bar (sun and moon).
// "Match my computer's theme" is in the avatar menu.
export default function ThemeToggle() {
  const shown = useShownTheme();
  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      <button type="button" className="theme-toggle__btn" aria-pressed={shown === 'light'} aria-label="Light mode" onClick={() => setTheme('light')}>
        <Sun size={18} aria-hidden="true" />
      </button>
      <button type="button" className="theme-toggle__btn" aria-pressed={shown === 'dark'} aria-label="Dark mode" onClick={() => setTheme('dark')}>
        <Moon size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

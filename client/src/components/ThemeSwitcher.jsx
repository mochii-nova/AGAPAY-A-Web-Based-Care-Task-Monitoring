import { Monitor, Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '../utils/theme';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

// Light / Dark / System (follows the computer's setting)
export default function ThemeSwitcher() {
  const theme = useTheme();
  return (
    <div className="theme-switcher">
      <p className="small-label" id="theme-label">Appearance</p>
      <div className="segmented segmented--fill" role="group" aria-labelledby="theme-label">
        {OPTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className="segmented__btn" aria-pressed={theme === id} onClick={() => setTheme(id)}>
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

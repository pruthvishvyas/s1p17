import { useTheme } from '../../hooks/shared/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle light and dark theme" title="Toggle theme">
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

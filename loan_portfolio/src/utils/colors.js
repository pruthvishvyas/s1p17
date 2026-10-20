// All colours are CSS variables defined in styles.css so dark mode always works.
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
export const ACCENT = 'var(--color-accent)';
export const GRID = 'var(--color-border)';
export const AXIS = { fill: 'var(--color-text-secondary)', fontSize: 12 };
export const TOOLTIP_STYLE = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)' };
export function severityClass(s) {
  const v = String(s || '').toUpperCase();
  return v === 'HIGH' ? 'high' : v === 'MEDIUM' ? 'medium' : 'low';
}

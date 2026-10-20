import { useOutcome, OUTCOMES } from '../../context/OutcomeContext';
import { ThemeToggle } from './ThemeToggle';
import { useRunLog } from '../../hooks/shared/useRunLog';
import { useAlerts } from '../../hooks/monitor/useAlerts';
import { timeAgo, fmtInt } from '../../utils/formatters';

export function Header({ onMenu }) {
  const { tab, setActive } = useOutcome();
  const { last } = useRunLog();
  const alerts = useAlerts();
  const count = alerts.data && Array.isArray(alerts.data.alerts) ? alerts.data.alerts.length : 0;

  return (
    <header className="app-header">
      <button className="menu-btn" onClick={onMenu} aria-label="Open menu">☰</button>
      <div className="header-title">
        <span className={'outcome-pill outcome-' + tab.outcome.toLowerCase()}>{OUTCOMES[tab.outcome].label}</span>
        <h1>{tab.label}</h1>
      </div>
      <div className="header-right">
        {last && (
          <span className="header-meta" title={'Data source: ' + (last.source || 'n/a')}>
            Updated {timeAgo(last.run_at)} · {fmtInt(last.rows)} rows
          </span>
        )}
        <button className={'alert-chip' + (count > 0 ? ' has-alerts' : '')} onClick={() => setActive('alerts')}>
          🔔 {count}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

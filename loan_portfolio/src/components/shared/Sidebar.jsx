import { useOutcome, TABS, OUTCOMES } from '../../context/OutcomeContext';
import { useContract } from '../../hooks/shared/useContract';

const GROUPS = ['UNDERSTAND', 'DECIDE', 'MONITOR', 'EXPLORE', 'HELP'];

export function Sidebar({ onNavigate }) {
  const { active, setActive } = useOutcome();
  const { contract } = useContract();
  const name = (contract && contract.project && contract.project.name) || 'Analytics';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">{initials}</span>
        <span className="brand-name">{name}</span>
      </div>
      <nav className="sidebar-nav">
        {GROUPS.map(g => (
          <div key={g} className="nav-group">
            <div className="nav-group-title">
              {OUTCOMES[g].label}
              <span className="nav-group-sub">{OUTCOMES[g].question}</span>
            </div>
            {TABS.filter(t => t.outcome === g).map(t => (
              <button
                key={t.id}
                className={'nav-item' + (active === t.id ? ' active' : '')}
                onClick={() => { setActive(t.id); if (onNavigate) onNavigate(); }}
              >
                <span className="nav-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

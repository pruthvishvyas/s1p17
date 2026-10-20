import { useState } from 'react';
import { useInsights } from '../../hooks/decide/useInsights';
import { validateInsights } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { SeverityBadge } from '../shared/SeverityBadge';
import { severityClass } from '../../utils/colors';

const FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

export function InsightCards() {
  const { data: raw, loading, error } = useInsights();
  const [filter, setFilter] = useState('ALL');
  if (loading) return <SkeletonCard height={160} count={3} />;
  const { valid, data } = validateInsights(raw);
  if (!valid || error) return <EmptyState message="No insights available yet." action={FIX_ACTION} />;
  const list = filter === 'ALL' ? data : data.filter(i => String(i.severity).toUpperCase() === filter);
  const counts = { ALL: data.length };
  data.forEach(i => { const s = String(i.severity).toUpperCase(); counts[s] = (counts[s] || 0) + 1; });

  return (
    <div>
      <div className="filter-row">
        {FILTERS.map(f => (
          <button key={f} className={'chip' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} ({counts[f] || 0})
          </button>
        ))}
      </div>
      {list.length === 0 && <EmptyState message="No insights at this level." />}
      <div className="insight-list">
        {list.map((i, idx) => (
          <article key={idx} className={'card insight sev-' + severityClass(i.severity)}>
            <div className="card-head">
              <SeverityBadge severity={i.severity} />
              <span className="insight-cat">{i.category}</span>
            </div>
            <h4 className="insight-finding">{i.finding}</h4>
            <p className="insight-evidence"><strong>The evidence: </strong>{i.evidence}</p>
            <p className="insight-action"><strong>What to do: </strong>{i.action}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

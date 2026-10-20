import { useAlerts } from '../../hooks/monitor/useAlerts';
import { validateAlerts } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { SeverityBadge } from '../shared/SeverityBadge';
import { ALERT_LABELS } from '../../utils/terminology';
import { fmtNum, titleCase, timeAgo } from '../../utils/formatters';
import { severityClass } from '../../utils/colors';

export function AlertCenter() {
  const { data: raw, loading, error } = useAlerts();
  if (loading) return <SkeletonCard height={110} count={3} />;
  const { valid, data } = validateAlerts(raw);
  if (!valid || error) return <EmptyState message="No alert data available yet." action={FIX_ACTION} />;
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const alerts = [...data.alerts].sort((a, b) => (order[String(a.severity).toUpperCase()] ?? 3) - (order[String(b.severity).toUpperCase()] ?? 3));

  if (alerts.length === 0) {
    return (
      <div className="card all-clear">
        <span className="empty-icon">✅</span>
        <h4>All clear</h4>
        <p className="muted">Nothing is outside your limits{data.generated_at ? ' (checked ' + timeAgo(data.generated_at) + ')' : ''}.</p>
      </div>
    );
  }
  return (
    <div className="insight-list">
      {alerts.map((a, i) => (
        <article key={i} className={'card insight sev-' + severityClass(a.severity)}>
          <div className="card-head">
            <SeverityBadge severity={a.severity} />
            <span className="insight-cat">{ALERT_LABELS[a.metric] || titleCase(a.metric)}</span>
          </div>
          <h4 className="insight-finding">{a.message}</h4>
          <p className="insight-evidence"><strong>Now: </strong>{fmtNum(a.actual, 2)} · <strong>Limit: </strong>{fmtNum(a.threshold, 2)}</p>
          <p className="insight-action"><strong>What to do: </strong>{a.action}</p>
        </article>
      ))}
    </div>
  );
}

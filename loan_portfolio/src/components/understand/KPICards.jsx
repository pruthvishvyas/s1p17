import { useKPIs } from '../../hooks/understand/useKPIs';
import { validateKPIs } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { useTerminology } from '../shared/TerminologyProvider';
import { KPI_META, KPI_GROUPS, fmtBy, titleCase } from '../../utils/formatters';

export function KPICards() {
  const t = useTerminology();
  const { data: raw, loading, error } = useKPIs();

  if (loading) {
    return <div className="kpi-grid"><SkeletonCard height={120} count={8} /></div>;
  }
  const { valid, data } = validateKPIs(raw);
  if (!valid || error) {
    return <EmptyState message={'No ' + (t.revenue || 'key figure') + ' data available yet.'} action={FIX_ACTION} />;
  }

  const values = { ...data };
  if (values.interest_income !== undefined && values.fee_income !== undefined) {
    values.revenue_total = values.interest_income + values.fee_income;
  }
  const known = new Set(KPI_GROUPS.flatMap(g => g.keys));
  const extra = Object.keys(values).filter(k => !known.has(k));
  const groups = KPI_GROUPS.concat(extra.length ? [{ title: 'Other', keys: extra }] : []);

  return (
    <div>
      {groups.map(g => {
        const keys = g.keys.filter(k => values[k] !== undefined);
        if (!keys.length) return null;
        return (
          <section key={g.title} className="kpi-section">
            <h3 className="section-title">{g.title}</h3>
            <div className="kpi-grid">
              {keys.map(k => {
                const meta = KPI_META[k] || { label: () => titleCase(k), fmt: 'num2' };
                return (
                  <div key={k} className={'kpi-card' + (meta.tone ? ' tone-' + meta.tone : '')}>
                    <div className="kpi-label">{meta.label(t)}</div>
                    <div className="kpi-value">{fmtBy(meta.fmt, values[k])}</div>
                    {meta.hint && <div className="kpi-hint">{meta.hint}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

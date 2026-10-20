import { useRecommendations } from '../../hooks/decide/useRecommendations';
import { validateRecommendations } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { REC_META } from '../../utils/terminology';
import { fmtInt, fmtCurrency, fmtFrac } from '../../utils/formatters';

const WHEN_ORDER = { Now: 0, 'This week': 1, 'This month': 2, 'Next policy review': 3 };

export function RecommendationEngine() {
  const { data: raw, loading, error } = useRecommendations();
  if (loading) return <SkeletonCard height={150} count={3} />;
  const { valid, data } = validateRecommendations(raw);
  if (!valid || error) return <EmptyState message="No recommendations available yet." action={FIX_ACTION} />;

  const rules = data.rules
    .filter(r => Number(r.loans) > 0)
    .map(r => ({ ...r, meta: REC_META[r.rule] || { label: r.rule, when: 'This month', why: r.action, impact: '' } }))
    .sort((a, b) => (WHEN_ORDER[a.meta.when] ?? 9) - (WHEN_ORDER[b.meta.when] ?? 9) || Number(b.outstanding) - Number(a.outstanding));

  return (
    <div>
      <h3 className="section-title">Action list</h3>
      {rules.length === 0 && <EmptyState message="No loans currently need action." />}
      <div className="rec-grid">
        {rules.map(r => (
          <article key={r.rule} className="card rec-card">
            <div className="card-head">
              <h4>{r.meta.label}</h4>
              <span className={'badge ' + (r.meta.when === 'Now' || r.meta.when === 'This week' ? 'badge-high' : 'badge-medium')}>{r.meta.when}</span>
            </div>
            <p><strong>What to do: </strong>{r.action}</p>
            <p><strong>Why: </strong>{r.meta.why}</p>
            <p><strong>Impact: </strong>{r.meta.impact}</p>
            <div className="rec-stats">
              <span>{fmtInt(r.loans)} loans</span>
              <span>{fmtCurrency(r.outstanding)} still owed</span>
            </div>
          </article>
        ))}
      </div>

      <h3 className="section-title">Product and grade segments to fix</h3>
      {data.segments.length === 0 ? <EmptyState message="No segments need repricing or tightening." /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Grade</th><th>Loans</th><th>90+ days late</th><th>Net profit</th><th>Recommended action</th></tr></thead>
              <tbody>
                {data.segments.map((s, i) => (
                  <tr key={i}>
                    <td>{s.Product}</td><td>{s.Risk_Grade}</td><td>{fmtInt(s.loans)}</td><td>{fmtFrac(s.bad_rate, 1)}</td>
                    <td className={Number(s.net_profit) < 0 ? 'neg' : ''}>{fmtCurrency(s.net_profit)}</td>
                    <td><span className={'badge ' + (/discontinue/i.test(s.segment_action) ? 'badge-high' : 'badge-medium')}>{s.segment_action}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useAnomalies } from '../../hooks/understand/useAnomalies';
import { validateAnomalies } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { fmtBy, fmtInt, fmtFrac, titleCase } from '../../utils/formatters';

const FMT = { Loan_Amount: 'currency_full', Credit_Score: 'int', Post_Loan_DTI_pct: 'num1', Interest_Rate_pct: 'num2', anomaly_score: 'num3' };
const LABEL = { Loan_ID: 'Loan', Risk_Grade: 'Grade', Credit_Score: 'Credit score', Post_Loan_DTI_pct: 'Debt-to-income %', Interest_Rate_pct: 'Rate %', Loan_Amount: 'Amount', anomaly_score: 'Unusual-ness', Ever_90DPD: '90+ days late' };
const PAGE = 20;

export function AnomalyTable() {
  const { data: raw, loading, error } = useAnomalies();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'anomaly_score', dir: 'desc' });
  const [page, setPage] = useState(0);
  const v = validateAnomalies(raw);
  const rows = v.data ? v.data.rows : [];

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = term ? rows.filter(x => Object.values(x).some(val => String(val).toLowerCase().includes(term))) : rows;
    const k = sort.key;
    r = [...r].sort((a, b) => {
      const av = a[k], bv = b[k];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [rows, q, sort]);

  if (loading) return <SkeletonCard height={360} />;
  if (!v.valid || error) return <EmptyState message="No unusual-loan data available yet." action={FIX_ACTION} />;

  const cols = rows.length ? Object.keys(rows[0]) : [];
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = shown.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Unusual loans found</div><div className="kpi-value">{fmtInt(v.data.count)}</div><div className="kpi-hint">Odd mixes of risk and price compared with the rest of your book.</div></div>
        <div className="kpi-card tone-warn"><div className="kpi-label">Went 90+ days late (unusual loans)</div><div className="kpi-value">{fmtFrac(v.data.bad_rate_in_anomalies)}</div><div className="kpi-hint">Versus {fmtFrac(v.data.bad_rate_overall)} for all loans.</div></div>
      </div>

      {rows.length === 0 ? <EmptyState message="No unusual loans were flagged." /> : (
        <div className="card">
          <div className="card-head">
            <h4>Most unusual loans (top {fmtInt(rows.length)})</h4>
            <input className="input" placeholder="Search…" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {cols.map(c => (
                    <th key={c} onClick={() => setSort(s => ({ key: c, dir: s.key === c && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                      {LABEL[c] || titleCase(c)} {sort.key === c ? (sort.dir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((r, i) => (
                  <tr key={(r.Loan_ID || '') + i}>
                    {cols.map(c => (
                      <td key={c}>
                        {c === 'Ever_90DPD'
                          ? <span className={'badge ' + (Number(r[c]) === 1 ? 'badge-high' : 'badge-low')}>{Number(r[c]) === 1 ? 'Yes' : 'No'}</span>
                          : (FMT[c] && typeof r[c] === 'number' ? fmtBy(FMT[c], r[c]) : String(r[c] ?? '—'))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Previous</button>
            <span>Page {cur + 1} of {pages}</span>
            <button className="btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

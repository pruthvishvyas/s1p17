import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useSegments } from '../../hooks/understand/useSegments';
import { validateSegments } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { fmtBy } from '../../utils/formatters';
import { ACCENT, GRID, AXIS, TOOLTIP_STYLE } from '../../utils/colors';

const METRICS = [
  { key: 'bad_rate', label: 'Went 90+ days late', fmt: 'frac' },
  { key: 'loans', label: 'Number of loans', fmt: 'int' },
  { key: 'avg_score', label: 'Average credit score', fmt: 'num1' },
  { key: 'avg_rate', label: 'Average interest rate', fmt: 'pct' },
  { key: 'avg_dti', label: 'Average debt-to-income', fmt: 'pct1' },
  { key: 'outstanding', label: 'Still owed', fmt: 'currency' },
  { key: 'net_profit', label: 'Net profit', fmt: 'currency' }
];
const ORDER = ['Low Risk', 'Medium Risk', 'High Risk'];

export function SegmentExplorer() {
  const { data: raw, loading, error } = useSegments();
  const [metricKey, setMetricKey] = useState('bad_rate');
  const [selected, setSelected] = useState(null);

  if (loading) return <div className="kpi-grid"><SkeletonCard height={160} count={3} /></div>;
  const { valid, data } = validateSegments(raw);
  if (!valid || error) return <EmptyState message="No risk segments available yet." action={FIX_ACTION} />;

  const segs = [...data].sort((a, b) => ORDER.indexOf(a.risk_segment) - ORDER.indexOf(b.risk_segment));
  const metric = METRICS.find(m => m.key === metricKey) || METRICS[0];
  const chartData = segs.map(s => ({ name: s.risk_segment, value: Number(s[metric.key]) || 0 }));
  const sel = segs.find(s => s.risk_segment === selected) || null;

  return (
    <div>
      <p className="lead">Your loans are automatically sorted into three groups that behave alike. Click a group to see what makes it different.</p>
      <div className="kpi-grid seg-grid">
        {segs.map(s => (
          <button key={s.risk_segment} className={'card seg-card' + (selected === s.risk_segment ? ' selected' : '')}
            onClick={() => setSelected(selected === s.risk_segment ? null : s.risk_segment)}>
            <div className="kpi-label">{s.risk_segment}</div>
            <div className="kpi-value">{fmtBy('int', s.loans)}</div>
            <div className="kpi-hint">{fmtBy('frac', s.share_of_loans)} of loans · {fmtBy('frac', s.bad_rate)} went 90+ days late</div>
          </button>
        ))}
      </div>

      {sel && (
        <div className="card detail-card">
          <h4>{sel.risk_segment}</h4>
          <div className="detail-grid">
            {METRICS.map(m => (
              <div key={m.key}><span className="detail-label">{m.label}</span><strong>{fmtBy(m.fmt, sel[m.key])}</strong></div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h4>Compare groups</h4>
          <select className="select" value={metricKey} onChange={e => setMetricKey(e.target.value)}>
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="name" tick={AXIS} />
              <YAxis tick={AXIS} width={64} tickFormatter={v => fmtBy(metric.fmt === 'frac' ? 'frac' : metric.fmt, v)} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmtBy(metric.fmt, v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={d => setSelected((d && (d.name || (d.payload && d.payload.name))) || null)}>
                {chartData.map(c => <Cell key={c.name} fill={ACCENT} fillOpacity={selected && selected !== c.name ? 0.35 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

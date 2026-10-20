import { useState, useMemo, useContext } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line } from 'recharts';
import { ExplorerContext } from '../../context/ExplorerContext';
import { useAnomalies } from '../../hooks/understand/useAnomalies';
import { useRecommendations } from '../../hooks/decide/useRecommendations';
import { useChart } from '../../hooks/understand/useCharts';
import { validateChartData } from '../../utils/dataValidator';
import { DATASETS, buildRows, applyFilters, aggregate, groupBy, fmtCell } from '../../utils/explorerData';
import { fmtBy, fmtInt } from '../../utils/formatters';
import { ACCENT, GRID, AXIS, TOOLTIP_STYLE } from '../../utils/colors';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { FilterBar } from './FilterBar';
import { DrillDownPanel } from './DrillDownPanel';

function GroupChart({ rows, dim, metric, filters, onPick, height }) {
  const data = groupBy(applyFilters(rows, filters, dim), dim, metric);
  const selected = filters[dim];
  if (data.length === 0) return <EmptyState message="No data for the current filters." />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="name" tick={AXIS} interval={0} />
        <YAxis tick={AXIS} width={64} tickFormatter={v => fmtBy(metric.fmt, v)} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmtBy(metric.fmt, v)} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer"
          onClick={d => { const name = d && (d.name || (d.payload && d.payload.name)); if (name !== undefined) onPick(dim, name); }}>
          {data.map(e => <Cell key={e.name} fill={ACCENT} fillOpacity={selected && String(selected) !== String(e.name) ? 0.3 : 1} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendPanel() {
  const { data: raw, loading } = useChart('vintage_bad_rate');
  const v = validateChartData(raw);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  if (loading) return <SkeletonCard height={300} />;
  if (!v.valid) return null;
  const months = v.data.rows.map(r => r.x);
  const lo = from || months[0];
  const hi = to || months[months.length - 1];
  const rows = v.data.rows.filter(r => r.x >= lo && r.x <= hi);
  return (
    <div className="card">
      <div className="card-head">
        <h4>Loan quality over time (date range)</h4>
        <div className="range-picker">
          <select className="select" value={lo} onChange={e => setFrom(e.target.value)}>{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <span>to</span>
          <select className="select" value={hi} onChange={e => setTo(e.target.value)}>{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
        </div>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" tick={AXIS} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={AXIS} width={48} tickFormatter={v2 => v2 + '%'} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={val => fmtBy('pct', val)} />
            <Line type="monotone" dataKey="y" name="Went 90+ days late %" stroke={ACCENT} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function InteractiveExplorer() {
  const anomalies = useAnomalies();
  const recs = useRecommendations();
  const { filters, setFilter, clearFilters, activeFilters } = useContext(ExplorerContext);
  const [dsKey, setDsKey] = useState('loans');
  const [dim, setDim] = useState('Product');
  const [metricKey, setMetricKey] = useState(null);
  const [drill, setDrill] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [copied, setCopied] = useState(false);

  const ds = DATASETS[dsKey];
  const rows = useMemo(() => buildRows(dsKey, anomalies.data, recs.data), [dsKey, anomalies.data, recs.data]);
  const metric = ds.metrics.find(m => m.key === metricKey) || ds.metrics[0];
  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const dims = ds.dims.filter(d => rows.some(r => r[d] !== undefined));

  const table = useMemo(() => {
    if (!sort.key) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  if (anomalies.loading || recs.loading) return <SkeletonCard height={400} />;

  const switchDataset = key => { setDsKey(key); clearFilters(); setMetricKey(null); setDrill(null); setSort({ key: null, dir: 'desc' }); setDim(DATASETS[key].dims[0]); };
  const pick = (d, name) => { setFilter(d, name); setDrill(prev => (prev && prev.dim === d && prev.name === name ? null : { dim: d, name })); };
  const drillRows = drill ? applyFilters(rows, { ...filters, [drill.dim]: drill.name }) : [];

  const copySummary = async () => {
    const lines = ['Explorer summary - ' + ds.label, 'Filters: ' + (activeFilters ? JSON.stringify(filters) : 'none'), 'Rows: ' + filtered.length]
      .concat(ds.metrics.map(m => m.label + ': ' + fmtBy(m.fmt, aggregate(filtered, m))));
    const text = lines.join('\n');
    try { await navigator.clipboard.writeText(text); } catch (e) {
      try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (e2) { /* ignore */ }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="explorer">
      <div className="card explorer-top">
        <div className="filter-row">
          {Object.keys(DATASETS).map(k => (
            <button key={k} className={'chip' + (k === dsKey ? ' active' : '')} onClick={() => switchDataset(k)}>{DATASETS[k].label}</button>
          ))}
        </div>
        <p className="muted small">{ds.note} Click any bar to filter everything else on this page.</p>
      </div>

      {rows.length === 0 ? <EmptyState message="This dataset has no rows yet." action={FIX_ACTION} /> : (
        <>
          <div className="sticky-filters">
            <FilterBar dims={dims} rows={rows} hasScore={dsKey === 'loans'} />
          </div>

          <div className="kpi-grid">
            {ds.metrics.slice(0, 4).map(m => (
              <div key={m.key} className="kpi-card">
                <div className="kpi-label">{m.label}</div>
                <div className="kpi-value">{fmtBy(m.fmt, aggregate(filtered, m))}</div>
                <div className="kpi-hint">{fmtInt(filtered.length)} of {fmtInt(rows.length)} rows{activeFilters ? ' (filtered)' : ''}</div>
              </div>
            ))}
          </div>

          <div className="explorer-body">
            <div className="explorer-main">
              <div className="card">
                <div className="card-head">
                  <h4>Explore by</h4>
                  <div className="range-picker">
                    <select className="select" value={dim} onChange={e => setDim(e.target.value)}>{dims.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}</select>
                    <select className="select" value={metric.key} onChange={e => setMetricKey(e.target.value)}>{ds.metrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
                    <button className="btn" onClick={copySummary}>{copied ? 'Copied ✓' : 'Copy summary'}</button>
                  </div>
                </div>
                <div className="chart-box">
                  <ErrorBoundary label="chart"><GroupChart rows={rows} dim={dim} metric={metric} filters={filters} onPick={pick} height={340} /></ErrorBoundary>
                </div>
              </div>

              <div className="chart-grid">
                {dims.filter(d => d !== dim).map(d => (
                  <div key={d} className="card chart-card">
                    <div className="card-head"><h4>{metric.label} by {d.replace(/_/g, ' ')}</h4></div>
                    <div className="chart-box">
                      <ErrorBoundary label="chart"><GroupChart rows={rows} dim={d} metric={metric} filters={filters} onPick={pick} height={280} /></ErrorBoundary>
                    </div>
                  </div>
                ))}
              </div>

              <TrendPanel />

              <div className="card">
                <div className="card-head"><h4>Data table ({fmtInt(filtered.length)} rows)</h4></div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        {ds.columns.map(c => (
                          <th key={c.key} onClick={() => setSort(s => ({ key: c.key, dir: s.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                            {c.label} {sort.key === c.key ? (sort.dir === 'desc' ? '▼' : '▲') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.slice(0, 50).map((r, i) => (
                        <tr key={i} className="clickable" onClick={() => { const d0 = dims[0]; if (d0) setDrill({ dim: d0, name: String(r[d0]) }); }}>
                          {ds.columns.map(c => <td key={c.key}>{fmtCell(c, r[c.key])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.length > 50 && <p className="muted small">Showing the first 50 rows.</p>}
              </div>
            </div>
            {drill && (
              <DrillDownPanel group={drill} rows={drillRows} dataset={ds} onClose={() => setDrill(null)} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

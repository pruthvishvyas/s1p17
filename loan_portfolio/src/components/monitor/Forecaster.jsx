import { useState, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useForecast, useRiskEstimator } from '../../hooks/monitor/useForecast';
import { useChart } from '../../hooks/understand/useCharts';
import { useKPIs } from '../../hooks/understand/useKPIs';
import { validateForecast, validateChartData } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { fmtBy, fmtPct, fmtNum } from '../../utils/formatters';
import { ACCENT, GRID, AXIS, TOOLTIP_STYLE } from '../../utils/colors';

const METRICS = {
  loans: { label: 'New loans per month', fmt: 'int', mape: 'mape_loans' },
  volume: { label: 'New lending per month', fmt: 'currency', mape: 'mape_volume' }
};

export function Forecaster() {
  return (
    <div>
      <ErrorBoundary label="forecast"><OriginationForecast /></ErrorBoundary>
      <ErrorBoundary label="risk estimator"><RiskEstimator /></ErrorBoundary>
    </div>
  );
}

function OriginationForecast() {
  const { data: raw, loading, error } = useForecast();
  const [metric, setMetric] = useState('loans');
  const v = validateForecast(raw);

  const rows = useMemo(() => {
    if (!v.valid) return [];
    const list = v.data.series.filter(r => r.metric === metric);
    const out = list.map(r => ({
      month: r.month,
      actual: r.kind === 'history' ? r.actual : null,
      forecast: r.kind === 'forecast' ? r.forecast : null,
      band: r.kind === 'forecast' && r.lower !== null && r.upper !== null ? [r.lower, r.upper] : null
    }));
    // connect the forecast line to the last actual point
    let lastHist = -1;
    out.forEach((o, i) => { if (o.actual !== null) lastHist = i; });
    if (lastHist >= 0 && lastHist < out.length - 1) out[lastHist].forecast = out[lastHist].actual;
    return out;
  }, [v.valid, raw, metric]);

  if (loading) return <SkeletonCard height={380} />;
  if (!v.valid || error) return <EmptyState message="No forecast available yet." action={FIX_ACTION} />;

  const m = METRICS[metric];
  const mape = v.data.metrics ? v.data.metrics[m.mape] : null;
  const fut = rows.filter(r => r.band !== null);

  return (
    <div className="card">
      <div className="card-head">
        <h4>Forecast: {m.label}</h4>
        <select className="select" value={metric} onChange={e => setMetric(e.target.value)}>
          {Object.keys(METRICS).map(k => <option key={k} value={k}>{METRICS[k].label}</option>)}
        </select>
      </div>
      <p className="muted">
        {fut.length ? 'Next ' + fut.length + ' months: ' + fut.map(r => r.month + ' ≈ ' + fmtBy(m.fmt, r.forecast)).join(' · ') + '. ' : ''}
        {mape !== null && mape !== undefined ? 'When tested on recent months, forecasts were off by about ' + fmtPct(mape * 100, 1) + ' on average.' : 'Not enough history to test forecast accuracy yet.'}
      </p>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="month" tick={AXIS} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={AXIS} width={64} tickFormatter={val => fmtBy(m.fmt, val)} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={val => (Array.isArray(val) ? val.map(x => fmtBy(m.fmt, x)).join(' – ') : fmtBy(m.fmt, val))} />
            <Legend />
            <Area type="monotone" dataKey="band" name="Likely range" stroke="none" fill={ACCENT} fillOpacity={0.18} connectNulls />
            <Line type="monotone" dataKey="actual" name="Actual" stroke={ACCENT} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke={ACCENT} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function riskLevel(rate, portfolio) {
  if (!Number.isFinite(portfolio) || portfolio <= 0) return rate >= 10 ? 'High' : rate >= 3 ? 'Medium' : 'Low';
  return rate >= portfolio * 1.5 ? 'High' : rate >= portfolio * 0.5 ? 'Medium' : 'Low';
}

function RiskEstimator() {
  const band = useChart('bad_rate_by_score_band');
  const kpis = useKPIs();
  const bv = validateChartData(band.data);
  const { loading, error, result, estimate } = useRiskEstimator(bv.valid ? bv.data.rows : []);
  const [score, setScore] = useState('680');
  const portfolio = kpis.data && kpis.data.kpis ? Number(kpis.data.kpis.ever_90dpd_rate) * 100 : NaN;
  const level = result ? riskLevel(result.rate, portfolio) : null;

  return (
    <div className="card">
      <div className="card-head"><h4>Risk check by credit score</h4></div>
      <p className="muted">Enter a credit score to see how often past borrowers in that band went 90+ days late.</p>
      <div className="estimator">
        <input className="input" inputMode="numeric" value={score} onChange={e => setScore(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') estimate(score); }} placeholder="e.g. 640" />
        <button className="btn btn-primary" disabled={loading} onClick={() => estimate(score)}>{loading ? 'Checking…' : 'Check risk'}</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="estimate-result">
          <div className="kpi-value">{fmtNum(result.rate, 1)}%</div>
          <div>
            <span className={'badge badge-' + (level === 'High' ? 'high' : level === 'Medium' ? 'medium' : 'low')}>{level} risk</span>
            <p className="muted small">{result.band ? 'Credit band: ' + result.band + '. ' : ''}Portfolio average: {Number.isFinite(portfolio) ? fmtNum(portfolio, 1) + '%' : 'n/a'}.</p>
          </div>
        </div>
      )}
    </div>
  );
}

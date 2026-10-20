import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { useSimulationList, useSimulation } from '../../hooks/decide/useSimulations';
import { validateSimulation } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { fmtBy, fmtNum, titleCase } from '../../utils/formatters';
import { ACCENT, GRID, AXIS, TOOLTIP_STYLE } from '../../utils/colors';

const CONFIG = {
  minimum_credit_score: {
    title: 'Minimum credit score to approve', key: 'cutoff', fmtKey: v => String(v), question: 'What if we only approved borrowers above a credit score of…',
    cards: [
      { k: 'share_of_loans_pct', label: 'Loans you would keep', fmt: 'pct1', base: () => 100 },
      { k: 'bad_rate_pct', label: 'Went 90+ days late', fmt: 'pct', base: b => b.bad_rate_pct, lowerBetter: true },
      { k: 'net_profit_total', label: 'Total profit', fmt: 'currency', base: b => b.net_profit_total },
      { k: 'net_profit_per_loan', label: 'Profit per loan', fmt: 'currency_full', base: b => b.net_profit_per_loan },
      { k: 'volume', label: 'Lending volume', fmt: 'currency', base: b => b.volume },
      { k: 'expected_loss', label: 'Expected loss', fmt: 'currency', base: b => b.expected_loss, lowerBetter: true }
    ],
    charts: [{ k: 'net_profit_total', label: 'Total profit', fmt: 'currency' }, { k: 'bad_rate_pct', label: 'Went 90+ days late %', fmt: 'pct' }]
  },
  max_post_loan_dti_pct: {
    title: 'Maximum debt-to-income cap', key: 'dti_cap', fmtKey: v => v + '%', question: 'What if we capped borrower debt-to-income at…',
    cards: [
      { k: 'share_of_loans_pct', label: 'Loans you would keep', fmt: 'pct1', base: () => 100 },
      { k: 'bad_rate_pct', label: 'Went 90+ days late', fmt: 'pct', base: b => b.bad_rate_pct, lowerBetter: true },
      { k: 'net_profit_total', label: 'Total profit', fmt: 'currency', base: b => b.net_profit_total },
      { k: 'net_profit_per_loan', label: 'Profit per loan', fmt: 'currency_full', base: b => b.net_profit_per_loan },
      { k: 'volume', label: 'Lending volume', fmt: 'currency', base: b => b.volume },
      { k: 'expected_loss', label: 'Expected loss', fmt: 'currency', base: b => b.expected_loss, lowerBetter: true }
    ],
    charts: [{ k: 'net_profit_total', label: 'Total profit', fmt: 'currency' }, { k: 'bad_rate_pct', label: 'Went 90+ days late %', fmt: 'pct' }]
  },
  interest_rate_change_pp: {
    title: 'Change in interest rate', key: 'rate_change_pp', fmtKey: v => (v > 0 ? '+' : '') + v + ' pts', question: 'What if we changed our interest rates by…',
    cards: [
      { k: 'annual_interest_income', label: 'Yearly interest income', fmt: 'currency', base: (b, raw) => raw.baseline_annual_interest_income },
      { k: 'change_vs_baseline', label: 'Change vs today', fmt: 'currency' },
      { k: 'change_pct', label: 'Change vs today %', fmt: 'pct' },
      { k: 'volume_factor', label: 'Lending volume vs today', fmt: 'frac' }
    ],
    charts: [{ k: 'annual_interest_income', label: 'Yearly interest income', fmt: 'currency' }]
  }
};

function nameOf(url) {
  const f = String(url).split('/').pop().replace('.json', '');
  return titleCase(f);
}

export function WhatIfSimulator() {
  const { urls, ready } = useSimulationList();
  const [idx, setIdx] = useState(0);
  if (!ready) return <SkeletonCard height={300} />;
  if (!urls.length) return <EmptyState message="No simulations available yet." action={FIX_ACTION} />;
  const url = urls[Math.min(idx, urls.length - 1)];
  return (
    <div>
      <p className="lead">Move the slider to see what a policy change would have done to your portfolio. These are back-tests on your own data, not guarantees.</p>
      <div className="filter-row">
        {urls.map((u, i) => (
          <button key={u} className={'chip' + (i === idx ? ' active' : '')} onClick={() => setIdx(i)}>{nameOf(u).replace(' Impact', '')}</button>
        ))}
      </div>
      <ErrorBoundary key={url} label="simulator">
        <SimPanel url={url} />
      </ErrorBoundary>
    </div>
  );
}

function SimPanel({ url }) {
  const { data: raw, loading, error } = useSimulation(url);
  const v = validateSimulation(raw);
  const cfg = (v.valid && CONFIG[v.data.variable]) || null;
  const sc = v.valid ? v.data.scenarios : [];
  const key = cfg ? cfg.key : (sc[0] ? Object.keys(sc[0])[0] : 'x');

  const defaultIdx = useMemo(() => {
    if (!v.valid) return 0;
    if (v.data.variable === 'interest_rate_change_pp') {
      const i = sc.findIndex(s => Number(s[key]) === 0);
      return i >= 0 ? i : 0;
    }
    let best = 0, bd = Infinity;
    sc.forEach((s, i) => { const d = Math.abs(Number(s.share_of_loans_pct) - 100); if (d < bd) { bd = d; best = i; } });
    return best;
  }, [v.valid, raw]);  // eslint-disable-line react-hooks/exhaustive-deps

  const [sel, setSel] = useState(null);
  useEffect(() => { setSel(null); }, [url]);

  if (loading) return <SkeletonCard height={320} />;
  if (!v.valid || error) return <EmptyState message={v.error || error || 'Simulation unavailable'} action={FIX_ACTION} />;

  const i = sel === null ? defaultIdx : Math.min(sel, sc.length - 1);
  const cur = sc[i];
  const base = v.data.baseline || {};
  const cards = cfg ? cfg.cards : Object.keys(cur).filter(k => typeof cur[k] === 'number').map(k => ({ k, label: titleCase(k), fmt: 'num2' }));
  const charts = cfg ? cfg.charts : [];
  const chartData = sc.map(s => ({ x: cfg ? cfg.fmtKey(s[key]) : String(s[key]), ...s }));
  const xLabel = cfg ? cfg.fmtKey(cur[key]) : String(cur[key]);

  return (
    <div>
      <div className="card sim-control">
        <h4>{cfg ? cfg.title : titleCase(v.data.variable)}</h4>
        <p className="muted">{cfg ? cfg.question : ''} <strong className="sim-value">{xLabel}</strong></p>
        <input className="slider" type="range" min={0} max={sc.length - 1} step={1} value={i} onChange={e => setSel(Number(e.target.value))} />
        <div className="slider-scale">
          <span>{cfg ? cfg.fmtKey(sc[0][key]) : String(sc[0][key])}</span>
          <span>{cfg ? cfg.fmtKey(sc[sc.length - 1][key]) : String(sc[sc.length - 1][key])}</span>
        </div>
      </div>

      <div className="kpi-grid">
        {cards.map(c => {
          const value = cur[c.k];
          const b = c.base ? c.base(base, v.data) : undefined;
          const delta = b !== undefined && b !== null && Number.isFinite(Number(b)) ? Number(value) - Number(b) : null;
          const good = delta === null ? null : (c.lowerBetter ? delta <= 0 : delta >= 0);
          return (
            <div key={c.k} className="kpi-card">
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value">{fmtBy(c.fmt, value)}</div>
              {delta !== null && Math.abs(delta) > 1e-9 && (
                <div className={'kpi-delta ' + (good ? 'up' : 'down')}>{delta >= 0 ? '▲' : '▼'} {fmtBy(c.fmt, Math.abs(delta))} vs today</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="chart-grid">
        {charts.map(c => (
          <div key={c.k} className="card chart-card">
            <div className="card-head"><h4>{c.label}</h4></div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="x" tick={AXIS} />
                  <YAxis tick={AXIS} width={64} tickFormatter={val => fmtBy(c.fmt, val)} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={val => fmtBy(c.fmt, val)} />
                  <ReferenceLine x={xLabel} stroke={ACCENT} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey={c.k} stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <p className="muted small">{(v.data.note) || ''} {v.data.assumptions && v.data.assumptions.note ? v.data.assumptions.note : ''}
        {v.data.assumptions && v.data.assumptions.volume_elasticity_pct_per_pp !== undefined ? ' Assumes ' + fmtNum(v.data.assumptions.volume_elasticity_pct_per_pp, 1) + '% less lending per +1 point of rate.' : ''}</p>
    </div>
  );
}

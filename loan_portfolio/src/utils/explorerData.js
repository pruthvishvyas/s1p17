import { fmtBy } from './formatters';

export const DATASETS = {
  loans: {
    label: 'Unusual loans (top flagged)',
    note: 'Loan-level view of the most unusual loans flagged by the pipeline.',
    dims: ['Product', 'Risk_Grade'],
    metrics: [
      { key: 'count', label: 'Number of loans', agg: 'count', fmt: 'int' },
      { key: 'Loan_Amount', label: 'Total loan amount', agg: 'sum', fmt: 'currency' },
      { key: 'Credit_Score', label: 'Average credit score', agg: 'avg', fmt: 'num1' },
      { key: 'Post_Loan_DTI_pct', label: 'Average debt-to-income %', agg: 'avg', fmt: 'num1' },
      { key: 'Interest_Rate_pct', label: 'Average interest rate %', agg: 'avg', fmt: 'num2' },
      { key: 'Ever_90DPD', label: 'Went 90+ days late %', agg: 'avgPct', fmt: 'pct1' },
      { key: 'anomaly_score', label: 'Average unusual-ness score', agg: 'avg', fmt: 'num3' }
    ],
    columns: [
      { key: 'Loan_ID', label: 'Loan' }, { key: 'Product', label: 'Product' }, { key: 'Risk_Grade', label: 'Grade' },
      { key: 'Credit_Score', label: 'Credit score', fmt: 'int' }, { key: 'Post_Loan_DTI_pct', label: 'Debt-to-income %', fmt: 'num1' },
      { key: 'Interest_Rate_pct', label: 'Rate %', fmt: 'num2' }, { key: 'Loan_Amount', label: 'Amount', fmt: 'currency_full' },
      { key: 'anomaly_score', label: 'Unusual-ness', fmt: 'num3' }, { key: 'Ever_90DPD', label: '90+ days late', fmt: 'yesno' }
    ]
  },
  segments: {
    label: 'Product & grade segments (need action)',
    note: 'Segments the pipeline recommends repricing, tightening or discontinuing.',
    dims: ['Product', 'Risk_Grade'],
    metrics: [
      { key: 'loans', label: 'Number of loans', agg: 'sum', fmt: 'int' },
      { key: 'outstanding', label: 'Still owed', agg: 'sum', fmt: 'currency' },
      { key: 'net_profit', label: 'Net profit', agg: 'sum', fmt: 'currency' },
      { key: 'expected_loss', label: 'Expected loss', agg: 'sum', fmt: 'currency' },
      { key: 'bad_rate', label: 'Went 90+ days late %', agg: 'wavg', weight: 'loans', mult: 100, fmt: 'pct1' },
      { key: 'avg_rate', label: 'Average interest rate %', agg: 'wavg', weight: 'loans', fmt: 'num2' }
    ],
    columns: [
      { key: 'Product', label: 'Product' }, { key: 'Risk_Grade', label: 'Grade' }, { key: 'loans', label: 'Loans', fmt: 'int' },
      { key: 'bad_rate', label: '90+ days late', fmt: 'frac' }, { key: 'avg_rate', label: 'Rate %', fmt: 'num2' },
      { key: 'outstanding', label: 'Still owed', fmt: 'currency' }, { key: 'net_profit', label: 'Net profit', fmt: 'currency' },
      { key: 'segment_action', label: 'Recommended action' }
    ]
  }
};

export function buildRows(key, anomalies, recs) {
  if (key === 'loans') {
    const r = anomalies && Array.isArray(anomalies.top_anomalies) ? anomalies.top_anomalies : [];
    return r.filter(x => x && typeof x === 'object');
  }
  const s = recs && Array.isArray(recs.segment_actions) ? recs.segment_actions : [];
  return s.filter(x => x && typeof x === 'object');
}

export function applyFilters(rows, filters, skipDim) {
  const keys = Object.keys(filters || {}).filter(k => k !== skipDim);
  if (keys.length === 0) return rows;
  return rows.filter(r => keys.every(k => {
    const v = filters[k];
    if (v === null || v === undefined || v === '') return true;
    if (k.indexOf('min_') === 0) return Number(r[k.slice(4)]) >= Number(v);
    return String(r[k]) === String(v);
  }));
}

export function aggregate(rows, metric) {
  const n = rows.length;
  if (n === 0) return 0;
  const num = r => { const v = Number(r[metric.key]); return Number.isFinite(v) ? v : 0; };
  switch (metric.agg) {
    case 'count': return n;
    case 'sum': return rows.reduce((a, r) => a + num(r), 0);
    case 'avg': return rows.reduce((a, r) => a + num(r), 0) / n;
    case 'avgPct': return 100 * rows.reduce((a, r) => a + num(r), 0) / n;
    case 'wavg': {
      let w = 0, s = 0;
      rows.forEach(r => { const wt = Number(r[metric.weight]) || 0; w += wt; s += num(r) * wt; });
      return (w > 0 ? s / w : 0) * (metric.mult || 1);
    }
    default: return 0;
  }
}

export function groupBy(rows, dim, metric) {
  const m = new Map();
  rows.forEach(r => {
    const k = r[dim] === undefined || r[dim] === null ? 'Unknown' : String(r[dim]);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return Array.from(m.entries())
    .map(([name, rs]) => ({ name, value: Number(aggregate(rs, metric).toFixed(4)), n: rs.length }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
}

export function fmtCell(col, v) {
  if (v === null || v === undefined) return '—';
  if (col.fmt === 'yesno') return Number(v) === 1 ? 'Yes' : 'No';
  if (col.fmt) return fmtBy(col.fmt, v);
  return String(v);
}

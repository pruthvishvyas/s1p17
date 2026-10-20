export const CURRENCY = '$';

export function fmtInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
}
export function fmtNum(v, d = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
}
export function fmtCompact(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return fmtNum(n, 0);
}
export function fmtCurrency(v, compact = true) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const body = compact ? fmtCompact(Math.abs(n)) : fmtNum(Math.abs(n), 0);
  return (n < 0 ? '-' : '') + CURRENCY + body;
}
export function fmtPct(v, d = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? fmtNum(n, d) + '%' : '—';
}
export function fmtFrac(v, d = 2) {
  const n = Number(v);
  return Number.isFinite(n) ? fmtPct(n * 100, d) : '—';
}
export function fmtBy(kind, v) {
  switch (kind) {
    case 'int': return fmtInt(v);
    case 'currency': return fmtCurrency(v);
    case 'currency_full': return fmtCurrency(v, false);
    case 'pct': return fmtPct(v, 2);
    case 'pct1': return fmtPct(v, 1);
    case 'frac': return fmtFrac(v, 2);
    case 'num1': return fmtNum(v, 1);
    case 'num2': return fmtNum(v, 2);
    case 'num3': return fmtNum(v, 3);
    default: return fmtNum(v, 2);
  }
}
export function titleCase(s) {
  return String(s || '').replace(/_pct$/i, ' %').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function timeAgo(iso) {
  if (!iso) return 'unknown';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'unknown';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 2) return 'just now';
  if (mins < 60) return mins + ' minutes ago';
  const h = Math.round(mins / 60);
  if (h < 48) return h + ' hours ago';
  return Math.round(h / 24) + ' days ago';
}
export function plural(w) {
  const s = String(w || '');
  if (/[^aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ies';
  if (/s$/i.test(s)) return s;
  return s + 's';
}
export function goalStatus(actual, target, higherIsWorse = true) {
  const t = Number(target);
  const a = Number(actual);
  if (target === null || target === undefined || target === '' || !Number.isFinite(t) || !Number.isFinite(a)) return 'NOT_SET';
  return (higherIsWorse ? a <= t : a >= t) ? 'ON_TRACK' : 'OFF_TRACK';
}

// ---- KPI presentation (the data keys come from the pipeline; labels speak the client's language) ----
export const KPI_META = {
  total_loans: { label: t => 'Total ' + plural(t.transaction), fmt: 'int', hint: 'Every loan in your book.' },
  total_originated: { label: () => 'Total Lent Out', fmt: 'currency', hint: 'Money lent since the start.' },
  outstanding_principal: { label: () => 'Still Owed To You', fmt: 'currency', hint: 'Principal borrowers have not repaid yet.' },
  avg_credit_score: { label: () => 'Average Credit Score', fmt: 'num1', hint: 'Higher means safer borrowers.' },
  avg_interest_rate_pct: { label: () => 'Average Interest Rate', fmt: 'pct', hint: 'What borrowers pay on average.' },
  ever_90dpd_rate: { label: () => 'Went 90+ Days Late', fmt: 'frac', tone: 'warn', hint: 'Share of loans that have ever been 3+ months behind.' },
  npl_ratio_pct: { label: () => 'Non-Performing Balance', fmt: 'pct', tone: 'warn', hint: 'Share of money owed that is badly overdue.' },
  stage2_share_pct: { label: () => 'On The Watchlist (Stage 2)', fmt: 'pct', hint: 'Money owed on loans showing early stress.' },
  stage3_share_pct: { label: () => 'Impaired (Stage 3)', fmt: 'pct', tone: 'warn', hint: 'Money owed on loans considered credit-impaired.' },
  anomaly_count: { label: () => 'Unusual Loans', fmt: 'int', hint: 'Loans with odd combinations of risk and price.' },
  p1_urgent_count: { label: () => 'Urgent Actions', fmt: 'int', tone: 'warn', hint: 'Loans that need action this week.' },
  revenue_total: { label: t => 'Total ' + t.revenue, fmt: 'currency', hint: 'Interest plus fees earned to date.' },
  interest_income: { label: () => 'Interest Earned', fmt: 'currency', hint: 'Interest collected to date.' },
  fee_income: { label: () => 'Fees Earned', fmt: 'currency', hint: 'Origination and other fees.' },
  funding_cost: { label: () => 'Cost Of Funds', fmt: 'currency', hint: 'What it costs you to fund the loans.' },
  net_loss: { label: () => 'Losses After Recoveries', fmt: 'currency', tone: 'warn', hint: 'Money written off, net of recoveries.' },
  expected_loss_amount: { label: () => 'Expected Future Losses', fmt: 'currency', hint: 'What the models expect you to lose.' },
  net_profit_to_date: { label: () => 'Net Profit To Date', fmt: 'currency', tone: 'good', hint: 'Income minus all costs and losses.' },
  avg_risk_adjusted_spread_pct: { label: () => 'Margin After Expected Losses', fmt: 'pct', hint: 'Rate minus funding cost minus expected loss. Below 0% means under-priced.' },
  model_auc: { label: () => 'Early-Warning Accuracy', fmt: 'num3', hint: '1.0 is perfect, 0.5 is a coin flip.' },
  mean_composite_risk_score: { label: () => 'Average Risk Score', fmt: 'num1', hint: '0 = very safe, 100 = very risky.' }
};

export const KPI_GROUPS = [
  { title: 'Your Portfolio', keys: ['total_loans', 'total_originated', 'outstanding_principal', 'avg_credit_score', 'avg_interest_rate_pct'] },
  { title: 'Risk', keys: ['ever_90dpd_rate', 'npl_ratio_pct', 'stage2_share_pct', 'stage3_share_pct', 'anomaly_count', 'p1_urgent_count'] },
  { title: 'Profitability', keys: ['revenue_total', 'interest_income', 'fee_income', 'funding_cost', 'net_loss', 'expected_loss_amount', 'net_profit_to_date', 'avg_risk_adjusted_spread_pct'] },
  { title: 'Early-Warning Model', keys: ['model_auc', 'mean_composite_risk_score'] }
];

export function goalStatusLabel(s) {
  return s === 'ON_TRACK' ? 'On track' : s === 'OFF_TRACK' ? 'Off track' : 'Target not set';
}

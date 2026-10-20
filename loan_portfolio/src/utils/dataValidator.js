// Every validator returns { valid, data, error } - components never touch raw JSON shapes.
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validateKPIs(raw) {
  if (!isObj(raw) || !isObj(raw.kpis)) return { valid: false, data: {}, error: 'KPI file has no "kpis" object' };
  const out = {};
  Object.keys(raw.kpis).forEach(k => {
    const v = raw.kpis[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  });
  const ok = Object.keys(out).length > 0;
  return { valid: ok, data: out, error: ok ? null : 'No valid KPI values' };
}

export function validateChartIndex(raw) {
  if (!Array.isArray(raw)) return { valid: false, data: [], error: 'Chart index must be a list' };
  const cleaned = raw.filter(c => c && typeof c.id === 'string');
  return { valid: cleaned.length > 0, data: cleaned, error: cleaned.length ? null : 'No charts listed' };
}

export function validateChartData(raw) {
  if (!isObj(raw) || !Array.isArray(raw.data)) return { valid: false, data: null, error: 'Chart is missing its data list' };
  const rows = raw.data
    .filter(d => d && d.label !== undefined && d.label !== null && Number.isFinite(Number(d.value)))
    .map(d => ({ x: String(d.label), y: Number(d.value) }));
  if (rows.length === 0) return { valid: false, data: null, error: 'Chart has no data points' };
  return { valid: true, data: { ...raw, rows }, error: null };
}

export function validateInsights(raw) {
  if (!Array.isArray(raw)) return { valid: false, data: [], error: 'Insights must be a list' };
  const cleaned = raw.filter(i => i && i.finding && i.severity);
  return { valid: cleaned.length > 0, data: cleaned, error: cleaned.length ? null : 'No valid insights' };
}

export function validateAnomalies(raw) {
  if (!isObj(raw)) return { valid: false, data: null, error: 'Invalid anomaly file' };
  return { valid: true, data: { count: Number(raw.count) || 0, bad_rate_in_anomalies: raw.bad_rate_in_anomalies, bad_rate_overall: raw.bad_rate_overall, rows: Array.isArray(raw.top_anomalies) ? raw.top_anomalies : [] }, error: null };
}

export function validateSegments(raw) {
  if (!isObj(raw) || !Array.isArray(raw.segments)) return { valid: false, data: [], error: 'Invalid segment file' };
  return { valid: raw.segments.length > 0, data: raw.segments, error: raw.segments.length ? null : 'No segments' };
}

export function validateRecommendations(raw) {
  if (!isObj(raw)) return { valid: false, data: null, error: 'Invalid recommendations file' };
  return { valid: true, data: { rules: Array.isArray(raw.alert_rules) ? raw.alert_rules : [], segments: Array.isArray(raw.segment_actions) ? raw.segment_actions : [] }, error: null };
}

export function validateSimulation(raw) {
  if (!isObj(raw) || !Array.isArray(raw.scenarios) || raw.scenarios.length === 0) return { valid: false, data: null, error: 'Simulation has no scenarios' };
  return { valid: true, data: raw, error: null };
}

export function validateGoals(raw) {
  if (!isObj(raw)) return { valid: false, data: {}, error: 'Invalid goals file' };
  return { valid: Object.keys(raw).length > 0, data: raw, error: null };
}

export function validateForecast(raw) {
  if (!isObj(raw) || !Array.isArray(raw.series)) return { valid: false, data: null, error: 'Invalid forecast file' };
  const rows = raw.series.filter(r => r && r.month && r.metric);
  return { valid: rows.length > 0, data: { ...raw, series: rows }, error: rows.length ? null : 'Forecast has no rows' };
}

export function validateProgress(raw) {
  if (!isObj(raw) || !Array.isArray(raw.goals)) return { valid: false, data: null, error: 'Invalid goal progress file' };
  return { valid: true, data: raw, error: null };
}

export function validateAlerts(raw) {
  if (!isObj(raw) || !Array.isArray(raw.alerts)) return { valid: false, data: null, error: 'Invalid alerts file' };
  return { valid: true, data: raw, error: null };
}

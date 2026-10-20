// Contract helpers - every data path is resolved from frontend_contract.json (defaults only as a safety net).
export const DEFAULT_CONTRACT = {
  "project": {
    "name": "Consumer Lending Portfolio Intelligence",
    "domain": "consumer_lending",
    "client_id": "loan_portfolio",
    "description": "Consumer lending portfolio: understand risk, decide on pricing/approval/collections, monitor early warnings."
  },
  "terminology": {
    "revenue": "Interest & Fee Income",
    "customer": "Borrower",
    "product": "Loan Product",
    "transaction": "Loan"
  },
  "outcomes": {
    "understand": {
      "kpis": "understand/kpis.json",
      "charts": "understand/charts/_index.json",
      "segments": "understand/segments.json",
      "anomalies": "understand/anomalies.json"
    },
    "decide": {
      "insights": "decide/insights.json",
      "recommendations": "decide/recommendations.json",
      "simulations": "decide/simulations/",
      "goals": "decide/goals.json"
    },
    "monitor": {
      "forecast": "monitor/forecast.json",
      "goal_progress": "monitor/goal_progress.json",
      "alerts": "monitor/alerts.json"
    }
  }
};

export const DEFAULT_PATHS = {
  understand: { kpis: 'understand/kpis.json', charts: 'understand/charts/_index.json', segments: 'understand/segments.json', anomalies: 'understand/anomalies.json' },
  decide: { insights: 'decide/insights.json', recommendations: 'decide/recommendations.json', simulations: 'decide/simulations/', goals: 'decide/goals.json' },
  monitor: { forecast: 'monitor/forecast.json', goal_progress: 'monitor/goal_progress.json', alerts: 'monitor/alerts.json' }
};

const DEFAULT_SIMS = [
  'decide/simulations/score_cutoff_impact.json',
  'decide/simulations/dti_cap_impact.json',
  'decide/simulations/rate_change_impact.json'
];

export function dataUrl(rel) {
  return '/data/' + String(rel || '').replace(/^\/+/, '');
}

export function resolveRel(contract, outcome, key) {
  const p = contract && contract.outcomes && contract.outcomes[outcome] && contract.outcomes[outcome][key];
  return p || DEFAULT_PATHS[outcome][key];
}

export function resolvePath(contract, outcome, key) {
  return dataUrl(resolveRel(contract, outcome, key));
}

export function chartUrl(contract, id) {
  const idx = resolveRel(contract, 'understand', 'charts');
  const base = idx.replace(/_index\.json$/, '');
  return dataUrl(base + id + '.json');
}

export function metaPath(contract, name) {
  const list = (contract && Array.isArray(contract.meta)) ? contract.meta : [];
  const hit = list.find(p => String(p).endsWith('/' + name));
  return dataUrl(hit || ('meta/' + name));
}

export function simulationFiles(contract) {
  const files = (contract && Array.isArray(contract.files)) ? contract.files : [];
  const found = files.map(f => f.filename).filter(f => typeof f === 'string' && f.indexOf('decide/simulations/') === 0 && f.endsWith('.json'));
  return (found.length ? found : DEFAULT_SIMS).map(dataUrl);
}

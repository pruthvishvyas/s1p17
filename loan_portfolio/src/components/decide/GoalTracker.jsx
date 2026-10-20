import { useState } from 'react';
import { useGoals, useGoalOverrides, saveOverrides } from '../../hooks/decide/useGoals';
import { validateGoals } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { GOAL_META } from '../../utils/terminology';
import { titleCase } from '../../utils/formatters';

export function GoalTracker() {
  const { data: raw, loading, error } = useGoals();
  const overrides = useGoalOverrides();
  const [draft, setDraft] = useState({});
  if (loading) return <SkeletonCard height={90} count={4} />;
  const { valid, data } = validateGoals(raw);
  if (!valid || error) return <EmptyState message="No goals available yet." action={FIX_ACTION} />;

  const commit = key => {
    const txt = draft[key];
    if (txt === undefined) return;
    const next = { ...overrides };
    const n = Number(txt);
    if (txt === '' || !Number.isFinite(n)) delete next[key]; else next[key] = n;
    saveOverrides(next);
    setDraft(d => { const c = { ...d }; delete c[key]; return c; });
  };
  const reset = () => { saveOverrides({}); setDraft({}); };

  const keys = Object.keys(data);
  const mine = keys.filter(k => data[k] && data[k].client_sets);
  const limits = keys.filter(k => !(data[k] && data[k].client_sets));

  const row = k => {
    const g = data[k] || {};
    const meta = GOAL_META[k] || { label: titleCase(k), unit: g.unit || '', help: g.description || '' };
    const effective = overrides[k] !== undefined ? overrides[k] : g.value;
    const shown = draft[k] !== undefined ? draft[k] : (effective === null || effective === undefined ? '' : String(effective));
    return (
      <div key={k} className="card goal-row">
        <div>
          <h4>{meta.label}</h4>
          <p className="muted small">{meta.help || g.description}</p>
        </div>
        <div className="goal-input">
          <input className="input" inputMode="decimal" placeholder="Set a value" value={shown}
            onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
            onBlur={() => commit(k)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          <span className="unit">{meta.unit || g.unit}</span>
          {overrides[k] !== undefined && <span className="badge badge-medium">Your value</span>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="lead">Set the targets you care about. Your values are saved in this browser and used in Goal Progress. Press Enter or click away to save.</p>
      {mine.length > 0 && <h3 className="section-title">Your targets</h3>}
      {mine.map(row)}
      <h3 className="section-title">Alert limits</h3>
      {limits.map(row)}
      <button className="btn" onClick={reset}>Reset to defaults</button>
    </div>
  );
}

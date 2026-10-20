import { useGoalProgress } from '../../hooks/monitor/useGoalProgress';
import { useGoalOverrides } from '../../hooks/decide/useGoals';
import { validateProgress } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { GOAL_META } from '../../utils/terminology';
import { goalStatus, goalStatusLabel, fmtNum, titleCase, timeAgo } from '../../utils/formatters';

export function GoalProgress() {
  const { data: raw, loading, error } = useGoalProgress();
  const overrides = useGoalOverrides();
  if (loading) return <SkeletonCard height={110} count={4} />;
  const { valid, data } = validateProgress(raw);
  if (!valid || error) return <EmptyState message="No goal progress available yet." action={FIX_ACTION} />;

  return (
    <div>
      <p className="lead">Latest actuals from your data compared with your targets{data.generated_at ? ' (data updated ' + timeAgo(data.generated_at) + ')' : ''}.</p>
      <div className="rec-grid">
        {data.goals.map(g => {
          const meta = GOAL_META[g.goal] || { label: titleCase(g.goal), unit: '', higherIsWorse: true };
          const target = overrides[g.goal] !== undefined ? overrides[g.goal] : g.target;
          const status = goalStatus(g.actual, target, meta.higherIsWorse);
          const pct = Number.isFinite(Number(target)) && Number(target) > 0 ? Math.min(100, Math.max(0, (Number(g.actual) / Number(target)) * 100)) : 0;
          return (
            <article key={g.goal} className="card">
              <div className="card-head">
                <h4>{meta.label}</h4>
                <span className={'badge ' + (status === 'ON_TRACK' ? 'badge-low' : status === 'OFF_TRACK' ? 'badge-high' : 'badge-medium')}>{goalStatusLabel(status)}</span>
              </div>
              <div className="progress-numbers">
                <span><span className="detail-label">Now</span><strong>{fmtNum(g.actual, 2)} {meta.unit}</strong></span>
                <span><span className="detail-label">{meta.higherIsWorse ? 'Limit' : 'Target'}</span><strong>{target === null || target === undefined ? 'not set' : fmtNum(target, 2) + ' ' + meta.unit}</strong></span>
              </div>
              {status !== 'NOT_SET' && (
                <div className="progress-bar"><div className={'progress-fill ' + (status === 'ON_TRACK' ? 'ok' : 'bad')} style={{ width: pct + '%' }} /></div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

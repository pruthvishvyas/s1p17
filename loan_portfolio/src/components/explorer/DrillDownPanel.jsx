import { aggregate, fmtCell } from '../../utils/explorerData';
import { fmtBy } from '../../utils/formatters';

export function DrillDownPanel({ group, rows, dataset, onClose }) {
  if (!group) return null;
  const top = rows.slice(0, 5);
  return (
    <aside className="drilldown">
      <div className="card-head">
        <h4>{group.dim.replace(/_/g, ' ')}: {group.name}</h4>
        <button className="btn" onClick={onClose}>Close ×</button>
      </div>
      <p className="muted small">{rows.length} matching row{rows.length === 1 ? '' : 's'}</p>
      <div className="detail-grid single">
        {dataset.metrics.map(m => (
          <div key={m.key}><span className="detail-label">{m.label}</span><strong>{fmtBy(m.fmt, aggregate(rows, m))}</strong></div>
        ))}
      </div>
      {top.length > 0 && (
        <>
          <h5>Sample rows</h5>
          <ul className="drill-list">
            {top.map((r, i) => (
              <li key={i}>{dataset.columns.slice(0, 4).map(c => fmtCell(c, r[c.key])).join(' · ')}</li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

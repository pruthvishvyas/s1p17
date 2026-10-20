import { useContext } from 'react';
import { ExplorerContext } from '../../context/ExplorerContext';

export function FilterBar({ dims, rows, hasScore }) {
  const { filters, setFilter, clearFilters, activeFilters } = useContext(ExplorerContext);
  return (
    <div className="filter-bar">
      {dims.map(d => {
        const options = Array.from(new Set(rows.map(r => r[d]).filter(v => v !== undefined && v !== null).map(String))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return (
          <label key={d} className="filter-field">
            <span>{d.replace(/_/g, ' ')}</span>
            <select className="select" value={filters[d] || ''} onChange={e => setFilter(d, e.target.value || null)}>
              <option value="">All</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        );
      })}
      {hasScore && (
        <label className="filter-field">
          <span>Min credit score</span>
          <input className="input" type="number" min={300} max={850} placeholder="any"
            value={filters.min_Credit_Score === undefined ? '' : filters.min_Credit_Score}
            onChange={e => setFilter('min_Credit_Score', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
      )}
      <button className="btn" onClick={clearFilters} disabled={activeFilters === 0}>Clear filters{activeFilters ? ' (' + activeFilters + ')' : ''}</button>
    </div>
  );
}

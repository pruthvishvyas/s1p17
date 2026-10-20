import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { useChartIndex, useChart } from '../../hooks/understand/useCharts';
import { validateChartIndex, validateChartData } from '../../utils/dataValidator';
import { SkeletonCard } from '../shared/SkeletonCard';
import { EmptyState, FIX_ACTION } from '../shared/EmptyState';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { CHART_COLORS, ACCENT, GRID, AXIS, TOOLTIP_STYLE } from '../../utils/colors';
import { fmtNum } from '../../utils/formatters';

export function ChartPanel({ outcome, title }) {
  const { data: raw, loading, error } = useChartIndex();
  if (loading) return <div className="chart-grid"><SkeletonCard height={360} count={2} /></div>;
  const { valid, data } = validateChartIndex(raw);
  if (!valid || error) return <EmptyState message="No charts available yet." action={FIX_ACTION} />;
  const list = outcome ? data.filter(c => String(c.outcome).toUpperCase() === outcome) : data;
  if (list.length === 0) return null;
  return (
    <section>
      {title && <h3 className="section-title">{title}</h3>}
      <div className="chart-grid">
        {list.map(c => (
          <ErrorBoundary key={c.id} label="chart">
            <ChartCard meta={c} />
          </ErrorBoundary>
        ))}
      </div>
    </section>
  );
}

export function ChartCard({ meta }) {
  const { data: raw, loading, error } = useChart(meta.id);
  return (
    <div className="card chart-card">
      <div className="card-head">
        <h4>{meta.title || meta.id}</h4>
        <span className={'outcome-pill outcome-' + String(meta.outcome || '').toLowerCase()}>{meta.outcome}</span>
      </div>
      <div className="chart-box">
        {loading ? <SkeletonCard height={320} /> : (() => {
          const v = validateChartData(raw);
          if (!v.valid || error) return <EmptyState message={v.error || error || 'Chart unavailable'} />;
          return renderChart(meta.id, v.data);
        })()}
      </div>
    </div>
  );
}

const tip = (v) => fmtNum(v, Math.abs(Number(v)) >= 100 ? 0 : 2);

function renderChart(id, chart) {
  const rows = chart.rows;
  const type = chart.type;
  const longLabels = rows.some(r => r.x.length > 14) || rows.length > 9;
  const isShare = rows.length <= 4 && /distribution|sizes|breakdown/.test(id);
  const margin = { top: 10, right: 20, bottom: 10, left: 10 };

  if (isShare) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={rows} dataKey="y" nameKey="x" cx="50%" cy="50%" innerRadius="45%" outerRadius="75%"
            label={({ name, percent }) => name + ': ' + (percent * 100).toFixed(0) + '%'}>
            {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tip} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="x" tick={AXIS} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={AXIS} width={48} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tip} />
          <Line type="monotone" dataKey="y" stroke={ACCENT} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (longLabels && type !== 'histogram') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} layout="vertical" margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis type="number" tick={AXIS} />
          <YAxis type="category" dataKey="x" tick={{ ...AXIS, fontSize: 11 }} width={150} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tip} />
          <Bar dataKey="y" fill={ACCENT} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={margin} barCategoryGap={type === 'histogram' ? 1 : '20%'}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="x" tick={AXIS} interval={type === 'histogram' ? 'preserveStartEnd' : 0} />
        <YAxis tick={AXIS} width={52} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tip} />
        <Bar dataKey="y" fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

import { useOutcome } from '../context/OutcomeContext';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { KPICards } from '../components/understand/KPICards';
import { ChartPanel } from '../components/understand/ChartPanel';
import { SegmentExplorer } from '../components/understand/SegmentExplorer';
import { AnomalyTable } from '../components/understand/AnomalyTable';
import { InsightCards } from '../components/decide/InsightCards';
import { RecommendationEngine } from '../components/decide/RecommendationEngine';
import { WhatIfSimulator } from '../components/decide/WhatIfSimulator';
import { GoalTracker } from '../components/decide/GoalTracker';
import { Forecaster } from '../components/monitor/Forecaster';
import { GoalProgress } from '../components/monitor/GoalProgress';
import { AlertCenter } from '../components/monitor/AlertCenter';
import { InteractiveExplorer } from '../components/explorer/InteractiveExplorer';
import { UserManual } from '../components/manual/UserManual';

function renderTab(id) {
  switch (id) {
    case 'overview':
      return (<><KPICards /><ChartPanel outcome="UNDERSTAND" title="Charts that answer a question" /></>);
    case 'segments': return <SegmentExplorer />;
    case 'anomalies': return <AnomalyTable />;
    case 'insights':
      return (<><InsightCards /><ChartPanel outcome="DECIDE" title="Evidence behind the insights" /></>);
    case 'recommendations': return <RecommendationEngine />;
    case 'simulator': return <WhatIfSimulator />;
    case 'goals': return <GoalTracker />;
    case 'forecast':
      return (<><Forecaster /><ChartPanel outcome="MONITOR" title="Is new lending getting better or worse?" /></>);
    case 'progress': return <GoalProgress />;
    case 'alerts': return <AlertCenter />;
    case 'explorer': return <InteractiveExplorer />;
    case 'manual': return <UserManual />;
    default: return <KPICards />;
  }
}

export default function Dashboard() {
  const { tab } = useOutcome();
  return (
    <div className="page">
      <p className="page-subtitle">{tab.subtitle}</p>
      <ErrorBoundary key={tab.id} label="page">
        {renderTab(tab.id)}
      </ErrorBoundary>
    </div>
  );
}
